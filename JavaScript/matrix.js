function esResultadoValido(r) {

    if (!r) return false;

    const estado = (r.Estado || "").trim().toUpperCase();
    const resultado = (r.Resultado || "").trim().toUpperCase();

    // Debe estar validado oficialmente
    if (estado !== "DISPONIBLE") return false;

    // Resultados no válidos explícitos
    if (resultado === "PENDIENTE") return false;
    if (resultado === "RECHAZADO") return false;
    if (resultado === "") return false;

    return true;
}

function construirMatrizClinica(rut) {

    const data = obtener(rut);
    if (!data || !data.ordenes) return null;

    const paciente = data.paciente;

    // ===== 1️⃣ Construir columnas desde órdenes =====
    const columnas = Object.entries(data.ordenes)
        .map(([orden, contenido]) => {

            const registrosValidos = contenido.registros
                .filter(r => esResultadoValido(r));

            if (!registrosValidos.length) return null;

            const fechas = registrosValidos
                .map(r => normalizarFecha(r.FechaValidacion))
                .filter(f => f)
                .sort();

            if (!fechas.length) return null;

            return {
                orden,
                timestamp: fechas[0], // mínima fecha validada
                registros: registrosValidos
            };
        })
        .filter(c => c !== null);

    // ===== 2️⃣ Ordenar cronológicamente + secundario por número =====
    columnas.sort((a, b) => {

        const fA = new Date(a.timestamp);
        const fB = new Date(b.timestamp);

        if (fA < fB) return -1;
        if (fA > fB) return 1;

        return a.orden.localeCompare(b.orden, undefined, { numeric: true });
    });

    // ===== 3️⃣ Crear filas base (orden fijo MAP) =====
    const ordenBaseFilas = Object.values(MAP_EXAMENES);
    const filas = {};
    const examenesExtra = new Set();

    ordenBaseFilas.forEach(ex => {
        filas[ex] = {};
    });

    // ===== 4️⃣ Rellenar matriz =====
    columnas.forEach(col => {

        const timestamp = col.timestamp;

        col.registros.forEach(r => {

            let examen = normalizarNombre(r.Prueba);

            // Diferenciación gases arteriales / venosos
            const estudio = (r.Estudio || "").toUpperCase();

            if (estudio.includes("ARTERIAL")) {
                examen += "_A";
            }
            else if (estudio.includes("VENOS")) {
                examen += "_V";
            }

            if (!filas[examen]) {
                examenesExtra.add(examen);
                filas[examen] = {};
            }

            filas[examen][timestamp] = r.Resultado;
        });
    });

    // ===== 5️⃣ Orden final de filas (fijo + extras) =====
    const ordenFinalFilas = [
        ...ordenBaseFilas,
        ...Array.from(examenesExtra)
    ];

    // ===== 6️⃣ Retorno estructurado =====
    return {
        paciente,
        columnas: columnas.map(c => ({
            orden: c.orden,
            timestamp: c.timestamp
        })),
        filas,
        ordenFilas: ordenFinalFilas
    };
}
