import { SwissEphemeris } from '../vendor/swisseph/swisseph-browser.js?v=202610020939';
import { computeChart } from './chart.js?v=202610020939';
import { children, currentPath, LEVEL_NAMES } from './dasha.js?v=202610020939';
import { drawChart } from './render.js?v=202610020939';
import { localToUtc, msToJd, fmtLocal, fmtOffset } from './time.js?v=202610020939';
import { CITIES } from './cities.js?v=202610020939';
import { exportXlsx } from './export.js?v=202610020939';
import {
  SIGNS, PLANETS, PLANETS_FULL, NAKSHATRAS, NAK_SPAN, AYANAMSAS, DASHA_YEAR_OPTIONS, RELATION_LABEL, SIGN_LORD, DASHA_ORDER, fmtDeg, norm,
} from './constants.js?v=202610020939';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const f1 = (x) => (x == null ? '—' : x.toFixed(1));
const f2 = (x) => (x == null ? '—' : x.toFixed(2));
const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

let swe = null;
let chart = null;
const state = { style: localGet('style') || 'south', varga: 9, place: null, tab: 'overview' };

function localGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function localSet(k, v) { try { localStorage.setItem(k, v); } catch { /* 無痕模式 */ } }

// ---------------- 出生地搜尋 ----------------
const normName = (s) => s.toLowerCase().replace(/臺/g, '台').replace(/\s+/g, '');
const INDEX = CITIES.map((c, i) => ({ i, key: normName(c[0] + c[1]) }));

function searchCities(q) {
  const k = normName(q);
  if (!k) return [];
  const starts = [], contains = [];
  for (const it of INDEX) {
    const name = normName(CITIES[it.i][0]);
    if (name.startsWith(k)) starts.push(it.i);
    else if (it.key.includes(k)) contains.push(it.i);
    if (starts.length > 30) break;
  }
  return [...starts, ...contains].slice(0, 20).map((i) => CITIES[i]);
}

function setPlace(c) {
  state.place = { name: c[0], desc: c[1], lat: c[2], lon: c[3], tz: c[4] };
  $('#place').value = c[0];
  $('#lat').value = c[2];
  $('#lon').value = c[3];
  $('#tz').value = c[4];
  $('#placeInfo').textContent = `${c[1]}｜緯度 ${c[2].toFixed(4)}、經度 ${c[3].toFixed(4)}｜時區 ${c[4]}`;
  $('#placeList').hidden = true;
}

function initPlaceSearch() {
  const input = $('#place'), list = $('#placeList');
  let active = -1, results = [];
  const show = () => {
    results = searchCities(input.value);
    active = -1;
    list.innerHTML = results.map((c, i) => `<li role="option" data-i="${i}"><b>${esc(c[0])}</b><span>${esc(c[1])}</span></li>`).join('');
    list.hidden = !results.length;
  };
  input.addEventListener('input', show);
  input.addEventListener('focus', () => input.value && show());
  input.addEventListener('keydown', (e) => {
    if (list.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
      [...list.children].forEach((li, i) => li.classList.toggle('active', i === active));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setPlace(results[Math.max(0, active)]);
    } else if (e.key === 'Escape') list.hidden = true;
  });
  list.addEventListener('mousedown', (e) => {
    const li = e.target.closest('li');
    if (li) { e.preventDefault(); setPlace(results[+li.dataset.i]); }
  });
  input.addEventListener('blur', () => setTimeout(() => (list.hidden = true), 150));

  // 時區清單
  const zones = (Intl.supportedValuesOf && Intl.supportedValuesOf('timeZone')) || ['Asia/Taipei', 'UTC'];
  $('#tzList').innerHTML = zones.map((z) => `<option value="${z}">`).join('');
}

// ---------------- 表單 ----------------
function readForm() {
  const [year, month, day] = $('#date').value.split('-').map(Number);
  const [hour, minute, second = 0] = $('#time').value.split(':').map(Number);
  const lat = parseFloat($('#lat').value), lon = parseFloat($('#lon').value);
  const tzRaw = $('#tz').value.trim();
  if (!year || Number.isNaN(hour)) throw new Error('請填寫出生日期與時間');
  if (Number.isNaN(lat) || Number.isNaN(lon)) throw new Error('請選擇出生地，或手動填寫經緯度');
  let tz = tzRaw;
  const m = tzRaw.match(/^(?:UTC|GMT)?\s*([+-])(\d{1,2})(?::?(\d{2}))?$/i);
  if (m) tz = { fixedOffset: (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +(m[3] || 0)) };
  else {
    try { new Intl.DateTimeFormat('en', { timeZone: tz }); } catch { throw new Error('時區格式不正確，例如 Asia/Taipei 或 +08:00'); }
  }
  return {
    birth: { year, month, day, hour, minute, second },
    gender: $('input[name=gender]:checked')?.value || '',
    lat, lon, tz, tzLabel: tzRaw,
    placeName: $('#place').value.trim() || `${lat}, ${lon}`,
    ayanamsa: +$('#ayanamsa').value,
    dashaYearDays: +$('#dashaYear').value,
  };
}

function toHash(f) {
  const p = new URLSearchParams({
    d: $('#date').value, t: $('#time').value, g: f.gender, p: f.placeName, lat: f.lat, lon: f.lon, tz: f.tzLabel, a: f.ayanamsa, y: f.dashaYearDays,
  });
  return '#' + p.toString();
}

function fromHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (!p.get('d')) return false;
  $('#date').value = p.get('d');
  $('#time').value = p.get('t') || '12:00';
  const g = p.get('g'); if (g) { const r = $(`input[name=gender][value="${g}"]`); if (r) r.checked = true; }
  $('#place').value = p.get('p') || '';
  $('#lat').value = p.get('lat') || '';
  $('#lon').value = p.get('lon') || '';
  $('#tz').value = p.get('tz') || '';
  $('#ayanamsa').value = p.get('a') || '1';
  if (p.get('y') && $(`#dashaYear option[value="${p.get('y')}"]`)) $('#dashaYear').value = p.get('y');
  $('#placeInfo').textContent = p.get('lat') ? `緯度 ${p.get('lat')}、經度 ${p.get('lon')}｜時區 ${p.get('tz')}` : '';
  return true;
}

async function run() {
  const err = $('#formError');
  err.textContent = '';
  let f;
  try { f = readForm(); } catch (e) { err.textContent = e.message; return; }
  if (!swe) { err.textContent = '計算引擎載入中，請稍候…'; await ready; err.textContent = ''; }
  const { utcMs, offsetMin } = localToUtc(f.birth, f.tz);
  const jd = msToJd(utcMs);
  chart = computeChart(swe, { jd, lat: f.lat, lon: f.lon, ayanamsa: f.ayanamsa, offsetMin, gender: f.gender, dashaYearDays: f.dashaYearDays });
  chart.meta = { ...f, offsetMin };
  history.replaceState(null, '', toHash(f));
  render();
  $('#result').hidden = false;
  $('#result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------------- 顯示 ----------------
const P = (id) => `<span class="pl pl-${id}">${PLANETS[id]}</span>`;
const PF = (id) => `<span class="pl pl-${id}">${PLANETS_FULL[id]}</span>`;
const signDeg = (lon) => `${SIGNS[Math.floor(norm(lon) / 30)]} ${fmtDeg(lon)}`;
const nakText = (n) => `${n.zh}宿 ${n.name}・第 ${n.pada} 足（宿主 ${PLANETS[n.lord]}）`;
const table = (head, rows, cls = '') => `<div class="tablewrap"><table class="${cls}"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

function render() {
  const c = chart, m = c.meta;
  const vs = Object.fromEntries(c.vargas.map((v) => [v.n, v]));
  const moon = c.planets[1], sun = c.planets[0];
  const lagnaLord = c.planets[c.lagnaLord];
  const tithi = Math.floor(c.moonPhase.elong / 12) + 1;
  const ayanName = AYANAMSAS.find((a) => a.id === m.ayanamsa).name;

  $('#summary').innerHTML = `
    <div class="sumgrid">
      <div><span class="k">出生</span><span class="v">${esc($('#date').value)} ${esc($('#time').value)}（${fmtOffset(m.offsetMin)}）${m.gender ? '・' + (m.gender === 'F' ? '女' : '男') : ''}</span></div>
      <div><span class="k">出生地</span><span class="v">${esc(m.placeName)}（${m.lat.toFixed(4)}, ${m.lon.toFixed(4)}）</span></div>
      <div><span class="k">Ayanamsa</span><span class="v">${esc(ayanName)}（${c.ayanamsaValue.toFixed(4)}°）</span></div>
    </div>`;

  // 總覽
  const basic = [
    ['上升星座（Lagna）', `${signDeg(c.asc.lon)}<br><small>${nakText(c.asc.nakshatra)}</small>`],
    ['命主星', `${PF(c.lagnaLord)}（落第 ${lagnaLord.house} 宮 ${SIGNS[lagnaLord.sign]}）`],
    ['月亮星座', `${signDeg(moon.lon)}（第 ${moon.house} 宮）`],
    ['月亮星宿', nakText(moon.nakshatra)],
    ['太陽星座', `${signDeg(sun.lon)}（第 ${sun.house} 宮）`],
    ['月相', `${c.moonPhase.waxing ? '上弦（Shukla）' : '下弦（Krishna）'}・第 ${((tithi - 1) % 15) + 1} 個 Tithi（日月距 ${c.moonPhase.elong.toFixed(1)}°）`],
    ['日出／日落', `${c.sun.sunriseToday ? fmtLocal(c.sun.sunriseToday, m.offsetMin).slice(11) : '—'} ／ ${c.sun.sunsetToday ? fmtLocal(c.sun.sunsetToday, m.offsetMin).slice(11) : '—'}・${c.sun.isDay ? '白天出生' : '夜間出生'}`],
    ['吠陀日（以日出為界）', `${WEEKDAYS[c.sun.vedicWeekday]}（日主 ${PLANETS[c.timeLords.dina]}）`],
  ];
  $('#tab-overview').innerHTML = `
    <div class="charts2">
      <figure>${drawChart(state.style, vs[1], { title: 'D1 本命盤', showDeg: true })}</figure>
      <figure>${drawChart(state.style, vs[9], { title: 'D9 九分盤' })}</figure>
    </div>
    <h3>基本資料</h3>
    ${table(['項目', '內容'], basic, 'kv')}
    <h3>四軸點</h3>
    ${table(['名稱', '星座', '宮度', '恆星黃經'], c.angles.map((a) => [a.name, SIGNS[a.sign], fmtDeg(a.lon), a.lon.toFixed(2) + '°']))}`;

  // 行星
  const relText = (p) => (p.relation === 'own' ? '本宮' : p.relation == null ? '—' : RELATION_LABEL[p.relation]);
  $('#tab-planets').innerHTML = table(
    ['行星', '恆星黃經', '星座', '度數', '宮位', '星宿', '落陷', '廟旺', 'MT', '本宮', '燃燒', '逆行', '同宮', '與宮主關係', 'Baladi 狀態', 'Shadbala', '速率（°/日）'],
    c.planets.map((p) => [
      PF(p.id), p.lon.toFixed(2) + '°', SIGNS[p.sign], fmtDeg(p.lon), p.house,
      `${p.nakshatra.zh}宿 ${p.nakshatra.name} ${p.nakshatra.pada}`,
      p.debil ? '是' : '—', p.exalt ? '是' : '—', p.mt ? '是' : '—', p.own ? '是' : '—', p.combust ? '是' : '—', p.retro ? 'ᴿ 是' : '—',
      p.conj.map(P).join(' ') || '—', `${relText(p)}（宮主 ${PLANETS[p.dispositor]}）`, `${p.avastha.zh} ${p.avastha.en}`,
      p.shadbala == null ? '—' : f1(p.shadbala), p.speed.toFixed(3),
    ]),
    'wide',
  ) + `<p class="note">羅睺／計都採平均交點（Mean Node）。敵友為五重關係（自然＋臨時）：行星與其所在星座宮主的關係。</p>`;

  // 十二宮
  $('#tab-houses').innerHTML = table(
    ['宮位', '星座', '起點黃經', '宮主星', '宮主落宮', '宮內行星', 'Bhava Bala', '宮主力', '方位力', '相位力'],
    c.houses.map((h) => [h.house, SIGNS[h.sign], h.startLon + '°', PF(h.lord), `第 ${c.planets[h.lord].house} 宮`, h.planets.map(P).join(' ') || '—',
      `<b>${f1(h.bhavaBala.total)}</b>`, f1(h.bhavaBala.adhipati), f1(h.bhavaBala.dig), f1(h.bhavaBala.drishti)]),
  ) + `<p class="note">宮位採整宮制（Whole Sign）。Bhava Bala 依 BPHS：宮主星 Shadbala ＋ 宮位方位力 ＋ 行星對宮中點（上升度數起算的等宮）的相位力。</p>`;

  // Shadbala
  const SB = [
    ['Uchcha 廟旺力', 'uchcha'], ['Saptavargaja 七分盤力', 'saptavargaja'], ['Ojayugma 奇偶力', 'ojayugma'], ['Kendradi 角宮力', 'kendradi'], ['Drekkana 三分力', 'drekkana'],
    ['<b>Sthana 位置力</b>', 'sthana'], ['<b>Dig 方位力</b>', 'dig'],
    ['Nathonnatha 晝夜力', 'nathonnatha'], ['Paksha 月相力', 'paksha'], ['Tribhaga 三分時力', 'tribhaga'], ['年月日時主力', 'vmdh'], ['Ayana 赤緯力', 'ayana'], ['Yuddha 星戰', 'yuddha'],
    ['<b>Kala 時間力</b>', 'kala'], ['<b>Cheshta 運動力</b>', 'cheshta'], ['<b>Naisargika 自然力</b>', 'naisargika'], ['<b>Drik 相位力</b>', 'drik'],
    ['<b>總計（Virupa）</b>', 'total'], ['總計（Rupa）', 'rupa'], ['最低需求（Virupa）', 'required'], ['<b>強度比</b>', 'ratio'],
  ];
  const seven = [0, 1, 2, 3, 4, 5, 6];
  $('#tab-shadbala').innerHTML = table(['項目', ...seven.map(P)], SB.map(([label, k]) => [label, ...seven.map((p) => (k === 'ratio' ? `<b class="${c.shadbala[p].ratio >= 1 ? 'good' : 'weak'}">${f2(c.shadbala[p][k])}</b>` : k === 'rupa' ? f2(c.shadbala[p][k]) : f1(c.shadbala[p][k])))]), 'num')
    + `<p class="note">運動力判定：${[2, 3, 4, 5, 6].map((p) => `${PLANETS[p]} ${c.shadbala[p].cheshtaState}`).join('、')}。時間主宰星：年 ${PLANETS[c.timeLords.varsha]}、月 ${PLANETS[c.timeLords.masa]}、日 ${PLANETS[c.timeLords.dina]}、時 ${PLANETS[c.timeLords.hora]}。</p>`;

  // 二十七宿
  const occ = Array.from({ length: 27 }, () => []);
  c.planets.forEach((p) => occ[p.nakshatra.index].push(P(p.id)));
  occ[c.asc.nakshatra.index].push('<span class="pl">上升</span>');
  $('#tab-nakshatra').innerHTML = table(['#', '梵文名', '中文名', '起點', '終點', '宿主', '所在'],
    NAKSHATRAS.map((n, i) => [i + 1, n[0], n[1] + '宿', (i * NAK_SPAN).toFixed(2) + '°', ((i + 1) * NAK_SPAN).toFixed(2) + '°', PLANETS[DASHA_ORDER[i % 9]], occ[i].join(' ') || '']), 'nak');

  // 九分盤資訊
  const ni = c.navamsaInfo;
  $('#tab-navamsa').innerHTML = `
    <h3>九分盤＋本命盤同星座（Vargottama）</h3><p>${[...ni.vargottama.map(PF), ni.ascVargottama ? '上升' : ''].filter(Boolean).join('、') || '無'}</p>
    <h3>九分盤滋養之位（Pushkara Navamsa）</h3><p>${[...ni.pushkara.map(PF), ni.ascPushkara ? '上升' : ''].filter(Boolean).join('、') || '無'}</p>
    <h3>九分盤凶險點（64th Navamsa）</h3>
    ${table(['星曜', '星座', '宮主星', '恆星黃經'], ni.n64.map((o) => [o.id === 'asc' ? '上升' : PF(o.id), SIGNS[o.sign], PLANETS[o.lord], o.lon.toFixed(2) + '°']))}
    <h3>時間主宰星</h3>
    ${table(['年（Varsha）', '月（Masa）', '日（Dina）', '時（Hora）'], [[c.timeLords.varsha, c.timeLords.masa, c.timeLords.dina, c.timeLords.hora].map(PF)])}`;

  renderVargas();
  renderDasha();
  showTab(state.tab);
}

const VARGA_METHOD = {
  5: '每 6° 一分，奇數星座依序落牡羊、水瓶、射手、雙子、天秤；偶數星座依序落金牛、處女、雙魚、摩羯、天蠍',
  6: '每 5° 一分，奇數星座從牡羊起算、偶數星座從天秤起算',
  8: '每 3.75° 一分，本位星座從牡羊、固定星座從射手、變動星座從獅子起算',
  11: '每 30/11° 一分，從牡羊起連續循環計數（Parivritti）',
};

function renderVargas() {
  const c = chart;
  const v = c.vargas.find((x) => x.n === state.varga);
  const tol = v.tolerance;
  const status = (p) => [p.exalt && '廟旺', p.debil && '落陷', p.own && '本宮', p.mt && 'MT'].filter(Boolean).join(' ') || '—';
  $('#tab-vargas').innerHTML = `
    <div class="vargapick">${c.vargas.map((x) => `<button class="chip${x.n === state.varga ? ' on' : ''}" data-varga="${x.n}">${x.code} ${x.name}${x.extra ? '＊' : ''}</button>`).join('')}</div>
    <div class="vargamain">
      <figure>${drawChart(state.style, v, { title: `${v.code} ${v.name}`, size: 380 })}</figure>
      <div>
        <h3>${v.code} ${v.sanskrit}｜${v.name}</h3>
        ${v.extra ? `<p class="note">＊此分盤不在 Parashara 的 16 張標準分盤內，各家算法不同；本站採用：${VARGA_METHOD[v.n]}</p>` : ''}
        <p class="tol">分盤上升：${SIGNS[v.ascSign]} ${v.ascDeg.toFixed(1)}°<br>
        出生時間提早 <b>${tol.before.toFixed(1)}</b> 分鐘或延後 <b>${tol.after.toFixed(1)}</b> 分鐘，此分盤上升星座就會改變${Math.min(tol.before, tol.after) < 5 ? '　<span class="warn">⚠ 對出生時間非常敏感</span>' : ''}</p>
        ${table(['行星', '狀態', '宮位', '星座', '分盤度數'], v.planets.map((p) => [PF(p.id), status(p), p.house, SIGNS[p.sign], p.deg.toFixed(1) + '°']))}
      </div>
    </div>
    <h3>全部分盤一覽</h3>
    <div class="vargagrid">${c.vargas.map((x) => `<figure data-varga="${x.n}" class="${x.n === state.varga ? 'on' : ''}">${drawChart(state.style, x, { title: `${x.code} ${x.name}`, size: 300 })}</figure>`).join('')}</div>
    <h3>分盤總表</h3>
    ${table(['分盤', ...c.planets.map((p) => P(p.id)), '上升'], c.vargas.map((x) => [x.code + ' ' + x.name, ...x.planets.map((p) => `${SIGNS[p.sign].slice(0, 2)}<small> ${p.house}宮</small>`), SIGNS[x.ascSign].slice(0, 2)]), 'num')}`;
  $('#tab-vargas').querySelectorAll('[data-varga]').forEach((el) => el.addEventListener('click', () => { state.varga = +el.dataset.varga; renderVargas(); $('#tab-vargas').scrollIntoView({ behavior: 'smooth' }); }));
}

// ---------------- 運程 ----------------
function duration(days) {
  const y = Math.floor(days / 365.2425);
  const rem = days - y * 365.2425;
  const mo = Math.floor(rem / 30.436875);
  const d = rem - mo * 30.436875;
  if (y) return `${y}年${mo}月${Math.round(d)}日`;
  if (mo) return `${mo}月${Math.round(d)}日`;
  if (d >= 1) return `${d.toFixed(1)}日`;
  return `${(d * 24).toFixed(1)}時`;
}

function dashaRows(list, level, chain) {
  const now = msToJd(Date.now());
  const off = chart.meta.offsetMin;
  return list.map((p, i) => {
    const names = [...chain, p.lord];
    const cur = now >= p.start && now < p.end;
    const canOpen = level < 4;
    return `<div class="drow lv${level}${cur ? ' cur' : ''}" data-level="${level}" data-i="${i}">
      <button class="dtoggle" ${canOpen ? '' : 'disabled'} aria-expanded="false">${canOpen ? '▸' : '·'}</button>
      <span class="dname">${names.map(P).join('<i>/</i>')}</span>
      <span class="dlvl">${LEVEL_NAMES[level]}</span>
      <span class="ddate">${fmtLocal(p.start, off)} → ${fmtLocal(p.end, off)}</span>
      <span class="ddur">${duration(p.end - p.start)}</span>
    </div><div class="dchildren" hidden></div>`;
  }).join('');
}

function attachDasha(container, list, level, chain) {
  container.innerHTML = dashaRows(list, level, chain);
  container.querySelectorAll(`:scope > .drow`).forEach((row) => {
    const p = list[+row.dataset.i];
    const btn = row.querySelector('.dtoggle');
    const kids = row.nextElementSibling;
    const toggle = (open) => {
      if (level >= 4) return;
      const willOpen = open ?? kids.hidden;
      if (willOpen && !kids.dataset.done) { attachDasha(kids, children(p), level + 1, [...chain, p.lord]); kids.dataset.done = '1'; }
      kids.hidden = !willOpen;
      btn.textContent = willOpen ? '▾' : '▸';
      btn.setAttribute('aria-expanded', String(willOpen));
    };
    row._toggle = toggle;
    row.addEventListener('click', () => toggle());
  });
}

function openCurrent() {
  const path = currentPath(chart.dashas, msToJd(Date.now()), 5);
  let container = $('#dashaTree');
  let last = null;
  path.forEach((p, level) => {
    const row = [...container.querySelectorAll(':scope > .drow')].find((r) => r.classList.contains('cur'));
    if (!row) return;
    last = row;
    if (level < 4) { row._toggle(true); container = row.nextElementSibling; }
  });
  if (last) last.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderDasha() {
  const c = chart;
  const path = currentPath(c.dashas, msToJd(Date.now()), 5);
  $('#tab-dasha').innerHTML = `
    <div class="dashahead">
      <p>目前（${fmtLocal(msToJd(Date.now()), c.meta.offsetMin)}）：${path.map((p, i) => `${LEVEL_NAMES[i]} ${PF(p.lord)}`).join(' → ') || '不在此 120 年週期內'}</p>
      <button class="btn small" id="jumpNow">展開目前運程</button>
    </div>
    <p class="note">Vimshottari，一年以 ${c.dashaYearDays} 天計；日期時間為出生地當地時間。點任一列可往下展開：大運 → 中運 → 小運 → 小小運 → Prana。</p>
    <div id="dashaTree" class="dtree"></div>`;
  attachDasha($('#dashaTree'), c.dashas, 0, []);
  $('#jumpNow').addEventListener('click', openCurrent);
}

// ---------------- 分頁 ----------------
function showTab(t) {
  state.tab = t;
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  document.querySelectorAll('.tabpane').forEach((p) => (p.hidden = p.id !== 'tab-' + t));
}

// ---------------- 啟動 ----------------
const ready = (async () => {
  const s = new SwissEphemeris();
  await s.init();
  swe = s;
})();

function init() {
  $('#ayanamsa').innerHTML = AYANAMSAS.map((a) => `<option value="${a.id}">${a.name}</option>`).join('');
  $('#dashaYear').innerHTML = DASHA_YEAR_OPTIONS.map((o) => `<option value="${o.days}">${o.name}</option>`).join('');
  initPlaceSearch();
  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
  $('#form').addEventListener('submit', (e) => { e.preventDefault(); run(); });
  $('#ayanamsa').addEventListener('change', () => chart && run());
  $('#dashaYear').addEventListener('change', () => chart && run());
  $('#exportBtn').addEventListener('click', async () => {
    if (!chart) return;
    const btn = $('#exportBtn');
    btn.disabled = true; btn.textContent = '產生中…';
    try {
      const { blob, name } = await exportXlsx(chart);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click();
      setTimeout(() => { a.remove(); URL.revokeObjectURL(a.href); }, 10000);
    } catch (e) {
      alert('匯出失敗：' + e.message);
    } finally { btn.disabled = false; btn.textContent = '匯出 Excel'; }
  });
  $('#manualToggle').addEventListener('click', () => { const m = $('#manual'); m.hidden = !m.hidden; });
  document.querySelectorAll('input[name=style]').forEach((r) => {
    r.checked = r.value === state.style;
    r.addEventListener('change', () => { state.style = r.value; localSet('style', r.value); if (chart) render(); });
  });
  ['#lat', '#lon', '#tz'].forEach((s) => $(s).addEventListener('input', () => { $('#placeInfo').textContent = '（手動輸入）'; }));
  ready.catch((e) => { $('#formError').textContent = '計算引擎載入失敗：' + e.message + '（請用網址開啟，不要直接雙擊檔案）'; });
  if (fromHash()) run();
}

init();
