// IndexedDB schema via Dexie.
//   flights  — flight records
//   airports — IATA + lat/lon (seeded + user-added)
//   aircraft — one row per tail: { reg (pk), type }
//   settings — kv store (skin, etc.)

function buildDb() {
  const db = new Dexie('CaptainsLogbook');
  db.version(1).stores({
    flights:  '++id, dateUTC, fltNo, reg, dep, dest, updatedAt',
    airports: '&iata',
    aircraft: '&type',
    settings: '&key',
  });
  db.version(2).stores({
    flights:  '++id, dateUTC, fltNo, reg, dep, dest, updatedAt',
    airports: '&iata',
    aircraft: '&reg, type',
    settings: '&key',
  }).upgrade(async tx => {
    let old = [];
    try { old = await tx.table('aircraft').toArray(); } catch {}
    await tx.table('aircraft').clear();
    const flat = [];
    for (const a of old) {
      if (a && a.reg && a.type) flat.push({ reg: a.reg, type: a.type });
      else if (a && Array.isArray(a.regs)) {
        const type = a.type || '';
        for (const r of a.regs) flat.push({ reg: r, type });
      }
    }
    if (flat.length) await tx.table('aircraft').bulkAdd(flat);
  });
  return db;
}

let db = buildDb();
window.db = db;

window.dbInit = async function () {
  try {
    await db.open();
  } catch (err) {
    console.warn('[Logbook] DB open failed, resetting:', err);
    try { await db.delete(); } catch {}
    db = buildDb();
    window.db = db;
    await db.open();
  }
  const apCount = await db.airports.count();
  if (apCount === 0 && window.SEED_AIRPORTS) await db.airports.bulkAdd(window.SEED_AIRPORTS);
  const acCount = await db.aircraft.count();
  if (acCount === 0 && window.SEED_AIRCRAFT) await db.aircraft.bulkAdd(window.SEED_AIRCRAFT);
  if (window.RETIRED_AIRCRAFT?.length) await db.aircraft.bulkDelete(window.RETIRED_AIRCRAFT);
  const skin = await db.settings.get('skin');
  if (!skin) await db.settings.put({ key:'skin', value:'paper' });
};

window.getSetting = async function (k, fallback) {
  const r = await db.settings.get(k);
  return r ? r.value : fallback;
};
window.setSetting = async function (k, v) {
  await db.settings.put({ key: k, value: v });
};
