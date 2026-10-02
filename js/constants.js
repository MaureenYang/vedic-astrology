// 吠陀占星基本常數（依 BPHS / Parashara 傳統）

export const SIGNS = ['牡羊座', '金牛座', '雙子座', '巨蟹座', '獅子座', '處女座', '天秤座', '天蠍座', '射手座', '摩羯座', '水瓶座', '雙魚座'];
export const SIGNS_SHORT = ['羊', '牛', '雙', '蟹', '獅', '處', '秤', '蠍', '射', '摩', '瓶', '魚'];
export const SIGNS_EN = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

// 行星索引：0 日 1 月 2 火 3 水 4 木 5 金 6 土 7 羅 8 計
export const SU = 0, MO = 1, MA = 2, ME = 3, JU = 4, VE = 5, SA = 6, RA = 7, KE = 8;
export const PLANETS = ['日', '月', '火', '水', '木', '金', '土', '羅', '計'];
export const PLANETS_FULL = ['太陽', '月亮', '火星', '水星', '木星', '金星', '土星', '羅睺', '計都'];
export const PLANETS_EN = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
export const SEVEN = [SU, MO, MA, ME, JU, VE, SA];

// Swiss Ephemeris 天體代碼
export const SWE_BODY = [0, 1, 4, 2, 5, 3, 6];
export const SWE_MEAN_NODE = 10;

export const SIGN_LORD = [MA, VE, ME, MO, SU, ME, VE, MA, JU, SA, SA, JU];

export const EXALT_SIGN = [0, 1, 9, 5, 3, 11, 6];
export const DEBIL_SIGN = [6, 7, 3, 11, 9, 5, 0];
// 最高廟旺點（恆星黃經）
export const DEEP_EXALT = [10, 33, 298, 165, 95, 357, 200];
export const OWN_SIGNS = [[4], [3], [0, 7], [2, 5], [8, 11], [1, 6], [9, 10]];
// Moolatrikona：[星座, 起, 迄]
export const MOOLATRIKONA = [[4, 0, 20], [1, 3, 30], [0, 0, 12], [5, 15, 20], [8, 0, 10], [6, 0, 15], [10, 0, 20]];

// 自然關係：1 友、0 中立、-1 敵
export const NATURAL = [
  // 日 月 火 水 木 金 土
  [0, 1, 1, 0, 1, -1, -1], // 日
  [1, 0, 0, 1, 0, 0, 0], // 月
  [1, 1, 0, -1, 1, 0, 0], // 火
  [1, -1, 0, 0, 0, 1, 0], // 水
  [1, 1, 1, -1, 0, -1, 0], // 木
  [-1, -1, 0, 1, 0, 0, 1], // 金
  [-1, -1, -1, 1, 0, 1, 0], // 土
];
export const RELATION_LABEL = { 2: '大友', 1: '友', 0: '中立', '-1': '敵', '-2': '大敵' };

// 燃燒距離（度），[順行, 逆行]
export const COMBUST = { [MO]: [12, 12], [MA]: [17, 17], [ME]: [14, 12], [JU]: [11, 11], [VE]: [10, 8], [SA]: [15, 15] };

// 平均速度（度/日），供 Cheshta 判斷
export const MEAN_MOTION = { [MA]: 0.5240, [ME]: 0.9856, [JU]: 0.0831, [VE]: 0.9856, [SA]: 0.0335 };

// Vimshottari
export const DASHA_ORDER = [KE, VE, SU, MO, MA, RA, JU, SA, ME];
export const DASHA_YEARS = { [KE]: 7, [VE]: 20, [SU]: 6, [MO]: 10, [MA]: 7, [RA]: 18, [JU]: 16, [SA]: 19, [ME]: 17 };
// Dasha 一年的天數（可在表單選擇）
export const DASHA_YEAR_OPTIONS = [
  { days: 365.24219, name: '365.24219 天（回歸年）' },
  { days: 360, name: '360 天（Savana 年）' },
  { days: 359.017, name: '359.017 天' },
  { days: 354.37, name: '354.37 天（太陰年）' },
];
export const DASHA_YEAR_DAYS = DASHA_YEAR_OPTIONS[0].days;

export const NAKSHATRAS = [
  ['Ashwini', '婁'], ['Bharani', '胃'], ['Krittika', '昴'], ['Rohini', '畢'], ['Mrigashira', '觜'], ['Ardra', '參'],
  ['Punarvasu', '井'], ['Pushya', '鬼'], ['Ashlesha', '柳'], ['Magha', '星'], ['Purva Phalguni', '張'], ['Uttara Phalguni', '翼'],
  ['Hasta', '軫'], ['Chitra', '角'], ['Swati', '亢'], ['Vishakha', '氐'], ['Anuradha', '房'], ['Jyeshtha', '心'],
  ['Mula', '尾'], ['Purva Ashadha', '箕'], ['Uttara Ashadha', '斗'], ['Shravana', '女'], ['Dhanishta', '虛'], ['Shatabhisha', '危'],
  ['Purva Bhadrapada', '室'], ['Uttara Bhadrapada', '壁'], ['Revati', '奎'],
];
export const NAK_SPAN = 360 / 27;

export const AYANAMSAS = [
  { id: 1, name: 'Lahiri（Chitrapaksha）' },
  { id: 3, name: 'Raman' },
  { id: 5, name: 'KP（Krishnamurti）' },
];

// Shadbala
export const NAISARGIKA = [60, 51.43, 17.14, 25.71, 34.29, 42.86, 8.57];
export const REQUIRED_BALA = [300, 360, 300, 420, 390, 330, 300]; // virupa（5, 6, 5, 7, 6.5, 5.5, 5 rupa）

export const norm = (x) => ((x % 360) + 360) % 360;
export const signOf = (lon) => Math.floor(norm(lon) / 30);
export const degIn = (lon) => norm(lon) % 30;
export const angDist = (a, b) => { const d = Math.abs(norm(a) - norm(b)) % 360; return d > 180 ? 360 - d : d; };
export const houseFrom = (fromSign, sign) => ((sign - fromSign + 12) % 12) + 1;
export const isOddSign = (s) => s % 2 === 0; // 牡羊座(0) 為奇數星座
export const fmtDeg = (d) => { const a = norm(d) % 30; const D = Math.floor(a); const M = Math.floor((a - D) * 60); const S = Math.round(((a - D) * 60 - M) * 60); return `${D}°${String(M).padStart(2, '0')}′${String(S === 60 ? 59 : S).padStart(2, '0')}″`; };
