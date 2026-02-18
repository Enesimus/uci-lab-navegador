// popup.js

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
}

function esHttp(url) {
  return typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"));
}

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
          "Tip: recarga la pestaña del HIS (F5) después de recargar la extensión.\n\n" +
          "Detalle: " + chrome.runtime.lastError.message
        );
        return;
      }

      (async () => {
        if (!response || !response.ok) {
          alert("Error al extraer orden");
          return;
        }

        const contexto = response.contexto;

        await guardar(contexto);

        if (contexto?.paciente?.rut) {
          await setRutActual(contexto.paciente.rut);
        }

        alert("Orden guardada correctamente");
      })().catch((err) => {
        console.error(err);
        alert(`Error guardando: ${err?.message || err}`);
      });
    });
  });
});

document.getElementById("btnExportar").addEventListener("click", () => {
  (async () => {
    let rut = await getRutActual();

    if (!rutValidoBasico(rut)) {
      rut = prompt("Ingrese RUT del paciente (ej: 28364311-5):", rut || "");
      if (!rut) return;
      await setRutActual(rut);
    }

    await exportarPacienteCSV(rut);
  })().catch((err) => {
    console.error(err);
    alert(`Error exportando: ${err?.message || err}`);
  });
});

// ===== Helpers descarga/lectura =====
function descargarJSON(nombreArchivo, obj) {
  const contenido = JSON.stringify(obj, null, 2);
  const blob = new Blob([contenido], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function nombreBackup() {
  const ahora = new Date();
  const yyyy = ahora.getFullYear();
  const mm = String(ahora.getMonth() + 1).padStart(2, "0");
  const dd = String(ahora.getDate()).padStart(2, "0");
  const hh = String(ahora.getHours()).padStart(2, "0");
  const mi = String(ahora.getMinutes()).padStart(2, "0");
  return `UCI_backup_${yyyy}-${mm}-${dd}_${hh}${mi}.json`;
}

// ===== Botón: Ver almacenamiento =====
document.getElementById("btnVerStorage")?.addEventListener("click", async () => {
  try {
    const pre = document.getElementById("storageView");
    const pacientes = await listarPacientes();

    const lines = [];
    lines.push(`Pacientes almacenados: ${pacientes.length}`);
    lines.push("");

    pacientes.forEach(p => {
      lines.push(`${p.rut} — ${p.nombre} — ordenes: ${p.nOrdenes}`);
    });

    pre.textContent = lines.join("\n");
    pre.style.display = pre.style.display === "none" ? "block" : "none";
  } catch (e) {
    console.error(e);
    alert(`Error mostrando almacenamiento: ${e?.message || e}`);
  }
});

// ===== Botón: Borrar paciente =====
document.getElementById("btnBorrarPaciente")?.addEventListener("click", async () => {
  try {
    const rutDefault = await getRutActual();
    const rut = prompt("RUT del paciente a borrar (ej: 28364311-5):", rutDefault || "");
    if (!rut) return;

    if (!confirm(`¿Borrar todos los datos almacenados para ${rut}?`)) return;

    await limpiar(rut);

    const actual = await getRutActual();
    if (actual === rut) await clearRutActual();

    alert(`Paciente ${rut} eliminado.`);
  } catch (e) {
    console.error(e);
    alert(`Error borrando paciente: ${e?.message || e}`);
  }
});

// ===== Botón: Exportar Backup JSON =====
document.getElementById("btnBackupJSON")?.addEventListener("click", async () => {
  try {
    const backup = await exportarBackupJSONCompleto();
    descargarJSON(nombreBackup(), backup);
  } catch (e) {
    console.error(e);
    alert(`Error exportando backup: ${e?.message || e}`);
  }
});

// ===== Botón: Importar Backup JSON =====
document.getElementById("btnImportJSON")?.addEventListener("click", () => {
  document.getElementById("fileImportJSON")?.click();
});

document.getElementById("fileImportJSON")?.addEventListener("change", async (ev) => {
  const file = ev.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const backup = JSON.parse(text);

    const res = await importarBackupJSON(backup);
    alert(`Backup importado. Items: ${res.importados}`);

    // limpiar selección para poder reimportar el mismo archivo
    ev.target.value = "";
  } catch (e) {
    console.error(e);
    alert(`Error importando backup: ${e?.message || e}`);
  }
});

// ===== Botón: Vista HTML rápida =====
document.getElementById("btnVerHTML")?.addEventListener("click", async () => {
  try {
    const rut = await getRutActual();
    if (!rutValidoBasico(rut)) {
      alert("No hay RUT actual. Exporta o selecciona un paciente primero.");
      return;
    }

    const matrizClinica = await construirMatrizClinica(rut);
    if (!matrizClinica) {
      alert("No hay datos para visualizar.");
      return;
    }

    const { paciente, columnas, filas, ordenFilas } = matrizClinica;

    // HTML simple, con base para “sidebar” después
    const esc = (s) => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

    const thead = `
      <tr>
        <th class="sticky">Examen</th>
        ${columnas.map(c => `<th class="sticky">${esc(c.timestamp)}<div class="sub">${esc(c.orden)}</div></th>`).join("")}
      </tr>
    `;

    const tbody = ordenFilas.map(ex => {
      const tds = columnas.map(c => `<td>${esc(filas[ex]?.[c.timestamp] ?? "")}</td>`).join("");
      return `<tr><td class="rowhdr">${esc(ex)}</td>${tds}</tr>`;
    }).join("");

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>UCI Labs — ${esc(paciente?.rut)} — ${esc(paciente?.nombre)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; }
    .layout { display: grid; grid-template-columns: 260px 1fr; height: 100vh; }
    .side { border-right: 1px solid #ddd; padding: 12px; }
    .main { padding: 12px; overflow: auto; }
    .muted { color: #666; font-size: 12px; }
    table { border-collapse: collapse; width: max-content; min-width: 100%; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; font-size: 12px; }
    th.sticky { position: sticky; top: 0; background: #fff; z-index: 2; }
    td.rowhdr { position: sticky; left: 0; background: #fff; z-index: 1; font-weight: 600; }
    .sub { font-weight: normal; color: #666; font-size: 11px; margin-top: 2px; }
  </style>
</head>
<body>
  <div class="layout">
    <div class="side">
      <div><b>${esc(paciente?.nombre || "")}</b></div>
      <div class="muted">${esc(paciente?.rut || "")}</div>
      <hr />
      <div class="muted">Sidebar (placeholder)</div>
      <div class="muted">Luego podemos poner filtros, búsqueda, selección de pacientes, etc.</div>
    </div>
    <div class="main">
      <table>
        <thead>${thead}</thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    // abrir en pestaña nueva
    chrome.tabs.create({ url });

    // opcional: no revocar inmediato (si revocas muy pronto, a veces corta la carga)
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    console.error(e);
    alert(`Error generando vista HTML: ${e?.message || e}`);
  }
});
