// popup.js

// ===== Captura global de errores en el popup =====
window.addEventListener("error", (e) => {
  console.error("Popup error:", e.error || e.message, e.filename, e.lineno, e.colno);
  alert(`Error: ${e.message}\n${e.filename}:${e.lineno}:${e.colno}`);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled rejection:", e.reason);
  alert(`Promise error: ${String(e.reason)}`);
});

// ===== Helpers =====
function rutValidoBasico(rut) {
  return typeof rut === "string" && rut.includes("-") && rut.length >= 8;
}

function esHttp(url) {
  return typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"));
}

const KEY_RUT_ACTUAL = "UCI_RUT_ACTUAL";

// ===== Botón: Extraer =====
document.getElementById("btnExtraer").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs?.[0];
    if (!tab?.id) {
      alert("No encontré una pestaña activa.");
      return;
    }

    if (!esHttp(tab.url)) {
      alert("Esta extensión solo funciona en pestañas http/https.");
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: "extraerOrden" }, (response) => {
      // Manejar error de mensajería (evita 'Unchecked runtime.lastError')
      if (chrome.runtime.lastError) {
        console.error("sendMessage failed:", chrome.runtime.lastError.message);
        alert(
          "No pude conectar con la página para extraer.\n" +
            "1) Recarga la pestaña del HIS (F5) después de recargar la extensión.\n" +
            "2) Revisa 'Site access' de la extensión.\n\n" +
            "Detalle: " + chrome.runtime.lastError.message
        );
        return;
      }

      if (!response || !response.ok) {
        alert("Error al extraer orden");
        return;
      }

      const contexto = response.contexto;

      // Guardar en storage
      guardar(contexto);

      // Debug
      const data = obtener(contexto.paciente.rut);
      console.log("Ordenes guardadas:", Object.keys(data?.ordenes || {}));

      // Guardar rut “actual”
      if (contexto?.paciente?.rut) {
        localStorage.setItem(KEY_RUT_ACTUAL, contexto.paciente.rut);
      }

      alert("Orden guardada correctamente");
    });
  });
});

// ===== Botón: Exportar =====
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
