// popup.js (arriba de todo)
window.addEventListener("error", (e) => {
  console.error("Popup error:", e.error || e.message, e.filename, e.lineno, e.colno);
  alert(`Error: ${e.message}\n${e.filename}:${e.lineno}:${e.colno}`);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled rejection:", e.reason);
  alert(`Promise error: ${String(e.reason)}`);
});

function rutValidoBasico(rut) {
  return typeof rut === "string" && rut.includes("-") && rut.length >= 8;
};

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

                const data = obtener(contexto.paciente.rut);
                console.log("Ordenes guardadas:", Object.keys(data.ordenes));

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
   let rut = localStorage.getItem(KEY_RUT_ACTUAL);

  if (!rutValidoBasico(rut)) {
    const ingresado = prompt("Ingrese RUT del paciente (ej: 28364311-5):");
    if (!ingresado) return;
    rut = ingresado;
    localStorage.setItem(KEY_RUT_ACTUAL, rut);
  }

  try {
    exportarPacienteCSV(rut);
  } catch (err) {
    console.error(err);
    alert(`Error exportando: ${err?.message || err}`);
  }
});