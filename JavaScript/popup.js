document.getElementById("btnExtraer").addEventListener("click", () => {

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {

        chrome.tabs.sendMessage(
            tabs[0].id,
            { action: "extraerOrden" },
            (response) => {

                if (!response || !response.ok) {
                    alert("Error al extraer orden");
                    return;
                }

                const contexto = response.contexto;

                // Aquí llamamos a guardar()
                guardar(contexto);

                alert("Orden guardada correctamente");
            }
        );
    });
});

const datos = obtenerPacienteActual(); // desde storage.js

const matrizClinica = construirMatrizClinica(datos);
const matriz = convertirAMatrizBidimensional(matrizClinica);

const csv = generarCSV(matriz);

const nombreArchivo = `UCI_${datos.paciente.rut}_${Date.now()}.csv`;

descargarCSV(nombreArchivo, csv);

exportarPacienteCSV(rutActivo);
