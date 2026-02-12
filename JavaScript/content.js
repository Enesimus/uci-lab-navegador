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
    const nombres = celdas[1]?.innerText.trim();
    const apellidoPaterno = celdas[3]?.innerText.trim();
    const apellidoMaterno = celdas[5]?.innerText.trim();

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
    const filas = document.querySelectorAll("tr.grid-row");
    if (filas.length === 0) {
        console.warn("No se encontraron resultados");
        return null;
    }

    let registros = [];

    filas.forEach(fila => {

        const celdas = fila.querySelectorAll("td.grid-cell");
        let registro = {};

        celdas.forEach(celda => {
            const campo = celda.dataset.name;
            if (!campo) return;

            const valor = celda.innerText.trim();
            registro[campo] = valor;
        });

        if (!registro.Prueba || !registro.Resultado || !registro.FechaValidacion)
            return;

        // -----------------------------
        // 4️. Normalización
        // -----------------------------
        const nombreNormalizado = normalizarNombre(registro.Prueba);
        const fechaNormalizada = normalizarFecha(registro.FechaValidacion);

        let valor = registro.Resultado.replace(",", ".");
        valor = isNaN(valor) ? valor : Number(valor);

        registros.push({
            fechaValidacion: fechaNormalizada,
            examen: nombreNormalizado,
            valor: valor,
            unidad: registro.Unidad || "",
            referencia: registro.ValorReferencia || ""
        });
    });

    return {
        paciente,
        orden,
        registros
    };
}

//const contexto = extraerDesdeDOM();
//if (contexto) guardar(contexto);

// 5. Escuchar mensajes
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
