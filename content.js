/*
UCI Lab Navegador
Copyright (C) 2026 Juan Sepúlveda Sepúlveda

Licensed under the GNU General Public License v3.0
*/

// content.js (patched para soportar Estudio/Estado/Nota y resultados vacíos en cultivos)
console.log("[UCI Lab Extractor] content.js cargado", chrome.runtime?.id);

function pickResultsTable() {
  const tables = Array.from(document.querySelectorAll("table"));
  for (const t of tables) {
    const headers = Array.from(t.querySelectorAll("thead th")).map(x => x.innerText.trim());
    const has = (s) => headers.includes(s);

    // Mínimo viable
    if (has("Prueba") && has("Resultado") && has("Fecha Validación")) return t;

    // Algunos LIS pueden omitir "Resultado" o renombrar; si aparece "Valor" y "Fecha Validación" lo consideramos
    if (has("Prueba") && has("Valor") && has("Fecha Validación")) return t;
  }
  return null;
}

function headerIndexMap(table) {
  const headers = Array.from(table.querySelectorAll("thead th")).map(x => x.innerText.trim());
  const map = {};
  headers.forEach((h, i) => (map[h] = i));
  return map;
}

// Normaliza "13-02-2026 7:36:10" o "13-02-2026 7:36" -> "2026-02-13 07:36:10" / "2026-02-13 07:36"
function normalizarFechaHora(fecha) {
  if (!fecha) return null;
  const s = String(fecha).trim();

  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{1,2}:\d{2})(?::(\d{2}))?$/);
  if (!m) return null;

  const dd = m[1], mm = m[2], yyyy = m[3];
  const hhmm = m[4].padStart(5, "0");
  const ss = m[5] ? m[5].padStart(2, "0") : null;

  return ss ? `${yyyy}-${mm}-${dd} ${hhmm}:${ss}` : `${yyyy}-${mm}-${dd} ${hhmm}`;
}

async function sha256Hex(input) {
  const s = String(input);

  if (globalThis.crypto?.subtle?.digest) {
    const data = new TextEncoder().encode(s);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  return fnv1a64Hex(s);
}

function fnv1a64Hex(str) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;

  for (let i = 0; i < str.length; i++) {
    hash ^= BigInt(str.charCodeAt(i));
    hash = (hash * prime) & 0xffffffffffffffffn;
  }

  return hash.toString(16).padStart(16, "0");
}

async function calcularHashOrden({ rut, orden, timestamp, ordenOriginal }) {
  const payload = JSON.stringify({
    rut: rut || "",
    orden: orden || "",
    timestamp: timestamp || "",
    ordenOriginal: ordenOriginal || ""
  });
  return await sha256Hex(payload);
}

function normTxt(s) {
  return String(s || "").trim().toUpperCase();
}

function esEstudioCultivo(estudioUpper) {
  const s = String(estudioUpper || "");
  return s.includes("CULTIVO") || s.includes("HEMOCULTIVO") || s.includes("UROCULTIVO");
}

function extraerRegistrosTabla() {
  const table = pickResultsTable();
  if (!table) {
    throw new Error("No encontré la tabla de resultados (Prueba/Resultado/Fecha Validación)");
  }

  const idx = headerIndexMap(table);

  const iEstudio = idx["Estudio"]; // opcional
  const iPrueba = idx["Prueba"];
  const iResultado = (idx["Resultado"] !== undefined) ? idx["Resultado"] : idx["Valor"]; // fallback
  const iRef = idx["Valor Referencia"]; // opcional
  const iFecha = idx["Fecha Validación"];
  const iEstado = idx["Estado"]; // opcional
  const iNota = idx["Nota"]; // opcional

  const rows = Array.from(table.querySelectorAll("tbody tr"));
  const registros = [];

  for (const tr of rows) {
    const tds = Array.from(tr.querySelectorAll("td"));

    if (iPrueba === undefined || iResultado === undefined || iFecha === undefined) continue;
    if (!tds[iPrueba] || !tds[iResultado] || !tds[iFecha]) continue;

    const estudio = (iEstudio !== undefined && tds[iEstudio]) ? tds[iEstudio].innerText.trim() : "";
    const prueba = tds[iPrueba]?.innerText.trim();
    const valorTxt = tds[iResultado]?.innerText.trim();
    const referencia = (iRef !== undefined && tds[iRef]) ? (tds[iRef]?.innerText.trim() || "") : "";
    const fechaValidacionRaw = tds[iFecha]?.innerText.trim();
    const estado = (iEstado !== undefined && tds[iEstado]) ? tds[iEstado].innerText.trim() : "";
    const nota = (iNota !== undefined && tds[iNota]) ? tds[iNota].innerText.trim() : "";

    if (!prueba) continue;

    // Regla: normalmente no guardamos resultados vacíos.
    // EXCEPCIÓN: cultivos cabecera "DISPONIBLE" con resultado vacío (negativo/no informado)
    const textoVal = String(valorTxt || "").trim();
    const esCabeceraCultivoVacia = textoVal === "" && esEstudioCultivo(normTxt(estudio)) && normTxt(estado).includes("DISPONIBLE") && normTxt(prueba) === normTxt(estudio);
    if (textoVal === "" && !esCabeceraCultivoVacia) continue;

    const valorNum = Number(textoVal.replace(",", "."));
    const valor = (textoVal !== "" && Number.isFinite(valorNum)) ? valorNum : textoVal;

    registros.push({
      // compatibilidad
      examen: prueba,
      valor,
      referencia,
      fechaValidacion: normalizarFechaHora(fechaValidacionRaw) || null,

      // nuevos campos para paneles especiales
      estudio,
      prueba,
      estado,
      nota
    });
  }

  return registros;
}

function extraerMetadatosOrden(textoTitulo) {
  const ordenOriginal = String(textoTitulo || "").trim();
  const ordenOriginalNorm = ordenOriginal.replace(/\s+/g, " ").trim();

  const matchOrden = ordenOriginalNorm.match(/Orden n°\s*(\d+)/i);
  const orden = matchOrden ? matchOrden[1] : null;

  const matchFecha = ordenOriginalNorm.match(/(\d{2}-\d{2}-\d{4}\s+\d{1,2}:\d{2}(?::\d{2})?)/);
  const timestamp = matchFecha ? (normalizarFechaHora(matchFecha[1]) || null) : null;

  return { ordenOriginal, ordenOriginalNorm, orden, timestamp };
}

async function extraerDesdeDOM() {
  const card = document.querySelector("#DatosDemograficos");
  if (!card) {
    console.warn("No se encontró bloque DatosDemograficos");
    return null;
  }

  const celdas = card.querySelectorAll("td");
  const rut = celdas[0]?.textContent.trim();
  const nombres = celdas[2]?.innerText.trim();
  const apellidoPaterno = celdas[4]?.innerText.trim();
  const apellidoMaterno = celdas[6]?.innerText.trim();

  const nombreCompleto = [nombres, apellidoPaterno, apellidoMaterno].filter(Boolean).join(" ");
  const paciente = { rut, nombre: nombreCompleto };

  if (!paciente.rut) {
    console.warn("No se pudo extraer RUT del paciente");
    return null;
  }

  const tituloModal = document.querySelector("#ModalMostrarReporte .modal-title");
  if (!tituloModal) {
    console.warn("No se encontró título del modal de reporte");
    return null;
  }

  const textoTitulo = tituloModal.innerText || "";
  const meta = extraerMetadatosOrden(textoTitulo);

  if (!meta.orden) {
    console.warn("No se pudo extraer número de orden desde:", textoTitulo);
    return null;
  }

  let registros = [];
  try {
    registros = extraerRegistrosTabla();
  } catch (e) {
    console.error(e);
    return null;
  }

  const hash = await calcularHashOrden({
    rut: paciente.rut,
    orden: meta.orden,
    timestamp: meta.timestamp,
    ordenOriginal: meta.ordenOriginalNorm
  });

  return {
    paciente,
    orden: meta.orden,
    ordenOriginal: meta.ordenOriginal,
    timestamp: meta.timestamp,
    hash,
    registros
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== "extraerOrden") return;

  (async () => {
    try {
      const contexto = await extraerDesdeDOM();
      if (!contexto) {
        sendResponse({ ok: false, mensaje: "No se pudo extraer la orden" });
        return;
      }
      sendResponse({ ok: true, contexto });
    } catch (e) {
      console.error(e);
      sendResponse({ ok: false, mensaje: e.message || "Error" });
    }
  })();

  return true;
});
