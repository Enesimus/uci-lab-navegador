// content.js
console.log("[UCI Lab Extractor] content.js cargado", chrome.runtime?.id);

function pickResultsTable() {
  const tables = Array.from(document.querySelectorAll("table"));
  for (const t of tables) {
    const headers = Array.from(t.querySelectorAll("thead th")).map(x => x.innerText.trim());
    const has = (s) => headers.includes(s);
    if (has("Prueba") && has("Resultado") && has("Fecha Validación")) return t;
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

  // dd-mm-yyyy HH:MM(:SS)?
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{1,2}:\d{2})(?::(\d{2}))?$/);
  if (!m) return null;

  const dd = m[1], mm = m[2], yyyy = m[3];
  const hhmm = m[4].padStart(5, "0");        // "7:36" -> "07:36"
  const ss = m[5] ? m[5].padStart(2, "0") : null;

  return ss ? `${yyyy}-${mm}-${dd} ${hhmm}:${ss}` : `${yyyy}-${mm}-${dd} ${hhmm}`;
}

// Funcion Hash
async function sha256Hex(input) {
  const s = String(input);

  // Ruta preferida: WebCrypto
  if (globalThis.crypto?.subtle?.digest) {
    const data = new TextEncoder().encode(s);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  // Fallback: FNV-1a 64-bit (BigInt)
  return fnv1a64Hex(s);
}

function fnv1a64Hex(str) {
  // FNV-1a 64-bit
  let hash = 0xcbf29ce484222325n;        // offset basis
  const prime = 0x100000001b3n;

  for (let i = 0; i < str.length; i++) {
    hash ^= BigInt(str.charCodeAt(i));
    hash = (hash * prime) & 0xffffffffffffffffn; // mantener 64-bit
  }

  return hash.toString(16).padStart(16, "0"); // 16 hex chars
}


async function calcularHashOrden({ rut, orden, timestamp, ordenOriginal }) {
  // Usamos rut + orden + timestamp + ordenOriginal para máxima estabilidad
  // Si timestamp es null, igual queda determinístico.
  const payload = JSON.stringify({
    rut: rut || "",
    orden: orden || "",
    timestamp: timestamp || "",
    ordenOriginal: ordenOriginal || ""
  });
  return await sha256Hex(payload);
}


function extraerRegistrosTabla() {
  const table = pickResultsTable();
  if (!table) {
    throw new Error("No encontré la tabla de resultados (Prueba/Resultado/Fecha Validación)");
  }

  const idx = headerIndexMap(table);

  const iPrueba = idx["Prueba"];
  const iResultado = idx["Resultado"];
  const iRef = idx["Valor Referencia"];
  const iFecha = idx["Fecha Validación"];

  const rows = Array.from(table.querySelectorAll("tbody tr"));
  const registros = [];

  for (const tr of rows) {
    const tds = Array.from(tr.querySelectorAll("td"));

    // Validación robusta: requerimos que existan esas celdas
    if (
      iPrueba === undefined || iResultado === undefined || iFecha === undefined ||
      !tds[iPrueba] || !tds[iResultado] || !tds[iFecha]
    ) continue;

    const examen = tds[iPrueba]?.innerText.trim();
    const valorTxt = tds[iResultado]?.innerText.trim();
    const referencia = (iRef !== undefined ? tds[iRef]?.innerText.trim() : "") || "";
    const fechaValidacionRaw = tds[iFecha]?.innerText.trim();

    if (!examen || valorTxt === "") continue;

    const valorNum = Number(valorTxt.replace(",", "."));
    registros.push({
      examen,
      valor: Number.isFinite(valorNum) ? valorNum : valorTxt,
      unidad: null,
      referencia,
      // OJO: aquí dejamos null si no podemos normalizar, para no meter basura
      fechaValidacion: normalizarFechaHora(fechaValidacionRaw) || null
    });
  }

  return registros;
}

// Extrae metadatos desde el título del modal.
// Objetivo: ordenOriginal (texto), orden (número), timestamp (normalizado), hash

function extraerMetadatosOrden(textoTitulo) {
  const ordenOriginal = String(textoTitulo || "").trim();
  const ordenOriginalNorm = ordenOriginal.replace(/\s+/g, " ").trim();

  // Orden n° 12345
  const matchOrden = ordenOriginalNorm.match(/Orden n°\s*(\d+)/i);
  const orden = matchOrden ? matchOrden[1] : null;

  // Timestamp dd-mm-yyyy h:mm(:ss)? en cualquier parte del string
  const matchFecha = ordenOriginalNorm.match(/(\d{2}-\d{2}-\d{4}\s+\d{1,2}:\d{2}(?::\d{2})?)/);
  const timestamp = matchFecha ? (normalizarFechaHora(matchFecha[1]) || null) : null;

  return { ordenOriginal, ordenOriginalNorm, orden, timestamp };
}


async function extraerDesdeDOM() {
  // 1) Paciente
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

  // 2) Orden / metadatos
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

  // 3) Registros
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

  // Contexto “pro”
  return {
    paciente,
    orden: meta.orden,               // compatibilidad
    ordenOriginal: meta.ordenOriginal,
    timestamp: meta.timestamp,       // puede ser null
    hash,                            // ID estable
    registros
  };
}

// Listener
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
    } catch (err) {
      console.error(err);
      sendResponse({ ok: false, mensaje: String(err?.message || err) });
    }
  })();

  return true; // mantiene el canal abierto
});

