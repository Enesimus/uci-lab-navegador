// content.js

function extraerDesdeDOM() {

    // -----------------------------
    // 1️. Extraer datos del paciente
    // -----------------------------
    const card = document.querySelector("#DatosDemograficos");
    if (!card) {
        console.warn("No se encontró bloque DatosDemograficos");
        return null;
    }

    const celdas = card.querySelectorAll("td");
    const rut = celdas[0]?.innerText.trim();
    const nombres = celdas[2]?.innerText.trim();
    const apellidoPaterno = celdas[4]?.innerText.trim();
    const apellidoMaterno = celdas[6]?.innerText.trim();

    const nombreCompleto = [nombres, apellidoPaterno, apellidoMaterno]
        .filter(Boolean)
        .join(" ");

    const paciente = { rut, nombre: nombreCompleto };

    // -----------------------------
    // 2️. Extraer número de orden
    // -----------------------------
    const tituloModal = document.querySelector("#ModalMostrarReporte .modal-title");
    if (!tituloModal) {
        console.warn("No se encontró número de orden");
        return null;
    }

    const textoTitulo = tituloModal.innerText;
    const matchOrden = textoTitulo.match(/Orden n°\s*(\d+)/i);
    const orden = matchOrden ? matchOrden[1] : null;

    if (!orden) {
        console.warn("No se pudo extraer número de orden");
        return null;
    }

    // -----------------------------
    // 3️. Extraer tabla de resultados
    // -----------------------------

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
        headers.forEach((h, i) => map[h] = i);
        return map;
    }

    function normalizarFecha(fecha) {
        if (!fecha) return null;
        // "13-02-2026 7:36:10" -> "2026-02-13 07:36:10"
        const m = String(fecha).trim().match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{1,2}:\d{2}:\d{2})$/);
        if (!m) return String(fecha).trim();
        const dd = m[1], mm = m[2], yyyy = m[3];
        const time = m[4].padStart(8, "0"); // si viene "7:36:10" -> "07:36:10"
        return `${yyyy}-${mm}-${dd} ${time}`;
    }

    function extraerRegistrosTabla() {
        const table = pickResultsTable();
        if (!table) throw new Error("No encontré la tabla de resultados (Prueba/Resultado/Fecha Validación)");

        const idx = headerIndexMap(table);

        const iPrueba = idx["Prueba"];
        const iResultado = idx["Resultado"];
        const iRef = idx["Valor Referencia"];
        const iFecha = idx["Fecha Validación"];

        const rows = Array.from(table.querySelectorAll("tbody tr"));
        const registros = [];

        for (const tr of rows) {
            const tds = Array.from(tr.querySelectorAll("td"));
            if (tds.length < 8) continue;

            const examen = tds[iPrueba]?.innerText.trim();
            const valor = tds[iResultado]?.innerText.trim();
            const referencia = tds[iRef]?.innerText.trim();
            const fechaValidacionRaw = tds[iFecha]?.innerText.trim();

            if (!examen || valor === "") continue;
    
            registros.push({
                examen,
                valor: isNaN(Number(valor.replace(",", "."))) ? valor : Number(valor.replace(",", ".")),
                unidad: "", // si existe columna, la mapeamos igual
                referencia: referencia || "",
                fechaValidacion: normalizarFecha(fechaValidacionRaw)
            });
        }

        return registros;
    }
    
//----------------------
// 5. Escuchar mensajes
//----------------------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.action === "extraerOrden") {
        const contexto = extraerDesdeDOM();
        if (!contexto) {
            sendResponse({ ok: false, mensaje: "No se pudo extraer la orden" });
            return;
        }
        sendResponse({ ok: true, contexto: contexto });
        }
    });
};