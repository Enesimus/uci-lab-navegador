const KEY_RUT_ACTUAL = "UCI_RUT_ACTUAL";

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

                // Guardar rut “actual” para el botón Exportar
                if (contexto?.paciente?.rut) {
                    localStorage.setItem(KEY_RUT_ACTUAL, contexto.paciente.rut);
                }

                alert("Orden guardada correctamente");
            }
        );
    });
});

document.getElementById("btnExportar").addEventListener("click", () => {
  // Intentar usar el último rut guardado
  let rut = localStorage.getItem(KEY_RUT_ACTUAL);

  // Si no hay, pedirlo
  if (!rut) {
    rut = prompt("Ingrese RUT del paciente (ej: 28364311-5):");
    if (!rut) return;
    localStorage.setItem(KEY_RUT_ACTUAL, rut);
  }

  // Llama a tu función en export.js
  exportarPacienteCSV(rut);
});

//const datos = obtenerPacienteActual(); // desde storage.js
//const matrizClinica = construirMatrizClinica(datos);
//const matriz = convertirAMatrizBidimensional(matrizClinica);
//const csv = generarCSV(matriz);
//const nombreArchivo = `UCI_${datos.paciente.rut}_${Date.now()}.csv`;
//descargarCSV(nombreArchivo, csv);
//exportarPacienteCSV(rutActivo);
