// matrix.js
/*
UCI Lab Extractor
Copyright (C) 2026 Juan Sepúlveda Sepúlveda

Licensed under the GNU General Public License v3.0
*/

// Helpers
function normTxt(s) {
  return String(s || "").trim().toUpperCase();
}

function esNoSeObserva(v) {
  const t = normTxt(v);
  return t === "NO SE OBSERVAN" || t === "NO SE OBSERVA" || t === "NO SE OBSERVAN.";
}

// ===== ORINA COMPLETA (panel) =====
const ORINA_ESTUDIO = "ORINA COMPLETA";
const ORINA_HIDE_NOOBS = new Set([
  "BACTERIAS",
  "PLACAS DE PUS",
  "CRISTALES",
  "CRISTALES.",
  "CILINDROS",
  "OTROS ELEMENTOS"
]);

// ===== CULTIVOS (panel) =====
function esEstudioCultivo(estudioUpper) {
  const s = String(estudioUpper || "");
  return (
    s.includes("CULTIVO") ||
    s.includes("HEMOCULTIVO") ||
    s.includes("UROCULTIVO")
  );
}

function normalizarClaveEstudio(estudioRaw) {
  // Mantener números, pero normalizar espacios
  return String(estudioRaw || "").replace(/\s+/g, " ").trim();
}

function esPruebaTipoMuestra(pruebaUpper) {
  // En el LIS a veces viene cortado: "TIPO DE MU\nSTRA"
  return pruebaUpper.includes("TIPO DE MU");
}

function esPruebaGram(pruebaUpper) {
  return pruebaUpper.includes("TINCION") && pruebaUpper.includes("GRAM");
}

function esPruebaComentario(pruebaUpper) {
  return pruebaUpper.includes("COMENTARIO");
}

function construirMarkerCultivo(estudioKey) {
  // El viewer podrá parsear el estudio desde el marcador
  return `__CULTIVO_MODAL__::${estudioKey}`;
}

function esResultadoValido(r) {
  if (!r) return false;

  const valor = (r.valor ?? r.Resultado ?? "");
  if (valor === null || valor === undefined) return false;

  const texto = String(valor).trim().toUpperCase();

  // En cultivos puede haber fila cabecera "DISPONIBLE" con resultado vacío (negativo/no informado)
  if (texto === "") {
    const estudio = normTxt(r.estudio || r.Estudio);
    const prueba = normTxt(r.prueba || r.Prueba);
    const estado = normTxt(r.estado || r.Estado);
    if (esEstudioCultivo(estudio) && estado.includes("DISPONIBLE") && (prueba === estudio)) {
      return true;
    }
    return false;
  }

  if (texto === "PENDIENTE") return false;
  if (texto === "RECHAZADO") return false;

  return true;
}

async function construirMatrizClinica(rut) {
  const data = await obtener(rut);
  if (!data || !data.ordenes) return null;

  const paciente = data.paciente;

  const columnas = Object.entries(data.ordenes)
    .map(([hashKey, contenido]) => {
      const registrosValidos = (contenido.registros || []).filter(esResultadoValido);
      if (!registrosValidos.length) return null;

      const fechasBase = registrosValidos
        .map(r => r.fechaValidacion)
        .filter(Boolean)
        .sort();

      // timestamp preferido: el más antiguo válido de los registros;
      // si no hay, usar timestamp/fechaExtraccion del objeto orden
      const timestamp = (fechasBase[0] || contenido.timestamp || contenido.fechaExtraccion || null);
      if (!timestamp) return null;

      // label de orden para la cabecera (NO mostrar hash completo)
      const ordenLabel =
        (contenido.orden != null && String(contenido.orden).trim() !== "")
          ? String(contenido.orden).trim()
          : (contenido.ordenOriginal && String(contenido.ordenOriginal).trim() !== "")
            ? String(contenido.ordenOriginal).trim()
            : `hash:${String(hashKey).slice(0, 8)}`;

      return {
        hash: contenido.hash || hashKey,
        orden: ordenLabel,
        timestamp,
        registros: registrosValidos
      };
    })
    .filter(Boolean);

  if (!columnas.length) return null;

  columnas.sort((a, b) => {
    const fA = new Date(String(a.timestamp).replace(" ", "T"));
    const fB = new Date(String(b.timestamp).replace(" ", "T"));

    if (fA < fB) return -1;
    if (fA > fB) return 1;

    return String(a.orden).localeCompare(String(b.orden), undefined, { numeric: true });
  });

  const ordenBaseFilas = Array.from(new Set(Object.values(MAP_EXAMENES)));
  const filas = {};
  const examenesExtra = new Set();

  // Paneles especiales
  const paneles = {
    orina: {},
    cultivos: {} // paneles.cultivos[timestamp][estudioKey] = panel
  };

  // Acceso a parser de cultivos (cultures.js)
  const C = (typeof window !== "undefined" && window.Cultures) ? window.Cultures : null;

  ordenBaseFilas.forEach(ex => { filas[ex] = {}; });

  function getCultivoPanel(timestamp, estudioKey) {
    if (!paneles.cultivos[timestamp]) paneles.cultivos[timestamp] = {};
    if (!paneles.cultivos[timestamp][estudioKey]) {
      paneles.cultivos[timestamp][estudioKey] = {
        estudio: estudioKey,
        resultadoGlobal: null,
        tipoMuestra: null,
        gram: null,
        comentarios: [],
        refAntibiograma: null,
        aislados: [],
        meta: { fechaValidacion: timestamp }
      };
    }
    return paneles.cultivos[timestamp][estudioKey];
  }

  columnas.forEach(col => {
    const timestamp = col.timestamp;

    col.registros.forEach(r => {
      const examenCrudo = (r.examen || r.Prueba || "").trim();
      if (!examenCrudo) return;

      const estudioRaw = (r.estudio || r.Estudio || "");
      const estudioUp = normTxt(estudioRaw);
      const pruebaRaw = (r.prueba || r.Prueba || "");
      const pruebaUp = normTxt(pruebaRaw);
      const valor = (r.valor ?? r.Resultado ?? "");

      // ===== ORINA COMPLETA (panel) =====
      if (estudioUp === ORINA_ESTUDIO) {
        if (!paneles.orina[timestamp]) {
          paneles.orina[timestamp] = {
            fisico: {},
            micro: {},
            meta: { fechaValidacion: timestamp }
          };
        }

        const esMicro = [
          "CELULAS EPITELIALES",
          "HEMATIES",
          "LEUCOCITOS OC",
          "BACTERIAS",
          "PLACAS DE PUS",
          "CRISTALES",
          "CRISTALES.",
          "CILINDROS",
          "OTROS ELEMENTOS"
        ].includes(pruebaUp);

        if (ORINA_HIDE_NOOBS.has(pruebaUp) && esNoSeObserva(valor)) {
          return;
        }

        const target = esMicro
          ? paneles.orina[timestamp].micro
          : paneles.orina[timestamp].fisico;

        if (!target[pruebaUp]) target[pruebaUp] = [];
        target[pruebaUp].push(valor);

        if (!filas[ORINA_ESTUDIO]) filas[ORINA_ESTUDIO] = {};
        filas[ORINA_ESTUDIO][timestamp] = "__ORINA_MODAL__";
        return;
      }

      // ===== CULTIVOS (panel) =====
      if (esEstudioCultivo(estudioUp)) {
        const estudioKey = normalizarClaveEstudio(estudioRaw) || estudioUp;
        const panel = getCultivoPanel(timestamp, estudioKey);

        // Resultado global: normalmente la prueba igual al estudio
        if (pruebaUp === normTxt(estudioKey) || pruebaUp === estudioUp) {
          // Puede ser vacío (negativo/no informado) — igual se guarda
          panel.resultadoGlobal = (valor != null) ? String(valor).trim() : panel.resultadoGlobal;
        } else if (esPruebaTipoMuestra(pruebaUp)) {
          panel.tipoMuestra = (valor != null) ? String(valor).trim() : panel.tipoMuestra;
        } else if (esPruebaGram(pruebaUp)) {
          panel.gram = (valor != null) ? String(valor).trim() : panel.gram;
        } else if (esPruebaComentario(pruebaUp)) {
          const txt = (valor != null) ? String(valor).trim() : "";
          if (txt) panel.comentarios.push(txt);
          if (!panel.refAntibiograma && C && typeof C.parseReferenciaAntibiograma === "function") {
            const ref = C.parseReferenciaAntibiograma(txt);
            if (ref) panel.refAntibiograma = ref;
          }
        } else if (C && typeof C.isAisladoPrueba === "function" && C.isAisladoPrueba(pruebaRaw)) {
          const parsed = (typeof C.parseAislado === "function") ? C.parseAislado(valor) : { microorganismo: null, recuento: null, antibioticos: [] };
          panel.aislados.push({
            label: String(pruebaRaw).replace(/\s+/g, " ").trim(),
            ...parsed
          });
        }

        // Fila única del estudio de cultivo
        if (!filas[estudioKey]) filas[estudioKey] = {};
        filas[estudioKey][timestamp] = construirMarkerCultivo(estudioKey);

        // No seguir al flujo normal
        return;
      }

      // ===== FLUJO NORMAL (matriz clásica) =====

      // Mapeo de nombres alternativos
      const examenCanonico = (typeof mapearExamen === "function")
        ? mapearExamen(examenCrudo)
        : examenCrudo;

      // Exclusión opcional (si definiste examenExcluido en exams.js)
      if (typeof examenExcluido === "function" && examenExcluido(examenCanonico)) return;

      let examen = normalizarNombre(examenCanonico);

      // Sufijos gasométricos (mantener variable distinta para evitar doble declaración)
      const estudioGas = normTxt(r.estudio || r.Estudio);
      if (estudioGas.includes("ARTERIAL")) examen += "_A";
      else if (estudioGas.includes("VENOS")) examen += "_V";

      if (!filas[examen]) {
        examenesExtra.add(examen);
        filas[examen] = {};
      }

      filas[examen][timestamp] = (r.valor ?? r.Resultado ?? "");
    });
  });

  // Orden final de filas: base + extras + paneles conocidos (si existen)
  const filasEspeciales = [];
  if (filas[ORINA_ESTUDIO]) filasEspeciales.push(ORINA_ESTUDIO);

  // Agregar estudios de cultivos que se hayan creado (en orden alfabético simple para empezar)
  const cultivosKeys = Object.keys(filas)
    .filter(k => k !== ORINA_ESTUDIO)
    .filter(k => esEstudioCultivo(normTxt(k)));
  cultivosKeys.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  filasEspeciales.push(...cultivosKeys.filter(k => !ordenBaseFilas.includes(k) && !examenesExtra.has(k)));

  return {
    paciente,
    columnas: columnas.map(c => ({ hash: c.hash, orden: c.orden, timestamp: c.timestamp })),
    filas,
    ordenFilas: [...ordenBaseFilas, ...Array.from(examenesExtra), ...filasEspeciales],
    paneles
  };
}
