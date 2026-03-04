/*
UCI Lab Extractor
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

  // Segmenta el string a pares key/value usando ocurrencias de "Algo:"
  function segmentByColonKeys(text) {
    const t = cleanText(text);
    if (!t) return [];

    const re = /([A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\/\-\.\s]{2,}):(?=\s|$)/g;

    const hits = [];
    let m;
    while ((m = re.exec(t)) !== null) {
      hits.push({ key: cleanText(m[1]), idx: m.index, end: re.lastIndex });
    }
    if (!hits.length) return [];

    const segs = [];
    for (let i = 0; i < hits.length; i++) {
      const cur = hits[i];
      const next = hits[i + 1];
      const valStart = cur.end;
      const valEnd = next ? next.idx : t.length;
      segs.push({ key: cur.key, value: cleanText(t.slice(valStart, valEnd)) });
    }
    return segs;
  }

  function parseAtbValue(value) {
    const v = cleanText(value);
    if (!v) return { cim: null, interp: null, resto: "" };

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
      else interp = interp[0].toUpperCase() + interp.slice(1).toLowerCase();
    }

    let resto = v;
    if (mCim) resto = resto.replace(mCim[0], "").trim();
    if (mInterp) resto = resto.replace(mInterp[0], "").trim();

    return { cim, interp, resto };
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

    const segs = segmentByColonKeys(text);
    if (!segs.length) {
      out.microorganismo = text;
      return out;
    }

    for (const { key, value } of segs) {
      const k = normKey(key);

      if (k === "MICROORGANISMO") {
        out.microorganismo = value || out.microorganismo;
        continue;
      }

      if (k.startsWith("RECUENTO DE COLONIAS")) {
        out.recuento = value || out.recuento;
        continue;
      }

      // antibiótico genérico
      const parsed = parseAtbValue(value);
      out.antibioticos.push({
        antibiotico: cleanText(key),
        cim: parsed.cim,
        interp: parsed.interp,
        raw: value
      });
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

  // export
  window.Cultures = {
    cleanText,
    parseAislado,
    parseReferenciaAntibiograma,
    isAisladoPrueba
  };
})();