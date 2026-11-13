// 時家奇門排盤（轉盤法）
import { STEMS, BRANCHES, TERMS, sb, currentTerm, fourPillars, xunInfo, localDayNum, dayGanzhiIndex, termTime, termLon, jdToLocal, lunarDate } from './qimen-calendar.js?v=202611132341';

// 九宮：1坎 2坤 3震 4巽 5中 6乾 7兌 8艮 9離
export const PALACE_NAME = { 1: '坎', 2: '坤', 3: '震', 4: '巽', 5: '中', 6: '乾', 7: '兌', 8: '艮', 9: '離' };
export const PALACE_ELEM = { 1: '水', 2: '土', 3: '木', 4: '木', 5: '土', 6: '金', 7: '金', 8: '土', 9: '火' };
export const RING = [1, 8, 3, 4, 9, 2, 7, 6]; // 順時針
export const GRID = [[4, 9, 2], [3, 5, 7], [8, 1, 6]];
export const STAR_HOME = { 1: '蓬', 8: '任', 3: '沖', 4: '輔', 9: '英', 2: '芮', 7: '柱', 6: '心', 5: '禽' };
export const DOOR_HOME = { 1: '休', 8: '生', 3: '傷', 4: '杜', 9: '景', 2: '死', 7: '驚', 6: '開' };
export const STAR_ELEM = { 蓬: '水', 任: '土', 沖: '木', 輔: '木', 英: '火', 芮: '土', 柱: '金', 心: '金', 禽: '土' };
export const DOOR_ELEM = { 休: '水', 生: '土', 傷: '木', 杜: '木', 景: '火', 死: '土', 驚: '金', 開: '金' };
export const GODS = ['符', '蛇', '陰', '六', '白', '玄', '地', '天'];
export const GOD_FULL = { 符: '值符', 蛇: '螣蛇', 陰: '太陰', 六: '六合', 白: '白虎', 玄: '玄武', 地: '九地', 天: '九天' };
export const STAR_FULL = (s) => '天' + s + '星';
export const DOOR_FULL = (d) => d + '門';
const EARTH_ORDER = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];
const XUN_STEM = { 0: '戊', 10: '己', 20: '庚', 30: '辛', 40: '壬', 50: '癸' }; // 甲子戊 甲戌己 甲申庚 甲午辛 甲辰壬 甲寅癸
// 地支所在宮
export const BRANCH_PALACE = [1, 8, 8, 3, 4, 4, 9, 2, 2, 7, 6, 6];
export const JIXING = { 戊: 3, 己: 2, 庚: 8, 辛: 9, 壬: 4, 癸: 4 }; // 擊刑
export const RUMU = { 乙: 2, 丙: 6, 丁: 8, 戊: 6, 己: 8, 庚: 8, 辛: 4, 壬: 4, 癸: 2 }; // 入墓
const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };

// 局數表 [節氣序號] → [上, 中, 下]；陽遁 冬至～芒種
const JU = {
  冬至: [1, 7, 4], 小寒: [2, 8, 5], 大寒: [3, 9, 6], 立春: [8, 5, 2], 雨水: [9, 6, 3], 驚蟄: [1, 7, 4],
  春分: [3, 9, 6], 清明: [4, 1, 7], 穀雨: [5, 2, 8], 立夏: [4, 1, 7], 小滿: [5, 2, 8], 芒種: [6, 3, 9],
  夏至: [9, 3, 6], 小暑: [8, 2, 5], 大暑: [7, 1, 4], 立秋: [2, 5, 8], 處暑: [1, 4, 7], 白露: [9, 3, 6],
  秋分: [7, 1, 4], 寒露: [6, 9, 3], 霜降: [5, 8, 2], 立冬: [6, 9, 3], 小雪: [5, 8, 2], 大雪: [4, 7, 1],
};
const isYang = (termName) => TERMS.indexOf(termName) >= TERMS.indexOf('冬至') || TERMS.indexOf(termName) < TERMS.indexOf('夏至');

// 元：符頭（甲己日）地支 子午卯酉上、寅申巳亥中、辰戌丑未下 → dayIdx%15: 0 上 5 中 10 下
const yuanOf = (dayIdx) => Math.floor((dayIdx % 15) / 5);

// 定局：拆補法 / 置閏法
export function findJu(swe, jd, offsetMin, dayNum, method) {
  const dayIdx = dayGanzhiIndex(dayNum);
  const term = currentTerm(swe, jd);
  if (method === 'zhirun') {
    // 置閏：找最近的芒種／大雪（在 jd 之前），其上元符頭取 [節-9, 節+5] 內的 甲子/甲午/己卯/己酉 日
    const i = term.index;
    const iMang = TERMS.indexOf('芒種'), iDa = TERMS.indexOf('大雪');
    let base = i >= iMang && i < iDa ? iMang : iDa;
    let baseJd = termTime(swe, termLon(base), jd - ((i - base + 24) % 24) * 15.22);
    if (baseJd > jd) baseJd = termTime(swe, termLon(base), baseJd - 365.25);
    const n0 = localDayNum(baseJd, offsetMin);
    const idx0 = dayGanzhiIndex(n0);
    // 從 n0-9 起找第一個 符頭%15==0 的日子
    let f0 = n0 - 9;
    while (dayGanzhiIndex(f0) % 15 !== 0) f0++;
    let termIdx, yuan, leap = false;
    if (dayNum < f0) { termIdx = base; yuan = Math.floor((dayNum - f0 + 15) / 5); leap = true; }
    else { termIdx = (base + Math.floor((dayNum - f0) / 15)) % 24; yuan = Math.floor(((dayNum - f0) % 15) / 5); }
    void idx0;
    const name = TERMS[termIdx];
    return { term, juTerm: name, yuan, ju: JU[name][yuan], yang: isYang(name), leap, futou: dayIdx - (dayIdx % 5) };
  }
  const yuan = yuanOf(dayIdx);
  return { term, juTerm: term.name, yuan, ju: JU[term.name][yuan], yang: isYang(term.name), leap: false, futou: dayIdx - (dayIdx % 5) };
}

const ringIdx = (p) => RING.indexOf(p === 5 ? 2 : p);
const ringAt = (i) => RING[((i % 8) + 8) % 8];

// 主程式。input: {jd, offsetMin, method:'chaibu'|'zhirun', juOverride, hourBranchOverride}
export function computeQimen(swe, input) {
  const { jd, offsetMin } = input;
  const method = input.method || 'chaibu';
  let pillars = fourPillars(swe, jd, offsetMin);
  // 換時柱：改用指定時支（日柱不變）
  if (input.hourBranchOverride != null) {
    const hb = input.hourBranchOverride;
    const dStem = pillars.day % 10;
    const hs = ((dStem % 5) * 2 + hb) % 10;
    let hi = -1; for (let i = 0; i < 60; i++) if (i % 10 === hs && i % 12 === hb) hi = i;
    pillars = { ...pillars, hour: hi };
  }
  const juInfo = findJu(swe, jd, offsetMin, pillars.dayNum, method);
  const yang = juInfo.yang;
  const ju = input.juOverride || juInfo.ju;

  // 地盤
  const earth = {};
  for (let i = 0; i < 9; i++) {
    const p = ((ju - 1 + (yang ? i : -i)) % 9 + 9) % 9 + 1;
    earth[p] = EARTH_ORDER[i];
  }
  const earthPalaceOf = (stem) => +Object.keys(earth).find((p) => earth[p] === stem);
  const eff = (p) => (p === 5 ? 2 : p);

  // 旬首、值符、值使
  const hour = pillars.hour;
  const xun = xunInfo(hour);
  const xunStem = XUN_STEM[xun.head];
  const steps = hour % 10;
  const pXun = earthPalaceOf(xunStem);
  const zhifuStar = STAR_HOME[pXun];
  const zhishiDoor = DOOR_HOME[eff(pXun)];
  const hourStem = STEMS[hour % 10];
  const pHour = hourStem === '甲' ? pXun : earthPalaceOf(hourStem);

  // 天盤九星與天盤干：值符隨時干
  const shift = ringIdx(pHour) - ringIdx(pXun);
  const stars = {}, heaven = {};
  for (const home of RING) {
    const dest = ringAt(ringIdx(home) + shift);
    stars[dest] = STAR_HOME[home];
    heaven[dest] = earth[home];
    if (home === 2) { stars[dest] += '禽'; heaven[dest] += earth[5]; }
  }
  // 八門：值使依時辰數飛宮（經過中宮）
  let pDoor = eff(pXun);
  for (let i = 0; i < steps; i++) pDoor = ((pDoor - 1 + (yang ? 1 : -1)) % 9 + 9) % 9 + 1;
  pDoor = eff(pDoor);
  const doorShift = ringIdx(pDoor) - ringIdx(eff(pXun));
  const doors = {};
  for (const home of RING) doors[ringAt(ringIdx(home) + doorShift)] = DOOR_HOME[home];
  // 八神：值符起，陽順陰逆
  const gods = {};
  const g0 = ringIdx(eff(pHour));
  GODS.forEach((g, i) => { gods[ringAt(g0 + (yang ? i : -i))] = g; });

  // 各宮狀態
  const hourKong = xun.kong;
  const dayKong = xunInfo(pillars.day).kong;
  const hb = hour % 12;
  const horse = [2, 11, 8, 5][hb % 4]; // 申子辰馬在寅、巳酉丑在亥、寅午戌在申、亥卯未在巳
  const palaces = {};
  for (const p of RING) {
    const door = doors[p];
    const de = DOOR_ELEM[door], pe = PALACE_ELEM[p];
    const stemsH = heaven[p].split(''), stemsE = earth[p].split('').concat(p === 2 ? [earth[5]] : []);
    const jixing = [...stemsH, ...stemsE].filter((s) => JIXING[s] === p);
    const rumu = [...stemsH, ...stemsE].filter((s) => RUMU[s] === p);
    const kongH = hourKong.some((b) => BRANCH_PALACE[b] === p);
    const kongD = dayKong.some((b) => BRANCH_PALACE[b] === p);
    palaces[p] = {
      palace: p, name: PALACE_NAME[p], god: gods[p], star: stars[p], door, heaven: heaven[p],
      earth: earth[p] + (p === 2 ? earth[5] : ''), jixing, rumu, kong: kongH, kongDay: kongD,
      menpo: KE[de] === pe, menzhi: KE[pe] === de, horse: BRANCH_PALACE[horse] === p,
      oppositeHeaven: heaven[ringAt(ringIdx(p) + 4)],
      starGround: STAR_ELEM[stars[p][0]] === pe,
      fuyin: heaven[p][0] === earth[p][0], fanyin: heaven[p][0] === earth[ringAt(ringIdx(p) + 4)][0],
    };
  }
  // 九星得時：季節旺相
  const season = seasonOf(juInfo.term.index);
  const seasonElem = { 春: '木', 夏: '火', 秋: '金', 冬: '水' }[season];
  for (const p of RING) {
    const se = STAR_ELEM[palaces[p].star[0]];
    palaces[p].starTime = se === seasonElem ? '旺' : SHENG[seasonElem] === se ? '相' : '';
  }
  // 命宮等（日干、時干落宮：天盤干）
  const dayStem = STEMS[pillars.day % 10];
  const heavenPalaceOf = (stem) => {
    const s = stem === '甲' ? xunStem : stem;
    return +Object.keys(heaven).find((p) => heaven[p].includes(s));
  };
  const lunar = lunarDate(swe, pillars.dayNum, offsetMin);
  const t = jdToLocal(jd, offsetMin);
  return {
    input, time: t, pillars, lunar, term: juInfo.term, juTerm: juInfo.juTerm, yuan: juInfo.yuan, leap: juInfo.leap,
    ju, juAuto: juInfo.ju, yang, method,
    xunHead: sb(xun.head), xunStem, zhifuStar, zhishiDoor, steps,
    hourKong, dayKong, horse, season,
    earth, heaven, stars, doors, gods, palaces,
    dayStem, hourStem, dayPalace: heavenPalaceOf(dayStem), hourPalace: heavenPalaceOf(hourStem),
    yearStem: STEMS[pillars.year % 10], yearPalace: heavenPalaceOf(STEMS[pillars.year % 10]),
    heavenPalaceOf, earthPalaceOf: (s) => eff(earthPalaceOf(s)),
  };
}

function seasonOf(termIdx) {
  if (termIdx < 6) return '春';
  if (termIdx < 12) return '夏';
  if (termIdx < 18) return '秋';
  return '冬';
}

// 十二長生：天干 → 各地支狀態
const CHANGSHENG = ['長生', '沐浴', '冠帶', '臨官', '帝旺', '衰', '病', '死', '墓', '絕', '胎', '養'];
const CS_START = { 甲: 11, 乙: 6, 丙: 2, 丁: 9, 戊: 2, 己: 9, 庚: 5, 辛: 0, 壬: 8, 癸: 3 };
export function changsheng(stem) {
  const out = {};
  const yangStem = STEMS.indexOf(stem) % 2 === 0;
  for (let i = 0; i < 12; i++) out[(CS_START[stem] + (yangStem ? i : -i) + 12) % 12] = CHANGSHENG[i];
  return out;
}

// 大六壬：天三門（月將加時，卯未酉所臨）、地四戶（月建加時，除危定開所臨）
export function liuren(pillars) {
  const mb = pillars.month % 12, hb = pillars.hour % 12;
  const yuejiang = (13 - mb + 12) % 12;
  const at = (x) => (x - yuejiang + hb + 12) % 12; // 天盤地支 x 落在的地盤地支
  const JIANCHU = ['建', '除', '滿', '平', '定', '執', '破', '危', '成', '收', '開', '閉'];
  const tian = [3, 7, 9].map((x) => ({ branch: BRANCHES[x], at: BRANCHES[at(x)], palace: PALACE_NAME[BRANCH_PALACE[at(x)]] }));
  const di = [1, 7, 4, 10].map((i) => ({ name: JIANCHU[i], at: BRANCHES[(hb + i) % 12], palace: PALACE_NAME[BRANCH_PALACE[(hb + i) % 12]] }));
  return { yuejiang: BRANCHES[yuejiang], tian, di };
}

// 八字大運（終身盤）：出生年月、性別
export function dayun(swe, chart, male) {
  const { pillars } = chart;
  const { jd, offsetMin } = chart.input;
  const yangYear = pillars.year % 2 === 0;
  const forward = yangYear === male;
  const term = pillars.term;
  // 順行到下一個「節」，逆行到上一個「節」（節 = 偶數節氣序號）
  let target;
  if (forward) {
    let i = term.index + 1; let t = term.nextStart;
    if (i % 2 === 1) { i++; t = termTime(swe, termLon(i % 24), t + 15); }
    target = t;
  } else {
    let i = term.index; let t = term.start;
    if (i % 2 === 1) { i--; t = termTime(swe, termLon(i), t - 15); }
    target = t;
  }
  const days = Math.abs(target - jd);
  const years = days / 3;
  const startAge = Math.floor(years);
  const startMonths = Math.round((years - startAge) * 12);
  const birthYear = pillars.lunarYear;
  const list = [];
  for (let i = 1; i <= 9; i++) {
    const gz = ((pillars.month + (forward ? i : -i)) % 60 + 60) % 60;
    const y = birthYear + startAge + (i - 1) * 10;
    list.push({ gz: sb(gz), year: y, age: y - birthYear + 1 });
  }
  return { forward, startAge, startMonths, startYears: years, list, birthYear };
}

// 天盤干 + 地盤干 十干克應
export const KEYING = {
  戊: { 戊: '伏吟', 己: '犬遇青龍', 庚: '值符飛宮', 辛: '青龍折足', 壬: '青龍入天牢', 癸: '青龍華蓋', 丁: '青龍耀明', 丙: '青龍返首', 乙: '青龍合靈' },
  己: { 戊: '貴人入獄', 己: '地戶逢鬼', 庚: '刑格返名', 辛: '遊魂入墓', 壬: '地網高張', 癸: '地刑玄武', 丁: '朱雀入墓', 丙: '火悖地戶', 乙: '墓神不明' },
  庚: { 戊: '太白伏宮', 己: '官符刑格', 庚: '太白同宮', 辛: '白虎干格', 壬: '移蕩格', 癸: '大格', 丁: '亭亭之格', 丙: '太白入熒', 乙: '太白逢星' },
  辛: { 戊: '困龍被傷', 己: '入獄自刑', 庚: '白虎出力', 辛: '伏吟天庭', 壬: '凶蛇入獄', 癸: '天牢華蓋', 丁: '獄神得奇', 丙: '干合悖師', 乙: '白虎猖狂' },
  壬: { 戊: '小蛇化龍', 己: '反吟蛇刑', 庚: '太白擒蛇', 辛: '螣蛇相纏', 壬: '蛇入地羅', 癸: '幼女奸淫', 丁: '干合蛇刑', 丙: '水蛇入火', 乙: '小蛇得勢' },
  癸: { 戊: '天乙會合', 己: '華蓋地戶', 庚: '太白入網', 辛: '網蓋天牢', 壬: '復見螣蛇', 癸: '天網四張', 丁: '螣蛇夭矯', 丙: '華蓋悖師', 乙: '華蓋逢星' },
  丁: { 戊: '青龍轉光', 己: '火入勾陳', 庚: '文書阻隔', 辛: '朱雀入獄', 壬: '五神互合', 癸: '朱雀投江', 丁: '奇入太陰', 丙: '星奇朱雀', 乙: '玉女乘龍' },
  丙: { 戊: '飛鳥跌穴', 己: '大悖入刑', 庚: '熒入太白', 辛: '日月相會', 壬: '火入天羅', 癸: '華蓋悖師', 丁: '星隨月轉', 丙: '月悖', 乙: '日月並行' },
  乙: { 戊: '青龍合靈', 己: '日奇入墓', 庚: '日奇被刑', 辛: '青龍逃走', 壬: '日奇入地', 癸: '華蓋逢星', 丁: '奇儀相佐', 丙: '奇儀順遂', 乙: '日奇伏吟' },
};
export const GOOD_DOORS = ['開', '休', '生'];
export const GOOD_GODS = ['符', '陰', '六', '地', '天'];
