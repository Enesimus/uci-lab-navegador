function convertirAMatrizBidimensional(matrizClinica) {
  if (!matrizClinica) return null;

  const { columnas, filas, ordenFilas } = matrizClinica;

  const header = ["Examen"];
  columnas.forEach(col => header.push(`${col.timestamp} (${col.orden})`));

  const matriz = [header];

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

  return matriz
    .map(fila =>
      fila.map(celda => {
        if (celda === null || celda === undefined) return "";
        const texto = String(celda);
        const escapado = texto.replace(/"/g, '""');
        if (escapado.includes(";") || escapado.includes("\n")) return `"${escapado}"`;
        return escapado;
      }).join(";")
    )
    .join("\n");
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

async function exportarPacienteCSV(rut) {
  const data = await obtener(rut);

  if (!data) {
    alert("No hay datos para este paciente");
    return;
  }

  const matrizClinica = await construirMatrizClinica(rut);
  const matriz = convertirAMatrizBidimensional(matrizClinica);

  if (!matriz) {
    alert("No se pudo construir la matriz");
    return;
  }

  const { paciente, ordenes } = data;

  const ahora = new Date();
  const fechaExport =
    ahora.getFullYear() + "-" +
    String(ahora.getMonth() + 1).padStart(2, "0") + "-" +
    String(ahora.getDate()).padStart(2, "0") + " " +
    String(ahora.getHours()).padStart(2, "0") + ":" +
    String(ahora.getMinutes()).padStart(2, "0");

  const meta = [
    ["Paciente", paciente.nombre],
    ["RUT", paciente.rut],
    ["Fecha exportación", fechaExport],
    ["Total órdenes", Object.keys(ordenes).length],
    []
  ];

  const matrizCompleta = [...meta, ...matriz];
  descargarCSV(`UCI_${paciente.rut}.csv`, generarCSV(matrizCompleta));
}
