// content.js
// Normaliza exámenes y los agrupa por fecha + hora (eventos UCI)

// url laboratorio http://10.6.127.136/GestionIntegrada/Clinicos#

(function () {
    console.log("content.js UCI: normalizacion + eventos");

    // Diccionario mínimo de normalizacion
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
"BILIRRUBINA DIRECTA":"",
"BILIRRUBINA TOTAL":"",
"FOSFATASA ALCALINA":"",
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

        // Solo agregar si tiene al menos prueba, resultado y fecha de validacion
        if (registro.Prueba && registro.Resultado && registro.FechaValidacion) {
            resultados.push(registro);
        };
    });

    console.log("Resultados extraidos:", resultados);

    // Funcion para normalizar fecha/hora
    function normalizarFechaHora(texto) {
        // Esperado : "08-02-2026 08:15"
        txt = texto;
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

        const nombreRaw = registro.Prueba.toUpperCase();
        const examen = MAP_EXAMENES[nombreRaw] || nombreRaw;

        if (!eventos[evento]) {
            eventos[evento] = {};
        }

        eventos[evento][examen] = resultados.registro;
    });

    // Ordenar cronologicamente los eventos
    const eventosOrdenados = Object.keys(eventos)
        .sort()
        .reduce((acc,key)=> {
            acc[key] = eventos[key];
            return acc;
        },{});

    console.log("Eventos UCI (agrupados y ordenados):", eventosOrdenados);


    // Guardamos los datos en window para que otros script los usen después
    window.__UCI_EVENTOS__ = eventosOrdenados;

    console.log(`${resultados.length} exámenes cargados en window.__UCI_EVENTOS__`);
})();
