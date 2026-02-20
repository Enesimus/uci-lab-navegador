// matrix.js

function esResultadoValido(r) {
  if (!r) return false;

  const valor = (r.valor ?? r.Resultado ?? "");
  if (valor === null || valor === undefined) return false;

  const texto = String(valor).trim().toUpperCase();
  if (texto === "") return false;
  if (texto === "PENDIENTE") return false;
  if (texto === "RECHAZADO") return false;

  return true;
}

async function construirMatrizClinica(rut) {
  const data = await obtener(rut);
  if (!data || !data.ordenes) return null;

  const paciente = data.paciente;

    const columnas = Object.entries(data.ordenes)
      .map(([hashKey, contenido]) => {
      const registrosValidos = (contenido.registros || []).filter(esResultadoValido);
      if (!registrosValidos.length) return null;

      const fechasBase = registrosValidos
        .map(r => r.fechaValidacion)
        .filter(Boolean)
        .sort();

      // timestamp preferido: el más antiguo válido de los registros;
      // si no hay, usar timestamp/fechaExtraccion del objeto orden
      const timestamp = (fechasBase[0] || contenido.timestamp || contenido.fechaExtraccion || null);
      if (!timestamp) return null;

      // label de orden para la cabecera (NO mostrar hash completo)
      const ordenLabel =
        (contenido.orden != null && String(contenido.orden).trim() !== "")
          ? String(contenido.orden).trim()
          : (contenido.ordenOriginal && String(contenido.ordenOriginal).trim() !== "")
            ? String(contenido.ordenOriginal).trim()
            : `hash:${String(hashKey).slice(0, 8)}`;

      return {
        hash: contenido.hash || hashKey,
        orden: ordenLabel,
        timestamp,
        registros: registrosValidos
      };
    })
    .filter(Boolean);

  if (!columnas.length) return null;

  columnas.sort((a, b) => {
    const fA = new Date(String(a.timestamp).replace(" ", "T"));
    const fB = new Date(String(b.timestamp).replace(" ", "T"));

    if (fA < fB) return -1;
    if (fA > fB) return 1;

    return String(a.orden).localeCompare(String(b.orden), undefined, { numeric: true });
  });

  const ordenBaseFilas = Array.from(new Set(Object.values(MAP_EXAMENES)));
  const filas = {};
  const examenesExtra = new Set();

  ordenBaseFilas.forEach(ex => { filas[ex] = {}; });

  columnas.forEach(col => {
    const timestamp = col.timestamp;

    col.registros.forEach(r => {
      const examenCrudo = (r.examen || r.Prueba || "").trim();
      if (!examenCrudo) return;

      // Mapeo de nombres alternativos
      const examenCanonico = (typeof mapearExamen === "function")
        ? mapearExamen(examenCrudo)
        : examenCrudo;

      // Exclusión opcional (si definiste examenExcluido en exams.js)
      if (typeof examenExcluido === "function" && examenExcluido(examenCanonico)) return;

      let examen = normalizarNombre(examenCanonico);

      const estudio = (r.estudio || r.Estudio || "").toUpperCase();
      if (estudio.includes("ARTERIAL")) examen += "_A";
      else if (estudio.includes("VENOS")) examen += "_V";

      if (!filas[examen]) {
        examenesExtra.add(examen);
        filas[examen] = {};
      }

      filas[examen][timestamp] = (r.valor ?? r.Resultado ?? "");
    });
  });

  return {
    paciente,
    columnas: columnas.map(c => ({ hash: c.hash, orden: c.orden, timestamp: c.timestamp })),
    filas,
    ordenFilas: [...ordenBaseFilas, ...Array.from(examenesExtra)]
  };
}
