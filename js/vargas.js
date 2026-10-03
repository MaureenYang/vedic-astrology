// 分盤：Parashara 16 張（Shodashavarga）＋ 常用的 D5、D6、D8、D11 ＋ D19、D23、D25、D50（Parivritti）
import { norm, signOf, degIn, isOddSign } from './constants.js?v=202610031551';

const MOVABLE = [0, 3, 6, 9], FIXED = [1, 4, 7, 10];
const modality = (s) => (MOVABLE.includes(s) ? 0 : FIXED.includes(s) ? 1 : 2); // 0 本位 1 固定 2 變動
const element = (s) => s % 4; // 0 火 1 土 2 風 3 水

// 每張分盤：由恆星黃經算出分盤星座
// Parivritti 循環法：從牡羊座第 1 份起，把 12 個星座的所有等分連續計數
const parivritti = (n, s, d) => (s * n + Math.floor(d / (30 / n))) % 12;

const RULES = {
  1: (s) => s,
  2: (s, d) => (isOddSign(s) ? (d < 15 ? 4 : 3) : (d < 15 ? 3 : 4)), // 奇：獅→蟹；偶：蟹→獅
  3: (s, d) => (s + [0, 4, 8][Math.floor(d / 10)]) % 12,
  4: (s, d) => (s + [0, 3, 6, 9][Math.floor(d / 7.5)]) % 12,
  // D5 Panchamsa：每 6°，奇數星座依序 火、土、木、水、金 的奇數星座；偶數星座依序 金、水、木、土、火 的偶數星座
  5: (s, d) => (isOddSign(s) ? [0, 10, 8, 2, 6] : [1, 5, 11, 9, 7])[Math.floor(d / 6)],
  // D6 Shashthamsa：每 5°，奇數星座從牡羊起、偶數星座從天秤起
  6: (s, d) => ((isOddSign(s) ? 0 : 6) + Math.floor(d / 5)) % 12,
  7: (s, d) => ((isOddSign(s) ? s : s + 6) + Math.floor(d / (30 / 7))) % 12,
  // D8 Ashtamsa：每 3.75°，本位星座從牡羊起、固定星座從射手起、變動星座從獅子起
  8: (s, d) => ([0, 8, 4][modality(s)] + Math.floor(d / 3.75)) % 12,
  9: (s, d) => ([0, 9, 6, 3][element(s)] + Math.floor(d / (30 / 9))) % 12,
  10: (s, d) => ((isOddSign(s) ? s : s + 8) + Math.floor(d / 3)) % 12,
  // D11 Rudramsa／Ekadasamsa：每 30/11°，從牡羊起連續計數（Parivritti 循環法）
  11: (s, d) => parivritti(11, s, d),
  // D19、D23、D25、D50：古典無記載，同樣採 Parivritti 循環法
  19: (s, d) => parivritti(19, s, d),
  23: (s, d) => parivritti(23, s, d),
  25: (s, d) => parivritti(25, s, d),
  50: (s, d) => parivritti(50, s, d),
  12: (s, d) => (s + Math.floor(d / 2.5)) % 12,
  16: (s, d) => ([0, 4, 8][modality(s)] + Math.floor(d / 1.875)) % 12,
  20: (s, d) => ([0, 8, 4][modality(s)] + Math.floor(d / 1.5)) % 12,
  24: (s, d) => ((isOddSign(s) ? 4 : 3) + Math.floor(d / 1.25)) % 12,
  27: (s, d) => ([0, 3, 6, 9][element(s)] + Math.floor(d / (30 / 27))) % 12,
  30: (s, d) => {
    // 奇數星座：火(牡羊) 0-5、土(水瓶) 5-10、木(射手) 10-18、水(雙子) 18-25、金(天秤) 25-30
    // 偶數星座：金(金牛) 0-5、水(處女) 5-12、木(雙魚) 12-20、土(摩羯) 20-25、火(天蠍) 25-30
    if (isOddSign(s)) return d < 5 ? 0 : d < 10 ? 10 : d < 18 ? 8 : d < 25 ? 2 : 6;
    return d < 5 ? 1 : d < 12 ? 5 : d < 20 ? 11 : d < 25 ? 9 : 7;
  },
  40: (s, d) => ((isOddSign(s) ? 0 : 6) + Math.floor(d / 0.75)) % 12,
  45: (s, d) => ([0, 4, 8][modality(s)] + Math.floor(d / (30 / 45))) % 12,
  60: (s, d) => (s + Math.floor(d * 2)) % 12,
};

export const VARGAS = [
  [1, 'D1', 'Rasi', '本命盤'],
  [2, 'D2', 'Hora', '財富盤'],
  [3, 'D3', 'Drekkana', '兄弟盤'],
  [4, 'D4', 'Chaturthamsa', '家宅盤'],
  [5, 'D5', 'Panchamsa', '權力地位名聲盤', true],
  [6, 'D6', 'Shashthamsa', '健康疾病盤', true],
  [7, 'D7', 'Saptamsa', '子女盤'],
  [8, 'D8', 'Ashtamsa', '意外突發盤', true],
  [9, 'D9', 'Navamsa', '九分盤／婚姻'],
  [10, 'D10', 'Dasamsa', '事業盤'],
  [11, 'D11', 'Rudramsa', '收穫利益盤', true],
  [12, 'D12', 'Dwadasamsa', '父母盤'],
  [16, 'D16', 'Shodasamsa', '車乘享樂盤'],
  [19, 'D19', 'Parivritti', '十九分盤', true],
  [20, 'D20', 'Vimsamsa', '靈修盤'],
  [23, 'D23', 'Parivritti', '二十三分盤', true],
  [24, 'D24', 'Chaturvimsamsa', '學識盤'],
  [25, 'D25', 'Parivritti', '二十五分盤', true],
  [27, 'D27', 'Bhamsa', '體力盤'],
  [30, 'D30', 'Trimsamsa', '災厄盤'],
  [40, 'D40', 'Khavedamsa', '母系業力盤'],
  [45, 'D45', 'Akshavedamsa', '父系業力盤'],
  [50, 'D50', 'Parivritti', '五十分盤', true],
  [60, 'D60', 'Shashtiamsa', '總業力盤'],
].map(([n, code, sa, zh, extra = false]) => ({ n, code, sanskrit: sa, name: zh, extra }));

export function vargaSign(n, lon) {
  return RULES[n](signOf(lon), degIn(lon));
}

// 分盤內度數：採通行的「黃經 × N 後取 30 餘數」
export function vargaDegree(n, lon) {
  return norm(lon * n) % 30;
}

// 上升點在此分盤停留的時間長度（分鐘）：每 30/N 度換一次分盤星座，上升約每 4 分鐘移動 1 度
export function vargaTimeTolerance(n, ascLon, ascSpeedDegPerMin) {
  const span = n === 2 ? 15 : n === 30 ? null : 30 / n;
  const d = degIn(ascLon);
  let lo, hi;
  if (n === 30) {
    const cuts = isOddSign(signOf(ascLon)) ? [0, 5, 10, 18, 25, 30] : [0, 5, 12, 20, 25, 30];
    for (let i = 0; i < 5; i++) if (d >= cuts[i] && d < cuts[i + 1]) { lo = cuts[i]; hi = cuts[i + 1]; }
  } else {
    lo = Math.floor(d / span) * span; hi = lo + span;
  }
  return { before: (d - lo) / ascSpeedDegPerMin, after: (hi - d) / ascSpeedDegPerMin };
}
