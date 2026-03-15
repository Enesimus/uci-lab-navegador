/*
UCI Lab Navegador
Copyright (C) 2026 Juan Sepúlveda Sepúlveda

Licensed under the GNU General Public License v3.0
*/

// export.js

function convertirAMatrizBidimensional(matrizClinica, opciones = {}) {
  if (!matrizClinica) return null;

  const { columnas, filas, ordenFilas } = matrizClinica;

  const incluirFilaHash = (opciones.incluirFilaHash !== false); // default true
  const hashCompleto = !!opciones.hashCompleto;                 // default false

  // ===== 1) Encabezado =====
  const header = ["Examen"];

  columnas.forEach(col => {
    const stamp = col.timestamp || "";
    const ord = col.orden || "";
    header.push(`${stamp} (#${ord})`);
  });

  const matriz = [header];

  // ===== 1b) Fila HASH (trazabilidad) =====
  if (incluirFilaHash) {
    const filaHash = ["HASH"];
    columnas.forEach(col => {
      const h = col.hash ? String(col.hash) : "";
      filaHash.push(hashCompleto ? h : h.slice(0, 8));
    });
    matriz.push(filaHash);
  }

  // ===== 2) Filas =====
  ordenFilas.forEach(nombreExamen => {
    const fila = [nombreExamen];

    columnas.forEach(col => {
      const valor = filas[nombreExamen]?.[col.timestamp] ?? "";
      fila.push(valor);
    });

    matriz.push(fila);
  });

  return matriz;
}

function generarCSV(matriz) {
  if (!matriz || !Array.isArray(matriz)) return null;

  const escapeCelda = (celda) => {
    if (celda === null || celda === undefined) return "";
    const texto = String(celda);

    // Escapar comillas
    const escapado = texto.replace(/"/g, '""');

    // CSV seguro: si hay ;, salto de línea, \r o comillas, envolver en comillas
    if (
      escapado.includes(";") ||
      escapado.includes("\n") ||
      escapado.includes("\r") ||
      escapado.includes('"')
    ) {
      return `"${escapado}"`;
    }
    return escapado;
  };

  return matriz.map(fila => fila.map(escapeCelda).join(";")).join("\n");
}

function descargarCSV(nombreArchivo, contenidoCSV) {
  if (!contenidoCSV) return;


  const BOM = "\uFEFF";
  const blob = new Blob([BOM + contenidoCSV], { type: "text/csv;charset=utf-8;" });
  //const blob = new Blob([contenidoCSV], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function descargarJSON(nombreArchivo, data) {
  if (!data) return;

  const contenido = JSON.stringify(data, null, 2);
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

function construirBackupPacienteJSON(rut, data) {
  return {
    format: "uci-lab-navegador",
    version: 1,
    exportedAt: new Date().toISOString(),
    patientKey: rut,
    data
  };
}

function validarBackupPacienteJSON(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Archivo JSON inválido.");
  }

const formatosValidos = new Set(["uci-lab-navegador", "uci-lab-extractor"]);
if (!formatosValidos.has(payload.format)) {
  throw new Error("El archivo no corresponde a UCI Lab Navegador.");
}

  if (payload.version !== 1) {
    throw new Error(`Versión de backup no soportada: ${payload.version}`);
  }

  if (!payload.data || typeof payload.data !== "object") {
    throw new Error("El backup no contiene datos clínicos.");
  }

  const data = payload.data;
  const rut = String(data?.paciente?.rut || payload.patientKey || "").trim();

  if (!rut) {
    throw new Error("El backup no contiene RUT del paciente.");
  }

  if (!data.ordenes || typeof data.ordenes !== "object") {
    throw new Error("El backup no contiene órdenes válidas.");
  }

  return { rut, data };
}

async function exportarPacienteJSON(rut) {
  const data = await obtener(rut);
  if (!data) {
    alert("No hay datos para este paciente");
    return;
  }

  const payload = construirBackupPacienteJSON(rut, data);
  const rutSafe = data?.paciente?.rut || rut;
  descargarJSON(`UCI_${rutSafe}.json`, payload);
}

// Usa chrome.storage.local vía storage.js + construirMatrizClinica (async)
async function exportarPacienteCSV(rut, opciones = {}) {
  const data = await obtener(rut);
  if (!data) {
    alert("No hay datos para este paciente");
    return;
  }

  const matrizClinica = await construirMatrizClinica(rut);
  if (!matrizClinica) {
    alert("No se pudo construir la matriz");
    return;
  }

  const matriz = convertirAMatrizBidimensional(matrizClinica, opciones);
  if (!matriz) {
    alert("No se pudo construir la matriz");
    return;
  }

  const { paciente, ordenes } = data;

  // ===== 1) Metadatos =====
  const ahora = new Date();
  const fechaExport =
    ahora.getFullYear() + "-" +
    String(ahora.getMonth() + 1).padStart(2, "0") + "-" +
    String(ahora.getDate()).padStart(2, "0") + " " +
    String(ahora.getHours()).padStart(2, "0") + ":" +
    String(ahora.getMinutes()).padStart(2, "0");

  const meta = [
    ["Paciente", paciente?.nombre ?? ""],
    ["RUT", paciente?.rut ?? rut],
    ["Fecha exportación", fechaExport],
    ["Total órdenes", Object.keys(ordenes || {}).length],
    []
  ];

  // ===== 2) Matriz completa =====
  const matrizCompleta = [...meta, ...matriz];

  const contenidoCSV = generarCSV(matrizCompleta);
  descargarCSV(`UCI_${paciente?.rut ?? rut}.csv`, contenidoCSV);
}

async function importarPacienteJSONDesdeArchivo(file) {
  if (!file) throw new Error("No se seleccionó archivo.");

  const texto = await file.text();

  let payload;
  try {
    payload = JSON.parse(texto);
  } catch {
    throw new Error("El archivo no contiene un JSON válido.");
  }

  const { rut, data } = validarBackupPacienteJSON(payload);

  await guardar(rut, data);
  await guardarRutActual(rut);

  return {
    rut,
    nombre: data?.paciente?.nombre || "",
    totalOrdenes: Object.keys(data?.ordenes || {}).length
  };
}

async function importarPacienteJSONConPicker(inputEl) {
  if (!inputEl?.files?.length) {
    throw new Error("No se seleccionó archivo.");
  }

  const file = inputEl.files[0];
  return await importarPacienteJSONDesdeArchivo(file);
}
