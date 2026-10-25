/* Planner Pro — financial planning app for FAs (single page, data in localStorage) */
'use strict';

// ---------- state ----------
const KEY = 'plannerpro.v1';
const PORT_CATS = ['เงินฝาก/ตลาดเงิน', 'ตราสารหนี้', 'หุ้นไทย', 'หุ้นต่างประเทศ', 'ทางเลือก (ทองคำ/REIT)'];
const PORT_COLORS = ['#b5e8dc', '#0f9a7e', '#f2a516', '#5b8def', '#e0475b'];
const EDU_PRESETS = {
  'รัฐบาล': [10000, 15000, 20000, 25000, 40000, 100000],
  'เอกชน': [60000, 80000, 100000, 120000, 150000, 250000],
  'อินเตอร์': [400000, 600000, 700000, 800000, 500000, 600000],
};
const HOSPITAL_TIERS = [
  { n: 'โรงพยาบาลรัฐ', room: 1500, ipd: 300000 },
  { n: 'รพ.รัฐ ห้องพิเศษ / เอกชนขนาดเล็ก', room: 3000, ipd: 500000 },
  { n: 'เอกชนระดับกลาง', room: 5000, ipd: 1000000 },
  { n: 'เอกชนระดับบน', room: 8000, ipd: 5000000 },
  { n: 'เอกชนชั้นนำ (พรีเมียม)', room: 15000, ipd: 20000000 },
];
// regional multipliers vs Bangkok for room rate (indicative)
const REGIONS = [['กรุงเทพฯ และปริมณฑล', 1], ['ภาคกลาง/ตะวันออก', 0.85], ['ภาคเหนือ', 0.75], ['ภาคตะวันออกเฉียงเหนือ', 0.7], ['ภาคใต้', 0.8]];

function uid() { return Math.random().toString(36).slice(2, 10); }

function defaultPorts() {
  return [
    { n: 'มั่นคงสูง', ret: 2, a: [30, 60, 5, 5, 0], link: '' },
    { n: 'ระมัดระวัง', ret: 3.5, a: [10, 60, 10, 15, 5], link: '' },
    { n: 'สมดุล', ret: 5, a: [5, 45, 15, 25, 10], link: '' },
    { n: 'เติบโต', ret: 6.5, a: [5, 30, 20, 35, 10], link: '' },
    { n: 'เติบโตสูง', ret: 8, a: [0, 15, 25, 50, 10], link: '' },
    { n: 'เชิงรุก', ret: 9, a: [0, 5, 25, 60, 10], link: '' },
  ];
}

function eduLevels(preset = 'เอกชน') {
  const c = EDU_PRESETS[preset];
  return [
    { k: 'อนุบาล', start: 3, yrs: 3, cost: c[0], on: true },
    { k: 'ประถมศึกษา', start: 6, yrs: 6, cost: c[1], on: true },
    { k: 'มัธยมต้น', start: 12, yrs: 3, cost: c[2], on: true },
    { k: 'มัธยมปลาย', start: 15, yrs: 3, cost: c[3], on: true },
    { k: 'ปริญญาตรี', start: 18, yrs: 4, cost: c[4], on: true },
    { k: 'ปริญญาโท', start: 22, yrs: 2, cost: c[5], on: false },
  ];
}

function newClient(name = 'ลูกค้าใหม่') {
  return {
    id: uid(), created: Date.now(), d: {
      profile: { name, nick: '', age: 35, gender: 'ชาย', phone: '', email: '', occupation: '', income: 50000, folder: 'ทั่วไป', photo: '', note: '', spouse: false, children: 1, parents: 0 },
      cash: {
        inc: [{ n: 'เงินเดือน', v: 50000 }, { n: 'รายได้อื่น', v: 0 }],
        exp: [
          { n: 'ค่าอาหาร/ใช้จ่ายประจำวัน', v: 12000, t: 'v' }, { n: 'ค่าผ่อนบ้าน', v: 12000, t: 'd' },
          { n: 'ค่าผ่อนรถ', v: 0, t: 'd' }, { n: 'ค่าเบี้ยประกัน', v: 2000, t: 'f' },
          { n: 'ค่าสาธารณูปโภค/โทรศัพท์', v: 3000, t: 'f' }, { n: 'เงินออม/ลงทุน', v: 5000, t: 's' },
        ],
        asset: [
          { n: 'เงินสด/เงินฝากออมทรัพย์', v: 150000, t: 'l' }, { n: 'กองทุนรวม/หุ้น', v: 200000, t: 'i' },
          { n: 'กองทุนสำรองเลี้ยงชีพ (PVD)', v: 300000, t: 'i' }, { n: 'บ้าน/คอนโด', v: 2500000, t: 'p' }, { n: 'รถยนต์', v: 500000, t: 'p' },
        ],
        debt: [{ n: 'บัตรเครดิต', v: 0, t: 's' }, { n: 'สินเชื่อบ้าน', v: 1800000, t: 'l' }, { n: 'สินเชื่อรถ', v: 0, t: 'l' }],
      },
      retire: { method: 'exp', retireAge: 60, life: 85, expense: 30000, inf: 3, rPre: 5, rPost: 3, replace: 70, salGrow: 3, useAssets: true, savings: 500000, usePvd: false, plan: 5000 },
      pvd: { salary: 50000, grow: 3, emp: 5, er: 5, ret: 4, bal: 300000 },
      edu: { inf: 5, ret: 4, kids: [{ name: 'บุตรคนที่ 1', age: 3, preset: 'เอกชน', levels: eduLevels() }] },
      life: { years: 10, autoFamily: true, family: 360000, inf: 3, ret: 3, autoDebt: true, debt: 0, autoEdu: true, edu: 0, final: 200000, emergency: 100000, other: 0, autoAsset: true, asset: 0 },
      policies: [],
      health: { tier: 2, region: 0, ciYears: 3, acc: 0 },
      goals: [{ n: 'ท่องเที่ยวต่างประเทศ', amt: 150000, yrs: 2, inf: 3, ret: 2 }],
      tax: {
        inc: { s1: 600000, s2: 0, s3: 0, s4: 0, s5: 0, s6: 0, s7: 0, s8: 0 },
        ded: { spouse: false, child: 1, parents: 0, sso: 9000, life: 0, health: 0, parentHealth: 0, pension: 0, rmf: 0, ssf: 0, pvd: 0, esg: 0, home: 0, easy: 0, donate: 0 },
      },
      port: { sel: 2 },
      report: { cover: true, fa: true, cash: true, retire: true, edu: true, life: true, health: true, policy: true, goals: true, tax: true, port: true },
    },
  };
}

function defaults() {
  return {
    fa: { name: 'ชื่อ นักวางแผน', nick: '', position: 'Financial Planner', company: '', license: '', phone: '', email: '', line: '', web: '', certs: '', photo: '', link: '' },
    clients: [], cur: null, view: 'dashboard', folder: 'ทั้งหมด', q: '',
    tools: { tvm: { n: 10, i: 5, pv: -100000, pmt: 0, fv: 0, ppy: 1, bgn: false, solve: 'fv' }, qr: { text: 'https://', label: '', saved: [] }, ports: defaultPorts() },
  };
}

// fill missing keys from a template (keeps old saves working as the app grows)
function merge(t, v) {
  if (Array.isArray(t)) return Array.isArray(v) ? v : t;
  if (t && typeof t === 'object') {
    const o = { ...t };
    if (v && typeof v === 'object') for (const k in v) o[k] = k in t ? merge(t[k], v[k]) : v[k];
    return o;
  }
  return v === undefined ? t : v;
}

function load() {
  let s;
  try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
  s = merge(defaults(), s || {});
  s.clients = s.clients.map(c => { const t = newClient(); return { ...c, d: merge(t.d, c.d) }; });
  if (!s.clients.length) { const c = newClient('คุณตัวอย่าง ใจดี'); c.d.profile.nick = 'ตัวอย่าง'; s.clients.push(c); s.cur = c.id; }
  return s;
}
const S = load();
let saveTimer;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('บันทึกไม่สำเร็จ: พื้นที่เต็ม (ลองลดขนาดรูป)'); } }, 200); }
const C = () => S.clients.find(c => c.id === S.cur);
const D = () => C()?.d;

// ---------- helpers ----------
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n, d = 0) => isFinite(n) ? Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '-';
const baht = n => fmt(n) + ' บาท';
const pct = (n, d = 1) => isFinite(n) ? (n * 100).toFixed(d) + '%' : '-';
const sum = (a, f = x => x.v) => a.reduce((s, x) => s + (+f(x) || 0), 0);
const abbr = n => { const a = Math.abs(n); return a >= 1e6 ? (n / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M' : a >= 1e3 ? (n / 1e3).toFixed(0) + 'K' : fmt(n); };

function root(path) {
  const [h, ...rest] = path.split('.');
  if (h === 'fa') return [S.fa, rest];
  if (h === 'tools') return [S.tools, rest];
  if (h === 'S') return [S, rest];
  return [D(), [h, ...rest]];
}
function getp(path) { let [o, ks] = root(path); for (const k of ks) o = o?.[k]; return o; }
function setp(path, v) { let [o, ks] = root(path); for (const k of ks.slice(0, -1)) o = o[k]; o[ks.at(-1)] = v; save(); }

function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200); }

// ---------- finance math ----------
const fv = (pv, r, n) => pv * Math.pow(1 + r, n);
function pmtForFV(target, i, N) { if (N <= 0) return target; if (Math.abs(i) < 1e-12) return target / N; return target * i / (Math.pow(1 + i, N) - 1); }
function pmtForPV(pv, i, N) { if (N <= 0) return pv; if (Math.abs(i) < 1e-12) return pv / N; return pv * i / (1 - Math.pow(1 + i, -N)); }
// PV at start of retirement of an inflating withdrawal paid at the start of each year
function growingAnnuityDue(W, r, g, m) {
  if (m <= 0) return 0;
  if (Math.abs(r - g) < 1e-9) return W * m;
  return W * (1 - Math.pow((1 + g) / (1 + r), m)) / (r - g) * (1 + r);
}

function cashTotals(d) {
  const c = d.cash;
  const inc = sum(c.inc), exp = sum(c.exp.filter(x => x.t !== 's')), save = sum(c.exp.filter(x => x.t === 's')), debtPay = sum(c.exp.filter(x => x.t === 'd'));
  const liquid = sum(c.asset.filter(x => x.t === 'l')), invest = sum(c.asset.filter(x => x.t === 'i')), personal = sum(c.asset.filter(x => x.t === 'p'));
  const assets = liquid + invest + personal, debts = sum(c.debt), shortDebt = sum(c.debt.filter(x => x.t === 's'));
  return { inc, exp, save, debtPay, net: inc - exp - save, liquid, invest, personal, assets, debts, shortDebt, worth: assets - debts };
}

function calcRatios(d) {
  const t = cashTotals(d);
  return [
    { n: 'สภาพคล่อง', v: t.exp ? t.liquid / t.exp : Infinity, f: v => isFinite(v) ? v.toFixed(1) + ' เท่า' : '∞', ok: v => v >= 3, bench: '≥ 3–6 เท่าของรายจ่ายต่อเดือน', icon: '💧', desc: 'สินทรัพย์สภาพคล่อง ÷ รายจ่ายต่อเดือน — ควรมีเงินสำรองฉุกเฉินอย่างน้อย 3–6 เดือน' },
    { n: 'หนี้สินต่อสินทรัพย์', v: t.assets ? t.debts / t.assets : 0, f: v => pct(v), ok: v => v <= 0.5, bench: '≤ 50%', icon: '⚖️', desc: 'หนี้สินรวม ÷ สินทรัพย์รวม — วัดความสามารถในการชำระหนี้ทั้งหมด' },
    { n: 'ภาระผ่อนหนี้ต่อรายได้', v: t.inc ? t.debtPay / t.inc : 0, f: v => pct(v), ok: v => v <= 0.35, bench: '≤ 35–45%', icon: '🏦', desc: 'ค่างวดผ่อนหนี้ต่อเดือน ÷ รายได้ต่อเดือน' },
    { n: 'อัตราการออม', v: t.inc ? t.save / t.inc : 0, f: v => pct(v), ok: v => v >= 0.1, bench: '≥ 10%', icon: '🐷', desc: 'เงินออม/ลงทุนต่อเดือน ÷ รายได้ต่อเดือน' },
    { n: 'สินทรัพย์ลงทุนต่อความมั่งคั่ง', v: t.worth > 0 ? t.invest / t.worth : 0, f: v => pct(v), ok: v => v >= 0.5, bench: '≥ 50%', icon: '📈', desc: 'สินทรัพย์ลงทุน ÷ ความมั่งคั่งสุทธิ — สะท้อนโอกาสในการสร้างความมั่งคั่ง' },
    { n: 'ความอยู่รอด (Survival)', v: t.exp ? (t.inc) / t.exp : Infinity, f: v => isFinite(v) ? v.toFixed(2) + ' เท่า' : '∞', ok: v => v > 1, bench: '> 1 เท่า', icon: '🛟', desc: 'รายได้ ÷ รายจ่าย (ไม่รวมเงินออม) — มากกว่า 1 แปลว่ารายได้พอกับรายจ่าย' },
  ].map(r => ({ ...r, good: r.ok(r.v) }));
}

function calcPvd(d) {
  const p = d.pvd, age = d.profile.age, months = Math.max(0, (d.retire.retireAge - age) * 12);
  let bal = +p.bal, sal = +p.salary, contrib = 0; const rows = [];
  for (let k = 0; k < months; k++) {
    if (k > 0 && k % 12 === 0) sal *= 1 + p.grow / 100;
    const c = sal * (+p.emp + +p.er) / 100; contrib += c;
    bal = bal * (1 + p.ret / 1200) + c;
    if ((k + 1) % 12 === 0) rows.push({ age: age + (k + 1) / 12, sal, bal, contrib });
  }
  return { fv: bal, contrib, rows, years: months / 12 };
}

function retireAssets(d) {
  return sum(d.cash.asset.filter(x => x.t === 'i' && !(d.retire.usePvd && /สำรองเลี้ยงชีพ|pvd/i.test(x.n))));
}

function calcRetire(d) {
  const p = d.profile, r = d.retire, age = +p.age;
  const n = Math.max(0, r.retireAge - age), m = Math.max(0, r.life - r.retireAge);
  const inf = r.inf / 100, r1 = r.rPre / 100, r2 = r.rPost / 100;
  const annual = r.method === 'exp' ? r.expense * 12 * Math.pow(1 + inf, n) : p.income * 12 * Math.pow(1 + r.salGrow / 100, n) * r.replace / 100;
  const need = growingAnnuityDue(annual, r2, inf, m);
  const assetsNow = r.useAssets ? retireAssets(d) : +r.savings;
  const fvAssets = fv(assetsNow, r1, n);
  const pvdFV = r.usePvd ? calcPvd(d).fv : 0;
  const have = fvAssets + pvdFV, gap = Math.max(0, need - have);
  // monthly rate equivalent to r1 per year, so monthly saving and the yearly simulation agree
  const i1 = Math.pow(1 + r1, 1 / 12) - 1, yearOfSaving = Math.abs(i1) < 1e-12 ? 12 : (Math.pow(1 + i1, 12) - 1) / i1;
  const monthly = gap > 0 ? pmtForFV(gap, i1, n * 12) : 0;
  // simulation with the planned monthly saving
  const ages = [], bal = [], needLine = [];
  let b = assetsNow;
  for (let a = age; a <= r.life; a++) {
    if (a === Math.max(age, r.retireAge)) b += pvdFV;
    ages.push(a); bal.push(b);
    if (a < r.retireAge) b = b * (1 + r1) + r.plan * yearOfSaving;
    else b = (b - annual * Math.pow(1 + inf, a - r.retireAge)) * (1 + r2);
  }
  const runOut = ages.find((a, i) => a > r.retireAge && bal[i] < 0);
  const planFV = r1 ? r.plan * yearOfSaving * (Math.pow(1 + r1, n) - 1) / r1 : r.plan * 12 * n;
  return { n, m, annual, monthlyAtRetire: annual / 12, need, assetsNow, fvAssets, pvdFV, have, gap, monthly, progress: need ? Math.min(1, have / need) : 1, progressPlan: need ? Math.min(1, (have + planFV) / need) : 1, ages, bal, runOut, planFV };
}

function calcEdu(d) {
  const e = d.edu, inf = e.inf / 100, r = e.ret / 100;
  const kids = e.kids.map(k => {
    const rows = []; let fut = 0, pv = 0, lastT = 0;
    for (const L of k.levels) {
      if (!L.on) continue;
      for (let y = 0; y < L.yrs; y++) {
        const a = +L.start + y, t = a - k.age;
        if (t < 0) continue;
        const f = L.cost * Math.pow(1 + inf, t), v = f / Math.pow(1 + r, t);
        rows.push({ level: L.k, age: a, t, f, v }); fut += f; pv += v; lastT = Math.max(lastT, t);
      }
    }
    return { ...k, rows, fut, pv, monthly: pmtForPV(pv, r / 12, Math.max(1, lastT * 12)), lastT };
  });
  return { kids, fut: sum(kids, k => k.fut), pv: sum(kids, k => k.pv), monthly: sum(kids, k => k.monthly) };
}

function policyTotals(d) {
  const P = d.policies;
  return { sum: sum(P, x => x.sum), prem: sum(P, x => x.prem), room: sum(P, x => x.room), ipd: sum(P, x => x.ipd), ci: sum(P, x => x.ci), acc: sum(P, x => x.acc) };
}

function calcLife(d) {
  const L = d.life, t = cashTotals(d);
  const family = L.autoFamily ? t.exp * 12 : +L.family;
  const incomeNeed = growingAnnuityDue(family, L.ret / 100, L.inf / 100, +L.years);
  const debt = L.autoDebt ? t.debts : +L.debt;
  const edu = L.autoEdu ? calcEdu(d).pv : +L.edu;
  const needs = incomeNeed + debt + edu + +L.final + +L.emergency + +L.other;
  const asset = L.autoAsset ? t.liquid + t.invest : +L.asset;
  const cover = policyTotals(d).sum;
  const gap = Math.max(0, needs - asset - cover);
  return { family, incomeNeed, debt, edu, needs, asset, cover, gap, progress: needs ? Math.min(1, (asset + cover) / needs) : 1 };
}

function calcHealth(d) {
  const h = d.health, tier = HOSPITAL_TIERS[h.tier], mult = REGIONS[h.region][1];
  const room = Math.round(tier.room * mult / 100) * 100, ipd = tier.ipd;
  const ci = d.profile.income * 12 * h.ciYears, acc = +h.acc || d.profile.income * 12 * 2;
  const have = policyTotals(d);
  return { tier, room, ipd, ci, acc, have, items: [
    { n: 'ค่าห้องต่อวัน', need: room, have: have.room },
    { n: 'ค่ารักษาผู้ป่วยใน (IPD) ต่อปี/ครั้ง', need: ipd, have: have.ipd },
    { n: 'โรคร้ายแรง (CI)', need: ci, have: have.ci },
    { n: 'อุบัติเหตุ (PA)', need: acc, have: have.acc },
  ] };
}

const TAX_BRACKETS = [[150000, 0], [300000, .05], [500000, .10], [750000, .15], [1000000, .20], [2000000, .25], [5000000, .30], [Infinity, .35]];
function progressiveTax(net) {
  let prev = 0, tax = 0, marginal = 0; const rows = [];
  for (const [cap, rate] of TAX_BRACKETS) {
    const part = Math.max(0, Math.min(net, cap) - prev);
    rows.push({ from: prev, to: cap, rate, part, tax: part * rate });
    tax += part * rate; if (part > 0) marginal = rate; prev = cap;
  }
  return { tax, rows, marginal };
}
const DED_INFO = {
  personal: ['ลดหย่อนส่วนตัว', 'ผู้มีเงินได้ทุกคนได้รับ 60,000 บาท'],
  spouse: ['คู่สมรส (ไม่มีเงินได้)', '60,000 บาท กรณีจดทะเบียนสมรสและคู่สมรสไม่มีเงินได้'],
  child: ['บุตร', 'คนละ 30,000 บาท (บุตรคนที่ 2 ขึ้นไปที่เกิดตั้งแต่ปี 2561 ได้ 60,000 บาท)'],
  parents: ['บิดามารดา (อายุ 60+)', 'คนละ 30,000 บาท สูงสุด 4 คน (บิดามารดาตนเองและคู่สมรส) ต้องมีรายได้ไม่เกิน 30,000 บาท/ปี'],
  sso: ['ประกันสังคม', 'ตามที่จ่ายจริง สูงสุด 9,000 บาท'],
  life: ['เบี้ยประกันชีวิต', 'ตามที่จ่ายจริง สูงสุด 100,000 บาท กรมธรรม์ต้องมีระยะเวลา 10 ปีขึ้นไป'],
  health: ['เบี้ยประกันสุขภาพตนเอง', 'สูงสุด 25,000 บาท และเมื่อรวมกับเบี้ยประกันชีวิตต้องไม่เกิน 100,000 บาท'],
  parentHealth: ['เบี้ยประกันสุขภาพบิดามารดา', 'ตามที่จ่ายจริง สูงสุด 15,000 บาท'],
  pension: ['ประกันบำนาญ', '15% ของเงินได้ สูงสุด 200,000 บาท (นับรวมกลุ่มเกษียณไม่เกิน 500,000)'],
  rmf: ['กองทุน RMF', '30% ของเงินได้ สูงสุด 500,000 บาท (นับรวมกลุ่มเกษียณ)'],
  ssf: ['กองทุน SSF', '30% ของเงินได้ สูงสุด 200,000 บาท (นับรวมกลุ่มเกษียณ)'],
  pvd: ['กองทุนสำรองเลี้ยงชีพ (ส่วนลูกจ้าง)', '15% ของค่าจ้าง สูงสุด 500,000 บาท (นับรวมกลุ่มเกษียณ)'],
  esg: ['กองทุน Thai ESG', '30% ของเงินได้ สูงสุด 300,000 บาท แยกจากกลุ่มเกษียณ'],
  home: ['ดอกเบี้ยเงินกู้ซื้อที่อยู่อาศัย', 'ตามที่จ่ายจริง สูงสุด 100,000 บาท'],
  easy: ['Easy E-Receipt', 'ซื้อสินค้า/บริการที่มีใบกำกับภาษีอิเล็กทรอนิกส์ สูงสุด 50,000 บาท (ตามช่วงเวลาที่รัฐกำหนด)'],
  donate: ['เงินบริจาค', 'ตามจ่ายจริง ไม่เกิน 10% ของเงินได้หลังหักค่าใช้จ่ายและค่าลดหย่อน'],
};
const INC_INFO = {
  s1: ['40(1) เงินเดือน ค่าจ้าง โบนัส', 'หักค่าใช้จ่าย 50% รวมกับ 40(2) ไม่เกิน 100,000 บาท'],
  s2: ['40(2) ค่าคอมมิชชั่น ค่านายหน้า', 'หักค่าใช้จ่าย 50% รวมกับ 40(1) ไม่เกิน 100,000 บาท'],
  s3: ['40(3) ค่าลิขสิทธิ์ ค่าแฟรนไชส์', 'หักค่าใช้จ่าย 50% ไม่เกิน 100,000 บาท'],
  s4: ['40(4) ดอกเบี้ย เงินปันผล', 'หักค่าใช้จ่ายไม่ได้ (อาจเลือกเครดิตภาษีเงินปันผล/ไม่นำมารวมคำนวณ)'],
  s5: ['40(5) ค่าเช่าทรัพย์สิน', 'หักค่าใช้จ่ายเหมา 10–30% ตามประเภททรัพย์ (ใช้ 30% สำหรับบ้าน/อาคาร)'],
  s6: ['40(6) วิชาชีพอิสระ', 'ประกอบโรคศิลปะหักเหมา 60% วิชาชีพอื่นหัก 30% (ใช้ 60%)'],
  s7: ['40(7) รับเหมาก่อสร้าง', 'หักค่าใช้จ่ายเหมา 60% หรือตามจริง'],
  s8: ['40(8) ธุรกิจ/ค้าขาย/อื่นๆ', 'หักค่าใช้จ่ายเหมา 40–60% ตามประเภท (ใช้ 60%)'],
};
function calcTax(d, override) {
  const I = d.tax.inc, Dd = { ...d.tax.ded, ...(override || {}) };
  const total = sum(Object.values(I), x => x);
  const exp = Math.min((+I.s1 + +I.s2) * .5, 100000) + Math.min(I.s3 * .5, 100000) + I.s5 * .3 + I.s6 * .6 + I.s7 * .6 + I.s8 * .6;
  const ded = {};
  ded.personal = 60000;
  ded.spouse = Dd.spouse ? 60000 : 0;
  ded.child = 30000 * (+Dd.child || 0);
  ded.parents = 30000 * Math.min(4, +Dd.parents || 0);
  ded.sso = Math.min(+Dd.sso, 9000);
  ded.life = Math.min(+Dd.life, 100000);
  ded.health = Math.min(+Dd.health, 25000, 100000 - ded.life);
  ded.parentHealth = Math.min(+Dd.parentHealth, 15000);
  ded.pension = Math.min(+Dd.pension, total * .15, 200000);
  ded.rmf = Math.min(+Dd.rmf, total * .3, 500000);
  ded.ssf = Math.min(+Dd.ssf, total * .3, 200000);
  ded.pvd = Math.min(+Dd.pvd, I.s1 * .15, 500000);
  // the retirement group shares one 500,000 cap
  let room = 500000;
  for (const k of ['pvd', 'pension', 'rmf', 'ssf']) { ded[k] = Math.min(ded[k], room); room -= ded[k]; }
  ded.esg = Math.min(+Dd.esg, total * .3, 300000);
  ded.home = Math.min(+Dd.home, 100000);
  ded.easy = Math.min(+Dd.easy, 50000);
  const before = sum(Object.entries(ded).filter(([k]) => k !== 'donate'), ([, v]) => v);
  ded.donate = Math.min(+Dd.donate, Math.max(0, (total - exp - before) * .1));
  const dedTotal = before + ded.donate;
  const net = Math.max(0, total - exp - dedTotal);
  const pt = progressiveTax(net);
  return { total, exp, ded, dedTotal, net, ...pt, eff: total ? pt.tax / total : 0, retireRoom: room };
}
// what more could be deducted, and the tax it would save
function taxPotential(d) {
  const base = calcTax(d), I = d.tax.inc, total = base.total;
  const caps = {
    life: 100000, health: Math.min(25000, 100000 - base.ded.life), parentHealth: d.tax.ded.parents ? 15000 : 0,
    ssf: Math.min(total * .3, 200000), rmf: Math.min(total * .3, 500000), pension: Math.min(total * .15, 200000), esg: Math.min(total * .3, 300000),
  };
  return Object.entries(caps).map(([k, cap]) => {
    const extra = Math.max(0, cap - base.ded[k]);
    if (!extra) return null;
    const t2 = calcTax(d, { [k]: base.ded[k] + extra });
    return { k, extra: t2.ded[k] - base.ded[k], save: base.tax - t2.tax };
  }).filter(x => x && x.extra > 0 && x.save > 0);
}

function calcGoal(g) {
  const fut = g.amt * Math.pow(1 + g.inf / 100, g.yrs);
  return { fut, monthly: pmtForFV(fut, g.ret / 1200, g.yrs * 12) };
}

// TVM: sign convention — money paid out is negative
function tvmSolve(t) {
  const n = +t.n, i = t.i / 100 / t.ppy, pv = +t.pv, pmt = +t.pmt, fvv = +t.fv, b = t.bgn ? 1 : 0;
  const f = (i, n, pv, pmt, fvv) => Math.abs(i) < 1e-12 ? pv + pmt * n + fvv : pv * Math.pow(1 + i, n) + pmt * (1 + i * b) * (Math.pow(1 + i, n) - 1) / i + fvv;
  switch (t.solve) {
    case 'fv': return -(f(i, n, pv, pmt, 0));
    case 'pv': return Math.abs(i) < 1e-12 ? -(fvv + pmt * n) : -(fvv + pmt * (1 + i * b) * (Math.pow(1 + i, n) - 1) / i) / Math.pow(1 + i, n);
    case 'pmt': return Math.abs(i) < 1e-12 ? -(fvv + pv) / n : -(fvv + pv * Math.pow(1 + i, n)) * i / ((Math.pow(1 + i, n) - 1) * (1 + i * b));
    case 'n': {
      if (Math.abs(i) < 1e-12) return -(pv + fvv) / pmt;
      const p = pmt * (1 + i * b);
      return Math.log((p - fvv * i) / (p + pv * i)) / Math.log(1 + i);
    }
    case 'i': {
      let lo = -0.99, hi = 1, flo = f(lo, n, pv, pmt, fvv), fhi = f(hi, n, pv, pmt, fvv);
      if (flo * fhi > 0) return NaN;
      for (let k = 0; k < 200; k++) { const mid = (lo + hi) / 2, fm = f(mid, n, pv, pmt, fvv); if (flo * fm <= 0) { hi = mid; } else { lo = mid; flo = fm; } }
      return (lo + hi) / 2 * t.ppy * 100;
    }
  }
}

// ---------- UI components ----------
function helpHtml(h) { return h ? `<button class="help" data-help type="button">?</button>` : ''; }
function helpBox(h) { return h ? `<div class="helptext">${h}</div>` : ''; }
function num(path, label, o = {}) {
  const v = getp(path);
  return `<div class="field"><label>${label}${helpHtml(o.help)}</label><div class="stepper">
    <button class="sbtn" data-step="${-(o.step || 1)}" data-path="${path}" type="button">−</button>
    <input inputmode="decimal" data-path="${path}" data-num value="${fmt(v, o.dec || 0)}" ${o.dis ? 'disabled' : ''}>
    <button class="sbtn" data-step="${o.step || 1}" data-path="${path}" type="button">+</button>
    <span class="unit">${o.unit || ''}</span></div></div>${helpBox(o.help)}`;
}
function txt(path, label, o = {}) {
  return `<div class="field"><label>${label}</label><input class="inp" style="max-width:${o.w || 280}px" type="${o.type || 'text'}" data-path="${path}" value="${esc(getp(path))}" placeholder="${o.ph || ''}"></div>`;
}
function sel(path, label, opts, o = {}) {
  const v = getp(path);
  return `<div class="field"><label>${label}${helpHtml(o.help)}</label><select class="inp" style="max-width:280px" data-path="${path}" data-rerender ${o.numv ? 'data-num' : ''}>
    ${opts.map(([val, t]) => `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>${helpBox(o.help)}`;
}
function chk(path, label, o = {}) {
  return `<div class="field"><label>${label}${helpHtml(o.help)}</label><input type="checkbox" data-path="${path}" data-rerender ${getp(path) ? 'checked' : ''} style="width:20px;height:20px"></div>${helpBox(o.help)}`;
}
function chips(path, label, vals, unit = '') {
  const v = getp(path);
  return `<div class="field"><label>${label}</label><div class="chips">${vals.map(x => `<button class="chip ${x == v ? 'on' : ''}" data-chip="${path}" data-v="${x}" type="button">${x}${unit}</button>`).join('')}</div></div>`;
}
function kpi(l, v, cls = '') { return `<div class="kpi ${cls}"><div class="l">${l}</div><div class="v">${v}</div></div>`; }
function progress(p, label) { return `<div class="progress"><div style="width:${(p * 100).toFixed(1)}%"></div><span>${label ?? pct(p, 0)}</span></div>`; }
function avatar(photo, name, cls = '') {
  return photo ? `<img class="avatar ${cls}" src="${photo}" alt="">` : `<div class="avatar ${cls}">${esc((name || '?').trim().charAt(0))}</div>`;
}

function lineChart(labels, series, o = {}) {
  const W = 720, H = o.h || 240, L = 54, R = 12, T = 14, B = 28;
  const all = series.flatMap(s => s.data);
  let max = Math.max(...all, 1), min = Math.min(0, ...all);
  const sx = i => L + (W - L - R) * i / Math.max(1, labels.length - 1);
  const sy = v => T + (H - T - B) * (1 - (v - min) / (max - min || 1));
  let g = '';
  for (let k = 0; k <= 4; k++) { const v = min + (max - min) * k / 4, y = sy(v); g += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="#dcefe9"/><text x="${L - 6}" y="${y + 4}" text-anchor="end" font-size="11" fill="#5f7d78">${abbr(v)}</text>`; }
  const every = Math.ceil(labels.length / 12);
  labels.forEach((l, i) => { if (i % every === 0 || i === labels.length - 1) g += `<text x="${sx(i)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#5f7d78">${l}</text>`; });
  if (min < 0) g += `<line x1="${L}" x2="${W - R}" y1="${sy(0)}" y2="${sy(0)}" stroke="#e0475b" stroke-dasharray="4 3"/>`;
  for (const m of (o.markers || []).filter(m => m.i >= 0)) { const x = sx(m.i); g += `<line x1="${x}" x2="${x}" y1="${T}" y2="${H - B}" stroke="${m.c || '#f2a516'}" stroke-dasharray="5 4"/><text x="${x + 4}" y="${T + 10}" font-size="11" fill="${m.c || '#b27800'}">${m.t}</text>`; }
  for (const s of series) {
    const pts = s.data.map((v, i) => `${sx(i)},${sy(v)}`).join(' ');
    if (s.fill) g += `<polygon points="${sx(0)},${sy(Math.max(min, 0))} ${pts} ${sx(s.data.length - 1)},${sy(Math.max(min, 0))}" fill="${s.color}" opacity=".15"/>`;
    g += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round"/>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img">${g}</svg>`;
}
function donut(vals, colors, size = 150, center = '') {
  const tot = vals.reduce((a, b) => a + b, 0) || 1, r = 52, c = 2 * Math.PI * r; let off = 0, g = '';
  vals.forEach((v, i) => { const len = c * v / tot; if (v > 0) g += `<circle r="${r}" cx="70" cy="70" fill="none" stroke="${colors[i]}" stroke-width="22" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"/>`; off += len; });
  return `<svg viewBox="0 0 140 140" width="${size}" height="${size}">${g}<text x="70" y="75" text-anchor="middle" font-size="16" font-weight="700" fill="#173b38">${center}</text></svg>`;
}
function bars(items, o = {}) {
  const max = Math.max(...items.map(x => x.v), 1);
  return items.map(x => `<div class="row" style="gap:8px;margin:6px 0"><div style="width:${o.lw || 140}px" class="small">${esc(x.n)}</div>
    <div style="flex:1;background:#e8f4f0;border-radius:8px;height:18px"><div style="width:${x.v / max * 100}%;height:100%;border-radius:8px;background:${x.c || 'var(--pri2)'}"></div></div>
    <div style="width:110px" class="right small">${fmt(x.v)}</div></div>`).join('');
}

function makeQR(el, text, size = 160) {
  el.innerHTML = '';
  if (!window.qrcode) { el.innerHTML = '<div class="small muted" style="width:' + size + 'px">โหลดตัวสร้าง QR ไม่ได้ (ต้องต่ออินเทอร์เน็ต)</div>'; return; }
  if (!text) return;
  let qr;
  try { qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8']; qr = qrcode(0, 'M'); qr.addData(text, 'Byte'); qr.make(); }
  catch (e) { el.innerHTML = `<div class="small muted" style="width:${size}px">ข้อความยาวเกินไปสำหรับ QR</div>`; return; }
  const n = qr.getModuleCount(), q = 2, cell = Math.max(2, Math.floor(size * 2 / (n + q * 2)));
  const cv = document.createElement('canvas'), x = cv.getContext('2d');
  cv.width = cv.height = cell * (n + q * 2);
  cv.style.width = cv.style.height = size + 'px';
  x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.fillStyle = '#000';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) x.fillRect((c + q) * cell, (r + q) * cell, cell, cell);
  el.appendChild(cv);
}
function qrToPng(el, name) {
  const cv = el.querySelector('canvas');
  if (!cv) return toast('ยังไม่มี QR');
  const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = name + '.png'; a.click();
}

// ---------- navigation ----------
const NAV = [
  ['หลัก', [['dashboard', '🏠', 'หน้าหลัก / ลูกค้า'], ['profile', '👤', 'ข้อมูลลูกค้า']]],
  ['สุขภาพการเงิน', [['cash', '📒', 'งบการเงิน/กระแสเงินสด'], ['ratio', '📊', 'อัตราส่วนทางการเงิน']]],
  ['วางแผน', [['retire', '🏖️', 'แผนเกษียณ'], ['edu', '🎓', 'การศึกษาบุตร'], ['life', '🛡️', 'ทุนประกันชีวิต'], ['health', '🏥', 'ประกันสุขภาพ'], ['policy', '📄', 'สรุปกรมธรรม์'], ['goals', '🎯', 'เป้าหมายอื่นๆ'], ['tax', '🧾', 'ภาษี/ลดหย่อน'], ['port', '🥧', 'พอร์ตแนะนำ']]],
  ['เครื่องมือ', [['tvm', '🧮', 'เครื่องคิดเลข TVM'], ['pvd', '🏢', 'กองทุนสำรองฯ (PVD)'], ['card', '💳', 'นามบัตร FA'], ['qr', '🔳', 'สร้าง QR Code'], ['report', '🖨️', 'รายงานแผนการเงิน']]],
];
const NEEDS_CLIENT = new Set(['profile', 'cash', 'ratio', 'retire', 'edu', 'life', 'health', 'policy', 'goals', 'tax', 'port', 'pvd', 'report']);

function renderNav() {
  $('#sidebar').innerHTML = NAV.map(([g, items]) => `<div class="grp">${g}</div>` + items.map(([k, ic, t]) =>
    `<button class="nav ${S.view === k ? 'on' : ''}" data-go="${k}"><span class="ic">${ic}</span>${t}</button>`).join('')).join('');
}
function renderHeader() {
  const f = S.fa, c = C();
  $('#faMini').innerHTML = `${avatar(f.photo, f.name)}<span><b>${esc(f.name)}</b><small>${esc(f.position)}</small></span>`;
  $('#clientMini').innerHTML = c ? `${avatar(c.d.profile.photo, c.d.profile.name)}<span><b>${esc(c.d.profile.name)}</b><small>ลูกค้าปัจจุบัน · อายุ ${c.d.profile.age}</small></span>` : '<span>ยังไม่เลือกลูกค้า</span>';
}
function go(v) { S.view = v; save(); render(); window.scrollTo(0, 0); }

function render() {
  renderNav(); renderHeader();
  const V = VIEWS[S.view] || VIEWS.dashboard;
  if (NEEDS_CLIENT.has(S.view) && !C()) {
    $('#main').innerHTML = `<div class="card empty"><h2>ยังไม่ได้เลือกลูกค้า</h2><p>เลือกหรือสร้างโปรไฟล์ลูกค้าก่อนเริ่มวางแผน</p><button class="btn" data-go="dashboard">ไปที่รายชื่อลูกค้า</button></div>`;
    return;
  }
  $('#main').innerHTML = V.render();
  refresh();
}
function refresh() {
  const V = VIEWS[S.view];
  const out = $('#out');
  if (V?.out && out) out.innerHTML = V.out();
  V?.after?.();
  renderHeader();
}

// ---------- views ----------
const VIEWS = {};

VIEWS.dashboard = {
  render() {
    const folders = ['ทั้งหมด', ...new Set(S.clients.map(c => c.d.profile.folder || 'ทั่วไป'))];
    if (!folders.includes(S.folder)) S.folder = 'ทั้งหมด';
    const f = S.fa;
    return `<h2>สวัสดี ${esc(f.nick || f.name)} 👋</h2><p class="sub">จัดการโปรไฟล์ลูกค้าและเริ่มวางแผนการเงินได้ในแอปเดียว</p>
    <div class="grid g2">
      <div class="card"><div class="row between"><h3>รายชื่อลูกค้า (${S.clients.length})</h3><button class="btn" data-act="addClient">+ เพิ่มลูกค้า</button></div>
        <input class="inp" placeholder="🔍 ค้นหาชื่อ ชื่อเล่น เบอร์โทร..." data-path="S.q" value="${esc(S.q)}">
        <div class="chips mt">${folders.map(x => `<button class="chip ${x === S.folder ? 'on' : ''}" data-act="folder" data-v="${esc(x)}">📁 ${esc(x)}</button>`).join('')}</div>
        <div id="out" class="grid mt" style="gap:8px"></div></div>
      <div>
        <div class="card"><h3>เริ่มต้นใช้งาน</h3>
          <div class="grid g3" style="gap:8px">${NAV.slice(1).flatMap(([, it]) => it).map(([k, ic, t]) => `<button class="btn ghost" style="justify-content:flex-start" data-go="${k}">${ic} ${t}</button>`).join('')}</div></div>
        <div class="card"><h3>ข้อมูลสำรอง</h3><p class="small muted">ข้อมูลทั้งหมดเก็บไว้ในเบราว์เซอร์เครื่องนี้ ควรส่งออกไฟล์สำรองเป็นระยะ</p>
          <div class="row"><button class="btn ghost" data-act="export">⬇️ ส่งออกข้อมูล (.json)</button>
          <label class="btn ghost">⬆️ นำเข้าข้อมูล<input type="file" accept=".json" data-import hidden></label></div></div>
      </div></div>`;
  },
  out() {
    const q = S.q.trim().toLowerCase();
    const list = S.clients.filter(c => (S.folder === 'ทั้งหมด' || (c.d.profile.folder || 'ทั่วไป') === S.folder) &&
      (!q || [c.d.profile.name, c.d.profile.nick, c.d.profile.phone].join(' ').toLowerCase().includes(q)));
    if (!list.length) return '<div class="empty">ไม่พบลูกค้า</div>';
    return list.map(c => { const p = c.d.profile, r = calcRetire(c.d); return `<div class="client-card ${c.id === S.cur ? 'on' : ''}" data-act="pick" data-id="${c.id}">
      ${avatar(p.photo, p.name)}<div style="flex:1;min-width:0"><b>${esc(p.name)}</b> ${p.nick ? `(${esc(p.nick)})` : ''}<div class="small muted">อายุ ${p.age} · ${esc(p.occupation || '-')} · ${esc(p.phone || '')}</div>
      <div class="progress" style="height:10px;margin:4px 0 0"><div style="width:${r.progress * 100}%"></div></div><div class="small muted">ความพร้อมเกษียณ ${pct(r.progress, 0)}</div></div>
      <span class="folder-tab">📁 ${esc(p.folder || 'ทั่วไป')}</span></div>`; }).join('');
  },
};

VIEWS.profile = {
  render() {
    const p = D().profile;
    return `<h2>ข้อมูลลูกค้า</h2><p class="sub">ข้อมูลพื้นฐานที่ใช้ในทุกแผน</p>
    <div class="grid g2"><div class="card" style="text-align:center">
      ${avatar(p.photo, p.name, 'lg')}<div class="mt"><label class="btn ghost sm">📷 เปลี่ยนรูป<input type="file" accept="image/*" data-photo="profile.photo" hidden></label>
      ${p.photo ? '<button class="btn ghost sm" data-act="clearPhoto" data-path="profile.photo">ลบรูป</button>' : ''}</div>
      <div style="text-align:left" class="mt">${txt('profile.name', 'ชื่อ-นามสกุล')}${txt('profile.nick', 'ชื่อเล่น')}${txt('profile.folder', 'โฟลเดอร์', { ph: 'เช่น VIP, ครอบครัว, บริษัท A' })}
      ${txt('profile.phone', 'เบอร์โทร', { type: 'tel' })}${txt('profile.email', 'อีเมล', { type: 'email' })}${txt('profile.occupation', 'อาชีพ')}</div></div>
      <div class="card">${num('profile.age', 'อายุปัจจุบัน', { unit: 'ปี' })}${sel('profile.gender', 'เพศ', [['ชาย', 'ชาย'], ['หญิง', 'หญิง'], ['อื่นๆ', 'อื่นๆ']])}
      ${num('profile.income', 'รายได้ต่อเดือน', { step: 1000, unit: 'บาท' })}${chk('profile.spouse', 'มีคู่สมรส')}${num('profile.children', 'จำนวนบุตร', { unit: 'คน' })}
      ${num('profile.parents', 'บิดามารดาที่ดูแล', { unit: 'คน' })}
      <div class="field" style="display:block"><label>บันทึก/หมายเหตุ</label><textarea class="inp mt" rows="4" data-path="profile.note">${esc(p.note)}</textarea></div>
      <div class="row between mt"><button class="btn ok" data-go="cash">ถัดไป: งบการเงิน →</button><button class="btn bad sm" data-act="delClient">ลบลูกค้า</button></div></div></div>`;
  },
};

function listEditor(path, rows, types, unit = 'บาท/เดือน') {
  return `<table><tbody>${rows.map((r, i) => `<tr><td><input class="inp" data-path="${path}.${i}.n" value="${esc(r.n)}"></td>
    ${types ? `<td style="width:150px"><select class="inp" data-path="${path}.${i}.t" data-rerender>${types.map(([v, t]) => `<option value="${v}" ${r.t === v ? 'selected' : ''}>${t}</option>`).join('')}</select></td>` : ''}
    <td style="width:150px"><input class="inp right" inputmode="decimal" data-num data-path="${path}.${i}.v" value="${fmt(r.v)}"></td>
    <td style="width:30px"><button class="x" data-act="delRow" data-path="${path}" data-i="${i}">×</button></td></tr>`).join('')}</tbody></table>
    <button class="btn ghost sm mt" data-act="addRow" data-path="${path}" data-t="${types ? types[0][0] : ''}">+ เพิ่มรายการ</button> <span class="small muted">${unit}</span>`;
}
const EXP_T = [['v', 'ผันแปร'], ['f', 'คงที่'], ['d', 'ผ่อนหนี้'], ['s', 'เงินออม/ลงทุน']];
const ASSET_T = [['l', 'สภาพคล่อง'], ['i', 'ลงทุน'], ['p', 'ใช้ส่วนตัว']];
const DEBT_T = [['s', 'ระยะสั้น'], ['l', 'ระยะยาว']];

VIEWS.cash = {
  render() {
    const c = D().cash;
    return `<h2>งบการเงินส่วนบุคคล</h2><p class="sub">งบกระแสเงินสด (รายเดือน) และงบดุล (สินทรัพย์–หนี้สิน)</p>
    <div id="out"></div>
    <div class="grid g2"><div class="card"><h3>💰 รายรับ</h3>${listEditor('cash.inc', c.inc)}</div>
    <div class="card"><h3>💸 รายจ่าย</h3>${listEditor('cash.exp', c.exp, EXP_T)}</div>
    <div class="card"><h3>🏠 สินทรัพย์</h3>${listEditor('cash.asset', c.asset, ASSET_T, 'บาท (มูลค่าปัจจุบัน)')}</div>
    <div class="card"><h3>📉 หนี้สิน</h3>${listEditor('cash.debt', c.debt, DEBT_T, 'บาท (ยอดคงค้าง)')}</div></div>`;
  },
  out() {
    const t = cashTotals(D());
    return `<div class="grid g4" style="margin-bottom:16px">${kpi('รายรับ/เดือน', fmt(t.inc))}${kpi('รายจ่าย/เดือน', fmt(t.exp))}${kpi('เงินออม/เดือน', fmt(t.save))}
    ${kpi('กระแสเงินสดสุทธิ', fmt(t.net), t.net >= 0 ? 'ok' : 'bad')}${kpi('สินทรัพย์รวม', fmt(t.assets))}${kpi('หนี้สินรวม', fmt(t.debts))}${kpi('ความมั่งคั่งสุทธิ', fmt(t.worth), t.worth >= 0 ? 'ok' : 'bad')}
    <div class="kpi" style="display:flex;align-items:center;gap:10px">${donut([t.liquid, t.invest, t.personal], ['#b5e8dc', '#1fa971', '#f2a516'], 70)}<div class="legend"><span><i style="background:#b5e8dc"></i>สภาพคล่อง</span><span><i style="background:#1fa971"></i>ลงทุน</span><span><i style="background:#f2a516"></i>ส่วนตัว</span></div></div></div>`;
  },
};

VIEWS.ratio = {
  render() {
    const R = calcRatios(D()), good = R.filter(r => r.good).length, t = cashTotals(D());
    return `<h2>อัตราส่วนทางการเงิน</h2><p class="sub">วิเคราะห์สุขภาพการเงินจากงบการเงินของลูกค้า</p>
    <div class="card row" style="gap:24px">${donut([good, R.length - good], ['#1fa971', '#f2c4cb'], 130, `${good}/${R.length}`)}
      <div><h3 style="margin:0">คะแนนสุขภาพการเงิน: ${good >= 5 ? 'ดีมาก 💪' : good >= 3 ? 'ปานกลาง 🙂' : 'ควรปรับปรุง ⚠️'}</h3>
      <p class="muted">ผ่านเกณฑ์ ${good} จาก ${R.length} ข้อ · ความมั่งคั่งสุทธิ ${baht(t.worth)}</p><button class="btn ghost sm" data-go="cash">แก้ไขงบการเงิน</button></div></div>
    <div class="grid g3">${R.map(r => `<div class="ratio ${r.good ? 'ok' : 'bad'}"><span class="badge">${r.good ? 'ผ่าน ✓' : 'ไม่ผ่าน ✗'}</span>
      <div style="font-size:28px">${r.icon}</div><b>${r.n}</b><div class="v">${r.f(r.v)}</div><div class="s">เกณฑ์ ${r.bench}</div><div class="s mt">${r.desc}</div></div>`).join('')}</div>`;
  },
};

VIEWS.retire = {
  render() {
    const r = D().retire;
    return `<h2>แผนเกษียณ</h2><p class="sub">คำนวณเงินที่ต้องมี ณ วันเกษียณ และจำลองแผนการออม</p>
    <div class="grid g2"><div class="card">
      <div class="chips" style="margin-bottom:8px"><button class="chip ${r.method === 'exp' ? 'on' : ''}" data-chip="retire.method" data-v="exp">แบบที่ 1: จากค่าใช้จ่าย</button><button class="chip ${r.method === 'inc' ? 'on' : ''}" data-chip="retire.method" data-v="inc">แบบที่ 2: อัตราทดแทนรายได้</button></div>
      ${num('profile.age', 'อายุปัจจุบัน', { unit: 'ปี' })}
      ${num('retire.retireAge', 'อายุที่คาดว่าจะเกษียณ', { unit: 'ปี' })}
      ${chips('retire.life', 'อายุขัยคาดการณ์', [80, 85, 90, 95, 100])}
      ${r.method === 'exp' ? num('retire.expense', 'ค่าใช้จ่ายหลังเกษียณ (มูลค่าปัจจุบัน)', { step: 1000, unit: 'บาท/ด.', help: 'ค่าใช้จ่ายต่อเดือนที่ต้องการใช้หลังเกษียณ คิดเป็นราคาปัจจุบัน ระบบจะปรับด้วยอัตราเงินเฟ้อให้อัตโนมัติ โดยทั่วไปประมาณ 70–80% ของค่าใช้จ่ายปัจจุบัน' })
        : num('profile.income', 'รายได้ปัจจุบัน', { step: 1000, unit: 'บาท/ด.' }) + num('retire.salGrow', 'อัตราเงินเดือนขึ้น', { step: .5, dec: 1, unit: '%' }) + num('retire.replace', 'อัตราทดแทนรายได้', { step: 5, unit: '%', help: 'สัดส่วนของรายได้เดือนสุดท้ายก่อนเกษียณที่ต้องการใช้ต่อหลังเกษียณ นิยมใช้ 70–80%' })}
      ${num('retire.inf', 'อัตราเงินเฟ้อ', { step: .5, dec: 1, unit: '%', help: 'อัตราเงินเฟ้อเฉลี่ยระยะยาวของไทยประมาณ 2–3% ต่อปี' })}
      ${num('retire.rPre', 'ผลตอบแทน (ก่อนเกษียณ)', { step: .5, dec: 1, unit: '%' })}
      ${num('retire.rPost', 'ผลตอบแทน (หลังเกษียณ)', { step: .5, dec: 1, unit: '%', help: 'หลังเกษียณมักลงทุนแบบระมัดระวังมากขึ้น ผลตอบแทนจึงต่ำกว่าช่วงสะสม' })}
      ${chk('retire.useAssets', 'ดึงสินทรัพย์ลงทุนจากงบการเงิน', { help: 'ใช้ยอดรวมสินทรัพย์ประเภท "ลงทุน" จากงบการเงินเป็นเงินออมเพื่อเกษียณที่มีอยู่แล้ว' })}
      ${r.useAssets ? `<div class="small muted right">สินทรัพย์ลงทุน: ${baht(retireAssets(D()))}</div>` : num('retire.savings', 'เงินออมเพื่อเกษียณที่มีแล้ว', { step: 10000, unit: 'บาท' })}
      ${chk('retire.usePvd', 'รวมกองทุนสำรองเลี้ยงชีพ (จากเครื่องคำนวณ PVD)', { help: 'ใช้มูลค่า PVD ณ วันเกษียณจากหน้า "กองทุนสำรองฯ (PVD)" แทนยอดคงเหลือปัจจุบัน' })}
    </div><div id="out"></div></div>`;
  },
  out() {
    const d = D(), r = d.retire, p = d.profile, x = calcRetire(d);
    const pr = Math.min(100, (r.retireAge - p.age) / Math.max(1, r.life - p.age) * 100);
    return `<div class="card"><h3>Timeline เกษียณ</h3>
      <div class="tl" style="--p:${pr}%"><div class="pt" style="left:0"><div class="dot">${p.age}</div>วันนี้</div>
      <div class="pt r" style="left:${pr}%"><div class="dot">${r.retireAge}</div>เกษียณ</div>
      <div class="pt e" style="left:100%"><div class="dot">${r.life}</div>อายุขัย</div></div>
      <div class="row between small muted mt"><span>เตรียมตัวอีก <b>${x.n}</b> ปี</span><span>ใช้ชีวิตหลังเกษียณ <b>${x.m}</b> ปี</span></div></div>
    <div class="card"><div class="grid g2" style="gap:10px">
      ${kpi('ค่าใช้จ่าย ณ วันเกษียณ', baht(x.monthlyAtRetire) + '<span class="small">/ด.</span>')}
      ${kpi('เงินที่ต้องมี ณ วันเกษียณ', baht(x.need), 'warn')}
      ${kpi('เงินที่มีแล้ว (มูลค่า ณ วันเกษียณ)', baht(x.have), 'ok')}
      ${kpi('ส่วนที่ขาด', baht(x.gap), x.gap > 0 ? 'bad' : 'ok')}</div>
      <div class="mt"><b>ความพร้อมเกษียณ</b>${progress(x.progress)}</div>
      ${x.pvdFV ? `<div class="small muted">รวม PVD ณ วันเกษียณ ${baht(x.pvdFV)}</div>` : ''}
      <div class="kpi ${x.gap > 0 ? 'bad' : 'ok'} mt"><div class="l">ต้องออมเพิ่มต่อเดือน (ผลตอบแทน ${r.rPre}%)</div><div class="v">${baht(x.monthly)}</div></div></div>
    <div class="card"><div class="row between"><h3>จำลองแผนเกษียณ</h3><button class="btn ghost sm" data-act="usePlan" data-v="${Math.ceil(x.monthly / 100) * 100}">ใช้ยอดที่ต้องออม</button></div>
      ${num('retire.plan', 'ออมจริงเดือนละ', { step: 1000, unit: 'บาท' })}
      ${progress(x.progressPlan, 'ถ้าออมตามแผน: ' + pct(x.progressPlan, 0))}
      ${lineChart(x.ages, [{ data: x.bal.map(v => Math.max(0, v)), color: '#0f9a7e', fill: true }], { markers: [{ i: x.ages.indexOf(r.retireAge), t: 'เกษียณ' }] })}
      <p class="small ${x.runOut ? '' : 'muted'}" style="${x.runOut ? 'color:var(--bad)' : ''}">${x.runOut ? `⚠️ เงินจะหมดประมาณอายุ ${x.runOut - 1} ปี` : `✅ เงินเพียงพอถึงอายุ ${r.life} ปี เหลือ ${baht(x.bal.at(-1))}`}</p></div>`;
  },
};

VIEWS.edu = {
  render() {
    const e = D().edu;
    return `<h2>แผนการศึกษาบุตร</h2><p class="sub">คำนวณทุนการศึกษาทุกระดับโดยอัตโนมัติ ปรับค่าเล่าเรียนเองหรือใช้ข้อมูลจากแอปฯ ได้</p>
    <div class="card"><div class="grid g2">${num('edu.inf', 'อัตราเงินเฟ้อค่าการศึกษา', { step: .5, dec: 1, unit: '%', help: 'ค่าเล่าเรียนมักเพิ่มเร็วกว่าเงินเฟ้อทั่วไป นิยมใช้ 4–6% ต่อปี' })}${num('edu.ret', 'ผลตอบแทนการลงทุน', { step: .5, dec: 1, unit: '%' })}</div></div>
    ${e.kids.map((k, i) => `<div class="card"><div class="row between"><input class="inp" style="max-width:260px;font-weight:700" data-path="edu.kids.${i}.name" value="${esc(k.name)}">
      <button class="x" data-act="delRow" data-path="edu.kids" data-i="${i}">ลบ ×</button></div>
      ${num(`edu.kids.${i}.age`, 'อายุบุตรปัจจุบัน', { unit: 'ปี' })}
      <div class="field"><label>ใช้ค่าเล่าเรียนตามประเภทโรงเรียน</label><div class="chips">${Object.keys(EDU_PRESETS).map(p => `<button class="chip ${k.preset === p ? 'on' : ''}" data-act="eduPreset" data-i="${i}" data-v="${p}">${p}</button>`).join('')}</div></div>
      <div class="tbl-wrap"><table><thead><tr><th></th><th>ระดับ</th><th class="n">เริ่มอายุ</th><th class="n">จำนวนปี</th><th class="n">ค่าใช้จ่าย/ปี (ปัจจุบัน)</th></tr></thead><tbody>
      ${k.levels.map((L, j) => `<tr><td><input type="checkbox" data-path="edu.kids.${i}.levels.${j}.on" data-rerender ${L.on ? 'checked' : ''}></td><td>${L.k}</td>
        <td class="n"><input class="inp right" style="width:70px" data-num data-path="edu.kids.${i}.levels.${j}.start" value="${L.start}"></td>
        <td class="n"><input class="inp right" style="width:70px" data-num data-path="edu.kids.${i}.levels.${j}.yrs" value="${L.yrs}"></td>
        <td class="n"><input class="inp right" style="width:130px" data-num data-path="edu.kids.${i}.levels.${j}.cost" value="${fmt(L.cost)}"></td></tr>`).join('')}</tbody></table></div>
      <div id="kid${i}"></div></div>`).join('')}
    <button class="btn ghost" data-act="addKid">+ เพิ่มบุตร</button>
    <div id="out" class="mt"></div>`;
  },
  out() {
    const x = calcEdu(D());
    x.kids.forEach((k, i) => {
      const el = $('#kid' + i); if (!el) return;
      el.innerHTML = `<div class="grid g3 mt" style="gap:10px">${kpi('ค่าใช้จ่ายรวม (มูลค่าอนาคต)', baht(k.fut))}${kpi('ต้องมีเงินก้อนวันนี้', baht(k.pv), 'warn')}${kpi(`หรือออมเดือนละ (${k.lastT} ปี)`, baht(k.monthly), 'ok')}</div>
      <details class="mt"><summary class="small">ดูค่าใช้จ่ายรายปี</summary><div class="tbl-wrap"><table><thead><tr><th>อายุ</th><th>ระดับ</th><th class="n">อีก (ปี)</th><th class="n">ค่าใช้จ่ายปีนั้น</th><th class="n">มูลค่าปัจจุบัน</th></tr></thead>
      <tbody>${k.rows.map(r => `<tr><td>${r.age}</td><td>${r.level}</td><td class="n">${r.t}</td><td class="n">${fmt(r.f)}</td><td class="n">${fmt(r.v)}</td></tr>`).join('')}</tbody></table></div></details>`;
    });
    return x.kids.length > 1 ? `<div class="card"><h3>รวมทุกคน</h3><div class="grid g3">${kpi('ค่าใช้จ่ายรวม', baht(x.fut))}${kpi('เงินก้อนวันนี้', baht(x.pv), 'warn')}${kpi('ออมรวมต่อเดือน', baht(x.monthly), 'ok')}</div></div>` : '';
  },
};

VIEWS.life = {
  render() {
    const L = D().life;
    return `<h2>ทุนประกันชีวิตที่ควรมี</h2><p class="sub">คำนวณแบบ Needs Approach — ภาระที่ครอบครัวต้องรับหากขาดผู้หารายได้</p>
    <div class="grid g2"><div class="card"><h3>ความต้องการ</h3>
      ${chk('life.autoFamily', 'ใช้ค่าใช้จ่ายครอบครัวจากงบการเงิน')}
      ${L.autoFamily ? '' : num('life.family', 'ค่าใช้จ่ายครอบครัวต่อปี', { step: 10000, unit: 'บาท' })}
      ${num('life.years', 'จำนวนปีที่ต้องดูแลครอบครัว', { unit: 'ปี', help: 'เช่น จนกว่าบุตรคนเล็กจะเรียนจบ หรือจนคู่สมรสเกษียณ' })}
      ${num('life.inf', 'อัตราเงินเฟ้อ', { step: .5, dec: 1, unit: '%' })}${num('life.ret', 'ผลตอบแทนเงินก้อน', { step: .5, dec: 1, unit: '%' })}
      ${chk('life.autoDebt', 'ดึงหนี้สินคงค้างจากงบการเงิน')}${L.autoDebt ? '' : num('life.debt', 'หนี้สินคงค้าง', { step: 10000, unit: 'บาท' })}
      ${chk('life.autoEdu', 'ดึงทุนการศึกษาบุตรจากแผนการศึกษา')}${L.autoEdu ? '' : num('life.edu', 'ทุนการศึกษาบุตร', { step: 10000, unit: 'บาท' })}
      ${num('life.final', 'ค่าใช้จ่ายงานศพ/จัดการมรดก', { step: 10000, unit: 'บาท' })}${num('life.emergency', 'เงินสำรองฉุกเฉินครอบครัว', { step: 10000, unit: 'บาท' })}
      ${num('life.other', 'เป้าหมายอื่นๆ', { step: 10000, unit: 'บาท' })}
      <h3 class="mt">สิ่งที่มีแล้ว</h3>${chk('life.autoAsset', 'ดึงสินทรัพย์สภาพคล่อง+ลงทุนจากงบการเงิน')}${L.autoAsset ? '' : num('life.asset', 'สินทรัพย์ที่ใช้ได้', { step: 10000, unit: 'บาท' })}
      <div class="small muted">ทุนประกันชีวิตเดิมดึงจากหน้า "สรุปกรมธรรม์" อัตโนมัติ</div></div>
    <div id="out"></div></div>`;
  },
  out() {
    const x = calcLife(D());
    return `<div class="card"><h3>สรุปทุนประกัน</h3>${bars([
      { n: 'ดูแลครอบครัว', v: x.incomeNeed }, { n: 'หนี้สินคงค้าง', v: x.debt }, { n: 'ทุนการศึกษาบุตร', v: x.edu },
      { n: 'ค่าใช้จ่ายสุดท้าย+ฉุกเฉิน+อื่นๆ', v: x.needs - x.incomeNeed - x.debt - x.edu },
      { n: 'สินทรัพย์ที่มี', v: x.asset, c: 'var(--ok)' }, { n: 'ทุนประกันเดิม', v: x.cover, c: 'var(--ok)' }])}
      <div class="grid g2 mt" style="gap:10px">${kpi('ความต้องการทั้งหมด', baht(x.needs), 'warn')}${kpi('มีแล้ว', baht(x.asset + x.cover), 'ok')}</div>
      ${progress(x.progress)}
      <div class="kpi ${x.gap > 0 ? 'bad' : 'ok'}"><div class="l">ทุนประกันชีวิตที่ควรเพิ่ม</div><div class="v">${baht(x.gap)}</div></div>
      <p class="small muted">ค่าใช้จ่ายครอบครัว ${baht(x.family)}/ปี เป็นเวลา ${D().life.years} ปี</p></div>`;
  },
};

VIEWS.policy = {
  render() {
    const P = D().policies;
    const col = (i, k, w = 110, t = 'num') => `<td><input class="inp ${t === 'num' ? 'right' : ''}" style="min-width:${w}px" ${t === 'num' ? 'data-num inputmode="decimal"' : ''} data-path="policies.${i}.${k}" value="${t === 'num' ? fmt(P[i][k]) : esc(P[i][k])}"></td>`;
    return `<h2>สรุปกรมธรรม์</h2><p class="sub">รวบรวมกรมธรรม์ทั้งหมดของลูกค้า แล้วสร้างรายงานสรุปพร้อมแชร์ได้ทันที</p>
    <div class="card"><div class="tbl-wrap"><table><thead><tr><th>บริษัท</th><th>ชื่อแบบประกัน</th><th>ประเภท</th><th class="n">ทุนชีวิต</th><th class="n">เบี้ย/ปี</th><th class="n">ค่าห้อง/วัน</th><th class="n">IPD</th><th class="n">โรคร้ายแรง</th><th class="n">อุบัติเหตุ</th><th>ครบกำหนด</th><th></th></tr></thead><tbody>
    ${P.map((p, i) => `<tr>${col(i, 'co', 110, 's')}${col(i, 'plan', 130, 's')}<td><select class="inp" data-path="policies.${i}.type">${['ตลอดชีพ', 'สะสมทรัพย์', 'ชั่วระยะเวลา', 'บำนาญ', 'Unit Linked', 'สุขภาพ', 'โรคร้ายแรง', 'อุบัติเหตุ'].map(t => `<option ${p.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
      ${col(i, 'sum')}${col(i, 'prem', 90)}${col(i, 'room', 80)}${col(i, 'ipd')}${col(i, 'ci')}${col(i, 'acc')}${col(i, 'end', 80, 's')}<td><button class="x" data-act="delRow" data-path="policies" data-i="${i}">×</button></td></tr>`).join('')}
    </tbody></table></div>${P.length ? '' : '<div class="empty">ยังไม่มีกรมธรรม์</div>'}
    <div class="row mt"><button class="btn ghost" data-act="addPolicy">+ เพิ่มกรมธรรม์</button><button class="btn" data-act="policyReport">🖨️ สร้างรายงานสรุปกรมธรรม์</button><button class="btn ghost" data-act="sharePolicy">📤 แชร์สรุป</button></div></div>
    <div id="out"></div>`;
  },
  out() {
    const t = policyTotals(D());
    return `<div class="grid g3">${kpi('จำนวนกรมธรรม์', D().policies.length + ' ฉบับ')}${kpi('ทุนประกันชีวิตรวม', baht(t.sum))}${kpi('เบี้ยประกันรวม/ปี', baht(t.prem), 'warn')}
      ${kpi('ค่าห้องรวม/วัน', baht(t.room))}${kpi('ค่ารักษา IPD รวม', baht(t.ipd))}${kpi('โรคร้ายแรงรวม', baht(t.ci))}</div>`;
  },
};

VIEWS.health = {
  render() {
    return `<h2>ประเมินประกันสุขภาพ</h2><p class="sub">เลือกระดับโรงพยาบาลที่ลูกค้าต้องการใช้บริการ เพื่อประเมินความคุ้มครองที่เหมาะสม</p>
    <div class="grid g2"><div class="card">
      ${sel('health.region', 'ภูมิภาค', REGIONS.map((r, i) => [i, r[0]]), { numv: true })}
      <div class="field" style="display:block"><label>ระดับโรงพยาบาลที่ต้องการ</label><div class="grid mt" style="gap:6px">
      ${HOSPITAL_TIERS.map((h, i) => `<button class="client-card ${D().health.tier === i ? 'on' : ''}" data-chip="health.tier" data-v="${i}" data-numv style="text-align:left"><span style="flex:1"><b>${h.n}</b><div class="small muted">ค่าห้องประมาณ ${fmt(Math.round(h.room * REGIONS[D().health.region][1] / 100) * 100)} บาท/วัน</div></span></button>`).join('')}</div></div>
      ${num('health.ciYears', 'ทุนโรคร้ายแรง (เท่าของรายได้ต่อปี)', { unit: 'ปี', help: 'นิยมให้มีทุนโรคร้ายแรง 3–5 เท่าของรายได้ต่อปี เพื่อทดแทนรายได้ระหว่างรักษาตัว' })}
      ${num('health.acc', 'ทุนอุบัติเหตุ (0 = อัตโนมัติ 2 เท่ารายได้ต่อปี)', { step: 100000, unit: 'บาท' })}
    </div><div id="out"></div></div>
    <div class="card"><h3>ข้อมูลค่าห้องโรงพยาบาล (ประมาณการ บาท/วัน)</h3><div class="tbl-wrap"><table><thead><tr><th>ระดับ</th>${REGIONS.map(r => `<th class="n">${r[0]}</th>`).join('')}</tr></thead>
    <tbody>${HOSPITAL_TIERS.map(h => `<tr><td>${h.n}</td>${REGIONS.map(r => `<td class="n">${fmt(Math.round(h.room * r[1] / 100) * 100)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <p class="small muted">ตัวเลขเป็นค่าประมาณเพื่อใช้อ้างอิงเบื้องต้น ค่าห้องจริงขึ้นกับโรงพยาบาลและประเภทห้อง</p></div>`;
  },
  out() {
    const x = calcHealth(D());
    return `<div class="card"><h3>ความคุ้มครองที่แนะนำ vs. ที่มีอยู่</h3><table><thead><tr><th>รายการ</th><th class="n">ควรมี</th><th class="n">มีแล้ว</th><th></th></tr></thead>
      <tbody>${x.items.map(i => `<tr><td>${i.n}</td><td class="n">${fmt(i.need)}</td><td class="n">${fmt(i.have)}</td><td>${i.have >= i.need ? '✅' : `<span style="color:var(--bad)">ขาด ${fmt(i.need - i.have)}</span>`}</td></tr>`).join('')}</tbody></table>
      <p class="small muted">ความคุ้มครองที่มีแล้วดึงจากหน้า "สรุปกรมธรรม์"</p><button class="btn ghost sm" data-go="policy">จัดการกรมธรรม์</button></div>`;
  },
};

VIEWS.goals = {
  render() {
    const G = D().goals;
    return `<h2>เป้าหมายการออม/ลงทุนอื่นๆ</h2><p class="sub">เพิ่มเป้าหมายได้ไม่จำกัด เช่น ซื้อบ้าน ซื้อรถ แต่งงาน ท่องเที่ยว</p>
    ${G.map((g, i) => `<div class="card"><div class="row between"><input class="inp" style="max-width:320px;font-weight:700" data-path="goals.${i}.n" value="${esc(g.n)}"><button class="x" data-act="delRow" data-path="goals" data-i="${i}">ลบ ×</button></div>
      <div class="grid g2"><div>${num(`goals.${i}.amt`, 'จำนวนเงิน (ราคาปัจจุบัน)', { step: 10000, unit: 'บาท' })}${num(`goals.${i}.yrs`, 'อีกกี่ปี', { unit: 'ปี' })}
      ${num(`goals.${i}.inf`, 'เงินเฟ้อ', { step: .5, dec: 1, unit: '%' })}${num(`goals.${i}.ret`, 'ผลตอบแทน', { step: .5, dec: 1, unit: '%' })}</div><div id="goal${i}"></div></div></div>`).join('')}
    <button class="btn ghost" data-act="addGoal">+ เพิ่มเป้าหมาย</button><div id="out" class="mt"></div>`;
  },
  out() {
    const G = D().goals; let tot = 0;
    G.forEach((g, i) => { const x = calcGoal(g); tot += x.monthly; const el = $('#goal' + i); if (el) el.innerHTML = `<div class="grid" style="gap:10px">${kpi('มูลค่าในอนาคต', baht(x.fut))}${kpi('ต้องออมต่อเดือน', baht(x.monthly), 'ok')}</div>`; });
    return G.length ? `<div class="card">${kpi('รวมเงินออมต่อเดือนสำหรับทุกเป้าหมาย', baht(tot), 'warn')}</div>` : '';
  },
};

VIEWS.tax = {
  render() {
    const keys = ['sso', 'life', 'health', 'parentHealth', 'pension', 'rmf', 'ssf', 'pvd', 'esg', 'home', 'easy', 'donate'];
    return `<h2>คำนวณภาษีเงินได้บุคคลธรรมดา</h2><p class="sub">ครบทุกประเภทเงินได้ 40(1)–40(8) พร้อมวางแผนลดหย่อนภาษี</p>
    <div class="grid g2"><div class="card"><h3>เงินได้ทั้งปี</h3>${Object.entries(INC_INFO).map(([k, [n, h]]) => num('tax.inc.' + k, n, { step: 10000, unit: 'บาท', help: h })).join('')}
      <button class="btn ghost sm mt" data-act="taxFromProfile">ดึงเงินเดือนจากข้อมูลลูกค้า (×12)</button></div>
    <div class="card"><h3>ค่าลดหย่อน</h3>
      <div class="field"><label>${DED_INFO.personal[0]}${helpHtml(1)}</label><b>60,000</b></div>${helpBox(DED_INFO.personal[1])}
      ${chk('tax.ded.spouse', DED_INFO.spouse[0], { help: DED_INFO.spouse[1] })}
      ${num('tax.ded.child', DED_INFO.child[0], { unit: 'คน', help: DED_INFO.child[1] })}
      ${num('tax.ded.parents', DED_INFO.parents[0], { unit: 'คน', help: DED_INFO.parents[1] })}
      ${keys.map(k => num('tax.ded.' + k, DED_INFO[k][0], { step: 1000, unit: 'บาท', help: DED_INFO[k][1] })).join('')}</div></div>
    <div id="out"></div>`;
  },
  out() {
    const x = calcTax(D()), pot = taxPotential(D());
    return `<div class="card"><div class="grid g4" style="gap:10px">${kpi('เงินได้รวม', fmt(x.total))}${kpi('หักค่าใช้จ่าย', fmt(x.exp))}${kpi('หักค่าลดหย่อน', fmt(x.dedTotal))}${kpi('เงินได้สุทธิ', fmt(x.net))}
      ${kpi('ภาษีที่ต้องชำระ', baht(x.tax), 'bad')}${kpi('อัตราภาษีที่แท้จริง', pct(x.eff, 2))}${kpi('ฐานภาษีสูงสุด', pct(x.marginal, 0), 'warn')}${kpi('สิทธิกลุ่มเกษียณคงเหลือ', fmt(x.retireRoom))}</div>
      <div class="grid g2 mt"><div><h3>ภาษีตามขั้นบันได</h3><table><thead><tr><th>เงินได้สุทธิ</th><th class="n">อัตรา</th><th class="n">เงินได้ในขั้น</th><th class="n">ภาษี</th></tr></thead>
      <tbody>${x.rows.map(r => `<tr style="${r.part ? '' : 'opacity:.45'}"><td>${fmt(r.from + (r.from ? 1 : 0))} – ${isFinite(r.to) ? fmt(r.to) : 'ขึ้นไป'}</td><td class="n">${pct(r.rate, 0)}</td><td class="n">${fmt(r.part)}</td><td class="n">${fmt(r.tax)}</td></tr>`).join('')}</tbody></table></div>
      <div><h3>💡 วางแผนลดหย่อนเพิ่ม</h3>${pot.length ? `<table><thead><tr><th>รายการ</th><th class="n">ซื้อเพิ่มได้</th><th class="n">ประหยัดภาษี</th></tr></thead>
      <tbody>${pot.map(p => `<tr><td>${DED_INFO[p.k][0]}</td><td class="n">${fmt(p.extra)}</td><td class="n" style="color:var(--ok);font-weight:700">${fmt(p.save)}</td></tr>`).join('')}</tbody></table>
      <p class="small muted">แต่ละรายการคำนวณแยกกัน (ไม่รวมกัน) ภายใต้เพดานสิทธิ์ที่เหลือ</p>` : '<p class="muted">ใช้สิทธิ์ลดหย่อนหลักครบแล้ว หรือไม่มีภาษีที่ต้องชำระ</p>'}</div></div></div>`;
  },
};

VIEWS.port = {
  render() {
    const P = S.tools.ports, s = D().port.sel;
    return `<h2>พอร์ตการลงทุนแนะนำ</h2><p class="sub">6 พอร์ตตามระดับความเสี่ยง พร้อม QR Code ให้ลูกค้าสแกนเปิดพอร์ตได้ทันที</p>
    <div class="grid g3">${P.map((p, i) => `<div class="port ${s === i ? 'on' : ''}" data-chip="port.sel" data-v="${i}" data-numv>
      <div class="row between"><b>${i + 1}. ${p.n}</b><span class="folder-tab">ความเสี่ยง ${'●'.repeat(i + 1)}${'○'.repeat(5 - i)}</span></div>
      <div class="row">${donut(p.a, PORT_COLORS, 110, p.ret + '%')}<div class="legend">${p.a.map((v, j) => v ? `<span><i style="background:${PORT_COLORS[j]}"></i>${PORT_CATS[j]} ${v}%</span>` : '').join('')}</div></div>
      <div class="small muted">ผลตอบแทนคาดหวัง ~${p.ret}% ต่อปี</div></div>`).join('')}</div>
    <div id="out" class="mt"></div>`;
  },
  out() {
    const i = D().port.sel, p = S.tools.ports[i];
    return `<div class="card grid g2"><div><h3>พอร์ตที่เลือก: ${p.n}</h3>
      ${p.a.map((v, j) => num(`tools.ports.${i}.a.${j}`, PORT_CATS[j], { step: 5, unit: '%' })).join('')}
      ${num(`tools.ports.${i}.ret`, 'ผลตอบแทนคาดหวัง', { step: .5, dec: 1, unit: '%' })}
      <div class="small ${sum(p.a, x => x) === 100 ? 'muted' : ''}" style="${sum(p.a, x => x) === 100 ? '' : 'color:var(--bad)'}">รวม ${sum(p.a, x => x)}%</div>
      <button class="btn ghost sm mt" data-act="portToRetire">ใช้ผลตอบแทนนี้ในแผนเกษียณ</button></div>
      <div style="text-align:center">${txt(`tools.ports.${i}.link`, 'ลิงก์เปิดพอร์ต', { ph: 'https://...' })}<div class="qrbox mt" id="portQR"></div>
      <div class="mt"><button class="btn ghost sm" data-act="dlQR" data-el="portQR" data-name="port-${i + 1}">⬇️ บันทึก QR</button></div></div></div>`;
  },
  after() { const p = S.tools.ports[D().port.sel]; makeQR($('#portQR'), p.link || '', 180); if (!p.link) $('#portQR').innerHTML = '<div class="small muted" style="width:180px">ใส่ลิงก์เพื่อสร้าง QR</div>'; },
};

VIEWS.tvm = {
  render() {
    const t = S.tools.tvm, f = (k, l, o = {}) => `<div class="row" style="gap:6px"><button class="chip ${t.solve === k ? 'on' : ''}" data-chip="tools.tvm.solve" data-v="${k}">หา</button><div style="flex:1">${num('tools.tvm.' + k, l, { ...o, dis: t.solve === k })}</div></div>`;
    return `<h2>เครื่องคิดเลข TVM</h2><p class="sub">มูลค่าเงินตามเวลา (Time Value of Money) — กด "หา" ที่ตัวแปรที่ต้องการคำนวณ · เงินจ่ายออกใส่เป็นค่าลบ</p>
    <div class="grid g2"><div class="card">${f('n', 'N (จำนวนงวด)', { dec: 2 })}${f('i', 'I/Y (อัตราผลตอบแทนต่อปี %)', { step: .5, dec: 2 })}
      ${f('pv', 'PV (มูลค่าปัจจุบัน)', { step: 1000, dec: 2 })}${f('pmt', 'PMT (เงินงวด)', { step: 100, dec: 2 })}${f('fv', 'FV (มูลค่าอนาคต)', { step: 1000, dec: 2 })}
      ${chips('tools.tvm.ppy', 'งวดต่อปี (P/Y)', [1, 2, 4, 12])}${chk('tools.tvm.bgn', 'ชำระต้นงวด (BGN)')}</div>
      <div id="out"></div></div>`;
  },
  out() {
    const t = S.tools.tvm, v = tvmSolve(t);
    const names = { n: 'N', i: 'I/Y', pv: 'PV', pmt: 'PMT', fv: 'FV' };
    return `<div class="card"><div class="kpi ok"><div class="l">${names[t.solve]} =</div><div class="v" style="font-size:34px">${isFinite(v) ? fmt(v, 2) + (t.solve === 'i' ? '%' : '') : 'ไม่มีคำตอบ'}</div></div>
      <button class="btn mt" data-act="tvmApply" data-v="${v}">ใส่ค่านี้ลงช่อง</button>
      <div class="helptext show mt"><b>ตัวอย่าง:</b> ลงทุน 100,000 (PV = −100,000) ผลตอบแทน 5% 10 ปี → หา FV ≈ 162,889<br>ออมเดือนละเท่าไหร่ให้ได้ 1 ล้านใน 10 ปี: N=120, I/Y=5, P/Y=12, FV=1,000,000 → หา PMT</div></div>`;
  },
};

VIEWS.pvd = {
  render() {
    return `<h2>กองทุนสำรองเลี้ยงชีพ (PVD)</h2><p class="sub">คำนวณเงินกองทุน ณ วันเกษียณ พร้อมนำไปใช้ในแผนเกษียณ</p>
    <div class="grid g2"><div class="card">${num('pvd.salary', 'เงินเดือนปัจจุบัน', { step: 1000, unit: 'บาท' })}${num('pvd.grow', 'อัตราเงินเดือนขึ้น/ปี', { step: .5, dec: 1, unit: '%' })}
      ${num('pvd.emp', 'อัตราสะสม (ลูกจ้าง)', { step: 1, unit: '%', help: 'ลูกจ้างสะสมได้ 2–15% ของค่าจ้าง' })}${num('pvd.er', 'อัตราสมทบ (นายจ้าง)', { step: 1, unit: '%' })}
      ${num('pvd.ret', 'ผลตอบแทนกองทุน/ปี', { step: .5, dec: 1, unit: '%' })}${num('pvd.bal', 'ยอดเงินกองทุนปัจจุบัน', { step: 10000, unit: 'บาท' })}
      ${num('profile.age', 'อายุปัจจุบัน', { unit: 'ปี' })}${num('retire.retireAge', 'อายุเกษียณ', { unit: 'ปี' })}</div><div id="out"></div></div>`;
  },
  out() {
    const x = calcPvd(D());
    return `<div class="card"><div class="grid" style="gap:10px">${kpi('เงินกองทุน ณ วันเกษียณ', baht(x.fv), 'ok')}${kpi('เงินสะสม+สมทบรวม ' + x.years + ' ปี', baht(x.contrib))}</div>
      ${x.rows.length ? lineChart(x.rows.map(r => r.age), [{ data: x.rows.map(r => r.bal), color: '#1fa971', fill: true }], { h: 200 }) : ''}
      <button class="btn mt" data-act="pvdToRetire">✅ ใช้ในแผนเกษียณ</button>
      <details class="mt"><summary class="small">ตารางรายปี</summary><table><thead><tr><th>อายุ</th><th class="n">เงินเดือน</th><th class="n">ยอดกองทุน</th></tr></thead><tbody>${x.rows.map(r => `<tr><td>${r.age}</td><td class="n">${fmt(r.sal)}</td><td class="n">${fmt(r.bal)}</td></tr>`).join('')}</tbody></table></details></div>`;
  },
};

function vcard(f) {
  return ['BEGIN:VCARD', 'VERSION:3.0', `FN:${f.name}`, f.company && `ORG:${f.company}`, f.position && `TITLE:${f.position}`, f.phone && `TEL:${f.phone}`, f.email && `EMAIL:${f.email}`, f.web && `URL:${f.web}`, 'END:VCARD'].filter(Boolean).join('\n');
}
function bizCardHtml(f, id = 'cardQR') {
  return `<div class="bizcard"><div style="z-index:1;display:flex;flex-direction:column;gap:6px;min-width:0">
    <div class="row">${avatar(f.photo, f.name)}<div><div style="font-family:Kanit;font-size:20px">${esc(f.name)}</div><div style="opacity:.85">${esc(f.nick ? '(' + f.nick + ') ' : '')}${esc(f.position)}</div></div></div>
    <div style="font-size:13px;line-height:1.6;margin-top:auto">${f.company ? `🏢 ${esc(f.company)}<br>` : ''}${f.phone ? `📞 ${esc(f.phone)}<br>` : ''}${f.email ? `✉️ ${esc(f.email)}<br>` : ''}${f.line ? `💬 LINE: ${esc(f.line)}<br>` : ''}${f.license ? `🪪 ใบอนุญาต ${esc(f.license)}<br>` : ''}${f.certs ? `🎖️ ${esc(f.certs)}` : ''}</div></div>
    <div class="qr" id="${id}"></div></div>`;
}
VIEWS.card = {
  render() {
    const f = S.fa;
    return `<h2>นามบัตรนักวางแผนการเงิน</h2><p class="sub">ข้อมูลนี้ใช้ในหน้าปกรายงานและนามบัตร — แชร์ให้ลูกค้าได้ทันที</p>
    <div class="grid g2"><div class="card"><div class="row">${avatar(f.photo, f.name, 'lg')}<label class="btn ghost sm">📷 เปลี่ยนรูป<input type="file" accept="image/*" data-photo="fa.photo" hidden></label></div>
      ${txt('fa.name', 'ชื่อ-นามสกุล')}${txt('fa.nick', 'ชื่อเล่น')}${txt('fa.position', 'ตำแหน่ง')}${txt('fa.company', 'บริษัท')}${txt('fa.license', 'เลขที่ใบอนุญาต')}
      ${txt('fa.certs', 'คุณวุฒิ', { ph: 'CFP, AFPT, MDRT' })}${txt('fa.phone', 'เบอร์โทร', { type: 'tel' })}${txt('fa.email', 'อีเมล', { type: 'email' })}${txt('fa.line', 'LINE ID')}${txt('fa.web', 'เว็บไซต์')}
      ${txt('fa.link', 'ลิงก์ใน QR (เว้นว่าง = vCard)', { ph: 'https://...' })}</div>
    <div><div class="card" id="out"></div></div></div>`;
  },
  out() { return `${bizCardHtml(S.fa)}<div class="row mt"><button class="btn" data-act="dlCard">⬇️ บันทึกเป็นรูปภาพ</button><button class="btn ghost" data-act="shareCard">📤 แชร์</button></div><canvas id="cardCanvas" hidden></canvas>`; },
  after() { makeQR($('#cardQR'), S.fa.link || vcard(S.fa), 90); },
};

VIEWS.qr = {
  render() {
    const q = S.tools.qr;
    const presets = [['🌐 เว็บไซต์', S.fa.web || 'https://'], ['💬 LINE', S.fa.line ? 'https://line.me/ti/p/~' + S.fa.line : 'https://line.me/ti/p/~'], ['📞 โทร', 'tel:' + (S.fa.phone || '')], ['✉️ อีเมล', 'mailto:' + (S.fa.email || '')]];
    return `<h2>สร้าง QR Code</h2><p class="sub">สร้าง QR จากลิงก์ใดก็ได้ เช่น เว็บไซต์ ลิงก์เปิดพอร์ตกองทุน แบบฟอร์ม</p>
    <div class="grid g2"><div class="card"><div class="chips">${presets.map(([l, v]) => `<button class="chip" data-act="qrPreset" data-v="${esc(v)}">${l}</button>`).join('')}</div>
      <div class="field" style="display:block"><label>ลิงก์หรือข้อความ</label><textarea class="inp mt" rows="3" data-path="tools.qr.text">${esc(q.text)}</textarea></div>
      ${txt('tools.qr.label', 'ชื่อ QR (สำหรับบันทึก)')}
      <div class="row mt"><button class="btn" data-act="qrSave">💾 บันทึกไว้ใช้ซ้ำ</button><button class="btn ghost" data-act="dlQR" data-el="qrMain" data-name="qr">⬇️ บันทึกรูป</button></div>
      <h3 class="mt">QR ที่บันทึกไว้</h3>${q.saved.length ? q.saved.map((s, i) => `<div class="field"><label><a href="#" data-act="qrLoad" data-i="${i}">${esc(s.label || s.text)}</a></label><button class="x" data-act="delRow" data-path="tools.qr.saved" data-i="${i}">×</button></div>`).join('') : '<p class="muted small">ยังไม่มี</p>'}</div>
      <div class="card" style="text-align:center"><div class="qrbox" id="qrMain"></div><div class="mt small muted" id="out"></div></div></div>`;
  },
  out() { return esc(S.tools.qr.label || ''); },
  after() { makeQR($('#qrMain'), S.tools.qr.text, 240); },
};

// ---------- report ----------
const REPORT_SECTIONS = [['cover', 'หน้าปก'], ['fa', 'โปรไฟล์นักวางแผน'], ['cash', 'งบการเงิน & อัตราส่วน'], ['retire', 'แผนเกษียณ'], ['edu', 'การศึกษาบุตร'], ['life', 'ประกันชีวิต'], ['health', 'ประกันสุขภาพ'], ['policy', 'สรุปกรมธรรม์'], ['goals', 'เป้าหมายอื่นๆ'], ['tax', 'ภาษี'], ['port', 'พอร์ตแนะนำ']];
function reportHtml(d, only) {
  const p = d.profile, f = S.fa, on = k => only ? only.includes(k) : d.report[k];
  const today = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  const pg = (title, body) => `<div class="report-page"><h2>${title}</h2><p class="small muted">${esc(p.name)} · ${today}</p>${body}</div>`;
  let h = '';
  if (on('cover')) h += `<div class="report-page cover">${avatar(p.photo, p.name, 'lg')}<h1>${only ? 'รายงานสรุปกรมธรรม์' : 'แผนการเงินส่วนบุคคล'}</h1><div style="font-size:22px">${esc(p.name)}</div><div class="mt" style="opacity:.85">จัดทำวันที่ ${today}</div>
    <div class="row mt" style="margin-top:48px;justify-content:center">${avatar(f.photo, f.name)}<div style="text-align:left"><b>${esc(f.name)}</b><br><small>${esc(f.position)} ${f.company ? '· ' + esc(f.company) : ''}</small></div></div></div>`;
  if (on('fa')) h += pg('นักวางแผนการเงินของคุณ', `<div style="display:flex;justify-content:center;margin:24px 0">${bizCardHtml(f, 'repQR')}</div>`);
  if (on('cash')) {
    const t = cashTotals(d), R = calcRatios(d);
    h += pg('งบการเงินและสุขภาพการเงิน', `<div class="grid g4">${kpi('รายรับ/เดือน', fmt(t.inc))}${kpi('รายจ่าย/เดือน', fmt(t.exp))}${kpi('เงินออม/เดือน', fmt(t.save))}${kpi('กระแสเงินสดสุทธิ', fmt(t.net), t.net >= 0 ? 'ok' : 'bad')}
      ${kpi('สินทรัพย์', fmt(t.assets))}${kpi('หนี้สิน', fmt(t.debts))}${kpi('ความมั่งคั่งสุทธิ', fmt(t.worth), t.worth >= 0 ? 'ok' : 'bad')}</div>
      <h3>อัตราส่วนทางการเงิน</h3><div class="grid g3">${R.map(r => `<div class="ratio ${r.good ? 'ok' : 'bad'}"><span class="badge">${r.good ? '✓' : '✗'}</span>${r.icon} <b>${r.n}</b><div class="v">${r.f(r.v)}</div><div class="s">เกณฑ์ ${r.bench}</div></div>`).join('')}</div>`);
  }
  if (on('retire')) {
    const x = calcRetire(d), r = d.retire;
    h += pg('แผนเกษียณ', `<p>เกษียณอายุ <b>${r.retireAge}</b> ปี (อีก ${x.n} ปี) ใช้ชีวิตหลังเกษียณ ${x.m} ปี ค่าใช้จ่าย ณ วันเกษียณ ${baht(x.monthlyAtRetire)}/เดือน</p>
      <div class="grid g4">${kpi('เงินที่ต้องมี', fmt(x.need), 'warn')}${kpi('มีแล้ว', fmt(x.have), 'ok')}${kpi('ส่วนที่ขาด', fmt(x.gap), x.gap ? 'bad' : 'ok')}${kpi('ต้องออมเพิ่ม/เดือน', fmt(x.monthly))}</div>${progress(x.progress)}
      ${lineChart(x.ages, [{ data: x.bal.map(v => Math.max(0, v)), color: '#0f9a7e', fill: true }], { h: 200, markers: [{ i: x.ages.indexOf(r.retireAge), t: 'เกษียณ' }] })}<p class="small muted">จำลองการออมเดือนละ ${baht(r.plan)}</p>`);
  }
  if (on('edu') && d.edu.kids.length) {
    const x = calcEdu(d);
    h += pg('แผนการศึกษาบุตร', `<table><thead><tr><th>บุตร</th><th class="n">อายุ</th><th class="n">ค่าใช้จ่ายรวม (อนาคต)</th><th class="n">เงินก้อนวันนี้</th><th class="n">ออม/เดือน</th></tr></thead>
      <tbody>${x.kids.map(k => `<tr><td>${esc(k.name)}</td><td class="n">${k.age}</td><td class="n">${fmt(k.fut)}</td><td class="n">${fmt(k.pv)}</td><td class="n">${fmt(k.monthly)}</td></tr>`).join('')}</tbody></table>`);
  }
  if (on('life')) { const x = calcLife(d); h += pg('ทุนประกันชีวิต', `<div class="grid g3">${kpi('ความต้องการ', fmt(x.needs), 'warn')}${kpi('มีแล้ว', fmt(x.asset + x.cover), 'ok')}${kpi('ควรเพิ่ม', fmt(x.gap), x.gap ? 'bad' : 'ok')}</div>${progress(x.progress)}`); }
  if (on('health')) { const x = calcHealth(d); h += pg('ประกันสุขภาพ', `<p>ระดับโรงพยาบาล: <b>${x.tier.n}</b></p><table><thead><tr><th>รายการ</th><th class="n">ควรมี</th><th class="n">มีแล้ว</th><th></th></tr></thead><tbody>${x.items.map(i => `<tr><td>${i.n}</td><td class="n">${fmt(i.need)}</td><td class="n">${fmt(i.have)}</td><td>${i.have >= i.need ? '✅' : '⚠️ ขาด ' + fmt(i.need - i.have)}</td></tr>`).join('')}</tbody></table>`); }
  if (on('policy')) {
    const t = policyTotals(d);
    h += pg('สรุปกรมธรรม์', `<div class="tbl-wrap"><table><thead><tr><th>บริษัท</th><th>แบบประกัน</th><th>ประเภท</th><th class="n">ทุนชีวิต</th><th class="n">เบี้ย/ปี</th><th class="n">ค่าห้อง</th><th class="n">IPD</th><th class="n">CI</th><th class="n">PA</th><th>ครบกำหนด</th></tr></thead>
      <tbody>${d.policies.map(x => `<tr><td>${esc(x.co)}</td><td>${esc(x.plan)}</td><td>${esc(x.type)}</td><td class="n">${fmt(x.sum)}</td><td class="n">${fmt(x.prem)}</td><td class="n">${fmt(x.room)}</td><td class="n">${fmt(x.ipd)}</td><td class="n">${fmt(x.ci)}</td><td class="n">${fmt(x.acc)}</td><td>${esc(x.end)}</td></tr>`).join('')}
      <tr style="font-weight:700"><td colspan="3">รวม ${d.policies.length} ฉบับ</td><td class="n">${fmt(t.sum)}</td><td class="n">${fmt(t.prem)}</td><td class="n">${fmt(t.room)}</td><td class="n">${fmt(t.ipd)}</td><td class="n">${fmt(t.ci)}</td><td class="n">${fmt(t.acc)}</td><td></td></tr></tbody></table></div>`);
  }
  if (on('goals') && d.goals.length) h += pg('เป้าหมายอื่นๆ', `<table><thead><tr><th>เป้าหมาย</th><th class="n">ปี</th><th class="n">มูลค่าอนาคต</th><th class="n">ออม/เดือน</th></tr></thead><tbody>${d.goals.map(g => { const x = calcGoal(g); return `<tr><td>${esc(g.n)}</td><td class="n">${g.yrs}</td><td class="n">${fmt(x.fut)}</td><td class="n">${fmt(x.monthly)}</td></tr>`; }).join('')}</tbody></table>`);
  if (on('tax')) { const x = calcTax(d); h += pg('ภาษีเงินได้', `<div class="grid g4">${kpi('เงินได้รวม', fmt(x.total))}${kpi('ค่าลดหย่อนรวม', fmt(x.dedTotal))}${kpi('เงินได้สุทธิ', fmt(x.net))}${kpi('ภาษี', fmt(x.tax), 'bad')}</div>
    <h3>ประหยัดภาษีเพิ่มได้</h3><table><tbody>${taxPotential(d).map(p => `<tr><td>${DED_INFO[p.k][0]}</td><td class="n">ซื้อเพิ่ม ${fmt(p.extra)}</td><td class="n">ประหยัด ${fmt(p.save)}</td></tr>`).join('') || '<tr><td>—</td></tr>'}</tbody></table>`); }
  if (on('port')) { const P = S.tools.ports[d.port.sel]; h += pg('พอร์ตการลงทุนแนะนำ', `<div class="row" style="gap:30px">${donut(P.a, PORT_COLORS, 200, P.ret + '%')}<div><h3>${P.n}</h3><div class="legend">${P.a.map((v, j) => v ? `<span><i style="background:${PORT_COLORS[j]}"></i>${PORT_CATS[j]} ${v}%</span>` : '').join('')}</div>${P.link ? '<div class="qrbox mt" id="repPortQR"></div><div class="small muted">สแกนเพื่อเปิดพอร์ต</div>' : ''}</div></div>`); }
  return h;
}
VIEWS.report = {
  render() {
    const d = D(), only = S.reportOnly;
    return `<div class="no-print"><h2>รายงานสรุปแผนการเงิน</h2><p class="sub">${only ? 'รายงานสรุปกรมธรรม์' : 'เลือกหัวข้อที่ต้องการ แล้วพิมพ์หรือบันทึกเป็น PDF'}</p>
      <div class="card">${only ? '<button class="btn ghost sm" data-act="fullReport">← กลับไปรายงานฉบับเต็ม</button>' : `<div class="chips">${REPORT_SECTIONS.map(([k, t]) => `<button class="chip ${d.report[k] ? 'on' : ''}" data-act="toggleSec" data-v="${k}">${d.report[k] ? '✓ ' : ''}${t}</button>`).join('')}</div>`}
      <div class="row mt"><button class="btn" data-act="print">🖨️ พิมพ์ / บันทึก PDF</button></div></div></div>
      <div id="out"></div>`;
  },
  out() { return reportHtml(D(), S.reportOnly); },
  after() {
    const q = $('#repQR'); if (q) makeQR(q, S.fa.link || vcard(S.fa), 90);
    const pq = $('#repPortQR'); if (pq) makeQR(pq, S.tools.ports[D().port.sel].link, 110);
  },
};

// ---------- events ----------
function parseNum(s) { const v = parseFloat(String(s).replace(/,/g, '')); return isFinite(v) ? v : 0; }

document.addEventListener('input', e => {
  const el = e.target, path = el.dataset.path;
  if (!path || el.type === 'checkbox' || el.tagName === 'SELECT') return;
  setp(path, 'num' in el.dataset ? parseNum(el.value) : el.value);
  refresh();
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.path && (el.type === 'checkbox' || el.tagName === 'SELECT')) {
    setp(el.dataset.path, el.type === 'checkbox' ? el.checked : 'num' in el.dataset ? parseNum(el.value) : el.value);
    'rerender' in el.dataset ? render() : refresh();
    return;
  }
  if (el.dataset.path && 'num' in el.dataset) { const v = getp(el.dataset.path); el.value = fmt(v, (String(el.value).split('.')[1] || '').length ? 2 : 0); }
  if (el.dataset.photo && el.files[0]) readPhoto(el.files[0], url => { setp(el.dataset.photo, url); render(); });
  if ('import' in el.dataset && el.files[0]) {
    el.files[0].text().then(t => {
      try { const o = JSON.parse(t); if (!Array.isArray(o.clients)) throw 0; Object.assign(S, merge(defaults(), o)); S.clients = S.clients.map(c => ({ ...c, d: merge(newClient().d, c.d) })); save(); render(); toast('นำเข้าข้อมูลเรียบร้อย'); }
      catch (err) { toast('ไฟล์ไม่ถูกต้อง'); }
    });
  }
});

function readPhoto(file, cb) {
  const img = new Image(), r = new FileReader();
  r.onload = () => { img.onload = () => { const s = 256, c = document.createElement('canvas'), k = Math.min(1, s / Math.max(img.width, img.height)); c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); cb(c.toDataURL('image/jpeg', .85)); }; img.src = r.result; };
  r.readAsDataURL(file);
}

const ACTS = {
  addClient() { const c = newClient(); S.clients.push(c); S.cur = c.id; go('profile'); },
  pick(el) { S.cur = el.dataset.id; go('profile'); },
  folder(el) { S.folder = el.dataset.v; save(); render(); },
  delClient() { if (!confirm('ลบข้อมูลลูกค้ารายนี้ถาวร?')) return; S.clients = S.clients.filter(c => c.id !== S.cur); S.cur = S.clients[0]?.id || null; go('dashboard'); },
  clearPhoto(el) { setp(el.dataset.path, ''); render(); },
  addRow(el) { getp(el.dataset.path).push({ n: 'รายการใหม่', v: 0, ...(el.dataset.t ? { t: el.dataset.t } : {}) }); save(); render(); },
  delRow(el) { getp(el.dataset.path).splice(+el.dataset.i, 1); save(); render(); },
  addKid() { const k = D().edu.kids; k.push({ name: 'บุตรคนที่ ' + (k.length + 1), age: 0, preset: 'เอกชน', levels: eduLevels() }); save(); render(); },
  eduPreset(el) { const k = D().edu.kids[+el.dataset.i]; k.preset = el.dataset.v; EDU_PRESETS[k.preset].forEach((c, j) => k.levels[j].cost = c); save(); render(); },
  addPolicy() { D().policies.push({ co: '', plan: '', type: 'ตลอดชีพ', sum: 0, prem: 0, room: 0, ipd: 0, ci: 0, acc: 0, end: '' }); save(); render(); },
  policyReport() { S.reportOnly = ['cover', 'fa', 'policy']; go('report'); },
  fullReport() { S.reportOnly = null; render(); },
  sharePolicy() {
    const d = D(), t = policyTotals(d);
    const text = `สรุปกรมธรรม์ ${d.profile.name}\n` + d.policies.map((p, i) => `${i + 1}. ${p.co} ${p.plan} (${p.type}) ทุน ${fmt(p.sum)} เบี้ย ${fmt(p.prem)}/ปี`).join('\n') + `\nรวมทุนชีวิต ${fmt(t.sum)} บาท เบี้ยรวม ${fmt(t.prem)} บาท/ปี\n— ${S.fa.name} ${S.fa.phone}`;
    share(text);
  },
  addGoal() { D().goals.push({ n: 'เป้าหมายใหม่', amt: 100000, yrs: 5, inf: 3, ret: 3 }); save(); render(); },
  taxFromProfile() { D().tax.inc.s1 = D().profile.income * 12; D().tax.ded.child = D().profile.children; D().tax.ded.spouse = D().profile.spouse; save(); render(); },
  usePlan(el) { D().retire.plan = +el.dataset.v; save(); render(); },
  portToRetire() { D().retire.rPre = S.tools.ports[D().port.sel].ret; save(); toast('ตั้งผลตอบแทนก่อนเกษียณ = ' + D().retire.rPre + '% แล้ว'); },
  pvdToRetire() { D().retire.usePvd = true; save(); go('retire'); toast('รวม PVD ในแผนเกษียณแล้ว'); },
  tvmApply(el) { const t = S.tools.tvm, v = +el.dataset.v; if (isFinite(v)) { t[t.solve] = Math.round(v * 100) / 100; save(); render(); } },
  qrPreset(el) { S.tools.qr.text = el.dataset.v; save(); render(); },
  qrSave() { const q = S.tools.qr; if (!q.text) return; q.saved.push({ text: q.text, label: q.label }); save(); render(); toast('บันทึกแล้ว'); },
  qrLoad(el) { const s = S.tools.qr.saved[+el.dataset.i]; Object.assign(S.tools.qr, { text: s.text, label: s.label }); save(); render(); },
  dlQR(el) { qrToPng($('#' + el.dataset.el), el.dataset.name); },
  dlCard() { drawCard(c => { const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'namecard.png'; a.click(); }); },
  shareCard() {
    drawCard(c => c.toBlob(b => {
      const file = new File([b], 'namecard.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) navigator.share({ files: [file], title: S.fa.name }).catch(() => {});
      else share(vcard(S.fa));
    }));
  },
  toggleSec(el) { const r = D().report; r[el.dataset.v] = !r[el.dataset.v]; save(); render(); },
  print() { window.print(); },
  export() {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }));
    a.download = 'plannerpro-backup-' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
  },
};
function share(text) {
  if (navigator.share) navigator.share({ text }).catch(() => {});
  else navigator.clipboard?.writeText(text).then(() => toast('คัดลอกข้อความแล้ว'), () => toast('แชร์ไม่สำเร็จ'));
}

// draw the business card to a canvas for saving as an image
function drawCard(cb) {
  const f = S.fa, W = 1050, H = 600, c = $('#cardCanvas') || document.createElement('canvas'), x = c.getContext('2d');
  c.width = W; c.height = H;
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0b7d66'); g.addColorStop(1, '#3fd0a9');
  x.fillStyle = g; x.beginPath(); x.roundRect(0, 0, W, H, 36); x.fill();
  x.fillStyle = 'rgba(255,255,255,.1)'; x.beginPath(); x.arc(W - 40, H - 40, 200, 0, 7); x.fill();
  x.fillStyle = '#fff'; x.font = '600 52px Kanit, sans-serif'; x.fillText(f.name, 220, 110);
  x.font = '30px Sarabun, sans-serif'; x.globalAlpha = .85; x.fillText((f.nick ? `(${f.nick}) ` : '') + f.position, 220, 160); x.globalAlpha = 1;
  const lines = [f.company && '🏢 ' + f.company, f.phone && '📞 ' + f.phone, f.email && '✉️ ' + f.email, f.line && '💬 LINE: ' + f.line, f.license && '🪪 ใบอนุญาต ' + f.license, f.certs && '🎖️ ' + f.certs].filter(Boolean);
  x.font = '28px Sarabun, sans-serif'; lines.forEach((l, i) => x.fillText(l, 50, H - 50 - (lines.length - 1 - i) * 44));
  const finish = () => {
    const q = $('#cardQR canvas');
    if (q) { x.fillStyle = '#fff'; x.beginPath(); x.roundRect(W - 270, H - 270, 230, 230, 18); x.fill(); x.drawImage(q, W - 255, H - 255, 200, 200); }
    cb(c);
  };
  const circle = (draw) => { x.save(); x.beginPath(); x.arc(120, 120, 75, 0, 7); x.clip(); draw(); x.restore(); x.strokeStyle = '#fff'; x.lineWidth = 6; x.beginPath(); x.arc(120, 120, 75, 0, 7); x.stroke(); };
  if (f.photo) { const im = new Image(); im.onload = () => { circle(() => x.drawImage(im, 45, 45, 150, 150)); finish(); }; im.src = f.photo; }
  else { circle(() => { x.fillStyle = '#c9f1e5'; x.fillRect(45, 45, 150, 150); x.fillStyle = '#0f9a7e'; x.font = '700 70px Kanit'; x.textAlign = 'center'; x.fillText(f.name.charAt(0), 120, 145); x.textAlign = 'left'; }); finish(); }
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-go],[data-step],[data-chip],[data-act],[data-help]');
  if (!el) return;
  if ('help' in el.dataset) { el.closest('.field').nextElementSibling?.classList.toggle('show'); return; }
  if (el.dataset.go) { if (el.dataset.go === 'report') S.reportOnly = null; return go(el.dataset.go); }
  if (el.dataset.step) {
    const path = el.dataset.path, v = Math.round((parseNum(getp(path)) + +el.dataset.step) * 1000) / 1000;
    setp(path, v);
    const inp = el.parentElement.querySelector('input'); inp.value = fmt(v, String(el.dataset.step).includes('.') || !Number.isInteger(v) ? (inp.value.split('.')[1]?.length || 1) : 0);
    // steppers that change the layout (e.g. ages shown in tables) just refresh the results
    refresh(); return;
  }
  if (el.dataset.chip) {
    const v = el.dataset.v, cur = getp(el.dataset.chip);
    setp(el.dataset.chip, typeof cur === 'number' || 'numv' in el.dataset ? +v : v);
    return render();
  }
  if (el.dataset.act) { e.preventDefault(); ACTS[el.dataset.act]?.(el); }
});

render();
