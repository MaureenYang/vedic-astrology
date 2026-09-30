// 排盤主程式：輸入出生資料，輸出所有命盤資訊
import {
  SIGN_LORD, EXALT_SIGN, DEBIL_SIGN, DEEP_EXALT, OWN_SIGNS, MOOLATRIKONA, NATURAL, COMBUST, MEAN_MOTION,
  NAKSHATRAS, NAK_SPAN, NAISARGIKA, REQUIRED_BALA, SWE_BODY, SWE_MEAN_NODE, DASHA_ORDER,
  SU, MO, MA, ME, JU, VE, SA, RA, KE, SEVEN, norm, signOf, degIn, angDist, houseFrom, isOddSign,
} from './constants.js';
import { VARGAS, vargaSign, vargaDegree, vargaTimeTolerance } from './vargas.js';
import { mahadashas } from './dasha.js';

const FLG_MOSEPH = 4, FLG_SPEED = 256, FLG_EQUATORIAL = 2048, FLG_SIDEREAL = 65536;
const rad = Math.PI / 180;
const norm180 = (x) => { const a = norm(x); return a > 180 ? a - 360 : a; };
const WEEKDAY_LORD = [SU, MO, MA, ME, JU, VE, SA];
const CHALDEAN = [SA, JU, MA, SU, VE, ME, MO];
const KALI_EPOCH_JD = 588465.5; // 公元前 3102 年 2 月 18 日（星期五）

// ---------- 天文計算 ----------

function bodyPos(swe, jd, body, sidereal) {
  const f = FLG_MOSEPH | FLG_SPEED | (sidereal ? FLG_SIDEREAL : 0);
  const p = swe.calculatePosition(jd, body, f);
  return { lon: norm(p.longitude), lat: p.latitude, speed: p.longitudeSpeed };
}

function declination(swe, jd, body) {
  return swe.calculatePosition(jd, body, FLG_MOSEPH | FLG_EQUATORIAL).latitude;
}

function ascMc(swe, jd, lat, lon, ayan) {
  const h = swe.calculateHouses(jd, lat, lon, 'P');
  return { asc: norm(h.ascendant - ayan), mc: norm(h.mc - ayan), ascTrop: h.ascendant, mcTrop: h.mc };
}

// 日出／日落（太陽上緣 + 大氣折射，高度 -0.833°）
function sunEvent(swe, jdGuess, lat, lon, rise) {
  let jd = jdGuess;
  for (let i = 0; i < 6; i++) {
    const eq = swe.calculatePosition(jd, 0, FLG_MOSEPH | FLG_EQUATORIAL);
    const ra = eq.longitude, dec = eq.latitude;
    const cosH = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(dec * rad)) / (Math.cos(lat * rad) * Math.cos(dec * rad));
    if (cosH < -1 || cosH > 1) return null; // 極晝／極夜
    const H0 = Math.acos(cosH) / rad;
    const lst = swe.siderealTime(jd) * 15 + lon;
    const ha = norm180(lst - ra);
    const target = rise ? -H0 : H0;
    jd += norm180(target - ha) / 360.9856;
  }
  return jd;
}

// ---------- 關係、尊貴、狀態 ----------

export function temporalRelation(fromSign, toSign) {
  const h = houseFrom(fromSign, toSign);
  return [2, 3, 4, 10, 11, 12].includes(h) ? 1 : -1;
}

export function compoundRelation(p, q, signs) {
  if (p > 6 || q > 6 || p === q) return null;
  return NATURAL[p][q] + temporalRelation(signs[p], signs[q]);
}

export function dignity(p, sign, deg) {
  if (p > 6) return { exalt: false, debil: false, own: false, mt: false };
  const mt = MOOLATRIKONA[p];
  return {
    exalt: EXALT_SIGN[p] === sign,
    debil: DEBIL_SIGN[p] === sign,
    own: OWN_SIGNS[p].includes(sign),
    mt: deg != null && mt[0] === sign && deg >= mt[1] && deg < mt[2],
  };
}

// Baladi 狀態：奇數星座 0-6 嬰兒、6-12 少年、12-18 青年、18-24 老年、24-30 瀕死；偶數星座反向
const BALADI = [['Infancy', '嬰兒'], ['Youth', '少年'], ['Mature', '青年'], ['Old', '老年'], ['Near Death', '瀕死']];
export function baladi(sign, deg) {
  let i = Math.min(4, Math.floor(deg / 6));
  if (!isOddSign(sign)) i = 4 - i;
  return { en: BALADI[i][0], zh: BALADI[i][1] };
}

// ---------- 主函式 ----------

export function computeChart(swe, input) {
  const { jd, lat, lon, ayanamsa, offsetMin, gender } = input;
  swe.setSiderealMode(ayanamsa);
  const ayan = swe.getAyanamsa(jd);

  // 行星
  const P = [];
  SEVEN.forEach((p) => {
    const s = bodyPos(swe, jd, SWE_BODY[p], true);
    const t = bodyPos(swe, jd, SWE_BODY[p], false);
    P[p] = { id: p, lon: s.lon, lat: s.lat, speed: s.speed, tropLon: t.lon, dec: declination(swe, jd, SWE_BODY[p]) };
  });
  const node = bodyPos(swe, jd, SWE_MEAN_NODE, true);
  const nodeT = bodyPos(swe, jd, SWE_MEAN_NODE, false);
  P[RA] = { id: RA, lon: node.lon, lat: 0, speed: node.speed, tropLon: nodeT.lon };
  P[KE] = { id: KE, lon: norm(node.lon + 180), lat: 0, speed: node.speed, tropLon: norm(nodeT.lon + 180) };

  const am = ascMc(swe, jd, lat, lon, ayan);
  const am2 = ascMc(swe, jd + 1 / 1440, lat, lon, ayan);
  const ascSpeed = norm180(am2.asc - am.asc); // 度/分鐘
  const ascSign = signOf(am.asc);

  P.forEach((x) => { x.sign = signOf(x.lon); x.deg = degIn(x.lon); x.house = houseFrom(ascSign, x.sign); });
  const signs = P.map((x) => x.sign);

  // 星宿
  const nak = (L) => { const i = Math.floor(norm(L) / NAK_SPAN); return { index: i, name: NAKSHATRAS[i][0], zh: NAKSHATRAS[i][1], pada: Math.floor((norm(L) % NAK_SPAN) / (NAK_SPAN / 4)) + 1, lord: DASHA_ORDER[i % 9] }; };

  // 日出日落、晝夜
  const localMidnight = Math.floor(jd + offsetMin / 1440 + 0.5) - 0.5 - offsetMin / 1440; // 當地民用日 00:00 的 JD
  const sunriseToday = sunEvent(swe, localMidnight + 0.25, lat, lon, true);
  const sunsetToday = sunEvent(swe, localMidnight + 0.75, lat, lon, false);
  const sunriseTomorrow = sunEvent(swe, localMidnight + 1.25, lat, lon, true);
  const sunsetYesterday = sunEvent(swe, localMidnight - 0.25, lat, lon, false);
  let isDay = true, periodStart, periodEnd, vedicDayOffset = 0;
  const polar = !sunriseToday || !sunsetToday;
  if (!polar) {
    if (jd >= sunriseToday && jd < sunsetToday) { isDay = true; periodStart = sunriseToday; periodEnd = sunsetToday; }
    else if (jd >= sunsetToday) { isDay = false; periodStart = sunsetToday; periodEnd = sunriseTomorrow; }
    else { isDay = false; periodStart = sunsetYesterday; periodEnd = sunriseToday; vedicDayOffset = -1; }
  }
  const civilWeekday = (Math.floor(jd + offsetMin / 1440 + 1.5)) % 7; // 0 = 星期日
  const vedicWeekday = (civilWeekday + vedicDayOffset + 7) % 7;
  const frac = polar ? 0.5 : (jd - periodStart) / (periodEnd - periodStart);

  // 時間主宰星
  const dinaLord = WEEKDAY_LORD[vedicWeekday];
  const horaNum = (isDay ? 0 : 12) + Math.min(11, Math.floor(frac * 12));
  const horaLord = CHALDEAN[(CHALDEAN.indexOf(dinaLord) + horaNum) % 7];
  const ahargana = Math.floor(jd + offsetMin / 1440 + 0.5 - (KALI_EPOCH_JD + 0.5)) + vedicDayOffset;
  const varshaLord = WEEKDAY_LORD[((Math.floor(ahargana / 360) * 3 + 1) % 7 + 6) % 7];
  const masaLord = WEEKDAY_LORD[((Math.floor(ahargana / 30) * 2 + 1) % 7 + 6) % 7];

  // 月相
  const elong = norm(P[MO].lon - P[SU].lon);
  const waxing = elong < 180;
  const tithiAngle = elong > 180 ? 360 - elong : elong;

  // 吉凶性
  const maleficSet = new Set([SU, MA, SA, RA, KE]);
  if (!waxing) maleficSet.add(MO);
  const mercuryMalefic = [SU, MA, SA, RA, KE].some((q) => signs[q] === signs[ME]) || (!waxing && signs[MO] === signs[ME]);
  const isBenefic = (p) => (p === ME ? !mercuryMalefic : !maleficSet.has(p));

  // 分盤
  const vargas = VARGAS.map((v) => {
    const ascV = vargaSign(v.n, am.asc);
    const planets = P.map((x) => {
      const s = vargaSign(v.n, x.lon);
      const dg = dignity(x.id, s, v.n === 1 ? x.deg : null);
      return { id: x.id, sign: s, deg: vargaDegree(v.n, x.lon), house: houseFrom(ascV, s), retro: x.speed < 0 && x.id <= 6, ...dg };
    });
    return { ...v, ascSign: ascV, ascDeg: vargaDegree(v.n, am.asc), planets, tolerance: vargaTimeTolerance(v.n, am.asc, ascSpeed) };
  });
  const vs = Object.fromEntries(vargas.map((v) => [v.n, v]));

  // 燃燒
  const combust = (p) => {
    if (!COMBUST[p]) return false;
    const orb = COMBUST[p][P[p].speed < 0 ? 1 : 0];
    return angDist(P[p].lon, P[SU].lon) < orb;
  };

  // ---------- Shadbala ----------
  const shadbala = {};
  const REL_POINTS = { 2: 20, 1: 15, 0: 10, '-1': 4, '-2': 2 };
  SEVEN.forEach((p) => {
    const x = P[p];
    const b = {};
    // 1. Sthana Bala
    b.uchcha = angDist(x.lon, norm(DEEP_EXALT[p] + 180)) / 3;
    let sv = 0;
    for (const n of [1, 2, 3, 7, 9, 12, 30]) {
      const s = vs[n].planets[p].sign;
      const lord = SIGN_LORD[s];
      // Moolatrikona：本命盤看度數範圍，分盤只看星座
      if (n === 1 ? dignity(p, s, x.deg).mt : MOOLATRIKONA[p][0] === s) sv += 45;
      else if (OWN_SIGNS[p].includes(s)) sv += 30;
      else sv += REL_POINTS[NATURAL[p][lord] + temporalRelation(signs[p], signs[lord])];
    }
    b.saptavargaja = sv;
    const femaleOk = p === MO || p === VE;
    b.ojayugma = [x.sign, vs[9].planets[p].sign].reduce((a, s) => a + ((isOddSign(s) !== femaleOk) ? 15 : 0), 0);
    b.kendradi = [1, 4, 7, 10].includes(x.house) ? 60 : [2, 5, 8, 11].includes(x.house) ? 30 : 15;
    const dk = Math.floor(x.deg / 10);
    const male = [SU, MA, JU].includes(p), neuter = [ME, SA].includes(p);
    b.drekkana = (male && dk === 0) || (neuter && dk === 1) || (!male && !neuter && dk === 2) ? 15 : 0;
    b.sthana = b.uchcha + b.saptavargaja + b.ojayugma + b.kendradi + b.drekkana;

    // 2. Dig Bala
    const strongPoint = { [SU]: 270, [MA]: 270, [JU]: 0, [ME]: 0, [MO]: 90, [VE]: 90, [SA]: 180 }[p];
    b.dig = (180 - angDist(x.lon, norm(am.asc + strongPoint))) / 3;

    // 3. Kala Bala
    const sunHA = norm180(swe.siderealTime(jd) * 15 + lon - swe.calculatePosition(jd, 0, FLG_MOSEPH | FLG_EQUATORIAL).longitude);
    const fromMidnight = 12 - Math.abs(sunHA) / 15; // 距當地真太陽午夜的小時數
    const dayStrength = fromMidnight * 5;
    b.nathonnatha = p === ME ? 60 : [SU, JU, VE].includes(p) ? dayStrength : 60 - dayStrength;
    const benVal = tithiAngle / 3;
    b.paksha = p === MO ? (waxing ? benVal : 60 - benVal) * 2 : isBenefic(p) ? benVal : 60 - benVal;
    const third = Math.min(2, Math.floor(frac * 3));
    const tribhagaLord = isDay ? [ME, SU, SA][third] : [MO, VE, MA][third];
    b.tribhaga = p === JU || p === tribhagaLord ? 60 : 0;
    b.vmdh = (varshaLord === p ? 15 : 0) + (masaLord === p ? 30 : 0) + (dinaLord === p ? 45 : 0) + (horaLord === p ? 60 : 0);
    const eps = 23.44;
    const d = x.dec;
    b.ayana = ([MO, SA].includes(p) ? (eps - d) : p === ME ? (eps + Math.abs(d)) : (eps + d)) / (2 * eps) * 60;
    b.yuddha = 0;
    b.kala = b.nathonnatha + b.paksha + b.tribhaga + b.vmdh + b.ayana + b.yuddha;

    // 4. Cheshta Bala
    if (p === SU) { b.cheshta = b.ayana; b.cheshtaState = '（太陽取 Ayana Bala）'; }
    else if (p === MO) { b.cheshta = b.paksha; b.cheshtaState = '（月亮取 Paksha Bala）'; }
    else {
      const r = x.speed / MEAN_MOTION[p];
      let st;
      if (x.speed < 0) st = ['Vakra 逆行', 60];
      else if (r < 0.05) st = ['Vikala 停滯', 15];
      else if (r < 0.5) st = ['Mandatara 極慢', 15];
      else if (r < 0.9) st = ['Manda 慢', 30];
      else if (r <= 1.1) st = ['Sama 平均', 7.5];
      else if (r < 2.5) st = ['Chara 快', 45];
      else st = ['Atichara 極快', 30];
      b.cheshtaState = st[0]; b.cheshta = st[1];
    }

    // 5. Naisargika
    b.naisargika = NAISARGIKA[p];
    shadbala[p] = b;
  });

  // 6. Drik Bala
  const drishti = (from, angle) => {
    const d = norm(angle);
    let v = 0;
    if (d >= 30 && d < 60) v = (d - 30) / 2;
    else if (d >= 60 && d < 90) v = d - 60 + 15;
    else if (d >= 90 && d < 120) v = (120 - d) / 2 + 30;
    else if (d >= 120 && d < 150) v = 150 - d;
    else if (d >= 150 && d < 180) v = (d - 150) * 2;
    else if (d >= 180 && d < 300) v = (300 - d) / 2;
    const full = { [MA]: [[90, 120], [210, 240]], [JU]: [[120, 150], [240, 270]], [SA]: [[60, 90], [270, 300]] }[from];
    if (full && full.some(([a, b]) => d >= a && d < b)) v = 60;
    return v;
  };
  SEVEN.forEach((p) => {
    let sum = 0;
    SEVEN.forEach((q) => { if (q !== p) sum += (isBenefic(q) ? 1 : -1) * drishti(q, P[p].lon - P[q].lon); });
    const b = shadbala[p];
    b.drik = sum / 4;
    b.total = b.sthana + b.dig + b.kala + b.cheshta + b.naisargika + b.drik;
    b.rupa = b.total / 60;
    b.required = REQUIRED_BALA[p];
    b.ratio = b.total / REQUIRED_BALA[p];
  });

  // ---------- 十二宮與 Bhava Bala ----------
  const nara = (s, dg) => [2, 5, 6, 10].includes(s) || (s === 8 && dg < 15);
  const jala = (s, dg) => [3, 11].includes(s) || (s === 9 && dg >= 15);
  const keeta = (s) => s === 7;
  const houses = [];
  for (let h = 1; h <= 12; h++) {
    const sign = (ascSign + h - 1) % 12;
    const lord = SIGN_LORD[sign];
    const mid = norm(am.asc + (h - 1) * 30); // 等宮制宮中點
    const dg = degIn(mid), s = signOf(mid);
    const strongHouse = nara(s, dg) ? 1 : jala(s, dg) ? 4 : keeta(s) ? 7 : 10;
    const dist = Math.min(Math.abs(h - strongHouse), 12 - Math.abs(h - strongHouse));
    const digB = 60 - dist * 10;
    let dr = 0;
    SEVEN.forEach((q) => { dr += (isBenefic(q) ? 1 : -1) * drishti(q, mid - P[q].lon); });
    const drB = dr / 4;
    const adhipati = shadbala[lord].total;
    houses.push({
      house: h, sign, startLon: sign * 30, midLon: mid, lord,
      planets: P.filter((x) => x.house === h).map((x) => x.id),
      bhavaBala: { adhipati, dig: digB, drishti: drB, total: adhipati + digB + drB },
    });
  }

  // ---------- 九分盤資訊 ----------
  const D9 = vs[9];
  const vargottama = P.filter((x) => D9.planets[x.id].sign === x.sign).map((x) => x.id);
  const ascVargottama = D9.ascSign === ascSign;
  const PUSHKARA_NAV = [[6, 8], [11, 1], [11, 1], [3, 5]]; // 依元素：火、土、風、水
  const inPushkara = (L) => PUSHKARA_NAV[signOf(L) % 4].includes(vargaSign(9, L));
  const pushkara = P.filter((x) => inPushkara(x.lon)).map((x) => x.id);
  const ascPushkara = inPushkara(am.asc);
  const n64 = [...P.map((x) => ({ id: x.id, lon: norm(x.lon + 210) })), { id: 'asc', lon: norm(am.asc + 210) }]
    .map((o) => ({ ...o, sign: vargaSign(9, o.lon), lord: SIGN_LORD[vargaSign(9, o.lon)] }));

  // ---------- 行星表 ----------
  const planetsTable = P.map((x) => {
    const dg = dignity(x.id, x.sign, x.deg);
    const lord = SIGN_LORD[x.sign];
    let relation = null;
    if (x.id <= 6) relation = lord === x.id ? 'own' : compoundRelation(x.id, lord, signs);
    return {
      ...x, nakshatra: nak(x.lon), ...dg, combust: combust(x.id), retro: x.speed < 0 && x.id <= 6,
      conj: P.filter((y) => y.id !== x.id && y.sign === x.sign).map((y) => y.id),
      relation, dispositor: lord, avastha: baladi(x.sign, x.deg),
      shadbala: x.id <= 6 ? shadbala[x.id].total : null,
    };
  });

  const dashas = mahadashas(P[MO].lon, jd);

  return {
    input, ayanamsaValue: ayan,
    asc: { lon: am.asc, sign: ascSign, deg: degIn(am.asc), tropLon: am.ascTrop, nakshatra: nak(am.asc), speedPerMin: ascSpeed },
    angles: [
      { key: 'ASC', name: 'ASC 上升', lon: am.asc },
      { key: 'DSC', name: 'DSC 下降', lon: norm(am.asc + 180) },
      { key: 'MC', name: 'MC 天頂', lon: am.mc },
      { key: 'IC', name: 'IC 天底', lon: norm(am.mc + 180) },
    ].map((a) => ({ ...a, sign: signOf(a.lon), deg: degIn(a.lon) })),
    lagnaLord: SIGN_LORD[ascSign],
    planets: planetsTable, houses, vargas, shadbala, dashas,
    navamsaInfo: { vargottama, ascVargottama, pushkara, ascPushkara, n64 },
    timeLords: { varsha: varshaLord, masa: masaLord, dina: dinaLord, hora: horaLord },
    sun: { sunrise: polar ? null : (vedicDayOffset ? null : sunriseToday), sunriseToday, sunsetToday, isDay, vedicWeekday, civilWeekday },
    moonPhase: { elong, waxing },
    gender,
  };
}
