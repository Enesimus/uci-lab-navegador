function construirMatrizPorFechaExacta(datos) {
    
}

function construirMatrizPorOrden(datos) {

}


// Construir matriz clinica
function construirMatrizClinica(eventos) {

    // Ordenar columnas cronológicamente
    const columnas = Object.keys(eventos).sort();

    // Detectar todos los exámenes presentes
    const examenesDetectados = new Set();

    columnas.forEach(fecha => {
        Object.keys(eventos[fecha]).forEach(examen => {
            examenesDetectados.add(examen);
        });
    });

    // Construir lista mixta (fijos + dinámicos)
    const filas = [...EXAMENES_FIJOS];

    examenesDetectados.forEach(examen => {
        if (!filas.includes(examen)) {
            filas.push(examen);
        }
    });

    // Construir matriz vacía
    const matriz = {};

    filas.forEach(examen => {
        matriz[examen] = {};
        columnas.forEach(fecha => {
            matriz[examen][fecha] = null;
        });
    });

    // Llenar valores reales
    columnas.forEach(fecha => {
        Object.entries(eventos[fecha]).forEach(([examen, valor]) => {

            // convertir a número si corresponde
            const valorNumerico = isNaN(valor) ? valor : Number(valor);

            matriz[examen][fecha] = valorNumerico;
        });
    });

    return {
        columnas,
        filas,
        matriz
    };
}