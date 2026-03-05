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