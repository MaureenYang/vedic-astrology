// 曆法：干支、節氣、農曆、四柱（用 Swiss Ephemeris 算太陽與月亮黃經）
export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const TERMS = ['立春', '雨水', '驚蟄', '春分', '清明', '穀雨', '立夏', '小滿', '芒種', '夏至', '小暑', '大暑',
  '立秋', '處暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'];
const LUNAR_MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
const LUNAR_DAYS = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

const FLG_MOSEPH = 4;
export const sb = (i) => STEMS[((i % 10) + 10) % 10] + BRANCHES[((i % 12) + 12) % 12];
export const norm = (x) => ((x % 360) + 360) % 360;
const norm180 = (x) => norm(x + 180) - 180;

// 當地時間（固定時差，分鐘）→ 儒略日（UT）
export function localToJd({ year, month, day, hour = 0, minute = 0 }, offsetMin) {
  return Date.UTC(year, month - 1, day, hour, minute) / 86400000 + 2440587.5 - offsetMin / 1440;
}
export function jdToLocal(jd, offsetMin) {
  const d = new Date(Math.round((jd - 2440587.5) * 86400000 + offsetMin * 60000 + 500)); // 取到秒，避免 23:29.999
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}
// 當地日期序號（整數，每天一個）
export const localDayNum = (jd, offsetMin) => Math.floor(jd + offsetMin / 1440 + 0.5);
export const dayGanzhiIndex = (dayNum) => (((dayNum + 49) % 60) + 60) % 60; // 2000-01-01 戊午

export function fmtLocal(jd, offsetMin, withTime = true) {
  const t = jdToLocal(jd, offsetMin);
  const p = (n) => String(n).padStart(2, '0');
  const s = `${t.year}-${p(t.month)}-${p(t.day)}`;
  return withTime ? `${s} ${p(t.hour)}:${p(t.minute)}` : s;
}

export function sunLon(swe, jd) { return swe.calculatePosition(jd, 0, FLG_MOSEPH).longitude; }
function moonSunDiff(swe, jd) { return norm180(swe.calculatePosition(jd, 1, FLG_MOSEPH).longitude - sunLon(swe, jd)); }

// 太陽到達黃經 target 的時刻（從 jd 附近找）
export function termTime(swe, target, jd) {
  for (let i = 0; i < 8; i++) {
    const d = norm180(target - sunLon(swe, jd));
    jd += d / 360 * 365.2422;
    if (Math.abs(d) < 1e-7) break;
  }
  return jd;
}
// 節氣序號 i（0 立春 … 23 大寒）對應的黃經
export const termLon = (i) => (315 + 15 * i) % 360;

// jd 所在的節氣：{index, start, next, nextStart}
export function currentTerm(swe, jd) {
  const lon = sunLon(swe, jd);
  let i = Math.floor(norm(lon - 315) / 15) % 24;
  let start = termTime(swe, termLon(i), jd);
  if (start > jd) { i = (i + 23) % 24; start = termTime(swe, termLon(i), jd - 15); }
  const nextStart = termTime(swe, termLon((i + 1) % 24), jd + 15);
  return { index: i, name: TERMS[i], start, next: TERMS[(i + 1) % 24], nextStart };
}

// 月份序號（寅月 = 1 … 丑月 = 12）；節氣序號 i → 月 = floor(i/2)+1
export function fourPillars(swe, jd, offsetMin, lateZiNextDay = true) {
  const t = jdToLocal(jd, offsetMin);
  const term = currentTerm(swe, jd);
  const month = Math.floor(term.index / 2) + 1;
  // 年柱：立春換年
  let year = t.year;
  const lichun = termTime(swe, 315, localToJd({ year, month: 2, day: 4 }, offsetMin));
  if (jd < lichun) year -= 1;
  const yearIdx = (((year - 4) % 60) + 60) % 60;
  const yStem = yearIdx % 10;
  const monthIdx = ((yStem % 5) * 2 + 2 + (month - 1)) % 10 + 0; // 天干
  const monthBranch = (month + 1) % 12;
  const monthGz = gzIndex(monthIdx, monthBranch);
  // 日柱：23 點以後算隔日（晚子時）
  let dayNum = localDayNum(jd, offsetMin);
  if (lateZiNextDay && t.hour >= 23) dayNum += 1;
  const dayIdx = dayGanzhiIndex(dayNum);
  const hourBranch = Math.floor((t.hour + 1) / 2) % 12;
  const hourStem = ((dayIdx % 10 % 5) * 2 + hourBranch) % 10;
  const hourIdx = gzIndex(hourStem, hourBranch);
  return { year: yearIdx, month: monthGz, day: dayIdx, hour: hourIdx, monthNo: month, term, dayNum, lunarYear: year };
}
// 由天干序、地支序求六十甲子序
export function gzIndex(stem, branch) {
  for (let i = 0; i < 60; i++) if (i % 10 === stem && i % 12 === branch) return i;
  return -1;
}
// 旬首（甲 x）與旬空
export function xunInfo(gz) {
  const head = gz - (gz % 10);
  const b = head % 12;
  return { head, kong: [(b + 10) % 12, (b + 11) % 12] };
}

// ---------------- 農曆 ----------------
function newMoonNear(swe, jd) {
  for (let i = 0; i < 10; i++) {
    const d = moonSunDiff(swe, jd);
    jd -= d / 12.1907;
    if (Math.abs(d) < 1e-6) break;
  }
  return jd;
}

// 傳回 dayNum（當地日期序號）的農曆資訊
export function lunarDate(swe, dayNum, offsetMin) {
  const jd = dayNum - offsetMin / 1440 + 0.25; // 當地中午附近
  const yr = jdToLocal(jd, offsetMin).year;
  // 上一個冬至 W1（≤ 當日）與下一個冬至 W2
  let w1 = termTime(swe, 270, localToJd({ year: yr, month: 12, day: 22 }, offsetMin));
  if (localDayNum(w1, offsetMin) > dayNum) w1 = termTime(swe, 270, w1 - 365.25);
  const w2 = termTime(swe, 270, w1 + 365.25);
  const d1 = localDayNum(w1, offsetMin), d2 = localDayNum(w2, offsetMin);
  // 含 W1 的朔日起，列出朔日到 W2
  let nm = newMoonNear(swe, w1);
  if (localDayNum(nm, offsetMin) > d1) nm = newMoonNear(swe, nm - 29.53);
  const moons = [localDayNum(nm, offsetMin)];
  while (true) {
    nm = newMoonNear(swe, nm + 29.5306);
    const d = localDayNum(nm, offsetMin);
    moons.push(d);
    if (d > d2) break;
  }
  // moons[0] 是十一月；moons[k] 是下一個十一月（k=12 平年、13 閏年）
  const k = moons.length - 2;
  let leapAt = -1;
  if (k === 13) {
    // 中氣日期（冬至之後依序）
    const zq = [];
    for (let i = 1; i <= 13; i++) zq.push(localDayNum(termTime(swe, (270 + 30 * i) % 360, w1 + 30.44 * i), offsetMin));
    for (let m = 1; m < k; m++) {
      const has = zq.some((z) => z >= moons[m] && z < moons[m + 1]);
      if (!has) { leapAt = m; break; }
    }
  }
  const names = [];
  let no = 11;
  for (let m = 0; m <= k; m++) {
    if (m === leapAt) names.push({ no: no - 1 === 0 ? 12 : no - 1, leap: true });
    else { names.push({ no, leap: false }); no = (no % 12) + 1; }
  }
  let mi = 0;
  while (mi + 1 < moons.length && moons[mi + 1] <= dayNum) mi++;
  const info = names[mi];
  const day = dayNum - moons[mi] + 1;
  // 農曆年：正月以前屬前一年
  const beforeNewYear = names.slice(0, mi + 1).every((n) => n.no >= 11 || (n.leap && n.no >= 11));
  const lunarYear = beforeNewYear ? jdToLocal(w1, offsetMin).year : jdToLocal(w2, offsetMin).year;
  const yIdx = (((lunarYear - 4) % 60) + 60) % 60;
  return { year: lunarYear, yearGz: sb(yIdx), month: info.no, leap: info.leap, day,
    text: `${sb(yIdx)}年${info.leap ? '閏' : ''}${LUNAR_MONTHS[info.no - 1]}月${LUNAR_DAYS[day - 1] || day}` };
}
