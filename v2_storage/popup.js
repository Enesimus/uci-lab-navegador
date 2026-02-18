// popup.js
// MV3, almacenamiento SOLO en chrome.storage.local (vía storage.js async)

function setBotonExtraerEstado(cargando) {
  const btn = document.getElementById("btnExtraer");
  if (!btn) return;

  if (cargando) {
    btn.disabled = true;
    btn.classList.add("loading");
  } else {
    btn.disabled = false;
    btn.classList.remove("loading");
  }
}

// Toast no bloqueante
function mostrarToast(mensaje, tipo = "success", duracion = 3500) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = mensaje;
  toast.className = "toast"; // reset

  if (tipo === "error") toast.classList.add("error");

  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("show"), 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("hidden"), 250);
  }, duracion);
}

// Badge Órdenes
function actualizarBadgeOrdenes(total) {
  const badge = document.getElementById("badgeOrdenes");
  if (!badge) return;

  badge.textContent = `Órdenes: ${total}`;

  if (typeof total === "number" && total > 0) badge.classList.remove("hidden");
  else badge.classList.add("hidden");
}

// Helpers Promises para chrome.tabs.*
function tabsQuery(queryInfo) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query(queryInfo, (tabs) => {
      const err = chrome.runtime.lastError;
      if (err) return reject(err);
      resolve(tabs);
    });
  });
}

function tabsSendMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const err = chrome.runtime.lastError;
      if (err) return reject(err);
      resolve(response);
    });
  });
}

// Habilita/deshabilita botón Viewer según haya rut actual
async function actualizarEstadoViewer() {
  const btn = document.getElementById("btnVerHTML");
  if (!btn) return;

  const rut = await obtenerRutActual();
  btn.disabled = !rut;
}

// Mini info del paciente actual (si existe el elemento)
async function actualizarInfoPaciente() {
  const el = document.getElementById("infoPacientePopup");
  if (!el) return;

  const rut = await obtenerRutActual();
  if (!rut) {
    el.classList.add("hidden");
    el.textContent = "";
    return;
  }

  const data = await obtener(rut);
  const nombre = data?.paciente?.nombre;
  const rutData = data?.paciente?.rut || rut;

  if (!nombre) {
    el.classList.add("hidden");
    el.textContent = "";
    return;
  }

  el.textContent = `${nombre} — ${rutData}`;
  el.classList.remove("hidden");
}

// Recalcula badge desde storage (seguro para reusar)
async function refrescarBadgeDesdeRutActual() {
  const rut = await obtenerRutActual();
  if (!rut) {
    actualizarBadgeOrdenes(0);
    return;
  }
  const data = await obtener(rut);
  const total = Object.keys(data?.ordenes || {}).length;
  actualizarBadgeOrdenes(total);
}

// ====== LISTENERS ======

document.getElementById("btnExtraer").addEventListener("click", async () => {
  const inicio = Date.now();
  setBotonExtraerEstado(true);

  try {
    const tabs = await tabsQuery({ active: true, currentWindow: true });
    const tab = tabs?.[0];
    if (!tab?.id) {
      mostrarToast("No se pudo detectar la pestaña activa.", "error");
      return;
    }

    const response = await tabsSendMessage(tab.id, { action: "extraerOrden" });
    if (!response || !response.ok) {
      mostrarToast("Error al extraer orden.", "error");
      return;
    }

    const contexto = response.contexto;

    const rut = contexto?.paciente?.rut;

    const hash = contexto?.hash;
    const orden = contexto?.orden; // se mantiene por compatibilidad/visualización
    const ordenOriginal = contexto?.ordenOriginal || "";
    const timestamp = contexto?.timestamp || null;
    const registros = contexto?.registros;

    if (!rut || !orden || !hash) {
      mostrarToast("Datos incompletos: falta RUT / orden / hash.", "error");
      return;
    }
    if (!Array.isArray(registros) || registros.length === 0) {
      mostrarToast("Orden sin registros (vacía).", "error");
      return;
    }

    // 1) Cargar datos existentes
    let data = await obtener(rut);
    if (!data) {
      data = { paciente: contexto.paciente, ordenes: {} };
    } else {
      data.paciente = contexto.paciente || data.paciente;
      data.ordenes = data.ordenes || {};
    }

    const yaExistia = !!data.ordenes[hash];

    // 2) Guardar/Reemplazar orden completa (key = hash)
    data.ordenes[hash] = {
      hash,
      ordenOriginal,
      orden,
      timestamp,
      fechaExtraccion: new Date().toISOString(),
      registros
    };

    // 3) Persistir y setear rut actual
    await guardar(rut, data);
    await guardarRutActual(rut);

    // 4) UI sync
    await refrescarBadgeDesdeRutActual();
    await actualizarEstadoViewer();
    await actualizarInfoPaciente();

    mostrarToast(yaExistia ? "Orden actualizada (reemplazada)." : "Orden guardada correctamente.");
  } catch (err) {
    console.error("Error en extracción/guardado:", err);
    mostrarToast("Error al extraer/guardar", "error");
  } finally {
    const esperaMinima = 1000;
    const delay = Math.max(0, esperaMinima - (Date.now() - inicio));
    setTimeout(() => setBotonExtraerEstado(false), delay);
  }
});

document.getElementById("btnExportar").addEventListener("click", async () => {
  try {
    let rut = await obtenerRutActual();

    if (!rut) {
      rut = prompt("Ingrese RUT del paciente (ej: 28364311-5):");
      if (!rut) return;
      rut = rut.trim();
      if (!rut) return;

      await guardarRutActual(rut);
      await actualizarEstadoViewer();
    }

    await exportarPacienteCSV(rut);
  } catch (err) {
    console.error("Error al exportar:", err);
    mostrarToast("Error al exportar. Revisa consola.", "error");
  }
});

document.getElementById("btnVerHTML").addEventListener("click", async () => {
  try {
    let rut = await obtenerRutActual();

    if (!rut) {
      rut = prompt("Ingrese RUT del paciente:");
      if (!rut) return;
      rut = rut.trim();
      if (!rut) return;

      await guardarRutActual(rut);
      await actualizarEstadoViewer();
      await actualizarInfoPaciente();
      await refrescarBadgeDesdeRutActual();
    }

    const url = chrome.runtime.getURL(`viewer.html?rut=${encodeURIComponent(rut)}`);
    chrome.tabs.create({ url });
  } catch (err) {
    console.error("Error al abrir viewer:", err);
    mostrarToast("No se pudo abrir la vista HTML", "error");
  }
});

// Init único
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await refrescarBadgeDesdeRutActual();
    await actualizarEstadoViewer();
    await actualizarInfoPaciente();
  } catch (e) {
    console.warn("No se pudo inicializar popup:", e);
  }
});
