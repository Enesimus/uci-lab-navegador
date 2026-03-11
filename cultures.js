/*
UCI Lab Navegador
Copyright (C) 2026 Juan Sepúlveda Sepúlveda

Licensed under the GNU General Public License v3.0
*/

// cultures.js
(function () {
  function cleanText(s) {
    return String(s || "")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normKey(s) {
     return cleanText(s).toUpperCase();
   }

  function parseAtbValue(value) {
    const v = cleanText(value);
    if (!v) return { cim: null, interp: null, raw: "" };

    // MIC: "C.I.M. 16" o "CIM 16"
    const mCim =
      v.match(/C\.?\s*I\.?\s*M\.?\s*([^\s]+)/i) ||
      v.match(/\bCIM\b\s*([^\s]+)/i);

    const cim = mCim ? mCim[1].trim() : null;

    // Interp al final (palabras o letras)
    const mInterp = v.match(/\b(Sensible|Resistente|Intermedio|Susceptible|S|R|I)\b\s*$/i);
    let interp = mInterp ? mInterp[1].trim() : null;

    if (interp) {
      const u = interp.toUpperCase();
      if (u === "S") interp = "Sensible";
      else if (u === "R") interp = "Resistente";
      else if (u === "I") interp = "Intermedio";
      else if (u === "SUSCEPTIBLE") interp = "Sensible";
      //else interp = interp[0].toUpperCase() + interp.slice(1).toLowerCase();
    }

    return {cim, interp, raw: v}
  }

  // Parser principal del texto de AISLADO (un aislado por string)
  function parseAislado(raw) {
    let text = cleanText(raw);
    text = text.replace(/^Obs:\s*/i, "").trim();

    const out = {
      microorganismo: null,
      recuento: null,
      antibioticos: [] // [{ antibiotico, cim, interp, raw }]
    };

    if (!text) return out;

    // 1) Microorganismo
  const mMicro = text.match(/Microorganismo:\s*(.*?)(?=\s+Recuento de Colonias:|\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\/-]+:\s|$)/i);
  if (mMicro) {
    out.microorganismo = cleanText(mMicro[1]);
  }

  // 2) Recuento
  const mRec = text.match(/Recuento de Colonias:\s*(.*?)(?=\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\/-]+:\s|$)/i);
  if (mRec) {
    out.recuento = cleanText(mRec[1]);
  }

  // 3) Antibiograma
  const atbRe = /([A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\/-]+):\s*(.*?)(?=\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\/-]+:\s|$)/g;
  let m;
  while ((m = atbRe.exec(text)) !== null) {
    const nombre = cleanText(m[1]);

    if (/^Microorganismo$/i.test(nombre)) continue;
    if (/^Recuento de Colonias$/i.test(nombre)) continue;
    if (/^Colonias$/i.test(nombre)) continue;

    const value = cleanText(m[2]);
    const parsed = parseAtbValue(value);

    out.antibioticos.push({
      antibiotico: nombre,
      cim: parsed.cim,
      interp: parsed.interp,
      raw: parsed.raw
    });
  }

  // fallback
  if (!out.microorganismo && !out.recuento && !out.antibioticos.length) {
    out.microorganismo = text;
  }

    return out;
  }

  function parseReferenciaAntibiograma(texto) {
    const t = cleanText(texto).replace(/^Obs:\s*/i, "").trim();

    // tolerante a "igual que", "igual al del", I/1/II/2
    const m = t.match(/antibiograma\s+igual(?:\s+al\s+del|\s+que)?\s+(hemocultivo)\s*([ivx]+|\d+)/i);
    if (!m) return null;

    return {
      tipo: m[1].toUpperCase(), // HEMOCULTIVO
      n: String(m[2]).toUpperCase()
    };
  }

  function isAisladoPrueba(prueba) {
    return /\bAISLADO\b/i.test(String(prueba || ""));
  }

  // Parse de "TINCION DE GRAM" (Obs: ...)
  // Heurística: separa por frases de cantidad típicas del LIS.
  function parseGramObservaciones(raw) {
    let text = cleanText(raw);
    text = text.replace(/^Obs:\s*/i, "").trim();
    if (!text) return [];

    const frases = [
      "NO SE OBSERVAN",
      "NO SE OBSERVA",
      "ESCASA CANTIDAD",
      "REGULAR CANTIDAD",
      "MODERADA CANTIDAD",
      "ABUNDANTE CANTIDAD",
      "ESCASOS",
      "ESCASAS"
    ];

    // Ordenar de mayor a menor para evitar matchs parciales
    const frasesSorted = frases.sort((a, b) => b.length - a.length);
    const re = new RegExp(`\\b(${frasesSorted.map(f => f.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")).join("|")})\\b`, "gi");

    const out = [];
    let lastIdx = 0;
    let m;

    while ((m = re.exec(text)) !== null) {
      const frase = cleanText(m[0]);
      const before = cleanText(text.slice(lastIdx, m.index));
      if (before) out.push({ item: before, cantidad: frase });
      lastIdx = re.lastIndex;
    }

    const tail = cleanText(text.slice(lastIdx));
    if (tail) {
      // Si quedó cola sin "cantidad", la dejamos como item libre
      out.push({ item: tail, cantidad: null });
    }

    // Limpieza: si un item quedó solo con "BACTERIAS" y cantidad NO SE OBSERVA(N), igual sirve
    return out;
  }

  function cleanTipoMuestra(raw) {
    const t = cleanText(raw);
    if (!t) return "";
    // quitar paréntesis tipo "(CUANTITATIVO)"
    return t.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  }

  function buildDisplayName(estudioKey, tipoMuestra) {
    const e = normKey(estudioKey);
    const tm = cleanTipoMuestra(tipoMuestra);
    if (!tm) return cleanText(estudioKey);

    // CULTIVO SECRECION: queremos "CULTIVO " + "SECRECION ENDOTRAQUEAL"
    if (e.includes("CULTIVO SECRECION")) return `CULTIVO ${tm}`;

    // CULTIVO DE LIQUIDOS: "CULTIVO " + "LIQUIDO CEFALORRAQUIDEO"
    if (e.includes("CULTIVO DE LIQUIDOS")) return `CULTIVO ${tm}`;

    return cleanText(estudioKey);
  }

  // export
  window.Cultures = {
    cleanText,
    parseAislado,
    parseReferenciaAntibiograma,
    isAisladoPrueba,
    parseGramObservaciones,
    cleanTipoMuestra,
    buildDisplayName
};
})();