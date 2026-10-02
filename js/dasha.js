// Vimshottari 運程：大運 → 中運 → 小運 → 小小運（Sookshma）→ Prana
import { DASHA_ORDER, DASHA_YEARS, DASHA_YEAR_DAYS, NAK_SPAN, norm } from './constants.js?v=202610020939';

export const LEVEL_NAMES = ['大運', '中運', '小運', '小小運', 'Prana'];
export const LEVEL_SANSKRIT = ['Mahadasha', 'Antardasha', 'Pratyantardasha', 'Sookshma', 'Prana'];

// 回傳出生時的大運起點（可能早於出生）與第一個大運行星
export function dashaStart(moonLon, birthJd, yearDays = DASHA_YEAR_DAYS) {
  const m = norm(moonLon);
  const nak = Math.floor(m / NAK_SPAN);
  const lordIdx = nak % 9;
  const elapsed = (m % NAK_SPAN) / NAK_SPAN;
  const lord = DASHA_ORDER[lordIdx];
  const startJd = birthJd - elapsed * DASHA_YEARS[lord] * yearDays;
  return { startJd, lordIdx, balanceYears: (1 - elapsed) * DASHA_YEARS[lord] };
}

// 把一段期間依 Vimshottari 比例切成 9 段，從 firstIdx 開始
export function subPeriods(startJd, endJd, firstIdx) {
  const total = endJd - startJd;
  const out = [];
  let t = startJd;
  for (let k = 0; k < 9; k++) {
    const idx = (firstIdx + k) % 9;
    const lord = DASHA_ORDER[idx];
    const len = (total * DASHA_YEARS[lord]) / 120;
    out.push({ lord, idx, start: t, end: t + len });
    t += len;
  }
  return out;
}

// 大運列表（一輪 120 年）
export function mahadashas(moonLon, birthJd, yearDays = DASHA_YEAR_DAYS) {
  const { startJd, lordIdx } = dashaStart(moonLon, birthJd, yearDays);
  return subPeriods(startJd, startJd + 120 * yearDays, lordIdx);
}

// 某一期的下一層（每層都從該期主星開始）
export function children(period) {
  return subPeriods(period.start, period.end, period.idx);
}

// 找出某時間點所在的各層運
export function currentPath(maha, jd, depth = 5) {
  const path = [];
  let list = maha;
  for (let lv = 0; lv < depth; lv++) {
    const p = list.find((x) => jd >= x.start && jd < x.end);
    if (!p) break;
    path.push(p);
    list = children(p);
  }
  return path;
}
