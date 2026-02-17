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
      if (chrome.runtime.lastError) {
        console.error("sendMessage failed:", chrome.runtime.lastError.message);
        alert(
          "No pude conectar con la página para extraer.\n" +
            "Sugerencias: recarga la pestaña del HIS (F5) después de recargar la extensión y revisa Site access.\n\n" +
            "Detalle: " + chrome.runtime.lastError.message
        );
        return;
      }

      if (!response || !response.ok) {
        alert("Error al extraer orden");
        return;
      }

      const contexto = response.contexto;
      guardar(contexto);

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
    const ingresado = prompt("Ingrese RUT del paciente (ej: 28364311-5):", rut || "");
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

// ===== Botón: Ver almacenamiento =====
document.getElementById("btnVerStorage").addEventListener("click", () => {
  const pre = document.getElementById("storageView");

  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("UCI_") && k !== KEY_RUT_ACTUAL) keys.push(k);
  }
  keys.sort();

  const lines = [];
  lines.push(`Pacientes almacenados: ${keys.length}`);
  lines.push("");

  keys.forEach((k) => {
    try {
      const data = JSON.parse(localStorage.getItem(k) || "null");
      const rut = data?.paciente?.rut || k.replace(/^UCI_/, "");
      const nombre = data?.paciente?.nombre || "(sin nombre)";
      const nOrdenes = data?.ordenes ? Object.keys(data.ordenes).length : 0;
      lines.push(`${rut} — ${nombre} — ordenes: ${nOrdenes}`);
    } catch {
      lines.push(`${k} — (no parseable)`);
    }
  });

  pre.textContent = lines.join("\n");
  pre.style.display = pre.style.display === "none" ? "block" : "none";
});

// ===== Botón: Borrar paciente =====
document.getElementById("btnBorrarPaciente").addEventListener("click", () => {
  const rutDefault = localStorage.getItem(KEY_RUT_ACTUAL) || "";
  const rut = prompt("RUT del paciente a borrar (ej: 28364311-5):", rutDefault);
  if (!rut) return;

  if (!confirm(`¿Borrar todos los datos almacenados para ${rut}?`)) return;

  try {
    limpiar(rut);
    if (localStorage.getItem(KEY_RUT_ACTUAL) === rut) {
      localStorage.removeItem(KEY_RUT_ACTUAL);
    }
    alert(`Paciente ${rut} eliminado.`);
  } catch (err) {
    console.error(err);
    alert(`Error borrando paciente: ${err?.message || err}`);
  }
});
