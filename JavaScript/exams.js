// exams.js

function normalizarClave(texto) {
    return texto
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .replace(/-/g, " ")
        .trim();
}

const MAP_EXAMENES = {
    "PH": "pH",
    "PO2": "pO2",
    "PCO2": "pCO2",
    "BICARBONATO (HCO3)": "HCO3",
    "EXCESO DE BASE (BEB)": "BE",
    "SATURACION DE 02 CALCULADA (SO2C)": "satO2",
    "ACIDO LACTICO (LACTATO)": "Lactato",
    "AMONIO": "Amonio",
    "SODIO": "Na",
    "POTASIO": "K",
    "CLORO": "Cl",
    "CALCIO IONICO": "iCa",
    "CALCIO": "Ca total",
    "FOSFORO": "P",
    "MAGNESIO": "Mg",
    "GLUCOSA": "Glucosa",
    "BUN": "BUN",
    "UREMIA": "Uremia",
    "CREATININA": "Creat",
    "BILIRRUBINA TOTAL": "BT",
    "BILIRRUBINA DIRECTA": "BD",
    "BILIRRUBINA INDIRECTA": "BI",
    "FOSFATASA ALCALINA": "FA",
    "GOT": "GOT",
    "GPT": "GPT",
    "TRIGLICERIDOS": "Trigl",
    "ALBUMINA": "Albumina",
    "LDH": "LDH",
    "AMILASA": "Amilasa",
    "LIPASA": "Lipasa",
    "CREATINKINASA TOTAL (CK TOTAL)": "CK Total",
    "CREATINKINASA MB": "CK MB",
    "TROPONINA ULTRASENSIBLE": "Troponina",
    "TP PORCENTAJE": "TP %",
    "INR": "INR",
    "TIEMPO DE TROMBOPLASTINA PARCIAL ACTIVADO (TTPA)": "TTPA",
    "FIBRINOGENO": "Fibrinogeno",
    "DIMERO D": "Dimero D",
    "HEMATOCRITO": "Hcto",
    "HEMOGLOBINA": "Hb",
    "LEUCOCITOS": "Leucocitos",
    "NEUTROFILOS": "RAN",
    "LINFOCITOS": "RAL",
    "GRANULOCITOS INMADUROS %": "% inmaduros",
    "PLAQUETAS": "Plaquetas",
    "PROTEINA C REACTIVA": "PCR",
    "PROCALCITONINA": "PCT"
};

function normalizarNombre(texto) {
    const clave = normalizarClave(texto);
    return MAP_EXAMENES[clave] || texto;
}

function normalizarFecha(texto) {
    if (!texto) return null;

    const match = texto.match(/(\d{2})-(\d{2})-(\d{4})\s+(\d{2}:\d{2}(:\d{2})?)/);

    if (!match) return null;

    const [, d, m, y, hora] = match;

    return `${y}-${m}-${d} ${hora}`;
}
