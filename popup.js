/*
UCI Lab Navegador
Copyright (C) 2026 Juan Sepúlveda Sepúlveda

Licensed under the GNU General Public License v3.0
*/

// popup.js

const $ = (id) => document.getElementById(id);

// UI refs
const elNombre = $("pacienteNombre");
const elRut = $("pacienteRut");
const elOrdenes = $("pacienteOrdenes");
const elStatus = $("status");

const btnExtraer = $("btnExtraer");
const btnExportar = $("btnExportar");
const btnExportarJSON = $("btnExportarJSON");
const btnImportarJSON = $("btnImportarJSON");
const fileImportJSON = $("fileImportJSON");
const btnExportarBackupGlobal = $("btnExportarBackupGlobal");
const btnImportarBackupGlobal = $("btnImportarBackupGlobal");
const fileImportBackupGlobal = $("fileImportBackupGlobal");
const btnVer = $("btnVer");
const btnAyuda = $("btnAyuda");
const helpModal = $("helpModal");
const helpBackdrop = $("helpBackdrop");
const btnCerrarAyuda = $("btnCerrarAyuda");


function setBusy(isBusy) {
  if (btnExtraer) btnExtraer.disabled = isBusy;
  if (btnExportar) btnExportar.disabled = isBusy;
  if (btnExportarJSON) btnExportarJSON.disabled = isBusy;
  if (btnImportarJSON) btnImportarJSON.disabled = isBusy;
  if (btnExportarBackupGlobal) btnExportarBackupGlobal.disabled = isBusy;
  if (btnImportarBackupGlobal) btnImportarBackupGlobal.disabled = isBusy;
  // btnVer depende de si existe rut válido
}

function aplicarVersionApp() {
  const el = document.getElementById("appVersion");
  if (!el) return;

  try {
    const version = chrome?.runtime?.getManifest?.()?.version || "";
    el.textContent = version ? `v${version}` : "";
  } catch {
    el.textContent = "";
  }
}

aplicarVersionApp();

function setVerEnabled(rut) {
  if (!btnVer) return;
  const ok = !!(rut && String(rut).trim());
  btnVer.disabled = !ok;
  btnVer.title = ok ? "" : "Primero extrae o selecciona un paciente (RUT).";
}

function abrirViewer(rut) {
  const r = (rut || "").trim();
  if (!r) return;

  const url = chrome.runtime.getURL(`viewer.html?rut=${encodeURIComponent(r)}`);
  chrome.tabs.create({ url });
}

function showStatus(message, kind = "success", ms = 3000) {
  if (!elStatus) return;

  elStatus.textContent = message || "";
  elStatus.classList.remove("success", "error", "warn");
  if (kind) elStatus.classList.add(kind);

  if (ms && message) {
    window.clearTimeout(showStatus._t);
    showStatus._t = window.setTimeout(() => {
      elStatus.textContent = "";
      elStatus.classList.remove("success", "error", "warn");
    }, ms);
  }
}

function abrirAyuda() {
  if (!helpModal) return;
  helpModal.classList.remove("hidden");
  helpModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function cerrarAyuda() {
  if (!helpModal) return;
  helpModal.classList.add("hidden");
  helpModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function renderPacienteVacio() {
  if (elNombre) elNombre.textContent = "—";
  if (elRut) elRut.textContent = "RUT: —";
  if (elOrdenes) elOrdenes.textContent = "Órdenes: —";
}

function renderPacienteDesdeData(data, rutFallback = "") {
  const nombre = data?.paciente?.nombre || "—";
  const rut = data?.paciente?.rut || rutFallback || "—";
  const total = data?.ordenes ? Object.keys(data.ordenes).length : 0;

  if (elNombre) elNombre.textContent = nombre;
  if (elRut) elRut.textContent = `RUT: ${rut}`;
  if (elOrdenes) elOrdenes.textContent = `Órdenes: ${total}`;
}

async function refrescarPacienteDesdeRut(rut) {
  const r = (rut || "").trim();
  if (!r) {
    renderPacienteVacio();
    return;
  }

  try {
    const data = await obtener(r);
    if (!data) {
      if (elNombre) elNombre.textContent = "—";
      if (elRut) elRut.textContent = `RUT: ${r}`;
      if (elOrdenes) elOrdenes.textContent = "Órdenes: 0";
      return;
    }

    renderPacienteDesdeData(data, r);
  } catch (e) {
    console.warn("No se pudo leer paciente desde storage:", e);
    renderPacienteVacio();
  }
}

async function exportarBackupGlobalManual() {
  setBusy(true);

  try {
    const payload = await construirBackupGlobal();

    const fecha = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    descargarJSON(`UCI_Backup_Global_${fecha}.json`, payload);

    setBusy(false);
    showStatus("✔ Respaldo global exportado.", "success", 4000);
  } catch (e) {
    console.error("Error exportando respaldo global:", e);
    setBusy(false);
    showStatus("Error al exportar respaldo global.", "error");
    alert(`Error al exportar respaldo global.\n${e?.message || e}`);
  }
}

async function importarBackupGlobalDesdeArchivo(file) {
  if (!file) return;

  setBusy(true);

  try {
    const contenido = await leerArchivoComoTexto(file);
    const payload = JSON.parse(contenido);

    const res = await importarBackupGlobal(payload, {
      merge: false,
      restaurarRutActual: true
    });

    const rut = await obtenerRutActual();
    await refrescarPacienteDesdeRut(rut);
    setVerEnabled(rut);

    setBusy(false);
    showStatus(
      `✔ Respaldo global importado (${res.totalPacientes} pacientes).`,
      "success",
      5000
    );
  } catch (e) {
    console.error("Error importando respaldo global:", e);
    setBusy(false);
    showStatus("Error al importar respaldo global.", "error");
    alert(`Error al importar respaldo global.\n${e?.message || e}`);
  } finally {
    if (fileImportBackupGlobal) fileImportBackupGlobal.value = "";
  }
}

async function intentarAutoRestore() {
  try {
    const res = await restaurarBackupAutomaticoSiCorresponde();

    if (res?.restored) {
      showStatus(
        `✔ Respaldo automático restaurado (${res.totalPacientes} pacientes).`,
        "success",
        5000
      );
    }

    return res;
  } catch (e) {
    console.warn("No se pudo evaluar restauración automática:", e);
    return { restored: false, reason: "restore_error" };
  }
}

/**
 * Upsert hash-based:
 * data = { paciente, ordenes: { [hash]: {hash, orden, ordenOriginal, timestamp, fechaExtraccion, registros } } }
 */
async function upsertOrdenDesdeContexto(contexto) {
  const paciente = contexto?.paciente;
  const rut = (paciente?.rut || "").trim();
  if (!rut) throw new Error("Contexto sin RUT.");

  const hash = String(contexto?.hash || "").trim();
  if (!hash) throw new Error("Contexto sin hash (ID estable).");

  const orden = (contexto?.orden != null) ? String(contexto.orden).trim() : "";
  const ordenOriginal = (contexto?.ordenOriginal != null) ? String(contexto.ordenOriginal).trim() : "";
  const timestamp = (contexto?.timestamp != null) ? String(contexto.timestamp).trim() : null;

  const registros = Array.isArray(contexto?.registros) ? contexto.registros : [];
  if (!registros.length) throw new Error("Orden sin registros.");

  const actual = (await obtener(rut)) || {
    paciente,
    ordenes: {},
    schemaVersion: STORAGE_SCHEMA_VERSION
  };

  actual.paciente = paciente || actual.paciente || { rut, nombre: "" };
  if (!actual.ordenes) actual.ordenes = {};
  if (!actual.schemaVersion) actual.schemaVersion = STORAGE_SCHEMA_VERSION;

  actual.ordenes[hash] = {
    hash,
    orden: orden || undefined,
    ordenOriginal: ordenOriginal || undefined,
    timestamp: timestamp || undefined,
    fechaExtraccion: new Date().toISOString(),
    registros
  };

  await guardar(rut, actual);
  await guardarRutActual(rut);
  setVerEnabled(rut);

  return { rut, totalOrdenes: Object.keys(actual.ordenes).length };
}

async function extraerOrdenActiva() {
  setBusy(true);
  showStatus("Extrayendo orden…", "warn", 0);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs?.[0];
    if (!tab?.id) {
      setBusy(false);
      showStatus("No se pudo acceder a la pestaña activa.", "error");
      alert("Error: no se pudo acceder a la pestaña activa.");
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: "extraerOrden" }, async (response) => {
      const lastErr = chrome.runtime?.lastError;
      if (lastErr) {
        setBusy(false);
        console.warn("sendMessage error:", lastErr.message);
        showStatus("No se pudo extraer (página no compatible o sin informe abierto).", "error");
        alert("No se pudo extraer la orden.\nVerifica que estás en el HIS y con el informe abierto.");
        return;
      }

      if (!response || !response.ok) {
        setBusy(false);
        showStatus("No se pudo extraer la orden.", "error");
        alert("Error al extraer orden");
        return;
      }

      const contexto = response.contexto;

      try {
        const { rut, totalOrdenes } = await upsertOrdenDesdeContexto(contexto);
        await refrescarPacienteDesdeRut(rut);

        setBusy(false);
        showStatus(`✔ Orden guardada. Total: ${totalOrdenes}`, "success");
      } catch (e) {
        console.error("Error guardando orden:", e);
        setBusy(false);
        showStatus("Error al guardar la orden.", "error");
        alert(`Error: no se pudo guardar la orden.\n${e?.message || e}`);
      }
    });
  });
}

async function exportarCSV() {
  setBusy(true);

  try {
    let rut = await obtenerRutActual();

    if (!rut) {
      setBusy(false);
      showStatus("Ingresa el RUT del paciente para exportar.", "warn");
      rut = prompt("Ingrese RUT del paciente (ej: 28364311-5):");
      if (!rut) return;
      rut = rut.trim();
      await guardarRutActual(rut);
      setBusy(true);
    }

    await exportarPacienteCSV(rut);

    await refrescarPacienteDesdeRut(rut);
    setBusy(false);
    showStatus("✔ CSV generado.", "success");
  } catch (e) {
    console.error("Error exportando CSV:", e);
    setBusy(false);
    showStatus("Error al exportar CSV.", "error");
    alert("Error al exportar CSV");
  }
}

async function exportarJSON() {
  setBusy(true);

  try {
    let rut = await obtenerRutActual();

    if (!rut) {
      setBusy(false);
      showStatus("No hay paciente seleccionado para exportar.", "warn");
      alert("No hay paciente seleccionado para exportar.");
      return;
    }

    await exportarPacienteJSON(rut);

    await refrescarPacienteDesdeRut(rut);
    setBusy(false);
    showStatus("✔ JSON generado.", "success");
  } catch (e) {
    console.error("Error exportando JSON:", e);
    setBusy(false);
    showStatus("Error al exportar JSON.", "error");
    alert(`Error al exportar JSON.\n${e?.message || e}`);
  }
}

function leerArchivoComoTexto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));

    reader.readAsText(file, "utf-8");
  });
}

async function importarJSONDesdeArchivo(file) {
  if (!file) return;

  setBusy(true);

  try {
    const contenido = await leerArchivoComoTexto(file);
    const payload = JSON.parse(contenido);
    const { rut, data } = validarBackupPacienteJSON(payload);

    await guardar(rut, data);
    await guardarRutActual(rut);

    await refrescarPacienteDesdeRut(rut);
    setVerEnabled(rut);

    setBusy(false);
    showStatus(`✔ JSON importado para ${rut}.`, "success", 4000);
  } catch (e) {
    console.error("Error importando JSON:", e);
    setBusy(false);
    showStatus("Error al importar JSON.", "error");
    alert(`Error al importar JSON.\n${e?.message || e}`);
  } finally {
    if (fileImportJSON) fileImportJSON.value = "";
  }
}

// ==== Init ====
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await intentarAutoRestore();

    const rut = await obtenerRutActual();
    await refrescarPacienteDesdeRut(rut);
    setVerEnabled(rut);
  } catch (e) {
    console.warn("No se pudo inicializar cabecera del popup:", e);
    renderPacienteVacio();
  }

  btnVer?.addEventListener("click", async () => {
    const r = await obtenerRutActual();
    if (!r) {
      alert("No hay paciente seleccionado. Extrae una orden primero.");
      return;
    }
    abrirViewer(r);
  });

  btnExtraer?.addEventListener("click", () => {
    if (btnExtraer.disabled) return;
    extraerOrdenActiva();
  });

  btnExportar?.addEventListener("click", () => {
    if (btnExportar.disabled) return;
    exportarCSV();
  });

  btnExportarJSON?.addEventListener("click", () => {
    if (btnExportarJSON.disabled) return;
    exportarJSON();
  });

  btnImportarJSON?.addEventListener("click", () => {
    if (btnImportarJSON.disabled) return;
    fileImportJSON?.click();
  });

  fileImportJSON?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importarJSONDesdeArchivo(file);
  });

  btnExportarBackupGlobal?.addEventListener("click", () => {
    if (btnExportarBackupGlobal.disabled) return;
    exportarBackupGlobalManual();
  });

  btnImportarBackupGlobal?.addEventListener("click", () => {
    if (btnImportarBackupGlobal.disabled) return;
    fileImportBackupGlobal?.click();
  });

  fileImportBackupGlobal?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importarBackupGlobalDesdeArchivo(file);
  });

  btnAyuda?.addEventListener("click", () => {
    abrirAyuda();
  });

  btnCerrarAyuda?.addEventListener("click", () => {
    cerrarAyuda();
  });

  helpBackdrop?.addEventListener("click", () => {
    cerrarAyuda();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && helpModal && !helpModal.classList.contains("hidden")) {
      cerrarAyuda();
    }
  });

});