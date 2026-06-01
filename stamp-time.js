(function (root) {
  function composeStampUTC(dateUTC, hh, mm) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateUTC || '')) {
      throw new Error('A UTC stamp date is required');
    }
    return new Date(`${dateUTC}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00Z`).toISOString();
  }

  root.composeStampUTC = composeStampUTC;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { composeStampUTC };
  }
})(typeof window !== 'undefined' ? window : globalThis);
