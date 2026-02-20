// content.js
// Normaliza exámenes y los agrupa por fecha + hora (eventos UCI)

// url laboratorio http://10.6.127.136/GestionIntegrada/Clinicos#

(function () {
    console.log("content.js UCI: normalizacion + eventos");

    // Diccionario mínimo de normalizacion
    
    // Funcion para normalizar nombres de examenes
    function normalizarNombreExamen(texto) {
        return texto
        .toUpperCase()
        .normalize("NFD")                // elimina tildes
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .replace(/-/g, " ")
        .trim();
    }
    // (Esto despues se movera a exams.js)
    const MAP_EXAMENES = {
                "pH": "pH",
                "pO2": "pO2",
                "pCO2": "pCO2",
                "BICARBONATO (HCO3)": "HCO3",
                "EXCESO DE BASE (BEb)": "BEb",
                "SATURACION DE 02 CALCULADA (sO2c)": "satO2",
                "LACTATO": "Lactato",
                "AMONIO": "Amonio",
                "SODIO": "Na",
                "POTASIO":"K",
                "CLORO": "Cl",
                "CALCIO IONICO": "iCa",
                "FOSFORO": "P",
                "MAGNESIO":"Mg",
                "GLUCOSA": "Glucosa",
                "BUN": "BUN",
                "CREATININA": "Creat",
                "BILIRRUBINA DIRECTA":"BD",
                "BILIRRUBINA TOTAL":"BT",
                "FOSFATASA ALCALINA":"FA",
                "GOT":"GOT",
                "GPT":"GPT",
                "TRIGLICERIDOS":"Trigl",
                "ALBUMINA":"Albumina",
                "LDH":"LDH",
                "AMILASA":"Amilasa",
                "LIPASA":"Lipasa",
                "CK TOTAL":"CK Total",
                "CK MB":"CK MB",
                "TROPONINA": "Troponina",
                "TP PORCENTAJE": "TP %",
                "INR": "INR",
                "TIEMPO DE TROMBOPLASTINA PARCIAL ACTIVADO (TTPA)": "TTPA",
                "FIBRINOGENO":"Fibrinogeno",
                "DIMERO-D":"Dimero D",
                "HEMATOCRITO": "Hcto",
                "HEMOGLOBINA": "Hb",
                "LEUCOCITOS": "Leucocitos",
                "NEUTROFILOS": "RAN",
                "LINFOCITOS": "RAL",
                "GRANULOCITOS INMADUROS %": "% inmaduros",
                "PLAQUETAS": "Plaquetas",
                "PROTEINA C REACTIVA": "PCR",
                "PROCALCITONINA":"PCT"
                };
    
    // Normalizar diccionario
    const MAP_EXAMENES_NORMALIZADO = {};

    Object.entries(MAP_EXAMENES).forEach(([key, value]) => {
        MAP_EXAMENES_NORMALIZADO[normalizarNombreExamen(key)] = value;
    });
    
    // Extraer datos del paciente
    function extraerDatosPaciente() {
        const card = document.querySelector("#DatosDemograficos");
        if (!card) return null;

        const celdas = card.querySelectorAll("td");

        let datos = {
            rut: null,
            nombre: null
        };

        for (let i = 0; i < celdas.length; i++) {
            const label = celdas[i].previousElementSibling?.innerText.trim();

            if (label === "Rut Paciente") {
                datos.rut = celdas[i].innerText.trim();
                }

            if (label === "Nombres") {
                const nombres = celdas[i].innerText.trim();
                const apellidoP = celdas[i + 2]?.innerText.trim();
                const apellidoM = celdas[i + 4]?.innerText.trim();

                datos.nombre = `${nombres} ${apellidoP} ${apellidoM}`.trim();
                }
        }

        return datos;
    }

    // Extraer numero de orden
    function extraerNumeroOrden() {
        const titulo = document.querySelector("#ModalMostrarReporte .modal-title");
        if (!titulo) return null;

        const texto = titulo.innerText;
        const match = texto.match(/Orden n°\s*(\d+)/i);

        return match ? match[1] : null;
    }

    // Extraer las filas de resultados
    const filas = document.querySelectorAll("tr.grid-row");

    if (filas.length === 0) {
        console.warn("No se encontraron resultados de laboratorio");
        return;
    }
    
    let resultados = [];
    
    filas.forEach((fila, index) => {
        let registro = {};

        const celdas = fila.querySelectorAll("td.grid-cell");
        
        celdas.forEach(celda => {
            const campo = celda.dataset.name;
            if (!campo) return;

            const valor = celda.innerText.trim();
            registro[campo] = valor;
        });

        // Solo agregar si tiene al menos prueba y fecha de validacion
        if (registro.Prueba && registro.FechaValidacion) {
            resultados.push(registro);
        };
    });

    console.log("Resultados extraidos:", resultados);

    // Funcion para normalizar fecha/hora
    function normalizarFechaHora(texto) {
        // Esperado : "08-02-2026 08:15"
        const partes = texto.split(" ");
        if (partes.length <2) return null;

        const [d, m, y] = partes[0].split("-");
        const hora = partes[1];
        return `${y}-${m}-${d} ${hora}`; // formato ISO para ordenar
    };

    // Agrupar por evento (fecha + hora)
    let eventos = {};

    resultados.forEach(registro => {
        const evento = normalizarFechaHora(registro.FechaValidacion);
        if (!evento) return;

        // const nombreRaw = registro.Prueba;
        // const examen = MAP_EXAMENES[nombreRaw] || nombreRaw;

        const nombreRaw = normalizarNombreExamen(registro.Prueba);
        const examen = MAP_EXAMENES_NORMALIZADO[nombreRaw] || registro.Prueba;

        if (!eventos[evento]) {
            eventos[evento] = {};
        }

        eventos[evento][examen] = registro.Resultado || null;
    });

    // Ordenar cronologicamente los eventos
    const eventosOrdenados = Object.keys(eventos)
        .sort()
        .reduce((acc,key)=> {
            acc[key] = eventos[key];
            return acc;
        },{});

    console.log("Eventos UCI (agrupados y ordenados):", eventosOrdenados);

    // Extraccion estructurada
    const paciente = extraerDatosPaciente();
    const orden = extraerNumeroOrden();

    const contexto = {
        paciente: {
            rut: paciente.rut,
            nombre: paciente.nombre
            },
        orden: orden,
        eventos: eventosOrdenados
    };

    console.log("Contexto clínico completo:", contexto);

    // Guardamos los datos en window para que otros script los usen después
    // window.__UCI_EVENTOS__ = contexto;

    function guardarEventosEnLocalStorage(eventosNuevos) {

        const clave = `UCI_EVENTOS_${paciente.rut}`;


        // Obtener acumulado actual
        let acumulado = JSON.parse(localStorage.getItem(clave) || "{}");

        // Fusionar sin borrar anteriores
        Object.assign(acumulado, eventosNuevos);

        // Guardar nuevamente
        localStorage.setItem(clave, JSON.stringify(acumulado));

        console.log("Eventos acumulados:", acumulado);
    }

    guardarEventosEnLocalStorage(contexto);
    console.log(`${resultados.length} exámenes cargados en localStorage`);
})();