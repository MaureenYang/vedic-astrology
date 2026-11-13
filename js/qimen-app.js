import { SwissEphemeris } from '../vendor/swisseph/swisseph-browser.js?v=202611132341';
import { STEMS, BRANCHES, sb, localToJd, fmtLocal, currentTerm } from './qimen-calendar.js?v=202611132341';
import {
  computeQimen, dayun, liuren, changsheng, GRID, RING, PALACE_NAME, GOD_FULL, STAR_FULL, DOOR_FULL, KEYING, GOOD_DOORS, GOOD_GODS, BRANCH_PALACE,
} from './qimen-chart.js?v=202611132341';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const p2 = (n) => String(n).padStart(2, '0');
function localGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function localSet(k, v) { try { localStorage.setItem(k, v); } catch { /* 無痕模式 */ } }

let swe = null;
let chart = null;
const state = { mode: 'life', sex: 'F', topic: null };

// 天罡煞（以月建）：寅巳 卯子 辰丑 巳申 午卯 未戌 申亥 酉午 戌未 亥寅 子酉 丑辰
const TIANGANG = { 2: 5, 3: 0, 4: 1, 5: 8, 6: 3, 7: 10, 8: 11, 9: 6, 10: 7, 11: 2, 0: 9, 1: 4 };
// 問測類型 → 用神
const TOPICS = [
  { id: 'wealth', name: '催財', color: '#c9972b', stems: ['戊'], doors: ['生'], stars: [], gods: [], note: '財運看戊（資本）與生門（生財之門）落宮。' },
  { id: 'career', name: '催官升職', color: '#2b4b8c', stems: [], doors: ['開'], stars: ['心'], gods: ['符'], note: '官運看開門（事業）、值符（領導）、天心星落宮。' },
  { id: 'love', name: '催桃花', color: '#d8457f', stems: ['乙'], doors: [], stars: [], gods: ['六'], note: '桃花看乙奇、六合落宮。' },
  { id: 'marriage', name: '催婚', color: '#a32d2d', stems: ['乙', '庚'], doors: [], stars: [], gods: ['六'], note: '婚姻看乙（女）、庚（男）與六合落宮。' },
  { id: 'kids', name: '催丁口', color: '#2b6fb8', stems: [], doors: ['生'], stars: ['任'], gods: [], note: '人丁看生門、天任星落宮。' },
  { id: 'study', name: '學業', color: '#1f7a3a', stems: [], doors: ['景'], stars: ['輔'], gods: [], note: '學業看天輔星（文昌）、景門落宮。' },
  { id: 'exam', name: '考試', color: '#6b3fb5', stems: ['丁'], doors: ['景'], stars: ['輔'], gods: [], note: '考試看丁奇、天輔星、景門落宮。' },
  { id: 'health', name: '催健康', color: '#c9972b', stems: [], doors: ['生'], stars: ['芮', '心'], gods: [], note: '健康看天芮星（病）、天心星（醫）與生門落宮。' },
];

// ---------------- 表單 ----------------
function fillSelect(sel, items) { sel.innerHTML = items.map(([v, t]) => `<option value="${v}">${t}</option>`).join(''); }
function initForm() {
  fillSelect($('#month'), Array.from({ length: 12 }, (_, i) => [i + 1, i + 1]));
  fillSelect($('#day'), Array.from({ length: 31 }, (_, i) => [i + 1, i + 1]));
  fillSelect($('#hour'), Array.from({ length: 24 }, (_, i) => [i, i]));
  fillSelect($('#minute'), Array.from({ length: 60 }, (_, i) => [i, p2(i)]));
  fillSelect($('#csStem'), [['', '選擇天干'], ...STEMS.map((s) => [s, s])]);
  fillSelect($('#juOverride'), [['', '本局'], ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, n + '局'])]);
  fillSelect($('#hourOverride'), [['', '原生時'], ...BRANCHES.map((b, i) => [i, b + '時'])]);
  $('#chips').innerHTML = TOPICS.map((t) => `<button type="button" class="chip" data-id="${t.id}" style="border-left-color:${t.color}">${t.name}<i>i</i></button>`).join('');
  document.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => {
    state.topic = state.topic === b.dataset.id ? null : b.dataset.id;
    document.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x.dataset.id === state.topic));
    const t = TOPICS.find((x) => x.id === state.topic);
    $('#usage').hidden = !t;
    if (t) $('#usage').textContent = t.note;
    if (chart) render();
  }));
  $('#modeSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    state.mode = b.dataset.mode;
    document.querySelectorAll('#modeSeg button').forEach((x) => x.classList.toggle('on', x === b));
    if (chart) run();
  });
  $('#sexSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    state.sex = b.dataset.sex;
    document.querySelectorAll('#sexSeg button').forEach((x) => { x.classList.toggle('on', x === b); x.classList.toggle('pink', x === b && x.dataset.sex === 'F'); });
    if (chart) run();
  });
  $('#nowBtn').addEventListener('click', () => { setNow(); run(); });
  $('#resetBtn').addEventListener('click', () => {
    setNow(); $('#name').value = ''; $('#juOverride').value = ''; $('#hourOverride').value = ''; $('#csStem').value = '';
    state.topic = null; document.querySelectorAll('.chip').forEach((x) => x.classList.remove('on')); $('#usage').hidden = true;
    chart = null; $('#result').hidden = true; history.replaceState(null, '', location.pathname);
  });
  ['#juOverride', '#hourOverride', '#method'].forEach((s) => $(s).addEventListener('change', () => chart && run()));
  $('#csStem').addEventListener('change', () => chart && render());
  $('#form').addEventListener('submit', (e) => { e.preventDefault(); run(); });
  if (!fromHash()) setNow();
}
function setNow() {
  const d = new Date();
  $('#year').value = d.getFullYear(); $('#month').value = d.getMonth() + 1; $('#day').value = d.getDate();
  $('#hour').value = d.getHours(); $('#minute').value = d.getMinutes();
}
function readInput() {
  const year = +$('#year').value, month = +$('#month').value, day = +$('#day').value, hour = +$('#hour').value, minute = +$('#minute').value;
  const dim = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (!year || day > dim) throw new Error(`${year} 年 ${month} 月沒有 ${day} 日`);
  return { year, month, day, hour, minute, tz: +$('#tz').value, name: $('#name').value.trim(), sex: state.sex, mode: state.mode,
    method: $('#method').value, ju: +$('#juOverride').value || 0, hb: $('#hourOverride').value === '' ? null : +$('#hourOverride').value };
}
function toHash(i) {
  const q = new URLSearchParams({ d: `${i.year}-${p2(i.month)}-${p2(i.day)}`, t: `${p2(i.hour)}:${p2(i.minute)}`, tz: i.tz, sex: i.sex, mode: i.mode, m: i.method });
  if (i.name) q.set('n', i.name);
  if (i.ju) q.set('ju', i.ju);
  if (i.hb != null) q.set('hb', i.hb);
  history.replaceState(null, '', '#' + q.toString());
}
function fromHash() {
  if (!location.hash) return false;
  const q = new URLSearchParams(location.hash.slice(1));
  if (!q.get('d')) return false;
  const [y, m, d] = q.get('d').split('-').map(Number);
  const [h, mi] = (q.get('t') || '12:00').split(':').map(Number);
  $('#year').value = y; $('#month').value = m; $('#day').value = d; $('#hour').value = h; $('#minute').value = mi;
  if (q.get('tz')) $('#tz').value = q.get('tz');
  $('#name').value = q.get('n') || '';
  $('#method').value = q.get('m') || 'chaibu';
  $('#juOverride').value = q.get('ju') || '';
  $('#hourOverride').value = q.get('hb') ?? '';
  setMode(q.get('mode') || 'life'); setSex(q.get('sex') || 'F');
  return true;
}
function setMode(m) { state.mode = m; document.querySelectorAll('#modeSeg button').forEach((x) => x.classList.toggle('on', x.dataset.mode === m)); }
function setSex(s) { state.sex = s; document.querySelectorAll('#sexSeg button').forEach((x) => { x.classList.toggle('on', x.dataset.sex === s); x.classList.toggle('pink', x.dataset.sex === 'F' && s === 'F'); }); }

// ---------------- 計算 ----------------
async function run() {
  $('#formError').textContent = '';
  let input;
  try { input = readInput(); } catch (e) { $('#formError').textContent = e.message; return; }
  try { await ready; } catch (e) { $('#formError').textContent = '計算引擎載入失敗：' + e.message; return; }
  try {
    const jd = localToJd(input, input.tz);
    const c = computeQimen(swe, { jd, offsetMin: input.tz, method: input.method, juOverride: input.ju || null, hourBranchOverride: input.hb });
    c.form = input;
    if (input.mode === 'life') {
      c.dayun = dayun(swe, c, input.sex === 'M');
      const now = new Date();
      const nowJd = localToJd({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate(), hour: now.getHours(), minute: now.getMinutes() }, input.tz);
      const nowTerm = currentTerm(swe, nowJd);
      let y = now.getFullYear();
      if (now.getMonth() < 2 && nowTerm.index >= 22) y -= 1; // 立春前（小寒、大寒）屬前一年
      c.nowYear = y;
      c.liunian = sb((y - 4) % 60 + 60);
      c.liunianPalace = c.heavenPalaceOf(STEMS[((y - 4) % 10 + 10) % 10]);
      const cur = [...c.dayun.list].reverse().find((d) => d.year <= y);
      c.curDayun = cur || null;
      c.dayunPalace = cur ? c.heavenPalaceOf(cur.gz[0]) : null;
    }
    chart = c;
    toHash(input);
    render();
    $('#result').hidden = false;
  } catch (e) {
    console.error(e);
    $('#formError').textContent = '排盤失敗：' + e.message;
  }
}

// ---------------- 顯示 ----------------
const PILL = { ming: '命宮', shi: '事宮', pt: '平台宮', dy: '大運', ln: '流年' };
function render() {
  const c = chart;
  const f = c.form;
  const yuan = ['上', '中', '下'][c.yuan];
  $('#head').innerHTML = `
    <p class="date">西元 ${c.time.year}-${p2(c.time.month)}-${p2(c.time.day)} ${p2(c.time.hour)}:${p2(c.time.minute)}（${c.term.name}）${f.name ? '　' + esc(f.name) : ''}</p>
    <p class="lunar">農曆 ${c.lunar.text}（下個節氣：${c.term.next} ${fmtLocal(c.term.nextStart, f.tz)}）</p>
    <div class="cols">
      <div class="pillars">
        ${[['年柱', c.pillars.year], ['月柱', c.pillars.month], ['日柱', c.pillars.day, 'day'], ['時柱', c.pillars.hour]].map(([t, g, k]) => `<div class="pillar ${k || ''}"><div class="t">${t}</div><div class="g">${sb(g)[0]}<br>${sb(g)[1]}</div></div>`).join('')}
      </div>
      <div class="info">
        <div><span class="lab">局數</span><b>${c.yang ? '陽遁' : '陰遁'} ${c.ju}局</b></div>
        <div><span class="lab">定局</span><span>${c.juTerm}${yuan}元${c.leap ? '（閏）' : ''}${c.ju !== c.juAuto ? `，換局（本局 ${c.juAuto}）` : ''}</span></div>
        <div><span class="lab">旬首（符頭干）</span><b>${c.xunHead}（${c.xunStem}）</b></div>
        <div><span class="lab">值符星</span><b>天${c.zhifuStar}</b></div>
        <div><span class="lab">值使門</span><b>${c.zhishiDoor}門</b></div>
      </div>
    </div>
    <div class="foot">
      <span class="lab">空亡</span><span>時空 ${c.hourKong.map((b) => BRANCHES[b]).join('、')}（${c.hourKong.map((b) => PALACE_NAME[BRANCH_PALACE[b]] + '宮').join('、')}）　日空 ${c.dayKong.map((b) => BRANCHES[b]).join('、')}</span>
      <span class="lab">馬星</span><span>${BRANCHES[c.horse]}（${PALACE_NAME[BRANCH_PALACE[c.horse]]}宮）</span>
      ${f.mode === 'life' ? `<span class="lab">流年</span><span>${c.nowYear} ${c.liunian}年　大運 ${c.curDayun ? c.curDayun.gz : '尚未起運'}</span>` : ''}
    </div>`;
  renderBoard(c);
  $('#dayunCard').hidden = f.mode !== 'life';
  if (f.mode === 'life') renderDayun(c);
  renderHai(c);
  renderStars(c);
  renderLiuren(c);
  renderKeying(c);
}

function pillsFor(c, p) {
  const f = c.form;
  const out = [];
  const person = f.mode === 'remote' ? c.hourPalace : c.dayPalace;
  const matter = f.mode === 'remote' ? c.dayPalace : c.hourPalace;
  if (p === person) out.push(['ming', PILL.ming]);
  if (p === matter) out.push([f.mode === 'life' ? 'pt' : 'pt', f.mode === 'life' ? PILL.pt : PILL.shi]);
  if (f.mode === 'life' && p === c.dayunPalace) out.push(['dy', PILL.dy]);
  if (f.mode === 'life' && p === c.liunianPalace) out.push(['ln', PILL.ln]);
  return out;
}
function topicHit(c, p) {
  const t = TOPICS.find((x) => x.id === state.topic);
  if (!t) return false;
  const x = c.palaces[p];
  return t.stems.some((s) => x.heaven.includes(s)) || t.doors.includes(x.door) || t.stars.some((s) => x.star.includes(s)) || t.gods.includes(x.god);
}
function renderBoard(c) {
  const cs = $('#csStem').value ? changsheng($('#csStem').value) : null;
  const csAt = (b) => (cs ? `<span class="cs">${cs[b]}</span>` : '');
  const outer = (p, cls, branches) => `<div class="outer ${cls}"><span class="g">${c.palaces[p].oppositeHeaven}</span>${branches.map(csAt).join('')}</div>`;
  const cell = (p) => {
    if (p === 5) return `<div class="cell center"><div class="yinyang"></div></div>`;
    const x = c.palaces[p];
    const stem = (s, hv) => `<span class="s ${x.jixing.includes(s) ? 'jx' : x.rumu.includes(s) ? 'rm' : ''}">${s}</span>`;
    const marks = pillsFor(c, p).map(([k, t]) => `<span class="pill ${k}">${t}</span>`);
    if (x.kong) marks.push('<span class="ring" title="時空亡"></span>');
    if (x.horse) marks.push('<span class="pill horse">馬</span>');
    return `<div class="cell ${topicHit(c, p) ? 'hl' : ''}" data-p="${p}">
      <div class="trig">${x.name}</div>
      <div class="god" title="${GOD_FULL[x.god]}">${x.god}</div>
      <div class="marks">${marks.join('')}</div>
      <div class="left">${x.heaven.split('').map((s) => stem(s)).join('')}<span>${x.earth.split('').map((s) => stem(s)).join('')}</span></div>
      <div class="right"><span title="${STAR_FULL(x.star[0])}">${x.star}</span><span class="door ${x.menpo ? 'po' : ''}" title="${DOOR_FULL(x.door)}${x.menpo ? '（門迫）' : ''}">${x.door}</span></div>
    </div>`;
  };
  $('#board').innerHTML = `
    <div class="corner"></div><div class="corner">${csAt(5)}</div>${outer(9, 'h', [6])}<div class="corner">${csAt(7)}</div><div class="corner"></div>
    ${outer(4, 'v', [4])}${cell(4)}${cell(9)}${cell(2)}${outer(2, 'v', [8])}
    ${outer(3, 'v', [3])}${cell(3)}${cell(5)}${cell(7)}${outer(7, 'v', [9])}
    ${outer(8, 'v', [2])}${cell(8)}${cell(1)}${cell(6)}${outer(6, 'v', [10])}
    <div class="corner"></div><div class="corner">${csAt(1)}</div>${outer(1, 'h lower', [0])}<div class="corner">${csAt(11)}</div><div class="corner"></div>`;
}

function renderDayun(c) {
  const d = c.dayun;
  $('#dayunCard').innerHTML = `<h2>大運（終身盤）</h2>
    <div class="tbl-wrap"><table>
      <tr><th>大運</th>${d.list.map((x) => `<td class="${c.curDayun && c.curDayun.gz === x.gz ? 'now' : ''}">${x.gz}</td>`).join('')}</tr>
      <tr><th>年份</th>${d.list.map((x) => `<td class="${c.curDayun && c.curDayun.gz === x.gz ? 'now' : ''}">${x.year}</td>`).join('')}</tr>
      <tr><th>歲數</th>${d.list.map((x) => `<td class="${c.curDayun && c.curDayun.gz === x.gz ? 'now' : ''}">${x.age}歲</td>`).join('')}</tr>
    </table></div>
    <p class="note">${c.form.sex === 'M' ? '乾造' : '坤造'}${c.pillars.year % 2 === 0 ? '陽' : '陰'}年，大運${d.forward ? '順' : '逆'}行；出生後 ${d.startAge} 年 ${d.startMonths} 個月起運（三日折一年）。歲數為虛歲。</p>`;
}

function hazards(x) {
  const h = [];
  if (x.jixing.length) h.push(`擊刑（${x.jixing.join('')}）`);
  if (x.rumu.length) h.push(`入墓（${x.rumu.join('')}）`);
  if (x.menpo) h.push(`門迫（${x.door}門）`);
  if (x.kong) h.push('空亡');
  return h;
}
function renderHai(c) {
  const f = c.form;
  const person = f.mode === 'remote' ? c.hourPalace : c.dayPalace;
  const x = c.palaces[person];
  let score = 0;
  const why = [];
  if (GOOD_DOORS.includes(x.door)) { score++; why.push(x.door + '門吉'); } else if (x.door !== '景') { score--; why.push(x.door + '門凶'); }
  if (GOOD_GODS.includes(x.god)) { score++; why.push(GOD_FULL[x.god] + '吉'); } else { score--; why.push(GOD_FULL[x.god] + '凶'); }
  if (x.starGround) { score++; why.push('星得地'); }
  if (x.starTime) { score++; why.push('星得時（' + x.starTime + '）'); }
  for (const h of hazards(x)) { score--; why.push(h); }
  const energy = score >= 2 ? '強' : score >= 0 ? '中' : '弱';
  const ky = KEYING[x.heaven[0]]?.[x.earth[0]] || '—';
  const list = RING.filter((p) => hazards(c.palaces[p]).length);
  const label = f.mode === 'life' ? '終身盤' : '命宮';
  $('#haiCard').innerHTML = `<h2>四害檢視</h2>
    <p class="state-line">${label}能量狀態：<b>${energy}</b>　命宮格局：<b>${ky}</b>（${x.heaven[0]}＋${x.earth[0]}，${x.name}宮）</p>
    <p class="note" style="text-align:center;margin:0 0 10px">命宮 ${x.name}宮：${why.join('、')}</p>
    ${list.length ? `<div class="pbtns">${list.map((p) => `<button type="button" class="pbtn" data-p="${p}">${PALACE_NAME[p]}宮</button>`).join('')}</div><div class="detail" id="haiDetail" hidden></div>`
      : '<p class="note" style="text-align:center">此盤各宮未見擊刑、入墓、門迫、空亡。</p>'}`;
  document.querySelectorAll('#haiCard .pbtn').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('#haiCard .pbtn').forEach((o) => o.classList.toggle('on', o === b));
    const p = +b.dataset.p, y = c.palaces[p];
    $('#haiDetail').hidden = false;
    $('#haiDetail').innerHTML = `<b>${y.name}宮</b>：${GOD_FULL[y.god]}、天${y.star}星、${y.door}門，天盤 ${y.heaven}／地盤 ${y.earth}
      <ul>${hazards(y).map((h) => `<li>${h}</li>`).join('')}${KEYING[y.heaven[0]]?.[y.earth[0]] ? `<li>十干克應：${KEYING[y.heaven[0]][y.earth[0]]}</li>` : ''}</ul>`;
  }));
}

function renderStars(c) {
  const ground = RING.filter((p) => c.palaces[p].starGround).map((p) => `天${c.palaces[p].star[0]}星（<span class="pal">${PALACE_NAME[p]}</span>）`);
  const time = RING.filter((p) => c.palaces[p].starTime).map((p) => `天${c.palaces[p].star[0]}星（<span class="pal">${PALACE_NAME[p]}</span>）`);
  $('#starCard').innerHTML = `<h2>九星能量狀態</h2>
    <table><tr><th style="width:4em">得地</th><td style="text-align:left">${ground.join('，') || '—'}</td></tr>
    <tr><th>得時</th><td style="text-align:left">${time.join('，') || '—'}</td></tr></table>
    <p class="note">得地：星之五行與所落宮同；得時：${c.season}季旺相之星（${{ 春: '木旺火相', 夏: '火旺土相', 秋: '金旺水相', 冬: '水旺木相' }[c.season]}）。</p>`;
}

function renderLiuren(c) {
  const l = liuren(c.pillars);
  $('#lirenCard').innerHTML = `<h2>奇門穿大六壬</h2>
    <table><tr><th rowspan="2" style="width:4.5em">天三門</th>${l.tian.map((t) => `<td>${t.branch}</td>`).join('')}</tr>
    <tr>${l.tian.map((t) => `<td class="pal">${t.at}（${t.palace}）</td>`).join('')}</tr></table>
    <table style="margin-top:8px"><tr><th rowspan="2" style="width:4.5em">地四戶</th>${l.di.map((t) => `<td>${t.name}</td>`).join('')}</tr>
    <tr>${l.di.map((t) => `<td class="pal">${t.at}（${t.palace}）</td>`).join('')}</tr></table>
    <p class="note">月將 ${l.yuejiang}（依月建）加時支 ${BRANCHES[c.pillars.hour % 12]}；天三門取卯、未、酉所臨，地四戶取除、危、定、開所臨。</p>`;
}

function renderKeying(c) {
  $('#keyingCard').innerHTML = `<h2>十干克應</h2>
    <table><tr><th>宮</th><th>天盤</th><th>地盤</th><th>克應</th><th>星／門／神</th></tr>
    ${RING.map((p) => { const x = c.palaces[p]; return `<tr><td class="pal">${x.name}</td><td>${x.heaven}</td><td>${x.earth}</td><td>${KEYING[x.heaven[0]]?.[x.earth[0]] || '—'}${x.fuyin ? '（伏吟）' : ''}${x.fanyin ? '（反吟）' : ''}</td><td>天${x.star}・${x.door}門・${GOD_FULL[x.god]}</td></tr>`; }).join('')}
    </table>`;
}

// ---------------- 匯出／匯入／列印／存盤 ----------------
function initIO() {
  $('#exportBtn').addEventListener('click', () => {
    if (!chart) return;
    const f = chart.form;
    const data = { app: 'qimen', version: 1, input: f, saved: new Date().toISOString() };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `奇門盤_${f.year}${p2(f.month)}${p2(f.day)}_${p2(f.hour)}${p2(f.minute)}.json`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(a.href); }, 5000);
  });
  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', async () => {
    const file = $('#importFile').files[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data.input) throw new Error('不是奇門盤檔案');
      loadInput(data.input); run();
    } catch (e) { $('#formError').textContent = '匯入失敗：' + e.message; }
    $('#importFile').value = '';
  });
  $('#printBtn').addEventListener('click', () => window.print());
  $('#saveBtn').addEventListener('click', () => {
    if (!chart) { $('#formError').textContent = '請先起局再儲存'; return; }
    const list = loadSaved();
    const f = { ...chart.form };
    f.name = $('#saveName').value.trim() || f.name;
    list.unshift({ id: Date.now(), input: f });
    localSet('qimenSaved', JSON.stringify(list));
    $('#saveName').value = '';
    renderSaved();
  });
  $('#savedSearch').addEventListener('input', renderSaved);
  renderSaved();
}
function loadSaved() { try { return JSON.parse(localGet('qimenSaved') || '[]'); } catch { return []; } }
function loadInput(i) {
  $('#year').value = i.year; $('#month').value = i.month; $('#day').value = i.day; $('#hour').value = i.hour; $('#minute').value = i.minute;
  $('#tz').value = i.tz ?? 480; $('#name').value = i.name || ''; $('#method').value = i.method || 'chaibu';
  $('#juOverride').value = i.ju || ''; $('#hourOverride').value = i.hb ?? '';
  setMode(i.mode || 'life'); setSex(i.sex || 'F');
}
function renderSaved() {
  const all = loadSaved();
  const q = $('#savedSearch').value.trim().toLowerCase();
  const list = q ? all.filter((s) => (s.input.name || '').toLowerCase().includes(q)) : all;
  $('#savedCount').textContent = `存盤清單（共 ${all.length} 筆）`;
  $('#savedList').innerHTML = list.map((s) => { const i = s.input; return `<li><b>${esc(i.name || '（未命名）')}</b><span class="meta">[${{ face: '面測', remote: '遠測', life: '終身盤' }[i.mode] || '時盤'}] ${i.year}-${p2(i.month)}-${p2(i.day)} ${p2(i.hour)}:${p2(i.minute)}　${i.sex === 'M' ? '男' : '女'}</span>
    <span class="acts"><button type="button" data-load="${s.id}">載入</button><button type="button" data-del="${s.id}">刪除</button></span></li>`; }).join('');
  document.querySelectorAll('#savedList [data-load]').forEach((b) => b.addEventListener('click', () => { const s = all.find((x) => x.id === +b.dataset.load); loadInput(s.input); run(); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
  document.querySelectorAll('#savedList [data-del]').forEach((b) => b.addEventListener('click', () => {
    if (!confirm('確定刪除這筆存盤？')) return;
    localSet('qimenSaved', JSON.stringify(all.filter((x) => x.id !== +b.dataset.del))); renderSaved();
  }));
}

// ---------------- 啟動 ----------------
const ready = (async () => {
  const s = new SwissEphemeris();
  await s.init();
  swe = s;
  // 當前天罡煞：以現在時間的月建
  const now = new Date();
  const jd = localToJd({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate(), hour: now.getHours(), minute: now.getMinutes() }, -now.getTimezoneOffset());
  const t = currentTerm(swe, jd);
  const mb = (Math.floor(t.index / 2) + 2) % 12;
  const tg = TIANGANG[mb];
  $('#tiangang').textContent = `當前天罡煞：${BRANCHES[tg]}（${PALACE_NAME[BRANCH_PALACE[tg]]}宮）　月建 ${BRANCHES[mb]}`;
})();

initForm();
initIO();
ready.catch((e) => { $('#formError').textContent = '計算引擎載入失敗：' + e.message + '（請用網址開啟，不要直接雙擊檔案）'; });
if (location.hash) run();
