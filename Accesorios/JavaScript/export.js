function convertirAMatrizBidimensional(matrizClinica) {

    if (!matrizClinica) return null;

    const { columnas, filas, ordenFilas } = matrizClinica;

    // 1. Encabezado
    const header = ["Examen"];

    columnas.forEach(col => {
        header.push(`${col.timestamp} (${col.orden})`);
    });

    const matriz = [header];

    // 2. Filas
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

// export.js

function generarCSV(matriz) {
    if (!matriz || !Array.isArray(matriz)) return null;

    const lineas = matriz.map(fila =>
        fila.map(celda => {
            if (celda === null || celda === undefined) return "";

            const texto = String(celda);

            // Escapar comillas si existen
            const escapado = texto.replace(/"/g, '""');

            // Si contiene ; o salto de linea, envolver en comillas
            if (escapado.includes(";") || escapado.includes("\n")) {
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

function exportarPacienteCSV(rut) {
    console.log("[export] rut:", rut);

    const data = obtener(rut);
    console.log("[export] data:", data);

    if (!data) {
        alert("No hay datos para este paciente");
        return;
    }

    const matrizClinica = construirMatrizClinica(rut);
    console.log("[export] matrizClinica:", matrizClinica);

    const matriz = convertirAMatrizBidimensional(matrizClinica);
    console.log("[export] matrizClinicaBidimensional:", matriz);

    if (!matriz) {
        alert("No se pudo construir la matriz");
        return;
    }

    const { paciente, ordenes } = data;

    // Metadatos
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
        ["Fecha exportacion", fechaExport],
        ["Total ordenes", Object.keys(ordenes).length],
        []
    ];

    // Convertir todo a matriz completa
    const matrizCompleta = [
        ...meta,
        ...matriz
    ];

    const contenidoCSV = generarCSV(matrizCompleta);

    descargarCSV(`UCI_${paciente.rut}.csv`, contenidoCSV);
};

function descargarJSON(nombreArchivo, obj) {
  const contenido = JSON.stringify(obj, null, 2);
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

// Exporta TODOS los pacientes guardados como un solo JSON
function exportarBackupJSON() {
  const backup = {
    version: 1,
    creadoEn: new Date().toISOString(),
    origen: "UCI Lab Extractor",
    pacientes: {}
  };

  // Todas las claves UCI_<rut>
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (!k.startsWith("UCI_")) continue;
    if (k === "UCI_RUT_ACTUAL") continue;

    try {
      const raw = localStorage.getItem(k);
      const data = JSON.parse(raw || "null");
      if (data) backup.pacientes[k] = data;
    } catch (e) {
      // si algo no parsea, lo guardamos como string
      backup.pacientes[k] = { __raw: localStorage.getItem(k) };
    }
  }

  // Nombre archivo: UCI_backup_YYYY-MM-DD_HHMM.json
  const ahora = new Date();
  const yyyy = ahora.getFullYear();
  const mm = String(ahora.getMonth() + 1).padStart(2, "0");
  const dd = String(ahora.getDate()).padStart(2, "0");
  const hh = String(ahora.getHours()).padStart(2, "0");
  const mi = String(ahora.getMinutes()).padStart(2, "0");

  const nombre = `UCI_backup_${yyyy}-${mm}-${dd}_${hh}${mi}.json`;
  descargarJSON(nombre, backup);
}

