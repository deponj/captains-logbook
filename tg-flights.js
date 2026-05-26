// Thai Airways (TG) flight number → route lookup.
// Seeded from Prinn's actual flown history. Add/edit as needed.
// Odd numbers = outbound from BKK, even = inbound (TG convention).
window.TG_ROUTES = {
  // ── Domestic ──────────────────────────────────────────────
  // BKK ↔ CNX (Chiang Mai)
  '120': { dep:'BKK', dest:'CNX' }, '121': { dep:'CNX', dest:'BKK' },

  // BKK ↔ HKT (Phuket)
  '217': { dep:'BKK', dest:'HKT' }, '218': { dep:'HKT', dest:'BKK' },

  // ── South Asia ────────────────────────────────────────────
  // BKK ↔ DEL (Delhi)
  '315': { dep:'BKK', dest:'DEL' }, '316': { dep:'DEL', dest:'BKK' },
  '323': { dep:'BKK', dest:'DEL' }, '324': { dep:'DEL', dest:'BKK' },
  '335': { dep:'BKK', dest:'DEL' }, '336': { dep:'DEL', dest:'BKK' },

  // BKK ↔ BOM (Mumbai)
  '317': { dep:'BKK', dest:'BOM' }, '318': { dep:'BOM', dest:'BKK' },

  // BKK ↔ HYD (Hyderabad)
  '329': { dep:'BKK', dest:'HYD' }, '330': { dep:'HYD', dest:'BKK' },

  // BKK ↔ MAA (Chennai)
  '337': { dep:'BKK', dest:'MAA' }, '338': { dep:'MAA', dest:'BKK' },

  // ── Pakistan ──────────────────────────────────────────────
  // BKK ↔ ISB (Islamabad)
  '349': { dep:'BKK', dest:'ISB' }, '350': { dep:'ISB', dest:'BKK' },

  // ── SE Asia ───────────────────────────────────────────────
  // BKK ↔ SIN (Singapore)
  '401': { dep:'BKK', dest:'SIN' }, '402': { dep:'SIN', dest:'BKK' },

  // ── East Asia ─────────────────────────────────────────────
  // BKK ↔ NRT (Tokyo Narita)
  '640': { dep:'BKK', dest:'NRT' },

  // BKK ↔ FUK (Fukuoka)
  '648': { dep:'BKK', dest:'FUK' }, '649': { dep:'FUK', dest:'BKK' },
};

// Accepts "TG401", "TG 401", "tg 401", "401" and returns { dep, dest } or null.
window.lookupTGRoute = function (input) {
  if (!input) return null;
  const s = String(input).toUpperCase().replace(/\s+/g, '');
  const m = s.match(/^(?:TG)?0*(\d{1,4})$/);
  if (!m) return null;
  return window.TG_ROUTES[m[1]] || null;
};
