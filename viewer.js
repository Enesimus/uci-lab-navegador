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
  mostrarExtras: true,

  // UI: modal de exámenes especiales
  modalMostrarTodo: false
};

// --- Exámenes especiales (paneles) ---
// Nota: estos paneles deben venir desde matrix.js como matriz.paneles.{tipo}[timestamp]
// Ejemplo esperado para orina:
// matriz.paneles.orina[timestamp] = {
//   fisico: { "PH": [{valor:"6" , significativo:false}] , ... },
//   micro:  { "CRISTALES": [{valor:"...", significativo:false}, ...], ... },
//   meta: { fechaValidacion: "YYYY-MM-DD HH:MM" }
// }

const ORINA_SIEMPRE = new Set([
  "PH",
  "DENSIDAD ESPECIFICA"
]);

function getDialog() {
  let dlg = document.getElementById("dlgEspecial");
  if (dlg) return dlg;

  dlg = document.createElement("dialog");
  dlg.id = "dlgEspecial";
  dlg.innerHTML = `
    <form method="dialog" class="dlg-form">
      <div class="dlg-head">
        <div>
          <div id="dlgTitulo" class="dlg-title"></div>
          <div id="dlgSub" class="dlg-sub"></div>
        </div>
        <button value="cancel" class="dlg-close" aria-label="Cerrar">✕</button>
      </div>
      <div class="dlg-toolbar">
        <label class="dlg-toggle">
          <input type="checkbox" id="dlgMostrarTodo" />
          Mostrar todos los ítems
        </label>
      </div>
      <div id="dlgBody" class="dlg-body"></div>
      <div class="dlg-foot">
        <button value="cancel">Cerrar</button>
      </div>
    </form>
  `;

  // estilos mínimos inline (evita depender de CSS externo)
  const style = document.createElement("style");
  style.textContent = `
    dialog#dlgEspecial{max-width:min(900px,96vw);width:96vw;border:1px solid #ccc;border-radius:12px;padding:0}
    dialog#dlgEspecial::backdrop{background:rgba(0,0,0,.25)}
    #dlgEspecial .dlg-form{margin:0}
    #dlgEspecial .dlg-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid #ddd}
    #dlgEspecial .dlg-title{font-weight:700;font-size:16px}
    #dlgEspecial .dlg-sub{opacity:.8;font-size:12px;margin-top:2px}
    #dlgEspecial .dlg-close{border:0;background:transparent;font-size:16px;cursor:pointer;padding:4px 6px}
    #dlgEspecial .dlg-toolbar{display:flex;align-items:center;justify-content:flex-start;padding:10px 14px;border-bottom:1px solid #eee}
    #dlgEspecial .dlg-toggle{font-size:13px;user-select:none}
    #dlgEspecial .dlg-body{padding:12px 14px;max-height:min(70vh,680px);overflow:auto}
    #dlgEspecial .dlg-foot{display:flex;justify-content:flex-end;gap:10px;padding:10px 14px;border-top:1px solid #eee}
    #dlgEspecial .sec{margin-bottom:14px}
    #dlgEspecial .sec h4{margin:0 0 8px 0;font-size:13px;text-transform:uppercase;letter-spacing:.04em;opacity:.85}
    #dlgEspecial .grid{display:grid;grid-template-columns: 1fr 1fr;gap:8px 14px}
    #dlgEspecial .item{display:flex;gap:8px;align-items:flex-start}
    #dlgEspecial .k{min-width:180px;max-width:280px;font-size:13px}
    #dlgEspecial .k.sig{font-weight:700}
    #dlgEspecial .v{font-size:13px;white-space:pre-wrap}
    @media (max-width:720px){#dlgEspecial .grid{grid-template-columns:1fr} #dlgEspecial .k{min-width:0}}
  `;

  document.head.appendChild(style);
  document.body.appendChild(dlg);

  // binding
  const chk = dlg.querySelector("#dlgMostrarTodo");
  chk.addEventListener("change", () => {
    state.modalMostrarTodo = !!chk.checked;
    // re-render con lo último abierto
    if (state._lastModal && state.matriz) {
      if (state._lastModal.tipo === "ORINA") openOrinaModal(state._lastModal.timestamp);
      if (state._lastModal.tipo === "CULTIVO") openCultivoModal(state._lastModal.timestamp, state._lastModal.estudioKey);
    }
  });

  return dlg;
}

function escapeTxt(s) {
  return escapeHtml(s ?? "");
}

function buildSectionHtml(section, mostrarTodo) {
  // section puede venir como:
  //  A) { "PRUEBA": ["valor", "valor2"], ... } (implementación actual en matrix.js)
  //  B) { "PRUEBA": [{valor:"..", significativo:false}, ...], ... } (formato antiguo)
  const keys = Object.keys(section || {});
  if (!keys.length) return "<div class=\"dlg-sub\">(Sin datos)</div>";

  const rows = [];

  keys.sort((a,b) => String(a).localeCompare(String(b), "es"));
  for (const k of keys) {
    const arr = section[k] || [];
    // decide si mostrar
    const tieneSig = arr.some(x => (x && typeof x === "object") ? !!x.significativo : false);
    const mostrar = mostrarTodo || tieneSig || ORINA_SIEMPRE.has(String(k).toUpperCase());
    if (!mostrar) continue;

    const valores = arr
      .map(x => (x && typeof x === "object" && "valor" in x) ? x.valor : x)
      .filter(v => v !== undefined && v !== null && String(v).trim() !== "");
    if (!valores.length) continue;

    const vHtml = valores.length === 1
      ? escapeTxt(valores[0])
      : "<ul style=\"margin:0;padding-left:18px\">" + valores.map(v => `<li>${escapeTxt(v)}</li>`).join("") + "</ul>";

    const kCls = "k" + (tieneSig ? " sig" : "");
    rows.push(`<div class=\"item\"><div class=\"${kCls}\">${escapeTxt(k)}</div><div class=\"v\">${vHtml}</div></div>`);
  }

  if (!rows.length) return "<div class=\"dlg-sub\">(Nada que mostrar con el filtro actual)</div>";
  return `<div class=\"grid\">${rows.join("")}</div>`;
}

function openOrinaModal(timestamp) {
  const matriz = state.matriz;
  const panel = matriz?.paneles?.orina?.[timestamp];
  if (!panel) {
    setEstado("No hay panel de ORINA para esta fecha (falta generar paneles en matrix.js)", true);
    return;
  }

  state._lastModal = { tipo: "ORINA", timestamp };

  const dlg = getDialog();
  const titulo = dlg.querySelector("#dlgTitulo");
  const sub = dlg.querySelector("#dlgSub");
  const body = dlg.querySelector("#dlgBody");
  const chk = dlg.querySelector("#dlgMostrarTodo");

  titulo.textContent = "Orina completa";
  sub.textContent = (panel?.meta?.fechaValidacion || timestamp) ? `Fecha: ${panel?.meta?.fechaValidacion || timestamp}` : "";
  chk.checked = !!state.modalMostrarTodo;

  const fisicoHtml = buildSectionHtml(panel.fisico, state.modalMostrarTodo);
  const microHtml = buildSectionHtml(panel.micro, state.modalMostrarTodo);

  body.innerHTML = `
    <div class="sec">
      <h4>Físico-químico</h4>
      ${fisicoHtml}
    </div>
    <div class="sec">
      <h4>Microscópico / morfológico</h4>
      ${microHtml}
    </div>
  `;

  if (!dlg.open) dlg.showModal();
}

// ===== CULTIVOS (modal) =====
function buildCultivoHtml(panel) {
  const esc = escapeTxt;

  const chips = [];
  if (panel?.resultadoGlobal) chips.push(`<span class="chip">Resultado: <b>${esc(panel.resultadoGlobal)}</b></span>`);
  if (panel?.tipoMuestra) chips.push(`<span class="chip">Muestra: <b>${esc(panel.tipoMuestra)}</b></span>`);
  if (panel?.gram) chips.push(`<span class="chip">Gram: <b>${esc(panel.gram)}</b></span>`);

  const comentarios = (panel?.comentarios || []).filter(Boolean);
  const ref = panel?.refAntibiograma;

  const aislados = panel?.aislados || [];
  const aisladosHtml = aislados.length
    ? aislados.map((a) => {
        const micro = a?.microorganismo ? esc(a.microorganismo) : "(sin microorganismo)";
        const rec = a?.recuento ? `<div class="dlg-sub">Recuento: <b>${esc(a.recuento)}</b></div>` : "";

        const atb = a?.antibioticos || [];
        const atbHtml = atb.length
          ? `
            <table style="width:100%;border-collapse:collapse;margin-top:8px">
              <thead>
                <tr>
                  <th style="text-align:left;border-bottom:1px solid #ddd;padding:6px 4px">ATB</th>
                  <th style="text-align:left;border-bottom:1px solid #ddd;padding:6px 4px">CIM</th>
                  <th style="text-align:left;border-bottom:1px solid #ddd;padding:6px 4px">Interp</th>
                </tr>
              </thead>
              <tbody>
                ${atb.map(x => `
                  <tr>
                    <td style="padding:4px">${esc(x.antibiotico || "")}</td>
                    <td style="padding:4px">${esc(x.cim || "")}</td>
                    <td style="padding:4px">${esc(x.interp || "")}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          `
          : "";

        return `
          <div class="sec">
            <h4>${esc(a?.label || "Aislado")}</h4>
            <div class="dlg-title" style="font-size:14px">${micro}</div>
            ${rec}
            ${atbHtml}
          </div>
        `;
      }).join("")
    : `<div class="dlg-sub">(Sin aislados informados)</div>`;

  const comentariosHtml = comentarios.length
    ? `<div class="sec"><h4>Comentarios</h4><div class="v">${comentarios.map(c => `<div style="margin-bottom:6px">${esc(c)}</div>`).join("")}</div></div>`
    : "";

  const refHtml = ref
    ? `<div class="sec"><h4>Referencia</h4><div class="v">Antibiograma igual que <b>${esc(ref.tipo)} ${esc(ref.n)}</b></div></div>`
    : "";

  return `
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">
      ${chips.join("")}
    </div>
    ${refHtml}
    ${comentariosHtml}
    ${aisladosHtml}
  `;
}

function openCultivoModal(timestamp, estudioKey) {
  const matriz = state.matriz;
  const panel = matriz?.paneles?.cultivos?.[timestamp]?.[estudioKey];
  if (!panel) {
    setEstado("No hay panel de CULTIVO para esta fecha/estudio (falta generar paneles en matrix.js)", true);
    return;
  }

  state._lastModal = { tipo: "CULTIVO", timestamp, estudioKey };

  const dlg = getDialog();
  const titulo = dlg.querySelector("#dlgTitulo");
  const sub = dlg.querySelector("#dlgSub");
  const body = dlg.querySelector("#dlgBody");
  const chk = dlg.querySelector("#dlgMostrarTodo");

  titulo.textContent = estudioKey;
  sub.textContent = (panel?.meta?.fechaValidacion || timestamp) ? `Fecha: ${panel?.meta?.fechaValidacion || timestamp}` : "";
  chk.checked = !!state.modalMostrarTodo;

  body.innerHTML = buildCultivoHtml(panel);

  if (!dlg.open) dlg.showModal();
}

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

          // Marcadores especiales (render distinto)
          if (txt === "__ORINA_MODAL__") {
            return `
              <td class="${cls}" data-col="${idx}">
                <button class="btn-mini" data-action="orina" data-ts="${escapeHtml(c.timestamp)}">Ver</button>
              </td>`;
          }

          if (txt.startsWith("__CULTIVO_MODAL__::")) {
            const estudioKey = txt.slice("__CULTIVO_MODAL__::".length);
            return `
              <td class="${cls}" data-col="${idx}">
                <button class="btn-mini" data-action="cultivo" data-ts="${escapeHtml(c.timestamp)}" data-est="${escapeHtml(estudioKey)}">Ver</button>
              </td>`;
          }

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

  // estilos mínimos para botones dentro de celdas
  if (!document.getElementById("viewer-inline-btn-style")) {
    const st = document.createElement("style");
    st.id = "viewer-inline-btn-style";
    st.textContent = `
      .btn-mini{font-size:12px;padding:3px 8px;border:1px solid #bbb;border-radius:10px;background:#fff;cursor:pointer}
      .btn-mini:hover{border-color:#888}
    `;
    document.head.appendChild(st);
  }
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

  // Acciones (modal de especiales)
  table.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    const ts = btn.getAttribute("data-ts");
    if (action === "orina") {
      openOrinaModal(ts);
    }
    if (action === "cultivo") {
      const est = btn.getAttribute("data-est") || "";
      openCultivoModal(ts, est);
    }
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
