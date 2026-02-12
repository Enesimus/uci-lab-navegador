// matrix.js

function esResultadoValido(r) {
  if (!r) return false;

  // En nuestra versión “madura”, los registros ya vienen normalizados desde content.js
  // y se guardan en storage.js con este shape:
  // { fechaValidacion, examen, valor, unidad, referencia }
  // Igual dejamos fallback por si en el futuro guardamos también el HTML crudo.
  const valor = (r.valor ?? r.Resultado ?? "");
  if (valor === null || valor === undefined) return false;

  const texto = String(valor).trim().toUpperCase();
  if (texto === "") return false;
  if (texto === "PENDIENTE") return false;
  if (texto === "RECHAZADO") return false;

  return true;
}

function construirMatrizClinica(rut) {
  const data = obtener(rut);
  if (!data || !data.ordenes) return null;

  const paciente = data.paciente;

  // ===== 1) Construir columnas desde órdenes =====
  const columnas = Object.entries(data.ordenes)
    .map(([orden, contenido]) => {
      const registrosValidos = (contenido.registros || []).filter(esResultadoValido);
      if (!registrosValidos.length) return null;

      // Timestamp principal de la orden = fechaValidación mínima
      // (viene como "YYYY-MM-DD HH:MM(:SS)" desde normalizarFecha en exams.js)
      const fechas = registrosValidos
        .map(r => r.fechaValidacion || normalizarFecha(r.FechaValidacion))
        .filter(Boolean)
        .sort();

      if (!fechas.length) return null;

      return {
        orden,
        timestamp: fechas[0],
        registros: registrosValidos
      };
    })
    .filter(Boolean);

  if (!columnas.length) return null;

  // ===== 2) Ordenar cronológicamente + secundario por número de orden =====
  columnas.sort((a, b) => {
    const fA = new Date(a.timestamp);
    const fB = new Date(b.timestamp);

    if (fA < fB) return -1;
    if (fA > fB) return 1;

    return a.orden.localeCompare(b.orden, undefined, { numeric: true });
  });

  // ===== 3) Crear filas base (orden fijo desde MAP_EXAMENES) =====
  const ordenBaseFilas = Object.values(MAP_EXAMENES);
  const filas = {};
  const examenesExtra = new Set();

  ordenBaseFilas.forEach(ex => {
    filas[ex] = {};
  });

  // ===== 4) Rellenar matriz =====
  columnas.forEach(col => {
    const timestamp = col.timestamp;

    col.registros.forEach(r => {
      // 1) nombre de examen (ya viene normalizado en r.examen)
      let examen = r.examen || normalizarNombre(r.Prueba);

      // 2) Diferenciación gases arteriales / venosos (si algún día lo guardamos)
      const estudio = (r.estudio || r.Estudio || "").toUpperCase();
      if (estudio.includes("ARTERIAL")) examen += "_A";
      else if (estudio.includes("VENOS")) examen += "_V";

      if (!filas[examen]) {
        examenesExtra.add(examen);
        filas[examen] = {};
      }

      // 3) valor
      filas[examen][timestamp] = (r.valor ?? r.Resultado ?? "");
    });
  });

  // ===== 5) Orden final de filas (fijo + extras) =====
  const ordenFinalFilas = [
    ...ordenBaseFilas,
    ...Array.from(examenesExtra)
  ];

  // ===== 6) Retorno estructurado =====
  return {
    paciente,
    columnas: columnas.map(c => ({ orden: c.orden, timestamp: c.timestamp })),
    filas,
    ordenFilas: ordenFinalFilas
  };
}
