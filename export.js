/*
UCI Lab Extractor
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
