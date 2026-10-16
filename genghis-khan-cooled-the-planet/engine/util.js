// Shared deterministic helpers (node + browser).
(function (root) {
  const U = {
    mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; },
    clamp: (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)),
    lerp: (a, b, t) => a + (b - a) * t,
    // progress of t through [a, b], clamped
    prog(t, a, b) { return U.clamp((t - a) / (b - a)); },
    easeOut: t => 1 - Math.pow(1 - t, 3),
    easeIn: t => t * t * t,
    easeInOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    backOut(t) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    // Arabic-Indic digits with Arabic thousands separator
    arNum(n) { const s = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
      return s.replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]); },
  };
  if (typeof module !== 'undefined') module.exports = U; else root.U = U;
})(typeof window !== 'undefined' ? window : globalThis);
