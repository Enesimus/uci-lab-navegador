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

// Muestra alerta de orden de examen agregada en modo toast
function mostrarToast(mensaje, tipo = "success", duracion = 4000) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = mensaje;
  toast.className = "toast"; // reset clases

  if (tipo === "error") {
    toast.classList.add("error");
  }

  toast.classList.remove("hidden");

  // pequeño delay para activar animación
  setTimeout(() => toast.classList.add("show"), 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.classList.add("hidden");
    }, 300);
  }, duracion);
}

// actualizar Badge
function actualizarBadgeOrdenes(total) {
  const badge = document.getElementById("badgeOrdenes");
  if (!badge) return;

  badge.textContent = `Órdenes: ${total}`;

  if (typeof total === "number" && total > 0) {
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

// Helpers para usar chrome.* con Promises (compatibilidad total)
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

document.getElementById("btnExtraer").addEventListener("click", async () => {

  const inicio = Date.now(); // para asegurar mínimo 1 segundo visible
  setBotonExtraerEstado(true);

  try {
    const tabs = await tabsQuery({ active: true, currentWindow: true });
    const tab = tabs?.[0];
    if (!tab?.id) {
      alert("No se pudo detectar la pestaña activa.");
      return;
    }

    const response = await tabsSendMessage(tab.id, { action: "extraerOrden" });

    if (!response || !response.ok) {
      alert("Error al extraer orden.");
      return;
    }

    const contexto = response.contexto;
    const rut = contexto?.paciente?.rut;
    const orden = contexto?.orden;
    const registros = contexto?.registros;

    if (!rut || !orden) {
      alert("Datos incompletos: falta RUT u orden.");
      return;
    }
    if (!Array.isArray(registros) || registros.length === 0) {
      alert("Orden sin registros (vacía).");
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

    // 2) Guardar/Reemplazar orden completa
    data.ordenes[orden] = {
      fechaExtraccion: new Date().toISOString(),
      registros
    };

    // 3) Persistir
    await guardar(rut, data);

    // 3.1 Actualizar Badge al guardar
    function actualizarBadgeOrdenes(total) {
      const badge = document.getElementById("badgeOrdenes");
      if (!badge) return;

      badge.textContent = `Órdenes: ${total}`;

      if (typeof total === "number" && total > 0) {
        badge.classList.remove("hidden");
      } else {
        badge.classList.add("hidden");
      }
    }

    // 4) Guardar rut actual para exportar
    await guardarRutActual(rut);

    mostrarToast("Orden guardada correctamente.");
 
  } catch (err) {
    console.error("Error en extracción/guardado:", err);
    // - Si el content script no está inyectado / no corre en esa página, suele caer acá
    // - Si storage.js no tiene las funciones async esperadas, también
    mostrarToast("Error al extraer/guardar", "error");
  } finally {

    // Asegura mínimo 1 segundo deshabilitado
    const tiempoTranscurrido = Date.now() - inicio;
    const esperaMinima = 1000;

    const delay = Math.max(0, esperaMinima - tiempoTranscurrido);

    setTimeout(() => {
      setBotonExtraerEstado(false);
    }, delay);
  }
});

// Listener boton exportar
document.getElementById("btnExportar").addEventListener("click", async () => {
  try {
    let rut = await obtenerRutActual();

    if (!rut) {
      rut = prompt("Ingrese RUT del paciente (ej: 28364311-5):");
      if (!rut) return;
      rut = rut.trim();
      if (!rut) return;

      await guardarRutActual(rut);
    }

    // exportarPacienteCSV ahora debería ser async (tu export.js nuevo)
    await exportarPacienteCSV(rut);
  } catch (err) {
    console.error("Error al exportar:", err);
    alert("Ocurrió un error al exportar. Revisa la consola.");
  }
});

// Contador de examenes al abrir popup en badge
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const rut = await obtenerRutActual();
    if (!rut) {
      actualizarBadgeOrdenes(0);
      return;
    }
    const data = await obtener(rut);
    const total = Object.keys(data?.ordenes || {}).length;
    actualizarBadgeOrdenes(total);
  } catch (e) {
    console.warn("No se pudo inicializar badge de órdenes:", e);
  }
});
