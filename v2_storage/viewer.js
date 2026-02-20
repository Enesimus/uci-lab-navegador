// viewer.js — tabla (matriz clínica) + filtros básicos
// Requiere: exams.js, storage.js (async), matrix.js (async), export.js

// function formatearFechaClinica(timestamp) {
//   if (!timestamp) return "";

//   // Esperamos formato "YYYY-MM-DD HH:MM(:SS)?"
//   const [fecha, hora] = String(timestamp).split(" ");

//   if (!fecha) return timestamp;

//   const partes = fecha.split("-");
//   if (partes.length !== 3) return timestamp;

//   const [yyyy, mm, dd] = partes;

//   return `${dd}-${mm}-${yyyy}` + (hora ? ` ${hora.slice(0,5)}` : "");
// }

const $ = (id) => document.getElementById(id);

const state = {
  rut: null,
  matriz: null,
  buscar: "",
  ocultarVacios: true,
  mostrarExtras: true
};

function parseRutFromUrl() {
  const params = new URLSearchParams(location.search);
  return params.get("rut");
}

function setEstado(msg, isError = false) {
  const el = $("estado");
  el.textContent = msg || "";
  el.className = "estado" + (isError ? " error" : "");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatearHeader(timestamp, orden) {
  if (!timestamp) return { fecha: "", hora: "", orden: orden || "" };

  const [fechaISO, horaRaw] = String(timestamp).split(" ");
  const hora = (horaRaw || "").slice(0, 5);

  let fecha = "";
  if (fechaISO) {
    const partes = fechaISO.split("-");
    if (partes.length === 3) {
      const meses = ["Ene","Feb","Mar","Abr","May","Jun",
               "Jul","Ago","Sep","Oct","Nov","Dic"];
      const [yyyy, mm, dd] = partes;
      const mIndex = Number(mm) -1;
      const mmm = meses[mIndex] || mm;
      fecha = `${dd}-${mmm}-${yyyy}`;
    } else {
      fecha = fechaISO;
    }
  }

  return {
    fecha,
    hora,
    orden: orden || ""
  };
}


function aplicarFiltros(matriz) {
  if (!matriz) return null;

  const buscar = state.buscar.trim().toLowerCase();
  const base = new Set(Object.values(MAP_EXAMENES));

  const ordenFilas = (matriz.ordenFilas || []).filter((ex) => {
    if (buscar && !String(ex).toLowerCase().includes(buscar)) return false;
    if (!state.mostrarExtras && !base.has(ex)) return false;

    if (state.ocultarVacios) {
      const row = matriz.filas?.[ex] || {};
      const tieneAlgo = (matriz.columnas || []).some((c) => {
        const v = row[c.timestamp];
        return v !== undefined && v !== null && String(v).trim() !== "";
      });
      if (!tieneAlgo) return false;
    }

    return true;
  });

  return { ...matriz, ordenFilas };
}

function renderInfo(data, matriz) {
  if (!data) {
    $("infoPaciente").textContent = "";
    renderPrintHeader(null, null);  
    return;
  }

  const nombre = data.paciente?.nombre || "";
  const rut = data.paciente?.rut || state.rut || "";
  const nOrdenes = Object.keys(data.ordenes || {}).length;

  let rango = "";
  if (matriz?.columnas?.length) {
    const fechas = matriz.columnas.map((c) => c.timestamp).filter(Boolean).sort();
    rango = `${fechas[0]} → ${fechas[fechas.length - 1]}`;
  }

  $("infoPaciente").innerHTML = `
    <span class="chip"><b>${escapeHtml(nombre)}</b></span>
    <span class="chip">RUT: <b>${escapeHtml(rut)}</b></span>
    <span class="chip">Órdenes: <b>${nOrdenes}</b></span>
    <span class="chip">Rango: <b>${escapeHtml(rango)}</b></span>
  `;
  renderPrintHeader(data, matriz);
}

function renderPrintHeader(data, matriz) {
  const el = document.getElementById("printHeader");
  if (!el) return;

  if (!data) {
    el.innerHTML = "";
    return;
  }

  const nombre = data.paciente?.nombre || "";
  const rut = data.paciente?.rut || state.rut || "";
  const nOrdenes = Object.keys(data.ordenes || {}).length;

  let rango = "";
  if (matriz?.columnas?.length) {
    const fechas = matriz.columnas.map(c => c.timestamp).filter(Boolean).sort();
    rango = `${fechas[0]} → ${fechas[fechas.length - 1]}`;
  }

  const hoy = new Date();
  const fechaImp = hoy.toISOString().slice(0,10); // YYYY-MM-DD

  el.innerHTML = `
    <div class="ph-row">
      <div class="ph-left">
        <div class="ph-title">UCI Lab Extractor – Resumen longitudinal</div>
        <div class="ph-sub">
          <b>${escapeHtml(nombre)}</b> · RUT: <b>${escapeHtml(rut)}</b> · Órdenes: <b>${nOrdenes}</b>
        </div>
        <div class="ph-sub">Rango: <b>${escapeHtml(rango)}</b></div>
      </div>
      <div class="ph-right">
        <div class="ph-sub">Impreso: <b>${escapeHtml(fechaImp)}</b></div>
        <div class="ph-note">Página: ver pie de página del navegador</div>
      </div>
    </div>
  `;
}

function renderTabla(matriz) {
  const wrap = $("tablaWrap");
  if (!matriz) {
    wrap.innerHTML = "";
    return;
  }

  const cols = matriz.columnas || [];

  const headerCells = cols
    .map((c, idx) => {
      const h = formatearHeader(c.timestamp, c.orden);
      return `
        <th class="colhead" data-col="${idx}">
          <div class="h-fecha">${escapeHtml(h.fecha)}</div>
          <div class="h-hora">${escapeHtml(h.hora)}</div>
          <div class="h-orden">#${escapeHtml(h.orden)}</div>
        </th>`;
    })
    .join("");

  const rowsHtml = (matriz.ordenFilas || [])
    .map((examen) => {
      const row = matriz.filas?.[examen] || {};
      const tds = cols
        .map((c, idx) => {
          const v = row[c.timestamp];
          const txt = v === undefined || v === null ? "" : String(v).trim();
          let cls = "";
          if(!txt) cls = "empty";
          else if (!Number.isNaN(Number(txt.replace(",", ".")))) cls = "num";
          return `<td class="${cls}" data-col="${idx}">${escapeHtml(txt)}</td>`;
        })
        .join("");

      return `<tr><th class="rowhead">${escapeHtml(examen)}</th>${tds}</tr>`;
    })
    .join("");

  wrap.innerHTML = `
    <table class="matrix">
      <thead>
        <tr>
          <th class="corner">Examen</th>
          ${headerCells}
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
  const lastIdx = cols.length - 1;
  wrap.querySelectorAll(`[data-col="${lastIdx}"]`).forEach(el => el.classList.add("last-col"));

  const table = wrap.querySelector("table.matrix");
  if (!table) return;

  let ultimoDia = null;
  let alternar = false;

  // Zebra vertical + divisores por día

  cols.forEach((c, idx) => {
    const dia = String(c.timestamp || "").split(" ")[0]; // YYYY-MM-DD
    if (!dia) return;

    const esNuevoDia = dia !== ultimoDia;

    if (esNuevoDia) {
      alternar = !alternar;
      ultimoDia = dia;

    // Marca inicio de día (divisor)
    wrap.querySelectorAll(`[data-col="${idx}"]`)
      .forEach(el => el.classList.add("day-start"));
    }

    // Zebra vertical por bloques de día
    if (alternar) {
      wrap.querySelectorAll(`[data-col="${idx}"]`)
        .forEach(el => el.classList.add("day-alt"));
    }
  });

  table.addEventListener("mouseover", (e) => {
    const cell = e.target.closest("[data-col]");
    if (!cell) return;
    const idx = cell.getAttribute("data-col");
    table.querySelectorAll(`[data-col="${idx}"]`).forEach(el => el.classList.add("col-hover"));
  });

  table.addEventListener("mouseout", (e) => {
    const cell = e.target.closest("[data-col]");
    if (!cell) return;
    const idx = cell.getAttribute("data-col");
    table.querySelectorAll(`[data-col="${idx}"]`).forEach(el => el.classList.remove("col-hover"));
  });
}

async function refrescarListaPacientes() {
  // usa listarPacientes() desde storage.js (chrome.storage.local)
  const sel = $("selPaciente");
  const ruts = await listarPacientes();
  sel.innerHTML =
    `<option value="">(Selecciona)</option>` +
    ruts.map((r) => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join("");

  if (state.rut) sel.value = state.rut;
}

async function cargarPaciente(rut) {
  state.rut = rut;
  const sel = $("selPaciente");
  if (sel) sel.value = rut || "";
  if (rut) await guardarRutActual(rut);

  const data = await obtener(rut);
  if (!data) {
    state.matriz = null;
    renderInfo(null, null);
    renderTabla(null);
    setEstado("No hay datos guardados para este paciente.", true);
    return;
  }

  const matriz = await construirMatrizClinica(rut);
  if (!matriz) {
    state.matriz = null;
    renderInfo(data, null);
    renderTabla(null);
    setEstado("Hay datos, pero no se pudo construir matriz (quizá todo es PENDIENTE/RECHAZADO).", true);
    return;
  }

  state.matriz = matriz;
  renderInfo(data, matriz);
  renderTabla(aplicarFiltros(matriz));
  setEstado("");
}

async function init() {
  $("btnCargar").addEventListener("click", async () => {
    const rut = $("txtRut").value.trim();
    if (rut) await cargarPaciente(rut);
  });

  $("selPaciente").addEventListener("change", async (e) => {
    const rut = e.target.value;
     $("txtRut").value = rut || "";
    if (rut) await cargarPaciente(rut);
  });

  $("btnActualizar").addEventListener("click", async () => {
    if (state.rut) await cargarPaciente(state.rut);
  });

  $("btnExportar").addEventListener("click", async () => {
    if (!state.rut) return;
    await exportarPacienteCSV(state.rut);
  });

  $("btnImprimir").addEventListener("click", () => window.print());

  $("btnBorrar").addEventListener("click", async () => {
    if (!state.rut) return;
    await limpiar(state.rut);
    state.rut = null;
    state.matriz = null;
    await refrescarListaPacientes();
    renderInfo(null, null);
    renderTabla(null);
    setEstado("Paciente borrado.");
  });

  $("txtBuscarExamen").addEventListener("input", (e) => {
    state.buscar = e.target.value || "";
    renderTabla(aplicarFiltros(state.matriz));
  });

  $("chkOcultarVacios").addEventListener("change", (e) => {
    state.ocultarVacios = !!e.target.checked;
    renderTabla(aplicarFiltros(state.matriz));
  });

  $("chkMostrarExtras").addEventListener("change", (e) => {
    state.mostrarExtras = !!e.target.checked;
    renderTabla(aplicarFiltros(state.matriz));
  });

  const rutUrl = parseRutFromUrl();
  const rutLast = await obtenerRutActual();
  state.rut = rutUrl || rutLast || null;

  await refrescarListaPacientes();

  if (state.rut) {
    $("txtRut").value = state.rut;
    await cargarPaciente(state.rut);
  } else {
    setEstado("Selecciona un paciente o ingresa un RUT.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  init().catch((e) => {
    console.error("Viewer init error:", e);
    setEstado("Error inicializando viewer. Revisa consola.", true);
  });
});
