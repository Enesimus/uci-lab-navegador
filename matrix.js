/*
UCI Lab Navegador
Copyright (C) 2026 Juan Sepúlveda Sepúlveda

Licensed under the GNU General Public License v3.0
*/

// matrix.js

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
const CITOQUIMICO_LCR_ESTUDIO = "CITOQUIMICO LCR";
const ORINA_HIDE_NOOBS = new Set([
  "BACTERIAS",
  "PLACAS DE PUS",
  "CRISTALES",
  "CRISTALES.",
  "CILINDROS",
  "OTROS ELEMENTOS"
]);

const CITO_LCR_CELULAR = new Set([
  "LEUCOCITOS",
  "POLINUCLEARES",
  "MONONUCLEARES"
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
  "PANEL PCR MENINGITIS",
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

function contieneDetectadoMolecular(valor) {
  const t = String(valor || "").trim().toUpperCase();
  return t === "DETECTADO" || t === "POSITIVO";
}

function resumirAntibioticos(antibioticos = [], max = 3) {
  return (antibioticos || [])
    .filter(x => x && x.antibiotico && (x.interp || x.raw))
    .slice(0, max)
    .map(x => `${x.antibiotico} ${x.interp || x.raw}`)
    .join(", ");
}

function resumirCultivo(panel) {
  if (!panel) return "NEGATIVO";

  const aislados = Array.isArray(panel.aislados) ? panel.aislados : [];
  if (aislados.length) {
    const partes = aislados.map((a) => {
      const trozos = [];

      if (a?.microorganismo) trozos.push(a.microorganismo);
      if (a?.recuento) trozos.push(a.recuento);

      const atb = resumirAntibioticos(a?.antibioticos || []);
      if (atb) trozos.push(atb);

      return trozos.join("; ");
    }).filter(Boolean);

    if (partes.length) return partes.join(" | ");
  }

  const global = String(panel.resultadoGlobal || "").trim();
  if (!global) return "NEGATIVO";

  const g = global.toUpperCase();
  if (
    g === "NO DESARROLLO" ||
    g === "NEGATIVO" ||
    g === "NO SE OBSERVA DESARROLLO" ||
    g === "SIN DESARROLLO"
  ) {
    return "NEGATIVO";
  }

  return global;
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
    citoquimicos: {},
    cultivos: {},
    moleculares: {},
    hemogramas: {}
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

  function construirMarkerCitoquimico(estudioKey) {
  return `__CITOQUIMICO_MODAL__::${estudioKey}`;
}

function getCitoquimicoPanel(timestamp, estudioKey) {
  if (!paneles.citoquimicos[timestamp]) paneles.citoquimicos[timestamp] = {};
  if (!paneles.citoquimicos[timestamp][estudioKey]) {
    paneles.citoquimicos[timestamp][estudioKey] = {
      estudio: estudioKey,
      fisico: {},
      celular: {},
      meta: { fechaValidacion: timestamp }
    };
  }
  return paneles.citoquimicos[timestamp][estudioKey];
}

  function construirMarkerHemograma(estudioKey = "FORMULA MANUAL") {
  return `__HEMOGRAMA_MODAL__::${estudioKey}`;
}

function esPruebaHemogramaManual(pruebaUpper) {
  const p = String(pruebaUpper || "").trim().toUpperCase();
  return (
    p === "MORFOLOGIA" ||
    p === "FORMULA MANUAL" ||
    p.endsWith(" MANUAL")
  );
}

function getHemogramaPanel(timestamp, estudioKey = "FORMULA MANUAL") {
  if (!paneles.hemogramas[timestamp]) paneles.hemogramas[timestamp] = {};
  if (!paneles.hemogramas[timestamp][estudioKey]) {
    paneles.hemogramas[timestamp][estudioKey] = {
      estudio: estudioKey,
      morfologiaRaw: null,
      morfologia: {},
      formulaManual: false,
      diferencial: {},
      meta: { fechaValidacion: timestamp }
    };
  }
  return paneles.hemogramas[timestamp][estudioKey];
}

function limpiarTextoMorfologia(raw) {
  return String(raw || "")
    .replace(/\u00A0/g, " ")
    .replace(/¬+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMorfologiaHemograma(raw) {
  const texto = limpiarTextoMorfologia(raw);
  if (!texto) return {};

  const out = {};

  const re = /([A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9()%.\s]+?)\s*:\s*([^:]+?)(?=\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9()%.\s]+?\s*:\s*|$)/g;
  let m;

  while ((m = re.exec(texto)) !== null) {
    const clave = String(m[1] || "").replace(/\s+/g, " ").trim();
    const valor = String(m[2] || "").replace(/\s+/g, " ").trim();
    if (clave) out[clave] = valor;
  }

  return out;
}

function nombreDiferencialManual(pruebaRaw) {
  const p = String(pruebaRaw || "").replace(/\s+/g, " ").trim();

  return p
    .replace(/\s+MANUAL$/i, "")
    .replace(/\bBASOFILOS\b/i, "Basófilos")
    .replace(/\bEOSINOFILOS\b/i, "Eosinófilos")
    .replace(/\bLINFOCITOS\b/i, "Linfocitos")
    .replace(/\bMONOCITOS\b/i, "Monocitos")
    .replace(/\bSEGMENTADOS\b/i, "Segmentados")
    .replace(/\bBACILIFORMES\b/i, "Baciliformes")
    .replace(/\bJUVENILES\b/i, "Juveniles")
    .replace(/\bMIELOCITOS\b/i, "Mielocitos")
    .replace(/\bPROMIELOCITOS\b/i, "Promielocitos")
    .replace(/\bBLASTOS\b/i, "Blastos")
    .replace(/\bERITROBLASTOS\b/i, "Eritroblastos");
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

      // ===== CITOQUIMICO LCR (panel) =====
      if (estudioUp === CITOQUIMICO_LCR_ESTUDIO) {
        const estudioKey = CITOQUIMICO_LCR_ESTUDIO;
        const panel = getCitoquimicoPanel(timestamp, estudioKey);

        const target = CITO_LCR_CELULAR.has(pruebaUp)
          ? panel.celular
          : panel.fisico;

        if (!target[pruebaUp]) target[pruebaUp] = [];
        target[pruebaUp].push(valor);

        if (!filas[estudioKey]) filas[estudioKey] = {};
        filas[estudioKey][timestamp] = construirMarkerCitoquimico(estudioKey);

        return;
      }

      // ===== CULTIVOS (panel) =====
      if (esEstudioCultivo(estudioUp)) {
        const baseKey = normalizarClaveEstudio(estudioRaw) || estudioUp;
        let panelKey = resolveCultivoKey(timestamp, baseKey);
        let panel = getCultivoPanel(timestamp, panelKey, baseKey);

        // Resultado global: normalmente la prueba igual al estudio
        if (pruebaUp === normTxt(baseKey) || pruebaUp === estudioUp) {
          panel.resultadoGlobal = (valor != null) ? String(valor).trim() : panel.resultadoGlobal;

        } else if (esPruebaTipoMuestra(pruebaUp)) {
          const tmRaw = (valor != null) ? String(valor).trim() : "";
          const desiredKey = buildCultivoPanelKey(baseKey, tmRaw);

          if (desiredKey !== panelKey) {
            // Migrar panel si existía bajo baseKey / panelKey antiguo
            if (!paneles.cultivos[timestamp][desiredKey]) {
              paneles.cultivos[timestamp][desiredKey] = panel;
            }
            delete paneles.cultivos[timestamp][panelKey];

            // Limpiar fila residual del nombre base
            if (filas[baseKey]?.[timestamp]) {
              delete filas[baseKey][timestamp];
              if (!Object.keys(filas[baseKey]).length) delete filas[baseKey];
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
          panel.gram = panel.gramObs || panel.gramRaw || panel.gram;

        } else if (esPruebaComentario(pruebaUp)) {
          const txt = (valor != null) ? String(valor).trim() : "";
          if (txt) panel.comentarios.push(txt);
          if (!panel.refAntibiograma && C && typeof C.parseReferenciaAntibiograma === "function") {
            const ref = C.parseReferenciaAntibiograma(txt);
            if (ref) panel.refAntibiograma = ref;
          }

        } else if (C && typeof C.isAisladoPrueba === "function" && C.isAisladoPrueba(pruebaRaw)) {
          const parsed = (typeof C.parseAislado === "function")
            ? C.parseAislado(valor)
            : { microorganismo: null, recuento: null, antibioticos: [] };

          const nota = String(r.nota ?? r.Nota ?? "").trim();
          panel.aislados.push({
            label: String(pruebaRaw).replace(/\s+/g, " ").trim(),
            nota: nota || null,
            ...parsed
          });
        }

        const effectivePanelKey = panel.estudio || panelKey;
        const rowKey =
          panel.displayName ||
          buildCultivoDisplayName(baseKey, panel.tipoMuestra) ||
          effectivePanelKey;

        if (!filas[rowKey]) filas[rowKey] = {};
        filas[rowKey][timestamp] = construirMarkerCultivo(effectivePanelKey);

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

      // ===== HEMOGRAMA CON FORMULA MANUAL (modal) =====
      if (esPruebaHemogramaManual(pruebaUp)) {
        const estudioKey = "FORMULA MANUAL";
        const panel = getHemogramaPanel(timestamp, estudioKey);

        if (pruebaUp === "MORFOLOGIA") {
          const raw = String(valor || "").trim();
          panel.morfologiaRaw = raw || panel.morfologiaRaw;
          panel.morfologia = parseMorfologiaHemograma(raw);
        } else if (pruebaUp === "FORMULA MANUAL") {
          const v = String(valor || "").trim().toUpperCase();
          panel.formulaManual = (v === "M" || v === "MANUAL" || v === "SI" || v === "SÍ" || v === "TRUE");
        } else if (pruebaUp.endsWith(" MANUAL")) {
          const nombre = nombreDiferencialManual(pruebaRaw);
          panel.diferencial[nombre] = String(valor ?? "").trim();
          panel.formulaManual = true;
        }

        if (!filas[estudioKey]) filas[estudioKey] = {};
        filas[estudioKey][timestamp] = construirMarkerHemograma(estudioKey);
        examenesExtra.add(estudioKey);

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
  if (filas[CITOQUIMICO_LCR_ESTUDIO]) filasEspeciales.push(CITOQUIMICO_LCR_ESTUDIO);

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

  const extrasOrdenados = Array.from(examenesExtra)
  .filter(ex => ex !== "FORMULA MANUAL")
  .sort((a, b) => String(a).localeCompare(String(b), "es", { numeric: true }));

const ordenFilasFinal = [...ordenFinalFilas];

// Insertar FORMULA MANUAL justo debajo de Plaquetas, si existe
if (filas["FORMULA MANUAL"]) {
  const idxPlaquetas = ordenFilasFinal.indexOf("Plaquetas");
  if (idxPlaquetas >= 0) {
    ordenFilasFinal.splice(idxPlaquetas + 1, 0, "FORMULA MANUAL");
  } else {
    ordenFilasFinal.push("FORMULA MANUAL");
  }
}

ordenFilasFinal.push(...extrasOrdenados);
ordenFilasFinal.push(...filasEspeciales);

return {
  paciente,
  columnas: columnas.map(c => ({ hash: c.hash, orden: c.orden, timestamp: c.timestamp })),
  filas,
  ordenFilas: ordenFilasFinal,
  paneles
};

}

function construirResumenInfecciosoDesdeData(matriz, data) {
  const items = [];

  // 1) Cultivos: reutilizar paneles ya construidos por la vista base
  Object.entries(matriz?.paneles?.cultivos || {}).forEach(([timestamp, bucket]) => {
    Object.entries(bucket || {}).forEach(([estudioKey, panel]) => {
      items.push({
        timestamp,
        fecha: timestamp,
        tipo: "cultivo",
        examen: panel?.displayName || panel?.estudioBase || panel?.estudio || estudioKey,
        resumen: resumirCultivo(panel),
        estudioKey
      });
    });
  });

  // 2) Moleculares + SARS + LCR: leer registros originales sin alterar la matriz base
  const ordenes = Object.values(data?.ordenes || {});
  for (const ord of ordenes) {
    const fechaBase =
      ord?.timestamp ||
      ord?.fechaExtraccion ||
      ord?.fecha ||
      "";

    const regs = Array.isArray(ord?.registros) ? ord.registros : [];

    const bucketMolecular = {};
    const bucketLCR = {};

    for (const r of regs) {
      if (!esResultadoValido(r)) continue;

      const estRaw = String(r?.estudio || r?.Estudio || "").trim();
      const pruebaRaw = String(r?.prueba || r?.Prueba || "").trim();
      const valor = String(r?.valor ?? r?.Resultado ?? r?.resultado ?? "").trim();

      const estUp = estRaw.toUpperCase();
      const pruebaUp = pruebaRaw.toUpperCase();
      const timestamp = r?.fechaValidacion || fechaBase || "";

      if (!timestamp || !estRaw) continue;

      // Paneles moleculares: resumir sólo detectados; si no hay, NEGATIVO
      if (esEstudioMolecular(estUp)) {
        if (!bucketMolecular[timestamp]) bucketMolecular[timestamp] = {};
        if (!bucketMolecular[timestamp][estRaw]) {
          bucketMolecular[timestamp][estRaw] = {};
        }

        if (pruebaUp && pruebaUp !== estUp && !esPruebaTipoMuestra(pruebaUp)) {
          bucketMolecular[timestamp][estRaw][pruebaRaw] = normalizarResultadoMolecular(valor);
        }
        continue;
      }

      // PCR SARS simple
      if (estUp === ESTUDIO_PCR_SARS) {
        if (esPruebaTipoMuestra(pruebaUp)) continue;

        // Evitar duplicados por líneas accesorias
        if (pruebaUp && !pruebaUp.includes("SARS") && pruebaUp !== estUp) continue;

        items.push({
          timestamp,
          fecha: timestamp,
          tipo: "sars",
          examen: "SARS COV-2",
          resumen: contieneDetectadoMolecular(valor) ? "Detectado" : "NEGATIVO"
        });
        continue;
      }

      // Citoquímico LCR resumido
      if (estUp === CITOQUIMICO_LCR_ESTUDIO) {
        if (!bucketLCR[timestamp]) bucketLCR[timestamp] = {};
        if (!bucketLCR[timestamp][estRaw]) bucketLCR[timestamp][estRaw] = {};

        const clave = pruebaUp.replace(/\s+/g, " ").trim();
        if (clave) bucketLCR[timestamp][estRaw][clave] = valor;
      }
    }

    Object.entries(bucketMolecular).forEach(([timestamp, estudios]) => {
      Object.entries(estudios).forEach(([estudio, resultados]) => {
        const detectados = Object.entries(resultados)
          .filter(([, v]) => contieneDetectadoMolecular(v))
          .map(([k]) => k);

        items.push({
          timestamp,
          fecha: timestamp,
          tipo: "molecular",
          examen: estudio,
          resumen: detectados.length ? `Detectado: ${detectados.join(", ")}` : "NEGATIVO"
        });
      });
    });

    Object.entries(bucketLCR).forEach(([timestamp, estudios]) => {
      Object.entries(estudios).forEach(([estudio, vals]) => {
        const partes = [];
        if (vals["LEUCOCITOS"]) partes.push(`Leucocitos ${vals["LEUCOCITOS"]}`);
        if (vals["POLINUCLEARES"]) partes.push(`PMN ${vals["POLINUCLEARES"]}`);
        if (vals["MONONUCLEARES"]) partes.push(`MN ${vals["MONONUCLEARES"]}`);
        if (vals["PROTEINAS"]) partes.push(`Proteínas ${vals["PROTEINAS"]}`);
        if (vals["GLUCOSA"]) partes.push(`Glucosa ${vals["GLUCOSA"]}`);

        if (partes.length) {
          items.push({
            timestamp,
            fecha: timestamp,
            tipo: "citoquimico",
            examen: estudio,
            resumen: partes.join(", ")
          });
        }
      });
    });
  }

  items.sort((a, b) => {
    const fa = new Date(String(a.timestamp).replace(" ", "T"));
    const fb = new Date(String(b.timestamp).replace(" ", "T"));
    return fa - fb;
  });

  return items;
}