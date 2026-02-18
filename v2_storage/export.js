// export.js

function convertirAMatrizBidimensional(matrizClinica) {
  if (!matrizClinica) return null;

  const { columnas, filas, ordenFilas } = matrizClinica;

  // ===== 1️. Encabezado =====
  const header = ["Examen"];

  columnas.forEach(col => {
    // Mantengo formato simple para CSV (una celda por columna)
    // Si después quieres 3 líneas (fecha/hora/orden) lo hacemos en viewer, no en CSV.
    header.push(`${col.timestamp} (${col.orden})`);
  });

  const matriz = [header];

  // ===== 2️. Filas =====
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

  const lineas = matriz.map(fila =>
    fila.map(celda => {
      if (celda === null || celda === undefined) return "";

      const texto = String(celda);

      // Escapar comillas si existen
      const escapado = texto.replace(/"/g, '""');

      // Si contiene ; o salto de línea, envolver en comillas
      if (escapado.includes(";") || escapado.includes("\n") || escapado.includes("\r")) {
        return `"${escapado}"`;
      }

      return escapado;
    }).join(";")
  );

  return lineas.join("\n");
}

function descargarCSV(nombreArchivo, contenidoCSV) {
  if (!contenidoCSV) return;

  const blob = new Blob([contenidoCSV], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Ahora async: usa chrome.storage.local vía storage.js (obtener/guardar async)
async function exportarPacienteCSV(rut) {
  const data = await obtener(rut);
  if (!data) {
    alert("No hay datos para este paciente");
    return;
  }

  // await funciona aunque construirMatrizClinica aún no sea async
  const matrizClinica = await construirMatrizClinica(rut);
  const matriz = convertirAMatrizBidimensional(matrizClinica);

  if (!matriz) {
    alert("No se pudo construir la matriz");
    return;
  }

  const { paciente, ordenes } = data;

  // ===== 1️. Metadatos =====
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

  // ===== 2️. Matriz completa =====
  const matrizCompleta = [
    ...meta,
    ...matriz
  ];

  const contenidoCSV = generarCSV(matrizCompleta);
  descargarCSV(`UCI_${paciente?.rut ?? rut}.csv`, contenidoCSV);
}
