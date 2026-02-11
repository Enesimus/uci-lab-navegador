// storage.js

function obtenerClavePaciente(rut) {
    return `UCI_${rut}`;
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

    // Obtener datos existentes
    let data = JSON.parse(localStorage.getItem(clave) || "null");

    if (!data) {
        data = {
            paciente: paciente,
            ordenes: {}
        };
    }

    // Reemplazar orden completa
    data.ordenes[orden] = {
        fechaExtraccion: new Date().toISOString(),
        registros: registros
    };

    localStorage.setItem(clave, JSON.stringify(data));

    console.log(`Orden ${orden} guardada correctamente`);
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



