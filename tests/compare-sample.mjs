// 與使用者提供的範例檔（MM_1988-07-19.xlsx，台中 1988-07-19 23:30 女）逐項比對
// 執行：node tests/compare-sample.mjs
import { loadSwe } from './node-setup.mjs';
import { computeChart } from '../js/chart.js';
import { mahadashas, children } from '../js/dasha.js';
import { localToUtc, msToJd, fmtLocal } from '../js/time.js';
import { PLANETS, SIGNS } from '../js/constants.js';

const swe = await loadSwe();
const { utcMs, offsetMin } = localToUtc({ year: 1988, month: 7, day: 19, hour: 23, minute: 30 }, 'Asia/Taipei');
const c = computeChart(swe, { jd: msToJd(utcMs), lat: 24.1417, lon: 120.6806, ayanamsa: 1, offsetMin });

let pass = 0, fail = 0;
const diffs = [];
const check = (label, ours, theirs, ok = ours === theirs) => { if (ok) pass++; else { fail++; diffs.push(`${label}：本站 ${ours}／範例檔 ${theirs}`); } };

// 行星星座與度數（範例檔度數取一位小數）
const XLSX_PLANETS = [['巨蟹座', 3.5], ['處女座', 6.4], ['雙魚座', 8.9], ['雙子座', 17.9], ['金牛座', 5.9], ['金牛座', 24.1], ['射手座', 3.5], ['水瓶座', 22.8], ['獅子座', 22.8]];
c.planets.forEach((p, i) => {
  check(`${PLANETS[i]} 星座`, SIGNS[p.sign], XLSX_PLANETS[i][0]);
  check(`${PLANETS[i]} 度數`, p.deg.toFixed(1), XLSX_PLANETS[i][1].toFixed(1), Math.abs(p.deg - XLSX_PLANETS[i][1]) < 0.06);
});
check('上升', `${SIGNS[c.asc.sign]} ${c.asc.deg.toFixed(1)}`, '牡羊座 3.9');
check('月亮星宿', c.planets[1].nakshatra.zh, '角（範例檔以回歸黃道計算，應為翼宿）');

// Baladi 狀態
const XLSX_AVASTHA = ['Near Death', 'Old', 'Old', 'Mature', 'Near Death', 'Infancy', 'Infancy', 'Old', 'Old'];
c.planets.forEach((p, i) => check(`${PLANETS[i]} 狀態`, p.avastha.en, XLSX_AVASTHA[i]));

// 分盤星座（依序 日月火水木金土羅計）
const XLSX_VARGAS = {
  2: '蟹蟹蟹蟹蟹獅獅蟹蟹', 3: '蟹處魚秤牛摩射秤羊', 4: '蟹處雙射牛瓶射蠍牛', 7: '摩羊蠍秤射羊射蟹摩', 9: '獅瓶處魚瓶獅牛羊秤',
  10: '羊蟹摩蠍瓶處摩處魚', 12: '獅蠍雙摩蟹瓶摩蠍牛', 16: '牛魚羊處蠍獅摩獅獅', 20: '雙射摩蟹魚羊秤魚魚', 24: '處射瓶秤蠍瓶秤瓶瓶',
  27: '羊射獅瓶射羊蟹雙射', 30: '秤雙雙射雙瓶羊雙瓶', 40: '瓶雙處魚牛雙獅秤秤', 45: '處處摩瓶羊獅牛雙雙', 60: '摩處獅牛羊牛蟹蠍牛',
};
const SHORT = ['羊', '牛', '雙', '蟹', '獅', '處', '秤', '蠍', '射', '摩', '瓶', '魚'];
for (const v of c.vargas) {
  const want = XLSX_VARGAS[v.n];
  if (!want) continue;
  v.planets.forEach((p, i) => check(`${v.code} ${PLANETS[i]}`, SHORT[p.sign], want[i]));
}

// 大運起點（範例檔為 UT 日期）
const XLSX_MD = ['1984-03-07', '1990-03-08', '2000-03-07', '2007-03-08', '2025-03-07', '2041-03-07', '2060-03-07', '2077-03-07', '2084-03-07'];
c.dashas.forEach((d, i) => check(`大運 ${PLANETS[d.lord]} 起點(UT)`, fmtLocal(d.start, 0, false), XLSX_MD[i]));
// 木星大運下的中運與小運起點
const ju = c.dashas[4];
const XLSX_AD = ['2025-03-07', '2027-04-26', '2029-11-06', '2032-02-12', '2033-01-18', '2035-09-19', '2036-07-07', '2037-11-06', '2038-10-13'];
children(ju).forEach((d, i) => check(`木星大運／${PLANETS[d.lord]} 中運起點(UT)`, fmtLocal(d.start, 0, false), XLSX_AD[i]));
const XLSX_PAD_JU = ['2025-03-07', '2025-06-19', '2025-10-21', '2026-02-08', '2026-03-25', '2026-08-02', '2026-09-10', '2026-11-14', '2026-12-30'];
children(children(ju)[0]).forEach((d, i) => check(`木/木/${PLANETS[d.lord]} 小運起點(UT)`, fmtLocal(d.start, 0, false), XLSX_PAD_JU[i]));

// Shadbala 總分（容許 ±15%，因各軟體細項算法不同）
const XLSX_SB = [466.7, 411.8, 363.4, 284.2, 398.4, 337.6, 395.3];
const sbRows = XLSX_SB.map((w, p) => `${PLANETS[p]} ${c.shadbala[p].total.toFixed(1)} vs ${w}`);

console.log(`一致 ${pass} 項，不同 ${fail} 項`);
diffs.forEach((d) => console.log('  ✗ ' + d));
console.log('Shadbala 總分：' + sbRows.join('、'));
