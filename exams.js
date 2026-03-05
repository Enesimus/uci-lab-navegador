/*
UCI Lab Extractor
Copyright (C) 2026 Juan Sepúlveda Sepúlveda

Licensed under the GNU General Public License v3.0
*/

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

// Definición de lista de examenes fija inicial
const MAP_EXAMENES = {
    "PH": "pH",
    "PO2": "pO2",
    "PCO2": "pCO2",
    "BICARBONATO (HCO3)": "HCO3",
    "EXCESO DE BASE (BEB)": "BE",
    "SATURACION DE 02 CALCULADA (SO2C)": "satO2",
    "ACIDO LACTICO (LACTATO)": "Lactato",
    "LACTATO": "Lactato",
    "ACIDO LACTICO": "Lactato",
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
    "TRIGLICERIDOS": "Trigliceridos",
    "ALBUMINA": "Albumina",
    "DESHIDROGENASA LACTICA (LDH)": "LDH",
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
    "VOLUMEN CORPUSCULAR MEDIO":"VCM",
    "CHCM":"CHCM",
    "LEUCOCITOS": "Leucocitos",
    "BASOFILOS %": "Basofilos %",
    "EOSINOFILOS %":"Eosinofilos %",
    "LINFOCITOS %":"Linfocitos %",
    "MONOCITOS %":"Monocitos %",
    "NEUTROFILOS %":"Neutrofilos %",
    "NEUTROFILOS": "RAN",
    "LINFOCITOS": "RAL",
    "GRANULOCITOS INMADUROS %": "% inmaduros",
    "PLAQUETAS": "Plaquetas",
    "PROTEINA C REACTIVA": "PCR",
    "PROCALCITONINA": "PCT"
};

function normalizarNombreExamen(nombre) {
  if (!nombre) return "";

  return String(nombre)
    .toUpperCase()
    .normalize("NFD")                 // quitar acentos
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mapearExamen(nombreOriginal) {
  const norm = normalizarNombreExamen(nombreOriginal);

  const mapaNormalizado = {};
  Object.entries(MAP_EXAMENES).forEach(([k, v]) => {
    mapaNormalizado[normalizarNombreExamen(k)] = v;
  });

  return mapaNormalizado[norm] || nombreOriginal;
}



// Definicion de lista de examenes que se excluiran
const MAP_EXAMENES_EXCL = [
    "C02 TOTAL (TCO2)",
    "BASOFILOS",
    "EOSINOFILOS",
    "HEMOGLOBINA CORPUSCULAR MEDIA",
    "MONOCITOS",
    "ERITROCITOS",
    "RDW-CV",
    "GRANULOCITOS INMADUROS",
    "TP SEGUNDOS"
];

const SET_EXCL = new Set(MAP_EXAMENES_EXCL.map(normalizarClave));

function examenExcluido(nombre) {
  return SET_EXCL.has(normalizarClave(nombre));
}

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
