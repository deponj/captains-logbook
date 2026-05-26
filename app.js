// Captain's Logbook — main app. Vanilla JS, IndexedDB via Dexie.

const SKINS = [
  { id:'paper',   name:'Paper',   sub:'Warm day',     swatch:['#f3efe6','#1a1815','#9b3a2a'] },
  { id:'airbus',  name:'Airbus',  sub:'Navy & white', swatch:['#ffffff','#00205b','#0033a0'] },
  { id:'cockpit', name:'Cockpit', sub:'Mint night',   swatch:['#0a0d11','#e8eef5','#6ad4b8'] },
  { id:'ink',     name:'Ink',     sub:'Warm night',   swatch:['#13110e','#ebe3d2','#d27662'] },
];

const ROLES = [
  { value:'PIC',     label:'PIC'      },
  { value:'LowRank', label:'Low Rank' },
];
const DUTIES = ['PF','PM','Cruise'];

const PERIODS = [
  { id:'mtd',  label:'Month to date' },
  { id:'p90',  label:'Previous 90 days' },
  { id:'ytd',  label:'Year to date' },
  { id:'y1',   label:'Last 12 months' },
  { id:'all',  label:'All time' },
];

// ── icons (subset from design, stroke 1.3) ────────────────────────
const ICONS = {
  history:  '<circle cx="9" cy="9" r="6.8"/><path d="M9 5.2v3.8l2.4 2.4"/>',
  chart:    '<path d="M2 15h14"/><path d="M4.5 11.5V8"/><path d="M8 11.5V5.5"/><path d="M11.5 11.5V7"/><path d="M15 11.5V3.5"/>',
  settings: '<circle cx="9" cy="9" r="2.2"/><path d="M9 1.5v2.2M9 14.3v2.2M15.2 9h2.2M.6 9h2.2M13.4 4.6l1.6-1.6M3 15l1.6-1.6M13.4 13.4 15 15M3 3l1.6 1.6"/>',
  moon:     '<path d="M14.2 10.8A5.5 5.5 0 1 1 7.2 3.8a4.6 4.6 0 0 0 7 7z"/>',
  search:   '<circle cx="8" cy="8" r="5"/><path d="M11.8 11.8 15 15"/>',
  chevron:  '<path d="M6 3l4 6-4 6"/>',
  close:    '<path d="M3 3l12 12M15 3 3 15"/>',
  plus:     '<path d="M9 3v12M3 9h12"/>',
  trash:    '<path d="M3 5h12M7 5V3h4v2M5 5l1 11h6l1-11"/>',
  share:    '<path d="M9 1.5v9"/><path d="M5.5 5 9 1.5 12.5 5"/><path d="M3 9.5v6h12v-6"/>',
  file:     '<path d="M4 1.5h6l3 3v12H4z"/><path d="M10 1.5v3h3"/>',
  pin:      '<path d="M9 1.5C6.5 1.5 4.5 3.5 4.5 6c0 3.5 4.5 9 4.5 9s4.5-5.5 4.5-9c0-2.5-2-4.5-4.5-4.5z"/><circle cx="9" cy="6" r="1.6"/>',
  plane:    '<path d="M2 9h14"/><path d="M12 4l4 5-4 5"/>',
  brush:    '<path d="M3 15l4-4 4 4-4 4z"/><path d="M11 7l6-6 0 4-4 0z"/>',
  check:    '<path d="M3 9l4 4 8-9"/>',
};
const ic = (n, size=16) => `<svg width="${size}" height="${size}" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" style="display:block">${ICONS[n]||''}</svg>`;

// ── state ─────────────────────────────────────────────────────────
const state = {
  tab: 'new',
  skin: 'paper',
  airports: [],
  aircraft: [],
  flights: [],
  form: blankForm(),
  search: '',
  swipedId: null,
  settingsOpen: false,
  editingId: null,
  totals: { period:'all', acType:'all' },
  pickerOpen: null, // { key, hh, mm } when picker is showing
  entryMode: 'live', // 'live' (stamp now) | 'backfill' (open picker on empty)
};

function blankForm() {
  const now = new Date();
  return {
    id: null,
    dateUTC: now.toISOString().slice(0,10),
    fltNo: '',
    acType: '',
    reg: '',
    dep: '',
    dest: '',
    role: 'PIC',
    duty: 'PF',
    offBlock: null,
    airborne: null,
    touchdown: null,
    onBlock: null,
    crew: ['','',''],
    remarks: '',
    nightTimeMin: 0,
    ldType: null,
  };
}

// ── helpers ───────────────────────────────────────────────────────
const $ = sel => document.querySelector(sel);
const el = (tag, attrs={}, ...kids) => {
  const e = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'class') e.className = attrs[k];
    else if (k === 'html') e.innerHTML = attrs[k];
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
    else if (attrs[k] != null) e.setAttribute(k, attrs[k]);
  }
  for (const kid of kids.flat()) if (kid != null) e.append(kid.nodeType ? kid : document.createTextNode(kid));
  return e;
};
const fmtMin = (mins) => {
  if (mins == null || isNaN(mins)) return '–:––';
  const h = Math.floor(mins/60), m = Math.abs(mins)%60;
  return `${h}:${String(m).padStart(2,'0')}`;
};
const minsBetween = (a, b) => (a && b) ? Math.max(0, Math.round((new Date(b)-new Date(a))/60000)) : null;
const isoUTCnow = () => new Date().toISOString();
const hhmmZ = (iso) => iso ? new Date(iso).toISOString().slice(11,16) : null;
function fmtDateDMY(yyyymmdd) {
  if (!yyyymmdd || !/^\d{4}-\d{2}-\d{2}$/.test(yyyymmdd)) return '';
  const [y,m,d] = yyyymmdd.split('-');
  return `${d}/${m}/${y}`;
}

const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function toast(msg) {
  let t = $('#toast');
  if (!t) { t = el('div', { id:'toast', class:'toast' }); document.body.append(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 1800);
}

function airportByIATA(code) {
  if (!code) return null;
  return state.airports.find(a => a.iata === code.toUpperCase()) || null;
}

function recomputeNight(f) {
  const dep = airportByIATA(f.dep), dest = airportByIATA(f.dest);
  if (f.airborne && f.touchdown && dep && dest) {
    f.nightTimeMin = window.computeNightMinutes(f.airborne, f.touchdown, dep, dest);
    f.ldType = window.classifyLanding(f.touchdown, dest);
  } else {
    f.nightTimeMin = 0;
    f.ldType = null;
  }
}

function setSkin(s) {
  state.skin = s;
  document.body.dataset.skin = s;
  window.setSetting('skin', s);
}

// ── rendering ─────────────────────────────────────────────────────
function render() {
  const app = $('#app');
  app.innerHTML = '';
  app.append(headerEl(), viewEl(), tabsEl());
  if (state.settingsOpen) app.append(settingsEl());
  const pick = timePickerEl();
  if (pick) app.append(pick);
}

function headerEl() {
  const title = { new:'New Flight', history:'History', totals:'Totals' }[state.tab];
  const sub = {
    new: state.form.id ? 'Editing' : (state.form.offBlock ? 'In flight' : 'Awaiting first stamp'),
    history: `${state.flights.length} flight${state.flights.length===1?'':'s'}`,
    totals: `${state.flights.length} legs`,
  }[state.tab];
  const now = new Date();
  const d = now.toUTCString().slice(0,11);
  const tt = String(now.getUTCHours()).padStart(2,'0')+':'+String(now.getUTCMinutes()).padStart(2,'0');
  return el('div', { class:'hdr' },
    el('span', { class:'hdr-title' }, title),
    el('span', { class:'hdr-sub' }, sub),
    el('div', { class:'hdr-right' },
      el('div', { class:'clock' },
        el('span', { class:'date' }, d.trim()),
        el('span', { class:'time' }, tt),
        el('span', { class:'z' }, 'UTC')),
      el('button', { class:'icon-btn', 'aria-label':'Settings', onclick: () => { state.settingsOpen = true; render(); }, html: ic('settings', 17) })
    ));
}

function tabsEl() {
  const tabs = [
    { id:'new', label:'New Flight' },
    { id:'history', label:'History' },
    { id:'totals', label:'Totals' },
  ];
  const wrap = el('div', { class:'tabs' });
  tabs.forEach(t => {
    const b = el('button', {
      class: 'tab' + (state.tab===t.id?' on':''),
      onclick: () => { state.tab = t.id; state.swipedId = null; render(); }
    },
      el('span', { class:'label' }, t.label),
      el('span', { class:'dot' }));
    wrap.append(b);
  });
  return wrap;
}

function viewEl() {
  const v = el('div', { class:'view' });
  if (state.tab === 'new') v.append(newFlightEl());
  else if (state.tab === 'history') v.append(historyEl());
  else if (state.tab === 'totals') v.append(totalsEl());
  return v;
}

// ── New Flight ─────────────────────────────────────────────────────
function newFlightEl() {
  const f = state.form;
  const wrap = el('div', { class:'nf' });

  const regs = state.aircraft.map(a => a.reg);
  const typeForReg = (r) => (state.aircraft.find(a => a.reg === r)?.type) || '';
  if (!f.reg && regs.length) { f.reg = regs[0]; f.acType = typeForReg(f.reg); }
  if (f.reg) f.acType = typeForReg(f.reg);

  // Header — single Registration picker; type shown as caption
  const hdr = el('div', { class:'nf-hdr' },
    field('Date', (() => {
      const wrap = el('div', { class:'date-wrap' });
      const show = el('span', { class:'date-show mono' }, fmtDateDMY(f.dateUTC));
      const inp = el('input', {
        class:'hf mono date-native', type:'date', value: f.dateUTC,
        oninput: e => { f.dateUTC = e.target.value; show.textContent = fmtDateDMY(f.dateUTC); }
      });
      wrap.append(inp, show);
      return wrap;
    })()),
    field('Flight', el('input', {
      class:'hf mono', placeholder:'TG—', value: f.fltNo, list:'flt-suggest',
      oninput: e => {
        f.fltNo = e.target.value.toUpperCase();
        const route = window.lookupTGRoute && window.lookupTGRoute(f.fltNo);
        if (route) {
          f.dep = route.dep;
          f.dest = route.dest;
          recomputeNight(f);
          renderNewFlight();
        }
      }
    })),
    (() => {
      const wrap = el('div');
      wrap.append(el('div', { class:'lbl' }, 'Aircraft Reg'));
      const sw = el('div', { class:'hs-wrap' });
      const sel = el('select', { class:'hs', onchange: e => {
        f.reg = e.target.value; f.acType = typeForReg(f.reg); renderNewFlight();
      }});
      if (!regs.length) sel.append(el('option', { value:'' }, '— add in Settings —'));
      regs.forEach(r => sel.append(el('option', { value:r, selected: r===f.reg ? '' : null }, r)));
      sw.append(sel);
      wrap.append(sw);
      return wrap;
    })(),
    field('From', el('input', {
      class:'hf mono large upper center', placeholder:'–––', maxlength:3, value: f.dep,
      oninput: e => { f.dep = e.target.value.toUpperCase().slice(0,3); recomputeNight(f); }
    })),
    el('div', { class:'nf-arrow', html: ic('plane', 18) }),
    field('To', el('input', {
      class:'hf mono large upper center', placeholder:'–––', maxlength:3, value: f.dest,
      oninput: e => { f.dest = e.target.value.toUpperCase().slice(0,3); recomputeNight(f); }
    })),
  );

  const regRow = el('div', { class:'nf-rd' },
    el('div', null,
      el('div', { class:'lbl' }, 'Role'),
      seg(ROLES, f.role, v => { f.role = v; renderNewFlight(); }, { deselect:true }),
    ),
    el('div', null,
      el('div', { class:'lbl' }, 'Duty'),
      seg(DUTIES.map(d => ({ value:d, label:d })), f.duty, v => { f.duty = v; renderNewFlight(); }),
    ),
  );

  const dutyRow = el('div', { class:'nf-rd' },
    el('div', null,
      el('div', { class:'lbl' }, 'Entry Mode'),
      seg([
        { value:'live',     label:'Live stamp' },
        { value:'backfill', label:'Backfill'   },
      ], state.entryMode, v => { state.entryMode = v; renderNewFlight(); }),
    ),
    el('div', null,
      el('div', { class:'lbl' }, 'Quick'),
      el('div', { style:'display:flex; gap:10px;' },
        el('button', { class:'inline-btn', onclick:() => { f.dateUTC = new Date().toISOString().slice(0,10); renderNewFlight(); }}, 'Today UTC'),
        el('button', { class:'inline-btn', onclick:() => clearAllStamps() }, 'Clear stamps'),
      ),
    ),
  );

  // Stamps
  const stampRow = el('div', null,
    el('div', { class:'stamps-hdr' },
      el('div', { class:'lbl', style:'margin-bottom:0' }, 'Time Stamps'),
      el('div', { style:'font-family:var(--mono); font-size:10px; color:var(--inkFaint); letter-spacing:1.2px; text-transform:uppercase;' }, 'UTC · hh:mm')
    ),
    (() => {
      const grid = el('div', { class:'stamps' });
      const stamps = [
        { key:'offBlock',  label:'Off-Block' },
        { key:'airborne',  label:'Airborne'  },
        { key:'touchdown', label:'Touchdown' },
        { key:'onBlock',   label:'On-Block'  },
      ];
      const nextIdx = stamps.findIndex(s => !f[s.key]);
      stamps.forEach((s, i) => grid.append(stampEl(s, i, nextIdx)));
      return grid;
    })(),
  );

  const block  = minsBetween(f.offBlock,  f.onBlock);
  const flight = minsBetween(f.airborne, f.touchdown);
  const night  = f.nightTimeMin || 0;
  const comp = el('div', { class:'comp' },
    el('div', { class:'comp-c' }, el('span', { class:'comp-l' }, 'Block Time'), el('span', { class:'comp-v' }, fmtMin(block))),
    el('div', { class:'comp-c' }, el('span', { class:'comp-l' }, 'Flight Time'), el('span', { class:'comp-v' }, fmtMin(flight))),
    el('div', { class:'comp-c' },
      el('span', { class:'comp-l', html: (night>0 ? ic('moon', 11) : '') + '<span>Night Time</span>' }),
      el('span', { class:'comp-v ' + (night>0?'night':'') }, fmtMin(night))
    ),
  );

  // Crew + remarks
  const opt = el('div', { class:'nf-opt' },
    el('div', null,
      el('div', { class:'lbl' }, 'Crew · Employee #'),
      el('div', { class:'crew' },
        ...[0,1,2].map(i => el('input', {
          class:'hf mono', placeholder:'#'+(i+1), value: f.crew[i],
          oninput: e => { f.crew[i] = e.target.value; }
        })),
      ),
    ),
    el('div', null,
      el('div', { class:'lbl' }, 'Remarks'),
      el('input', { class:'hf', placeholder:'Optional notes…', value: f.remarks,
        oninput: e => { f.remarks = e.target.value; } })
    )
  );

  const actions = el('div', { class:'actions' },
    el('button', { class:'btn btn-primary flex2', onclick: () => save(true), html: 'Save &amp; New Leg ' + ic('plus', 14) }),
    el('button', { class:'btn flex1', onclick: () => save(false) }, 'Save & Close'),
  );

  const datalist = el('datalist', { id:'flt-suggest' });
  const seen = new Set();
  state.flights.forEach(x => { if (x.fltNo && !seen.has(x.fltNo)) { seen.add(x.fltNo); datalist.append(el('option', { value:x.fltNo })); }});

  wrap.append(hdr, regRow, dutyRow, stampRow, comp, opt, actions, datalist);
  return wrap;
}

function field(label, input) {
  return el('div', null, el('div', { class:'lbl' }, label), input);
}

function seg(opts, value, onChange, { deselect=false } = {}) {
  const w = el('div', { class:'seg' });
  opts.forEach(o => {
    const isOn = o.value === value;
    const b = el('button', {
      class: isOn ? 'on' : '',
      onclick: () => onChange(deselect && isOn ? null : o.value)
    }, o.label);
    w.append(b);
  });
  return w;
}

function stampEl(s, i, nextIdx) {
  const f = state.form;
  const t = f[s.key];
  const time = t ? hhmmZ(t) : null;
  const isNext = i === nextIdx && !t;
  const cls = 'stamp' + (time ? ' stamped' : '');
  const btn = el('button', { class: cls, onclick: () => stampTap(s.key) });
  btn.append(
    el('div', { class:'stamp-h' },
      el('span', { class:'stamp-idx' }, '0'+(i+1)),
      el('span', { class:'stamp-lbl' }, s.label),
      isNext ? el('span', { class:'stamp-next' }, el('span', { class:'pulse' }), 'next') : null
    ),
    time
      ? el('div', { class:'stamp-time' }, time, el('span', { class:'z' }, 'z'))
      : el('div', { class:'stamp-time empty' }, '––:––'),
    el('div', { class: 'stamp-hint' + (isNext?' next':'') },
      time
        ? 'tap to edit'
        : (state.entryMode === 'backfill'
            ? 'tap to enter'
            : (isNext ? 'tap to stamp' : 'tap when ready')))
  );
  return btn;
}

const STAMP_LABELS = { offBlock:'Off-Block', airborne:'Airborne', touchdown:'Touchdown', onBlock:'On-Block' };
const STAMP_ORDER = ['offBlock','airborne','touchdown','onBlock'];

function defaultPickerSeed(key) {
  // Use existing time, or previous stamp + 0 min, or form.dateUTC at 00:00 UTC.
  const f = state.form;
  if (f[key]) return new Date(f[key]);
  const idx = STAMP_ORDER.indexOf(key);
  for (let i = idx - 1; i >= 0; i--) {
    if (f[STAMP_ORDER[i]]) return new Date(f[STAMP_ORDER[i]]);
  }
  return new Date((f.dateUTC || new Date().toISOString().slice(0,10)) + 'T00:00:00Z');
}

function stampTap(key) {
  const f = state.form;
  if (!f[key] && state.entryMode === 'live') {
    f[key] = isoUTCnow();
    recomputeNight(f);
    renderNewFlight();
  } else {
    const d = defaultPickerSeed(key);
    state.pickerOpen = { key, hh: d.getUTCHours(), mm: d.getUTCMinutes() };
    render();
  }
}

function timePickerEl() {
  if (!state.pickerOpen) return null;
  const f = state.form;
  const { key } = state.pickerOpen;
  const close = () => { state.pickerOpen = null; render(); };
  const apply = () => {
    const { hh, mm } = state.pickerOpen;
    // Choose the smallest valid date that produces HH:MM ≥ previous stamp.
    const idx = STAMP_ORDER.indexOf(key);
    let baseDay;
    if (f[key]) {
      baseDay = new Date(f[key]);
    } else {
      baseDay = defaultPickerSeed(key);
    }
    let cand = new Date(Date.UTC(baseDay.getUTCFullYear(), baseDay.getUTCMonth(), baseDay.getUTCDate(), hh, mm, 0));
    for (let i = idx - 1; i >= 0; i--) {
      const prev = f[STAMP_ORDER[i]] ? new Date(f[STAMP_ORDER[i]]) : null;
      if (prev && cand < prev) {
        // bump to next day until past previous
        while (cand < prev) cand = new Date(cand.getTime() + 86400000);
      }
      break;
    }
    f[key] = cand.toISOString();
    recomputeNight(f);
    state.pickerOpen = null;
    render();
  };
  const bump = (field, delta) => {
    const p = state.pickerOpen;
    if (field === 'hh') p.hh = (p.hh + delta + 24) % 24;
    else p.mm = (p.mm + delta + 60) % 60;
    // re-render just the picker by full render
    render();
  };
  const setNow = () => {
    const n = new Date();
    state.pickerOpen.hh = n.getUTCHours();
    state.pickerOpen.mm = n.getUTCMinutes();
    render();
  };
  const clearStamp = () => {
    f[key] = null;
    recomputeNight(f);
    state.pickerOpen = null;
    render();
  };

  const scrim = el('div', { class:'scrim', onclick: e => { if (e.target === scrim) close(); }});
  const sheet = el('div', { class:'sheet picker-sheet' });
  sheet.append(
    el('div', { class:'sheet-hdr' },
      el('div', null,
        el('div', { class:'sup' }, 'Edit stamp · UTC'),
        el('h2', null, STAMP_LABELS[key] || key)),
      el('button', { class:'icon-btn', onclick: close, html: ic('close', 11) })),
    el('div', { class:'picker-body' },
      el('div', { class:'picker-col' },
        el('button', { class:'picker-step', onclick: () => bump('hh', +1) }, '▲'),
        el('div', { class:'picker-val' }, String(state.pickerOpen.hh).padStart(2,'0')),
        el('div', { class:'picker-lbl' }, 'Hour'),
        el('button', { class:'picker-step', onclick: () => bump('hh', -1) }, '▼')),
      el('div', { class:'picker-sep' }, ':'),
      el('div', { class:'picker-col' },
        el('button', { class:'picker-step', onclick: () => bump('mm', +1) }, '▲'),
        el('div', { class:'picker-val' }, String(state.pickerOpen.mm).padStart(2,'0')),
        el('div', { class:'picker-lbl' }, 'Minute'),
        el('button', { class:'picker-step', onclick: () => bump('mm', -1) }, '▼'))),
    el('div', { class:'picker-quick' },
      ...[-5, -1, +1, +5].map(d =>
        el('button', { class:'inline-btn', onclick: () => bump('mm', d) }, (d>0?'+':'') + d + ' min'))),
    el('div', { class:'picker-actions' },
      el('button', { class:'btn flex1', onclick: setNow }, 'Now'),
      el('button', { class:'btn flex1', onclick: clearStamp, style:'border-color:var(--danger); color:var(--danger)' }, 'Clear'),
      el('button', { class:'btn btn-primary flex2', onclick: apply, html: 'Save '+ic('check',14) })),
  );
  scrim.append(sheet);
  return scrim;
}

function clearAllStamps() {
  const f = state.form;
  f.offBlock = f.airborne = f.touchdown = f.onBlock = null;
  f.nightTimeMin = 0; f.ldType = null;
  renderNewFlight();
}

function renderNewFlight() {
  // partial re-render via full render — cheap enough at this size
  const v = $('.view');
  if (!v) return render();
  v.innerHTML = '';
  v.append(newFlightEl());
  // refresh header sub
  const h = $('.hdr-sub');
  if (h) h.textContent = state.form.id ? 'Editing' : (state.form.offBlock ? 'In flight' : 'Awaiting first stamp');
}

async function save(newLeg) {
  const f = { ...state.form };
  if (!f.fltNo || !f.dep || !f.dest) { toast('Flt, From, To required'); return; }
  const ac = state.aircraft.find(a => a.reg === f.reg);
  if (ac) f.acType = ac.type;
  recomputeNight(f);
  f.updatedAt = Date.now();
  if (f.id) {
    await db.flights.put(f);
    toast('Updated');
  } else {
    delete f.id;
    const id = await db.flights.add(f);
    toast('Saved');
    f.id = id;
  }
  await loadFlights();
  if (newLeg) {
    const carry = blankForm();
    carry.acType = f.acType; carry.reg = f.reg;
    carry.dep = f.dest; // last destination becomes next origin
    carry.crew = [...f.crew];
    state.form = carry;
    state.tab = 'new';
  } else {
    state.form = blankForm();
    state.tab = 'history';
  }
  render();
}

// ── History ───────────────────────────────────────────────────────
function historyEl() {
  const wrap = el('div', null);
  const search = el('div', { class:'search-wrap' },
    el('span', { class:'search-ic', html: ic('search', 15) }),
    el('input', { class:'search', placeholder:'Search flight no, route, date…', value: state.search,
      oninput: e => { state.search = e.target.value; refreshHistory(); } })
  );
  wrap.append(search);
  const body = el('div', { id:'history-body' });
  wrap.append(body);
  fillHistory(body);
  return wrap;
}

function refreshHistory() { fillHistory($('#history-body')); }

function fillHistory(body) {
  if (!body) return;
  body.innerHTML = '';
  const q = state.search.trim().toLowerCase();
  const filtered = state.flights.filter(f =>
    !q ||
    (f.fltNo||'').toLowerCase().includes(q) ||
    (f.dep||'').toLowerCase().includes(q) ||
    (f.dest||'').toLowerCase().includes(q) ||
    (f.dateUTC||'').includes(q)
  );
  if (!filtered.length) {
    body.append(el('div', { class:'empty' },
      el('div', { class:'ti' }, 'No flights yet'),
      el('div', { class:'ds' }, 'Log your first leg from the New Flight tab.')));
    return;
  }
  // group by month
  const groups = {};
  filtered.forEach(f => {
    const k = (f.dateUTC || '').slice(0,7);
    (groups[k] ||= []).push(f);
  });
  const keys = Object.keys(groups).sort().reverse();
  keys.forEach(k => {
    // newest first throughout — date desc, then off-block desc within a date
    const arr = groups[k].sort((a,b) => {
      if (a.dateUTC !== b.dateUTC) return a.dateUTC < b.dateUTC ? 1 : -1;
      const ao = a.offBlock || '', bo = b.offBlock || '';
      return ao < bo ? 1 : (ao > bo ? -1 : 0);
    });
    const month = new Date(k+'-01').toLocaleDateString('en-US', { month:'long', year:'numeric' });
    const mins = arr.reduce((s,f) => s + (minsBetween(f.offBlock, f.onBlock) || 0), 0);
    body.append(monthHeader(month, arr.length, fmtMin(mins)));
    arr.forEach(f => body.append(flightRow(f)));
  });
  body.append(el('div', { style:'height:80px' }));
}

function monthHeader(label, legs, hours) {
  return el('div', { class:'month' },
    el('div', { class:'month-l' }, label),
    el('div', { class:'month-t' },
      el('span', null, `${legs} leg${legs===1?'':'s'}`),
      el('span', { class:'h' }, hours)));
}

function flightRow(f) {
  const swiped = state.swipedId === f.id;
  const row = el('div', { class: 'row' + (swiped?' swiped':'') });
  const del = el('button', { class:'row-del', onclick: async e => {
    e.stopPropagation();
    if (!confirm('Delete this flight?')) return;
    await db.flights.delete(f.id);
    state.swipedId = null;
    await loadFlights();
    refreshHistory();
  }, html: ic('trash', 14) + '<span style="margin-left:6px">Delete</span>' });
  row.append(del);

  const d = new Date(f.dateUTC);
  const day = d.getUTCDate();
  const dow = d.toLocaleDateString('en-US', { weekday:'short' }).toUpperCase();
  const blockMin = minsBetween(f.offBlock, f.onBlock);
  const isNight = (f.nightTimeMin||0) > 0;
  const offHHMM = f.offBlock ? hhmmZ(f.offBlock) : '';

  const grid = el('div', { class:'row-grid', onclick: () => editFlight(f) },
    el('div', null,
      el('div', { class:'row-date-d' }, String(day)),
      el('div', { class:'row-date-w' }, dow)),
    el('div', { class:'row-flt' }, f.fltNo || ''),
    el('div', { style:'min-width:0' },
      el('div', { class:'row-route' },
        el('span', null, f.dep || '—'),
        el('span', { class:'arr', html: '<svg width="28" height="6" viewBox="0 0 28 6"><path d="M0 3h22M20 1l4 2-4 2" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
        el('span', null, f.dest || '—'),
      ),
      el('div', { class:'row-reg' }, [f.acType, f.reg].filter(Boolean).join(' · '))),
    el('div', { class:'row-num block' }, el('div', { class:'v' }, fmtMin(blockMin)), el('div', { class:'l' }, 'Block')),
    el('div', { class:'row-num night' },
      el('div', { class:'v ' + (isNight?'night':'faint'), html: isNight ? (ic('moon',10)+'<span>'+fmtMin(f.nightTimeMin)+'</span>') : '—' }),
      el('div', { class:'l' }, 'Night')),
    el('div', { class:'row-badges' },
      f.role ? el('span', { class:'badge on' }, (f.role === 'LowRank' || f.role === 'SIC') ? 'LR' : f.role) : null,
      el('span', { class:'badge' }, f.duty === 'Cruise' ? 'CR' : (f.duty || ''))),
  );

  // touch swipe-to-delete
  let startX = null;
  grid.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive:true });
  grid.addEventListener('touchend', e => {
    if (startX == null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (dx < -50) { state.swipedId = f.id; refreshHistory(); }
    else if (dx > 50 && state.swipedId === f.id) { state.swipedId = null; refreshHistory(); }
    startX = null;
  });
  row.append(grid);
  return row;
}

function editFlight(f) {
  state.form = JSON.parse(JSON.stringify(f));
  if (!state.form.crew) state.form.crew = ['','',''];
  state.tab = 'new';
  state.swipedId = null;
  render();
}

// ── Totals ────────────────────────────────────────────────────────
function periodRange(id) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let from = null;
  if (id === 'mtd') from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  else if (id === 'p90') { from = new Date(today); from.setUTCDate(from.getUTCDate()-90); }
  else if (id === 'ytd') from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  else if (id === 'y1') { from = new Date(today); from.setUTCFullYear(from.getUTCFullYear()-1); }
  return from ? from.toISOString().slice(0,10) : null;
}

function computeTotals() {
  const fromStr = periodRange(state.totals.period);
  const acType = state.totals.acType;
  const matches = state.flights.filter(f => {
    if (acType !== 'all' && f.acType !== acType) return false;
    if (fromStr && (f.dateUTC || '') < fromStr) return false;
    return true;
  });
  let total=0, pic=0, sic=0, cruise=0, night=0, landingsPF=0;
  let firstDate = null, latestDate = null;
  matches.forEach(f => {
    const b = minsBetween(f.offBlock, f.onBlock) || 0;
    total += b;
    if (f.role === 'PIC') pic += b; else if (f.role === 'LowRank' || f.role === 'SIC') sic += b;
    if (f.duty === 'Cruise') cruise += b;
    night += (f.nightTimeMin || 0);
    if (f.duty === 'PF' && f.touchdown) landingsPF += 1;
    if (!firstDate || f.dateUTC < firstDate) firstDate = f.dateUTC;
    if (!latestDate || f.dateUTC > latestDate) latestDate = f.dateUTC;
  });
  return {
    legs: matches.length, firstDate, latestDate,
    cells: [
      { key:'total',  label:'Total',          value: fmtMin(total)  },
      { key:'pic',    label:'PIC',            value: fmtMin(pic)    },
      { key:'sic',    label:'Low Rank',       value: fmtMin(sic)    },
      { key:'cruise', label:'Cruise',         value: fmtMin(cruise) },
      { key:'night',  label:'Night',          value: fmtMin(night), night:true },
      { key:'land',   label:'Landings as PF', value: String(landingsPF) },
    ],
  };
}

function totalsEl() {
  const t = computeTotals();
  const types = ['all', ...[...new Set(state.aircraft.map(a => a.type).filter(Boolean))].sort()];

  const filters = el('div', { class:'totals-filters' },
    el('div', { class:'fld' },
      el('div', { class:'lbl' }, 'Period'),
      (() => {
        const w = el('div', { class:'hs-wrap' });
        const sel = el('select', { class:'hs', onchange: e => { state.totals.period = e.target.value; render(); }});
        PERIODS.forEach(p => sel.append(el('option', { value:p.id, selected: p.id===state.totals.period?'':null }, p.label)));
        w.append(sel); return w;
      })()),
    el('div', { class:'fld' },
      el('div', { class:'lbl' }, 'Aircraft Type'),
      (() => {
        const w = el('div', { class:'hs-wrap' });
        const sel = el('select', { class:'hs', onchange: e => { state.totals.acType = e.target.value; render(); }});
        types.forEach(ty => sel.append(el('option', { value:ty, selected: ty===state.totals.acType?'':null }, ty==='all'?'All types':ty)));
        w.append(sel); return w;
      })()),
  );

  const hdr = el('div', { class:'totals-hdr' },
    el('div', null,
      el('div', { class:'sup' }, 'Career summary'),
      el('h2', null, PERIODS.find(p => p.id === state.totals.period).label + (state.totals.acType==='all' ? '' : ' · ' + state.totals.acType))),
    el('div', { class:'totals-meta' },
      el('div', null, el('div', { class:'l' }, 'First'),  el('div', { class:'v' }, t.firstDate || '—')),
      el('div', null, el('div', { class:'l' }, 'Latest'), el('div', { class:'v' }, t.latestDate || '—')),
      el('div', null, el('div', { class:'l' }, 'Legs'),   el('div', { class:'v' }, String(t.legs))),
    ),
  );

  const grid = el('div', { class:'grid-totals' });
  t.cells.forEach(c => {
    grid.append(el('div', { class:'cell' },
      el('div', { class:'lbl', html: (c.night ? ic('moon',12) : '') + escapeHTML(c.label) }),
      el('div', { class:'big ' + (c.night?'night':'') }, c.value),
    ));
  });

  return el('div', null, hdr, filters, grid, el('div', { style:'height:24px' }));
}

// ── Settings ─────────────────────────────────────────────────────
function settingsEl() {
  const scrim = el('div', { class:'scrim', onclick: e => { if (e.target === scrim) { state.settingsOpen = false; render(); }}});
  const sheet = el('div', { class:'sheet' });
  sheet.append(
    el('div', { class:'sheet-hdr' },
      el('div', null,
        el('div', { class:'sup' }, 'Logbook'),
        el('h2', null, 'Settings')),
      el('button', { class:'icon-btn', onclick: () => { state.settingsOpen = false; render(); }, html: ic('close', 11) }),
    )
  );
  const body = el('div', { class:'sheet-body' });

  // Skin
  body.append(el('div', { class:'sec-hdr' }, 'Skin'));
  const grid = el('div', { class:'skin-grid' });
  SKINS.forEach(s => {
    const tile = el('button', { class: 'skin-tile' + (s.id === state.skin ? ' on' : ''),
      onclick: () => { setSkin(s.id); render(); } });
    const sw = el('div', { class:'swatch-row' });
    s.swatch.forEach(c => sw.append(el('span', { style:'background:'+c })));
    tile.append(sw, el('div', null, el('div', { class:'nm' }, s.name), el('div', { class:'sub' }, s.sub)));
    grid.append(tile);
  });
  body.append(grid);

  // Aircraft management — one row per tail (reg + type)
  body.append(el('div', { class:'sec-hdr' }, 'Aircraft'));
  if (!state.aircraft.length) {
    body.append(el('div', { style:'padding:14px 24px; color:var(--inkDim); font-size:12px' }, 'No aircraft yet. Add one below.'));
  }
  // group display by type for legibility
  const byType = {};
  state.aircraft.forEach(a => { (byType[a.type || '—'] ||= []).push(a); });
  Object.keys(byType).sort().forEach(type => {
    byType[type].sort((a,b) => a.reg.localeCompare(b.reg)).forEach(a => {
      body.append(el('div', { class:'ac-block' },
        el('div', { class:'head' },
          el('div', null,
            el('div', { class:'typ' }, a.reg),
            el('div', { class:'regs' }, 'Type · ' + (a.type || '—')),
          ),
          el('div', { style:'display:flex; gap:8px;' },
            el('button', { class:'inline-btn', onclick: () => editAircraftType(a.reg) }, 'Edit type'),
            el('button', { class:'inline-btn', onclick: () => removeAircraft(a.reg) }, 'Remove'),
          )
        )
      ));
    });
  });
  body.append(el('div', { style:'padding:10px 24px 18px' },
    el('button', { class:'inline-btn', onclick: () => addAircraft() }, '+ Add aircraft')));

  // Data
  body.append(el('div', { class:'sec-hdr' }, 'Data'));
  body.append(settingsRow('share', 'Export JSON', 'Download all flight data', exportJSON));
  body.append(settingsRow('file',  'Import JSON', 'Merge from backup file', importJSON));
  body.append(settingsRow('chart', 'Export CSV',  'Flat one-row-per-flight (for airline/CAAT)', exportCSV));
  body.append(settingsRow('pin',   'Add custom airport', 'IATA · lat · lon', addAirport));

  // Storage
  body.append(el('div', { class:'sec-hdr' }, 'Storage'));
  body.append(settingsRow('trash', 'Clear all data', 'Permanently delete every flight', clearAll, true));

  body.append(el('div', { style:'padding:24px 24px 26px; text-align:center; border-top:1px solid var(--hairline)' },
    el('div', { style:'font-family:var(--serif); font-style:italic; font-size:13px; color:var(--inkSoft)' }, 'Made for Prinn'),
    el('div', { style:'font-size:10px; color:var(--inkFaint); font-family:var(--mono); letter-spacing:0.6px; margin-top:6px' }, "Captain's Logbook · v1.0.0")));

  sheet.append(body);
  scrim.append(sheet);
  return scrim;
}

function settingsRow(icon, label, sub, onclick, danger=false) {
  return el('button', { class: 's-row' + (danger?' danger':''), onclick },
    el('div', { class:'ic', html: ic(icon, 16) }),
    el('div', { class:'txt' },
      el('div', { class:'lab' }, label),
      sub ? el('div', { class:'sub' }, sub) : null),
    el('span', { style:'color:var(--inkFaint)', html: ic('chevron', 12) }),
  );
}

// ── Aircraft / airport mgmt ─────────────────────────────────────
async function addAircraft() {
  const r = prompt('Aircraft registration / tail number (e.g. HS-TEA)');
  if (!r) return;
  const reg = r.trim().toUpperCase();
  if (state.aircraft.some(a => a.reg === reg)) { toast('Already exists'); return; }
  const tSuggest = [...new Set(state.aircraft.map(a => a.type).filter(Boolean))][0] || 'A330';
  const t = prompt(`Aircraft type for ${reg} (e.g. A330, A350, B777)`, tSuggest);
  if (!t) return;
  const type = t.trim().toUpperCase();
  await db.aircraft.add({ reg, type });
  await loadAircraft();
  render();
}

async function editAircraftType(reg) {
  const rec = state.aircraft.find(a => a.reg === reg);
  if (!rec) return;
  const t = prompt(`Type for ${reg}`, rec.type || '');
  if (t == null) return;
  rec.type = t.trim().toUpperCase();
  await db.aircraft.put(rec);
  await loadAircraft();
  render();
}

async function removeAircraft(reg) {
  if (!confirm(`Remove ${reg}?\nExisting flights keep this reg, but it won't appear in pickers.`)) return;
  await db.aircraft.delete(reg);
  await loadAircraft();
  if (state.form.reg === reg) { state.form.reg = ''; state.form.acType = ''; }
  render();
}

async function addAirport() {
  const iata = prompt('Airport IATA (3 letters)');
  if (!iata) return;
  const lat = parseFloat(prompt('Latitude (decimal °, e.g. 13.69)'));
  const lon = parseFloat(prompt('Longitude (decimal °, e.g. 100.75)'));
  if (isNaN(lat) || isNaN(lon)) { toast('Invalid lat/lon'); return; }
  await db.airports.put({ iata: iata.trim().toUpperCase(), lat, lon, name: '' });
  await loadAirports();
  toast('Airport saved');
}

// ── Export / Import / Clear ─────────────────────────────────────
async function exportJSON() {
  const all = {
    version: 1,
    exportedAt: new Date().toISOString(),
    flights:  await db.flights.toArray(),
    airports: await db.airports.toArray(),
    aircraft: await db.aircraft.toArray(),
  };
  const blob = new Blob([JSON.stringify(all, null, 2)], { type:'application/json' });
  const fname = `captains-logbook-${new Date().toISOString().slice(0,10)}.json`;
  if (navigator.share && navigator.canShare && navigator.canShare({ files:[new File([blob], fname, { type:'application/json' })] })) {
    try {
      await navigator.share({ files:[new File([blob], fname, { type:'application/json' })], title:fname });
      return;
    } catch (e) { /* fall through */ }
  }
  const url = URL.createObjectURL(blob);
  const a = el('a', { href:url, download:fname }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportCSV() {
  const rows = await db.flights.orderBy('dateUTC').toArray();
  const hdr = ['Date(UTC)','FltNo','AcType','Reg','DEP','DEST','Off-Block','Airborne','Touchdown','On-Block',
               'BlockMin','FlightMin','NightMin','LDType','Role','Duty','Crew1','Crew2','Crew3','Remarks'];
  const esc = v => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [hdr.join(',')];
  for (const f of rows) {
    const block  = minsBetween(f.offBlock, f.onBlock);
    const flight = minsBetween(f.airborne, f.touchdown);
    lines.push([
      f.dateUTC, f.fltNo, f.acType, f.reg, f.dep, f.dest,
      hhmmZ(f.offBlock), hhmmZ(f.airborne), hhmmZ(f.touchdown), hhmmZ(f.onBlock),
      block ?? '', flight ?? '', f.nightTimeMin ?? 0, f.ldType ?? '',
      f.role, f.duty,
      (f.crew||[])[0], (f.crew||[])[1], (f.crew||[])[2],
      f.remarks,
    ].map(esc).join(','));
  }
  const blob = new Blob([lines.join('\n')], { type:'text/csv;charset=utf-8' });
  const fname = `captains-logbook-${new Date().toISOString().slice(0,10)}.csv`;
  const url = URL.createObjectURL(blob);
  const a = el('a', { href:url, download:fname }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('CSV downloaded');
}

function importJSON() {
  const inp = el('input', { type:'file', accept:'application/json,.json', style:'display:none',
    onchange: async e => {
      const file = e.target.files[0]; if (!file) return;
      const text = await file.text();
      let data; try { data = JSON.parse(text); } catch { toast('Invalid JSON'); return; }
      if (!confirm(`Import ${data.flights?.length||0} flights? Existing flights with same id will be merged by updatedAt.`)) return;
      const existing = await db.flights.toArray();
      const byId = new Map(existing.map(f => [f.id, f]));
      for (const f of (data.flights || [])) {
        const cur = byId.get(f.id);
        if (!cur || (f.updatedAt||0) >= (cur.updatedAt||0)) await db.flights.put(f);
      }
      for (const a of (data.airports || [])) await db.airports.put(a);
      for (const a of (data.aircraft || [])) await db.aircraft.put(a);
      await loadAll();
      toast('Imported');
      render();
    }});
  document.body.append(inp); inp.click(); inp.remove();
}

async function clearAll() {
  if (!confirm('Permanently delete every flight, airport override, and aircraft type? This cannot be undone.')) return;
  if (!confirm('Are you sure?')) return;
  await db.flights.clear();
  await db.airports.clear();
  await db.aircraft.clear();
  await db.settings.clear();
  await window.dbInit();
  await loadAll();
  state.form = blankForm();
  state.settingsOpen = false;
  render();
  toast('Cleared');
}

// ── load ─────────────────────────────────────────────────────────
async function loadFlights()  {
  const all = await db.flights.toArray();
  const stale = all.filter(f => f.role === 'SIC');
  if (stale.length) {
    for (const f of stale) { f.role = 'LowRank'; await db.flights.put(f); }
  }
  state.flights = all.sort((a,b) => (a.dateUTC<b.dateUTC?1:-1));
}
async function loadAirports() { state.airports = await db.airports.toArray(); }
async function loadAircraft() { state.aircraft = await db.aircraft.toArray(); }
async function loadAll() { await Promise.all([loadFlights(), loadAirports(), loadAircraft()]); }

function showFatal(err) {
  const app = $('#app');
  if (app) app.innerHTML = `<div style="padding:40px; font-family:var(--mono); color:var(--ink); white-space:pre-wrap; font-size:13px; line-height:1.6">
    <div style="font-family:var(--serif); font-style:italic; font-size:22px; margin-bottom:14px;">Couldn't start the logbook</div>
    <div style="color:var(--danger); margin-bottom:14px;">${escapeHTML(String(err && (err.stack || err.message || err)))}</div>
    <button class="inline-btn" onclick="resetEverything()">Reset all local data</button>
  </div>`;
}
window.addEventListener('error', e => showFatal(e.error || e.message));
window.addEventListener('unhandledrejection', e => showFatal(e.reason));
window.resetEverything = async function () {
  try { if (window.db) await window.db.delete(); } catch {}
  try {
    const dbs = await indexedDB.databases?.();
    if (dbs) for (const d of dbs) indexedDB.deleteDatabase(d.name);
  } catch {}
  location.reload();
};

async function boot() {
  try {
    await window.dbInit();
    await loadAll();
    state.skin = await window.getSetting('skin', 'paper');
    document.body.dataset.skin = state.skin;
    render();
  } catch (err) {
    showFatal(err);
    return;
  }
  // tick clock once per minute
  setInterval(() => { if (!state.settingsOpen) {
    const c = $('.clock .time');
    if (c) { const n = new Date(); c.textContent = String(n.getUTCHours()).padStart(2,'0')+':'+String(n.getUTCMinutes()).padStart(2,'0'); }
  }}, 30000);
}

boot();
