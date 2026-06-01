(function (root) {
  const RETIRED_AIRCRAFT = ['HS-TER', 'HS-TES', 'HS-TEU'];

  root.RETIRED_AIRCRAFT = RETIRED_AIRCRAFT;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RETIRED_AIRCRAFT };
  }
})(typeof window !== 'undefined' ? window : globalThis);
