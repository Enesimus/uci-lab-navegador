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

const ESTUDIOS_MOLECULARES = new Set([
  "PANEL RESPIRATORIO",
  "PANEL PCR GASTROINTESTINAL",
  "PANEL PCR MENINGEO",
  "PANEL PCR NEUMONIA"
]);

const ESTUDIO_PCR_SARS = "PCR SARS COV-2";

function esEstudioMolecular(estudioUpper) {
  return ESTUDIOS_MOLECULARES.has(String(estudioUpper || "").trim().toUpperCase());
}

function construirMarkerMolecular(estudioKey) {
  return `__MOLECULAR_MODAL__::${estudioKey}`;
}

function normalizarResultadoMolecular(valor) {
  const raw = String(valor || "").trim();
  const t = raw.toUpperCase();

  if (t === "DETECTADO" || t === "POSITIVO") return "Detectado";
  if (t === "NO DETECTADO" || t === "NEGATIVO") return "No detectado";

  return raw;
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
  const GASES_CON_ETIQUETA = ["pH", "pO2", "pCO2", "HCO3", "BE", "satO2"];
  const SET_GASES_CON_ETIQUETA = new Set(GASES_CON_ETIQUETA);
  
  const filas = {};
  const examenesExtra = new Set();

  // Paneles especiales
  const paneles = {
    orina: {},
    cultivos: {},
    moleculares: {} 
  };

  // Acceso a parser de cultivos (cultures.js)
  const C = (typeof window !== "undefined" && window.Cultures) ? window.Cultures : null;

  ordenBaseFilas.forEach(ex => { filas[ex] = {}; });

  function resolveCultivoKey(timestamp, baseKey) {
    const bucket = paneles.cultivos[timestamp] || {};
    const keys = Object.keys(bucket).filter(k => k === baseKey || k.startsWith(baseKey + "::"));
    if (keys.length === 1) return keys[0];
    return baseKey;
  }

  function cleanTipoMuestraLocal(raw) {
    const t = String(raw || "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
    if (!t) return "";
    return t.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  }

  function buildCultivoPanelKey(baseKey, tipoMuestra) {
    const b = normTxt(baseKey);
    const tm = (C && typeof C.cleanTipoMuestra === "function") ? C.cleanTipoMuestra(tipoMuestra) : cleanTipoMuestraLocal(tipoMuestra);
    if (!tm) return baseKey;
    if (b.includes("CULTIVO SECRECION")) return `${baseKey}::${tm}`;
    if (b.includes("CULTIVO DE LIQUIDOS")) return `${baseKey}::${tm}`;
    return baseKey;
  }

  function buildCultivoDisplayName(baseKey, tipoMuestra) {
    if (C && typeof C.buildDisplayName === "function") return C.buildDisplayName(baseKey, tipoMuestra);
    const tm = cleanTipoMuestraLocal(tipoMuestra);
    const b = normTxt(baseKey);
    if (!tm) return String(baseKey || "").trim();
    if (b.includes("CULTIVO SECRECION")) return `CULTIVO ${tm}`;
    if (b.includes("CULTIVO DE LIQUIDOS")) return `CULTIVO ${tm}`;
    return String(baseKey || "").trim();
  }

  function getCultivoPanel(timestamp, panelKey, baseKey) {
    if (!paneles.cultivos[timestamp]) paneles.cultivos[timestamp] = {};
    if (!paneles.cultivos[timestamp][panelKey]) {
      paneles.cultivos[timestamp][panelKey] = {
        estudio: panelKey,
        estudioBase: baseKey || panelKey,
        gramRaw: null,
        gramObs: null,
        displayName: null,
        resultadoGlobal: null,
        tipoMuestra: null,
        gram: null,
        comentarios: [],
        refAntibiograma: null,
        aislados: [],
        meta: { fechaValidacion: timestamp }
      };
    }
    return paneles.cultivos[timestamp][panelKey];
  }

  function getMolecularPanel(timestamp, estudioKey) {
  if (!paneles.moleculares[timestamp]) paneles.moleculares[timestamp] = {};
  if (!paneles.moleculares[timestamp][estudioKey]) {
    paneles.moleculares[timestamp][estudioKey] = {
      estudio: estudioKey,
      tipoMuestra: null,
      resultados: {},
      meta: { fechaValidacion: timestamp }
    };
  }
  return paneles.moleculares[timestamp][estudioKey];
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
        const baseKey = normalizarClaveEstudio(estudioRaw) || estudioUp;
        let panelKey = resolveCultivoKey(timestamp, baseKey);
        let panel = getCultivoPanel(timestamp, panelKey, baseKey);

        // Resultado global: normalmente la prueba igual al estudio
        if (pruebaUp === normTxt(baseKey) || pruebaUp === estudioUp) {
          // Puede ser vacío (negativo/no informado) — igual se guarda
          panel.resultadoGlobal = (valor != null) ? String(valor).trim() : panel.resultadoGlobal;
        } else if (esPruebaTipoMuestra(pruebaUp)) {
          const tmRaw = (valor != null) ? String(valor).trim() : "";
          const desiredKey = buildCultivoPanelKey(baseKey, tmRaw);
          if (desiredKey !== panelKey) {
            // Migrar panel si existía bajo baseKey / panelKey antiguo
            if (!paneles.cultivos[timestamp][desiredKey]) {
              paneles.cultivos[timestamp][desiredKey] = panel;
              delete paneles.cultivos[timestamp][panelKey];
            }
            panelKey = desiredKey;
            panel = paneles.cultivos[timestamp][panelKey];
            panel.estudio = panelKey;
          }
          panel.tipoMuestra = tmRaw || panel.tipoMuestra;
          panel.displayName = buildCultivoDisplayName(baseKey, panel.tipoMuestra);
        } else if (esPruebaGram(pruebaUp)) {
          const gRaw = (valor != null) ? String(valor).trim() : "";
          panel.gramRaw = gRaw || panel.gramRaw;
          if (C && typeof C.parseGramObservaciones === "function") {
            const obs = C.parseGramObservaciones(gRaw);
            panel.gramObs = obs && obs.length ? obs : null;
          }
          // compatibilidad: panel.gram como texto si no hay parser
          panel.gram = panel.gramObs || panel.gramRaw || panel.gram;
        } else if (esPruebaComentario(pruebaUp)) {
          const txt = (valor != null) ? String(valor).trim() : "";
          if (txt) panel.comentarios.push(txt);
          if (!panel.refAntibiograma && C && typeof C.parseReferenciaAntibiograma === "function") {
            const ref = C.parseReferenciaAntibiograma(txt);
            if (ref) panel.refAntibiograma = ref;
          }
        } else if (C && typeof C.isAisladoPrueba === "function" && C.isAisladoPrueba(pruebaRaw)) {
          const parsed = (typeof C.parseAislado === "function") ? C.parseAislado(valor) : { microorganismo: null, recuento: null, antibioticos: [] };
          const nota = String(r.nota ?? r.Nota ?? "").trim();
          panel.aislados.push({
            label: String(pruebaRaw).replace(/\s+/g, " ").trim(),
            nota: nota || null,
            ...parsed
          });
        }

        // Fila única del estudio de cultivo (nombre amigable si aplica)
        const rowKey = panel.displayName || panelKey;
        if (!filas[rowKey]) filas[rowKey] = {};
        filas[rowKey][timestamp] = construirMarkerCultivo(panelKey);

        // No seguir al flujo normal
        return;
      }

      // ===== PANELES MOLECULARES (modal) =====
      if (esEstudioMolecular(estudioUp)) {
        const estudioKey = normalizarClaveEstudio(estudioRaw) || estudioUp;
        const panel = getMolecularPanel(timestamp, estudioKey);

        if (esPruebaTipoMuestra(pruebaUp)) {
          panel.tipoMuestra = String(valor || "").trim() || panel.tipoMuestra;
        } else if (pruebaUp !== estudioUp) {
          panel.resultados[String(pruebaRaw).trim()] = normalizarResultadoMolecular(valor);
        }

        if (!filas[estudioKey]) filas[estudioKey] = {};
        filas[estudioKey][timestamp] = construirMarkerMolecular(estudioKey);

        return;
      }

      // ===== PCR SARS COV-2 (fila simple) =====
      if (estudioUp === ESTUDIO_PCR_SARS) {
        if (esPruebaTipoMuestra(pruebaUp)) return;

        if (pruebaUp.includes("SARS")) {
          const examen = "SARS COV-2";
          if (!filas[examen]) filas[examen] = {};
          filas[examen][timestamp] = normalizarResultadoMolecular(valor);
        }

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
      if (SET_GASES_CON_ETIQUETA.has(examen)){
        if (estudioGas.includes("ARTERIAL")) examen += "_A";
        else if (estudioGas.includes("VENOS")) examen += "_V";
      }

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

  const molecularesKeys = Object.keys(filas)
  .filter(k => esEstudioMolecular(normTxt(k)));
  molecularesKeys.sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
  filasEspeciales.push(...molecularesKeys.filter(k => !ordenBaseFilas.includes(k) && !examenesExtra.has(k)));

  const ordenFinalFilas = [];
  const usados = new Set();

  for (const ex of ordenBaseFilas) {
    if (SET_GASES_CON_ETIQUETA.has(ex)) {
      const a = `${ex}_A`;
      const v = `${ex}_V`;

      if (filas[a]) {
        ordenFinalFilas.push(a);
        usados.add(a);
      }
      if (filas[v]) {
        ordenFinalFilas.push(v);
        usados.add(v);
      }
      
      // si no hubo A/V pero existe la fila base, se conserva
      if (!filas[a] && !filas[v] && filas[ex]) {
        ordenFinalFilas.push(ex);
        usados.add(ex);
      }

      continue;
    }

    if (filas[ex]) {
      ordenFinalFilas.push(ex);
      usados.add(ex);
    }
  }


return {
    paciente,
    columnas: columnas.map(c => ({ hash: c.hash, orden: c.orden, timestamp: c.timestamp })),
    filas,
    ordenFilas: [...ordenFinalFilas, ...Array.from(examenesExtra), ...filasEspeciales],
    paneles
};

}