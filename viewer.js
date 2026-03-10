/*
UCI Lab Extractor
Copyright (C) 2026 Juan Sepúlveda Sepúlveda

Licensed under the GNU General Public License v3.0
*/

// viewer.js — tabla (matriz clínica) + filtros básicos
// Requiere: exams.js, storage.js (async), matrix.js (async), export.js

const $ = (id) => document.getElementById(id);

const state = {
  rut: null,
  data: null,
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
  "DENSIDAD ESPECIFICA", 
  "NITRITOS",
  "LEUCOCITOS",
  "ERITROCITOS",
  "PROTEINAS",
  "GLUCOSA",
  "CUERPOS CETONICOS",
  "BILIRRUBINA"
]);

function formatearNombreFila(examen) {
  return String(examen || "").replace(/_(A|V)$/, "");
}

const GASES_BASE = new Set(["pH", "pO2", "pCO2", "HCO3", "BE", "satO2"]);

function esGasEtiquetado(examen) {
  return /_(A|V)$/.test(String(examen || ""));
}

function baseGas(examen) {
  return String(examen || "").replace(/_(A|V)$/, "");
}

function construirMatrizVista(matriz) {
  if (!matriz) return null;

  const filasSrc = matriz.filas || {};
  const ordenSrc = matriz.ordenFilas || [];
  const filas = {};
  const ordenFilas = [];
  const usados = new Set();

  for (const ex of ordenSrc) {
    if (usados.has(ex)) continue;

    const base = baseGas(ex);

    if (GASES_BASE.has(base) && esGasEtiquetado(ex)) {
      const keyA = `${base}_A`;
      const keyV = `${base}_V`;

      const rowA = filasSrc[keyA] || {};
      const rowV = filasSrc[keyV] || {};

      const merged = {};
      (matriz.columnas || []).forEach((c) => {
        const a = rowA[c.timestamp];
        const v = rowV[c.timestamp];

        if (
          (a !== undefined && a !== null && String(a).trim() !== "") ||
          (v !== undefined && v !== null && String(v).trim() !== "")
        ) {
          merged[c.timestamp] = {
            arterial: a ?? "",
            venoso: v ?? ""
          };
        }
      });

      filas[base] = merged;
      ordenFilas.push(base);
      usados.add(keyA);
      usados.add(keyV);
      continue;
    }

    if (!usados.has(ex)) {
      filas[ex] = filasSrc[ex] || {};
      ordenFilas.push(ex);
      usados.add(ex);
    }
  }

  return {
    ...matriz,
    filas,
    ordenFilas
  };
}

function valorCeldaVacio(v) {
  if (v === undefined || v === null) return true;

  if (typeof v === "object") {
    const a = v.arterial ?? "";
    const ve = v.venoso ?? "";
    return String(a).trim() === "" && String(ve).trim() === "";
  }

  return String(v).trim() === "";
}

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
    #dlgEspecial .sec{margin-bottom:8px}
    #dlgEspecial .sec h4{margin:0 0 3px 0;font-size:13px;text-transform:uppercase;letter-spacing:.04em;opacity:.85}
    #dlgEspecial .grid{display:grid;grid-template-columns: 1fr 1fr;gap:8px 14px}
    #dlgEspecial .sec.gram-sec{margin-bottom:4px}
    #dlgEspecial .gram-wrap{margin:0;padding:2px}
    #dlgEspecial .gram-line{margin:0;padding:2px;line-height:1.2}
    #dlgEspecial .item{display:flex;gap:8px;align-items:flex-start}
    #dlgEspecial .k{min-width:180px;max-width:280px;font-size:13px}
    #dlgEspecial .k.sig{font-weight:700}
    #dlgEspecial .v{font-size:13px;white-space:pre-wrap}
    #dlgEspecial .mol-table{width:100%;  border-collapse:collapse;table-layout:fixed;}
    #dlgEspecial .mol-table td{padding:6px 4px;    vertical-align:top;border-bottom:1px solid #eee;}
    #dlgEspecial .mol-k{width:72%;font-size:13px; padding-right:12px;}
    #dlgEspecial .mol-v{width:28%;font-size:13px;text-align:left;white-space:nowrap;}
    #dlgEspecial .mol-v.detected{color:#b00020; font-weight:600;}
    @media (max-width:720px){#dlgEspecial .grid{grid-template-columns:1fr} #dlgEspecial .k{min-width:0}}
  `;

  document.head.appendChild(style);
  document.body.appendChild(dlg);

  // binding
  const chk = dlg.querySelector("#dlgMostrarTodo");

  chk.addEventListener("change", () => {
    state.modalMostrarTodo = !!chk.checked;

    if (state._lastModal && state.matriz) {
      if (state._lastModal.tipo === "ORINA") {
        openOrinaModal(state._lastModal.timestamp);
      }
      if (state._lastModal.tipo === "CULTIVO") {
        openCultivoModal(state._lastModal.timestamp, state._lastModal.estudioKey);
      }
      if (state._lastModal.tipo === "MOLECULAR") {
        openMolecularModal(state._lastModal.timestamp, state._lastModal.estudioKey);
      }
      if (state._lastModal.tipo === "HEMOGRAMA") {
        openHemogramaModal(state._lastModal.timestamp, state._lastModal.estudioKey);
      }
      if (state._lastModal.tipo === "CITOQUIMICO") {
        openCitoquimicoModal(state._lastModal.timestamp, state._lastModal.estudioKey);
      }
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
  //const microHtml = buildSectionHtml(panel.micro, state.modalMostrarTodo);

  let microHtml = buildSectionHtml(panel.micro, state.modalMostrarTodo);

  if (!state.modalMostrarTodo && microHtml.includes("Nada que mostrar")) {
  microHtml = `<div class="dlg-sub">Sedimento sin hallazgos relevantes</div>`;
    }

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

function openCitoquimicoModal(timestamp, estudioKey) {
  const matriz = state.matriz;
  const panel = matriz?.paneles?.citoquimicos?.[timestamp]?.[estudioKey];
  if (!panel) {
    setEstado("No hay panel de CITOQUIMICO para esta fecha/estudio.", true);
    return;
  }

  state._lastModal = { tipo: "CITOQUIMICO", timestamp, estudioKey };

  const dlg = getDialog();
  const titulo = dlg.querySelector("#dlgTitulo");
  const sub = dlg.querySelector("#dlgSub");
  const body = dlg.querySelector("#dlgBody");
  const chk = dlg.querySelector("#dlgMostrarTodo");

  titulo.textContent = estudioKey === "CITOQUIMICO LCR" ? "Citoquímico LCR" : estudioKey;
  sub.textContent = (panel?.meta?.fechaValidacion || timestamp)
    ? `Fecha: ${panel?.meta?.fechaValidacion || timestamp}`
    : "";

  chk.checked = true;
  chk.closest(".dlg-toolbar").style.display = "none";

  const fisicoHtml = buildSectionHtml(panel.fisico, true);
  const celularHtml = buildSectionHtml(panel.celular, true);

  body.innerHTML = `
    <div class="sec">
      <h4>Físico-químico</h4>
      ${fisicoHtml}
    </div>
    <div class="sec">
      <h4>Citología / recuento</h4>
      ${celularHtml}
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

  const gramHtml = Array.isArray(panel?.gramObs) && panel.gramObs.length
  ? `
    <div class="sec gram-sec">
      <h4>Tinción de Gram</h4>
      <div class="gram-wrap">
        ${panel.gramObs.map(o => `<div class="gram-line">${esc(o.item || "")}${o.cantidad ? ` — <b>${esc(o.cantidad)}</b>` : ""}</div>`).join("")}
      </div>
    </div>
  `
  : (panel?.gramRaw
      ? `
        <div class="sec gram-sec">
          <h4>Tinción de Gram</h4>
          <div class="gram-line">${esc(panel.gramRaw)}</div>
        </div>
      `

      : "");

  const comentarios = (panel?.comentarios || []).filter(Boolean);
  const ref = panel?.refAntibiograma;

  const aislados = panel?.aislados || [];
  const aisladosHtml = aislados.length
    ? aislados.map((a) => {
        const micro = a?.microorganismo ? esc(a.microorganismo) : "(sin microorganismo)";
        const rec = a?.recuento ? `<div class="dlg-sub">Recuento de Colonias: <b>${esc(a.recuento)}</b></div>` : "";
        const notaHtml = a?.nota
          ? `<div class="dlg-sub" style="margin-top:6px">Nota: <b>${esc(a.nota)}</b></div>`
          : "";
        const atb = a?.antibioticos || [];
        const atbHtml = atb.length
          ? `
            <table style="width:100%;border-collapse:collapse;margin-top:8px">
              <thead>
                <tr>
                  <th style="text-align:left;border-bottom:1px solid #ddd;padding:6px 4px">Antibiótico</th>
                  <th style="text-align:left;border-bottom:1px solid #ddd;padding:6px 4px">CIM</th>
                  <th style="text-align:left;border-bottom:1px solid #ddd;padding:6px 4px">Interpretación</th>
                </tr>
              </thead>
              <tbody>
                ${atb.map(x => `
                  <tr>
                    <td style="padding:4px">${esc(x.antibiotico || "")}</td>
                    <td style="padding:4px">${esc(x.cim || "")}</td>
                    <td style="padding:4px">${esc(x.interp || x.raw || "")}</td>
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
            ${notaHtml}
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
    ${gramHtml}
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

  titulo.textContent = panel.displayName ||estudioKey;
  sub.textContent = (panel?.meta?.fechaValidacion || timestamp) ? `Fecha: ${panel?.meta?.fechaValidacion || timestamp}` : "";
  chk.checked = false;
  state.modalMostrarTodo = false;

  body.innerHTML = buildCultivoHtml(panel);

  if (!dlg.open) dlg.showModal();
}

function buildHemogramaManualHtml(panel) {
  const esc = escapeTxt;

  const diffRows = Object.entries(panel?.diferencial || {})
    .sort((a, b) => a[0].localeCompare(b[0], "es"))
    .map(([k, v]) => `
      <tr>
        <td style="padding:6px 4px;border-bottom:1px solid #eee;width:70%">${esc(k)}</td>
        <td style="padding:6px 4px;border-bottom:1px solid #eee;width:30%"><b>${esc(v)}</b></td>
      </tr>
    `)
    .join("");

  const diferencialHtml = diffRows
    ? `
      <div class="sec">
        <h4>Diferencial manual</h4>
        <table style="width:100%;border-collapse:collapse;table-layout:fixed">
          <tbody>${diffRows}</tbody>
        </table>
      </div>
    `
    : `<div class="dlg-sub">(Sin diferencial manual informado)</div>`;

  const morfoRows = Object.entries(panel?.morfologia || {})
    .sort((a, b) => a[0].localeCompare(b[0], "es"))
    .map(([k, v]) => `
      <div class="item">
        <div class="k">${esc(k)}</div>
        <div class="v"><b>${esc(v)}</b></div>
      </div>
    `)
    .join("");

  const morfologiaHtml = morfoRows
    ? `
      <div class="sec">
        <h4>Morfología</h4>
        <div class="grid">${morfoRows}</div>
      </div>
    `
    : `<div class="dlg-sub">(Sin morfología informada)</div>`;

  return `${diferencialHtml}${morfologiaHtml}`;
}

function openHemogramaModal(timestamp, estudioKey = "FORMULA MANUAL") {
  const matriz = state.matriz;
  const panel = matriz?.paneles?.hemogramas?.[timestamp]?.[estudioKey];
  if (!panel) {
    setEstado("No hay panel de hemograma manual para esta fecha.", true);
    return;
  }

  state._lastModal = { tipo: "HEMOGRAMA", timestamp, estudioKey };

  const dlg = getDialog();
  const titulo = dlg.querySelector("#dlgTitulo");
  const sub = dlg.querySelector("#dlgSub");
  const body = dlg.querySelector("#dlgBody");
  const chk = dlg.querySelector("#dlgMostrarTodo");

  titulo.textContent = "Hemograma con fórmula manual";
  sub.textContent = (panel?.meta?.fechaValidacion || timestamp)
    ? `Fecha: ${panel?.meta?.fechaValidacion || timestamp}`
    : "";

  chk.checked = false;
  chk.closest(".dlg-toolbar").style.display = "none";

  body.innerHTML = buildHemogramaManualHtml(panel);

  if (!dlg.open) dlg.showModal();
}

function buildMolecularHtml(panel) {
  const esc = escapeTxt;

  const tipoHtml = panel?.tipoMuestra
    ? `
      <div class="sec">
        <h4>Tipo de muestra</h4>
        <div class="v">${esc(panel.tipoMuestra)}</div>
      </div>
    `
    : "";

  const rows = Object.entries(panel?.resultados || {})
    .sort((a, b) => a[0].localeCompare(b[0], "es"))
    .map(([nombre, resultado]) => {
      const r = String(resultado || "").toUpperCase();
      const detectado = r.includes("DETECTADO") && !r.includes("NO");

      return `
        <tr>
          <td class="mol-k">${esc(nombre)}</td>
          <td class="mol-v ${detectado ? "detected" : ""}">
            ${detectado ? `<b>${esc(resultado)}</b>` : esc(resultado)}
          </td>
        </tr>
      `;
    })
    .join("");

  const resultadosHtml = rows
    ? `
      <div class="sec">
        <h4>Resultados</h4>
        <table class="mol-table">
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `
    : `<div class="dlg-sub">(Sin resultados)</div>`;

  return `${tipoHtml}${resultadosHtml}`;
}

function openMolecularModal(timestamp, estudioKey) {
  const matriz = state.matriz;
  const panel = matriz?.paneles?.moleculares?.[timestamp]?.[estudioKey];
  if (!panel) {
    setEstado("No hay panel molecular para esta fecha/estudio.", true);
    return;
  }

  state._lastModal = { tipo: "MOLECULAR", timestamp, estudioKey };

  const dlg = getDialog();
  const titulo = dlg.querySelector("#dlgTitulo");
  const sub = dlg.querySelector("#dlgSub");
  const body = dlg.querySelector("#dlgBody");
  const chk = dlg.querySelector("#dlgMostrarTodo");

  titulo.textContent = estudioKey;
  sub.textContent = panel?.meta?.fechaValidacion || timestamp || "";

  chk.checked = false;
  chk.closest(".dlg-toolbar").style.display = "none";

  body.innerHTML = buildMolecularHtml(panel);

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

  const matrizVista = construirMatrizVista(matriz);
  const buscar = state.buscar.trim().toLowerCase();

  const baseCanonica = Array.from(new Set(Object.values(MAP_EXAMENES)));
  const base = new Set([
    ...baseCanonica,
    ...Array.from(GASES_BASE)
  ]);

  const ordenFilas = (matrizVista.ordenFilas || []).filter((ex) => {
    if (buscar && !String(ex).toLowerCase().includes(buscar)) return false;
    if (!state.mostrarExtras && !base.has(ex)) return false;

    if (state.ocultarVacios) {
      const row = matrizVista.filas?.[ex] || {};
      const tieneAlgo = (matrizVista.columnas || []).some((c) => {
        const v = row[c.timestamp];
        return !valorCeldaVacio(v);
      });
      if (!tieneAlgo) return false;
    }

    return true;
  });

  return { ...matrizVista, ordenFilas };
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

    el.innerHTML = construirPrintHeaderHTML(data, matriz);
}

function construirPrintHeaderHTML(data, matriz, pageNum = null, totalPages = null, rangoCols = null) {
  if (!data) return "";

  const nombre = data.paciente?.nombre || "";
  const rut = data.paciente?.rut || state.rut || "";
  const nOrdenes = Object.keys(data.ordenes || {}).length;

  let rango = "";
  if (matriz?.columnas?.length) {
    const fechas = matriz.columnas.map(c => c.timestamp).filter(Boolean).sort();
    rango = `${fechas[0]} → ${fechas[fechas.length - 1]}`;
  }

  const hoy = new Date();
  const fechaImp = hoy.toISOString().slice(0, 10);

  const paginaTxt = (pageNum && totalPages)
    ? `Página: ${pageNum}/${totalPages}`
    : `Página: ver pie de página del navegador`;

  const bloqueTxt = rangoCols
    ? `Órdenes: ${rangoCols}`
    : "";

  return `
    <div class="ph-row">
      <div class="ph-left">
        <div class="ph-title">UCI Lab Extractor – Resumen longitudinal</div>
        <div class="ph-sub">
          <b>${escapeHtml(nombre)}</b> · RUT: <b>${escapeHtml(rut)}</b> · Órdenes: <b>${nOrdenes}</b>
        </div>
        <div class="ph-sub">Rango: <b>${escapeHtml(rango)}</b></div>
        ${bloqueTxt ? `<div class="ph-sub">${escapeHtml(bloqueTxt)}</div>` : ""}
      </div>
      <div class="ph-right">
        <div class="ph-sub">Impreso: <b>${escapeHtml(fechaImp)}</b></div>
        <div class="ph-note">${escapeHtml(paginaTxt)}</div>
      </div>
    </div>
  `;
}

function ensureInlineBtnStyle() {
  if (document.getElementById("viewer-inline-btn-style")) return;

  const st = document.createElement("style");
  st.id = "viewer-inline-btn-style";
  st.textContent = `
  .btn-mini{font-size:12px;padding:3px 8px;border:1px solid #bbb;border-radius:10px;background:#fff;cursor:pointer}
  .btn-mini:hover{border-color:#888}

  .gas-stack{
    display:flex;
    flex-direction:column;
    gap:2px;
    align-items:flex-start;
    line-height:1.1;
  }

  .gas-result{
    display:flex;
    align-items:center;
    gap:4px;
    white-space:nowrap;
  }

  .badge-gas{
    display:inline-flex;
    align-items:center;
    justify-content:center;
    min-width:12px;
    height:12px;
    padding:0 3px;
    border-radius:6px;
    font-size:9px;
    font-weight:600;
    color:#fff;
  }

  .badge-a{ background:#c62828; }
  .badge-v{ background:#1565c0; }

  .gas-val{
    font-weight:500;
    font-variant-numeric: tabular-nums;
  }
`;
  document.head.appendChild(st);
}

function construirTablaHTML(matriz) {
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
          const txt = (typeof v === "object" || v === undefined || v === null) ? "" : String(v).trim();
          let cls = "";

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

          if (txt.startsWith("__MOLECULAR_MODAL__::")) {
            const estudioKey = txt.slice("__MOLECULAR_MODAL__::".length);
            return `
              <td class="${cls}" data-col="${idx}">
                <button class="btn-mini" data-action="molecular" data-ts="${escapeHtml(c.timestamp)}" data-est="${escapeHtml(estudioKey)}">Ver</button>
              </td>`;
          }

          if (txt.startsWith("__CITOQUIMICO_MODAL__::")) {
            const estudioKey = txt.slice("__CITOQUIMICO_MODAL__::".length);
            return `
              <td class="${cls}" data-col="${idx}">
                <button class="btn-mini" data-action="citoquimico" data-ts="${escapeHtml(c.timestamp)}" data-est="${escapeHtml(estudioKey)}">Ver</button>
              </td>`;
          }

          if (txt.startsWith("__HEMOGRAMA_MODAL__::")) {
            const estudioKey = txt.slice("__HEMOGRAMA_MODAL__::".length);
            return `
              <td class="${cls}" data-col="${idx}">
                <button class="btn-mini" data-action="hemograma" data-ts="${escapeHtml(c.timestamp)}" data-est="${escapeHtml(estudioKey)}">Ver</button>
              </td>`;
          }
          
          if (typeof v === "object" && v !== null) {
            const a = String(v.arterial ?? "").trim();
            const ve = String(v.venoso ?? "").trim();

            const aHtml = a
  ? `<div class="gas-result gas-a"><span class="gas-val">${escapeHtml(a)}</span><span class="badge-gas badge-a">A</span></div>`
  : "";

const vHtml = ve
  ? `<div class="gas-result gas-v"><span class="gas-val">${escapeHtml(ve)}</span><span class="badge-gas badge-v">V</span></div>`
  : "";

            const gasCls = (!a && !ve) ? "empty" : "";
            return `<td class="${gasCls}" data-col="${idx}"><div class="gas-stack">${aHtml}${vHtml}</div></td>`;
            }

          if (!txt) cls = "empty";
          else if (!Number.isNaN(Number(txt.replace(",", ".")))) cls = "num";

          return `<td class="${cls}" data-col="${idx}">${escapeHtml(txt)}</td>`;
        })
        .join("");

          return `<tr><th class="rowhead">${escapeHtml(formatearNombreFila(examen))}</th>${tds}</tr>`;
    })
    .join("");

  return `
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
}

function decorarTablaRenderizada(wrap, matriz, interactive = true) {
  const cols = matriz.columnas || [];
  const table = wrap.querySelector("table.matrix");
  if (!table) return;

  const lastIdx = cols.length - 1;
  wrap.querySelectorAll(`[data-col="${lastIdx}"]`).forEach(el => el.classList.add("last-col"));

  let ultimoDia = null;
  let alternar = false;

  cols.forEach((c, idx) => {
    const dia = String(c.timestamp || "").split(" ")[0];
    if (!dia) return;

    const esNuevoDia = dia !== ultimoDia;

    if (esNuevoDia) {
      alternar = !alternar;
      ultimoDia = dia;

      wrap.querySelectorAll(`[data-col="${idx}"]`)
        .forEach(el => el.classList.add("day-start"));
    }

    if (alternar) {
      wrap.querySelectorAll(`[data-col="${idx}"]`)
        .forEach(el => el.classList.add("day-alt"));
    }
  });

  if (!interactive) return;

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

    table.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const ts = btn.getAttribute("data-ts");

    if (action === "orina") {
      openOrinaModal(ts);
      return;
    }

    if (action === "cultivo") {
      const est = btn.getAttribute("data-est") || "";
      openCultivoModal(ts, est);
      return;
    }

    if (action === "molecular") {
      const est = btn.getAttribute("data-est") || "";
      openMolecularModal(ts, est);
      return;
    }

    if (action === "citoquimico") {
      const est = btn.getAttribute("data-est") || "";
      openCitoquimicoModal(ts, est);
      return;
    }

    if (action === "hemograma") {
      const est = btn.getAttribute("data-est") || "";
      openHemogramaModal(ts, est);
      return;
    }
  });
}

function renderTablaEnContenedor(matriz, wrap, interactive = true) {
  if (!wrap) return;

  if (!matriz) {
    wrap.innerHTML = "";
    return;
  }

  ensureInlineBtnStyle();
  wrap.innerHTML = construirTablaHTML(matriz);
  decorarTablaRenderizada(wrap, matriz, interactive);
}

function renderTabla(matriz) {
  renderTablaEnContenedor(matriz, $("tablaWrap"), true);
}

function detectarColumnasPorPagina() {
  // Carta y Oficio vertical comparten prácticamente el mismo ancho útil.
  // Usamos ancho CSS aproximado de 8.5in a 96dpi.
  const anchoPaginaPx = 816; // 8.5 * 96
  const margenHorizontalPx = 96; // márgenes + tolerancia del navegador
  const anchoDisponible = anchoPaginaPx - margenHorizontalPx;

  // Medición real desde la tabla visible, si existe
  const corner = document.querySelector("#tablaWrap .matrix .corner");
  const firstCol = document.querySelector("#tablaWrap .matrix thead th.colhead");

  const anchoExamen = corner
    ? Math.ceil(corner.getBoundingClientRect().width)
    : 220;

  const anchoCol = firstCol
    ? Math.ceil(firstCol.getBoundingClientRect().width)
    : 74;

  const disponibleParaDatos = Math.max(220, anchoDisponible - anchoExamen);

  let n = Math.floor(disponibleParaDatos / Math.max(60, anchoCol));

  // límites prácticos para lectura clínica
  n = Math.max(6, Math.min(10, n));

  return n;
}

function fragmentarMatrizPorColumnas(matriz, columnasPorPagina) {
  if (!matriz?.columnas?.length) return [];

  const bloques = [];

  for (let i = 0; i < matriz.columnas.length; i += columnasPorPagina) {
    const cols = matriz.columnas.slice(i, i + columnasPorPagina);
    const filas = {};

    (matriz.ordenFilas || []).forEach((examen) => {
      filas[examen] = {};
      cols.forEach((c) => {
        filas[examen][c.timestamp] =
          matriz.filas?.[examen]?.[c.timestamp] ?? "";
      });
    });

    bloques.push({
      ...matriz,
      columnas: cols,
      filas
    });
  }

  return bloques;
}

function construirVistaImpresion(matriz) {
  const columnasPorPagina = detectarColumnasPorPagina();
  const bloques = fragmentarMatrizPorColumnas(matriz, columnasPorPagina);

  const root = document.createElement("div");
  root.id = "printPages";
  root.className = "print-pages";

  bloques.forEach((bloque, i) => {
    const page = document.createElement("section");
    page.className = "print-page";

    const inicio = i * columnasPorPagina + 1;
    const fin = i * columnasPorPagina + bloque.columnas.length;
    const rangoCols = `${inicio}–${fin}`;

    const header = document.createElement("div");
    header.className = "print-page-header";
    header.innerHTML = construirPrintHeaderHTML(
      state.data,
      state.matriz,
      i + 1,
      bloques.length,
      rangoCols
    );

    const wrap = document.createElement("div");
    wrap.className = "table-wrap print-table-wrap";

    renderTablaEnContenedor(bloque, wrap, false);

    page.appendChild(header);
    page.appendChild(wrap);
    root.appendChild(page);
  });

  return root;
}

function imprimirVistaPaginada() {
  const matriz = aplicarFiltros(state.matriz);
  if (!matriz) return;

  const tablaOriginal = $("tablaWrap");
  if (!tablaOriginal) return;

  const vista = construirVistaImpresion(matriz);

  tablaOriginal.style.display = "none";
  document.body.appendChild(vista);

  const limpiar = () => {
    vista.remove();
    tablaOriginal.style.display = "";
    window.removeEventListener("afterprint", limpiar);
  };

  window.addEventListener("afterprint", limpiar);

  try {
    window.print();
  } catch (e) {
    limpiar();
    throw e;
  }
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
    state.data = null;
    state.matriz = null;
    renderInfo(null, null);
    renderTabla(null);
    setEstado("No hay datos guardados para este paciente.", true);
    return;
  }

  state.data = data;

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

  $("btnImprimir").addEventListener("click", () => {
  imprimirVistaPaginada();
});

  $("btnBorrar").addEventListener("click", async () => {
    if (!state.rut) return;

    const nombre = state.data?.paciente?.nombre || "";
    const rut = state.data?.paciente?.rut || state.rut || "";

    const msg = nombre
      ? `¿Seguro que deseas borrar los datos guardados de ${nombre} (${rut})?\n\nEsta acción no se puede deshacer.`
      : `¿Seguro que deseas borrar los datos guardados del paciente ${rut}?\n\nEsta acción no se puede deshacer.`;

    const ok = window.confirm(msg);
    if (!ok) return;

    await limpiar(state.rut);
    state.rut = null;
    state.data = null;
    state.matriz = null;
    await refrescarListaPacientes();
    renderInfo(null, null);
    renderTabla(null);
    $("txtRut").value = "";
    $("selPaciente").value = "";
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
