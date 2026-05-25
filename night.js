// Night-time calc — great-circle interpolate every 1 min, count minutes
// where sun altitude < -6° (civil twilight, standard aviation night).
// Requires SunCalc loaded globally.

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

// Returns { latDeg, lonDeg } interpolated along great circle, fraction f in [0,1]
function gcInterp(lat1, lon1, lat2, lon2, f) {
  const φ1 = lat1 * D2R, λ1 = lon1 * D2R;
  const φ2 = lat2 * D2R, λ2 = lon2 * D2R;
  const Δφ = φ2 - φ1, Δλ = λ2 - λ1;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const δ = 2 * Math.asin(Math.min(1, Math.sqrt(a)));
  if (δ < 1e-9) return { latDeg: lat1, lonDeg: lon1 };
  const A = Math.sin((1 - f) * δ) / Math.sin(δ);
  const B = Math.sin(f * δ) / Math.sin(δ);
  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);
  const φi = Math.atan2(z, Math.sqrt(x * x + y * y));
  const λi = Math.atan2(y, x);
  return { latDeg: φi * R2D, lonDeg: λi * R2D };
}

// airborne, touchdown: ISO datetime strings (UTC). depAp / destAp: { lat, lon }.
// Returns night minutes (integer).
window.computeNightMinutes = function (airborneISO, touchdownISO, depAp, destAp) {
  if (!airborneISO || !touchdownISO || !depAp || !destAp) return 0;
  if (typeof SunCalc === 'undefined') return 0;
  const t0 = new Date(airborneISO).getTime();
  const t1 = new Date(touchdownISO).getTime();
  if (!(t1 > t0)) return 0;
  const totalMin = Math.round((t1 - t0) / 60000);
  if (totalMin <= 0) return 0;
  let night = 0;
  for (let m = 0; m < totalMin; m++) {
    const f = totalMin === 1 ? 0.5 : m / (totalMin - 1);
    const p = gcInterp(depAp.lat, depAp.lon, destAp.lat, destAp.lon, f);
    const when = new Date(t0 + m * 60000);
    const alt = SunCalc.getPosition(when, p.latDeg, p.lonDeg).altitude; // radians
    if (alt * R2D < -6) night++;
  }
  return night;
};

// touchdown landing classification
window.classifyLanding = function (touchdownISO, destAp) {
  if (!touchdownISO || !destAp || typeof SunCalc === 'undefined') return null;
  const when = new Date(touchdownISO);
  const alt = SunCalc.getPosition(when, destAp.lat, destAp.lon).altitude * R2D;
  return alt < -6 ? 'Night' : 'Day';
};
