// storage.js

function obtenerClavePaciente(rut) {
    return `UCI_${rut}`;
}

function firmaRegistros(registros) {
  return (registros || [])
    .map(r => `${r.examen}|${r.fechaValidacion}|${r.valor}|${r.unidad}`)
    .sort()
    .join(";");
}

function yaExisteMismaOrden(data, orden, firma) {
  return Object.values(data.ordenes || {}).some(o =>
    (o.ordenOriginal === orden) && (o.firma === firma)
  );
}


function guardar(contexto) {
  const { paciente, orden, registros } = contexto;

  if (!paciente?.rut || !orden) {
    console.warn("Datos incompletos para guardar");
    return;
  }

  if (!registros?.length) {
    console.warn("Orden sin registros");
    return;
  }

  const clave = obtenerClavePaciente(paciente.rut);

  let data = JSON.parse(localStorage.getItem(clave) || "null");

  if (!data) {
    data = { paciente, ordenes: {} };
  }

  //  1) calcular “timestamp” representativo de esta extracción (mínima fechaValidacion)
  let fechas = registros
    .map(r => r.fechaValidacion)
    .filter(Boolean)
    .sort();

  const ts = fechas[0] || new Date().toISOString();

  const registrosNormalizados = (registros || []).map(r => ({...r,
  fechaValidacion: r.fechaValidacion || ts}));

  const firma = firmaRegistros(registrosNormalizados);

    if (yaExisteMismaOrden(data, orden, firma)) {
        console.log("Orden duplicada (misma firma), no se guarda:", orden);
        return;
    }


  //  2) clave única por extracción
  const claveOrden = `${orden}__${ts}__${Date.now()}`;

  // Guardar sin pisar otras extracciones

  data.ordenes[claveOrden] = {
    ordenOriginal: orden,
    timestamp: ts, firma,
    fechaExtraccion: new Date().toISOString(),
    registros: registrosNormalizados
    };

  // Mantener paciente actualizado (por si corrige nombre después)
  data.paciente = paciente;

  localStorage.setItem(clave, JSON.stringify(data));

  console.log(`Orden ${orden} (${ts}) guardada correctamente`);
}


function obtener(rut) {
    const clave = obtenerClavePaciente(rut);
    return JSON.parse(localStorage.getItem(clave) || "null");
}

// function obtenerOrdenes(rut) {
//    const data = obtener(rut);
//    if (!data) return [];
//    return Object.values(data.ordenes);
// }

function obtenerOrdenes(rut) {
    const data = obtener(rut);
    if (!data) return [];

    return Object.entries(data.ordenes).map(([orden, contenido]) => ({
        orden,
        ...contenido
    }));
}

function limpiar(rut) {
    const clave = obtenerClavePaciente(rut);
    localStorage.removeItem(clave);
    console.log(`Datos del paciente ${rut} eliminados`);
}



