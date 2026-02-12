function convertirAMatrizBidimensional(matrizClinica) {

    if (!matrizClinica) return null;

    const { columnas, filas, ordenFilas } = matrizClinica;

    // ===== 1️⃣ Encabezado =====
    const header = ["Examen"];

    columnas.forEach(col => {
        header.push(`${col.timestamp} (${col.orden})`);
    });

    const matriz = [header];

    // ===== 2️⃣ Filas =====
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
