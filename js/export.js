// 把命盤整理成 Excel 工作表（方便交給 Claude 或其他工具解讀）
import { children, currentPath, LEVEL_NAMES } from './dasha.js?v=202610020939';
import { fmtLocal, fmtOffset, msToJd } from './time.js?v=202610020939';
import { SIGNS, PLANETS, PLANETS_FULL, PLANETS_EN, NAKSHATRAS, NAK_SPAN, AYANAMSAS, RELATION_LABEL, DASHA_ORDER, fmtDeg } from './constants.js?v=202610020939';
import { makeXlsx } from './xlsx.js?v=202610020939';

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const r4 = (x) => (x == null ? null : Math.round(x * 10000) / 10000);
const pName = (id) => `${PLANETS_FULL[id]} ${PLANETS_EN[id]}`;
const yn = (b) => (b ? '是' : '');

export function buildSheets(c) {
  const m = c.meta, off = m.offsetMin;
  const b = m.birth;
  const pad = (n) => String(n).padStart(2, '0');
  const birthStr = `${b.year}-${pad(b.month)}-${pad(b.day)} ${pad(b.hour)}:${pad(b.minute)}${b.second ? ':' + pad(b.second) : ''}`;
  const ayanName = AYANAMSAS.find((a) => a.id === m.ayanamsa).name;
  const moon = c.planets[1], sun = c.planets[0], lagnaLord = c.planets[c.lagnaLord];
  const tithi = Math.floor(c.moonPhase.elong / 12) + 1;
  const now = msToJd(Date.now());
  const vs = Object.fromEntries(c.vargas.map((v) => [v.n, v]));
  const sheets = [];

  // 1. 基本資料
  sheets.push({
    name: '基本資料', widths: [26, 60],
    rows: [
      ['項目', '內容'],
      ['出生日期時間（當地）', `${birthStr}（${fmtOffset(off)}）`],
      ['出生日期時間（UTC）', fmtLocal(c.input.jd, 0)],
      ['性別', m.gender === 'F' ? '女' : m.gender === 'M' ? '男' : ''],
      ['出生地', m.placeName],
      ['緯度', r4(m.lat)], ['經度', r4(m.lon)], ['時區', typeof m.tz === 'string' ? m.tz : fmtOffset(off)],
      ['Ayanamsa', `${ayanName}（${c.ayanamsaValue.toFixed(4)}°）`],
      ['Dasha 一年天數', c.dashaYearDays],
      ['黃道', '恆星黃道（Sidereal）'], ['宮位制', '整宮制（Whole Sign）'], ['羅睺／計都', '平均交點（Mean Node）'],
      ['上升星座（Lagna）', `${SIGNS[c.asc.sign]} ${fmtDeg(c.asc.lon)}`],
      ['上升星宿', `${c.asc.nakshatra.zh}宿 ${c.asc.nakshatra.name} 第${c.asc.nakshatra.pada}足（宿主 ${PLANETS[c.asc.nakshatra.lord]}）`],
      ['命主星', `${PLANETS_FULL[c.lagnaLord]}（落第 ${lagnaLord.house} 宮 ${SIGNS[lagnaLord.sign]}）`],
      ['月亮星座', `${SIGNS[moon.sign]} ${fmtDeg(moon.lon)}（第 ${moon.house} 宮）`],
      ['月亮星宿', `${moon.nakshatra.zh}宿 ${moon.nakshatra.name} 第${moon.nakshatra.pada}足（宿主 ${PLANETS[moon.nakshatra.lord]}）`],
      ['太陽星座', `${SIGNS[sun.sign]} ${fmtDeg(sun.lon)}（第 ${sun.house} 宮）`],
      ['月相', `${c.moonPhase.waxing ? '上弦 Shukla' : '下弦 Krishna'}，第 ${((tithi - 1) % 15) + 1} 個 Tithi（日月距 ${c.moonPhase.elong.toFixed(1)}°）`],
      ['日出', c.sun.sunriseToday ? fmtLocal(c.sun.sunriseToday, off) : ''],
      ['日落', c.sun.sunsetToday ? fmtLocal(c.sun.sunsetToday, off) : ''],
      ['晝／夜出生', c.sun.isDay ? '白天' : '夜間'],
      ['吠陀日（以日出為界）', `${WEEKDAYS[c.sun.vedicWeekday]}（日主 ${PLANETS[c.timeLords.dina]}）`],
      ['目前運程（匯出時）', currentPath(c.dashas, now, 5).map((p, i) => `${LEVEL_NAMES[i]} ${PLANETS[p.lord]}`).join(' → ')],
      ['匯出時間', fmtLocal(now, off)],
    ],
  });

  // 2. 十二宮
  sheets.push({
    name: '十二宮', widths: [6, 10, 10, 8, 10, 18, 12, 12, 12, 12],
    rows: [['宮位', '星座', '起點黃經', '宮主星', '宮主落宮', '宮內行星', 'Bhava Bala 總分', '宮主力', '方位力', '相位力'],
      ...c.houses.map((h) => [h.house, SIGNS[h.sign], h.startLon, PLANETS[h.lord], c.planets[h.lord].house, h.planets.map((p) => PLANETS[p]).join(' '),
        r1(h.bhavaBala.total), r1(h.bhavaBala.adhipati), r1(h.bhavaBala.dig), r1(h.bhavaBala.drishti)])],
  });

  // 3. 行星
  sheets.push({
    name: '行星', widths: [16, 11, 11, 9, 12, 6, 22, 6, 7, 7, 5, 6, 6, 6, 10, 14, 10, 14, 10, 10, 10],
    rows: [['行星', '恆星黃經', '回歸黃經', '星座', '星座內度數', '宮位', '星宿', '足', '宿主', '落陷', '廟旺', 'MT', '本宮', '燃燒', '逆行', '同宮', '宮主星', '與宮主關係', 'Baladi 狀態', 'Shadbala', '速率（°/日）'],
      ...c.planets.map((p) => [pName(p.id), r4(p.lon), r4(p.tropLon), SIGNS[p.sign], fmtDeg(p.lon), p.house,
        `${p.nakshatra.zh}宿 ${p.nakshatra.name}`, p.nakshatra.pada, PLANETS[p.nakshatra.lord],
        yn(p.debil), yn(p.exalt), yn(p.mt), yn(p.own), yn(p.combust), yn(p.retro),
        p.conj.map((q) => PLANETS[q]).join(' '), PLANETS[p.dispositor],
        p.relation === 'own' ? '本宮' : p.relation == null ? '' : RELATION_LABEL[p.relation],
        `${p.avastha.zh} ${p.avastha.en}`, r1(p.shadbala), r4(p.speed)])],
  });

  // 4. 四軸點
  sheets.push({
    name: '四軸點', widths: [12, 10, 12, 12],
    rows: [['名稱', '星座', '宮度', '恆星黃經'], ...c.angles.map((a) => [a.name, SIGNS[a.sign], fmtDeg(a.lon), r4(a.lon)])],
  });

  // 5. Shadbala
  const SB = [
    ['Uchcha 廟旺力', 'uchcha'], ['Saptavargaja 七分盤力', 'saptavargaja'], ['Ojayugma 奇偶力', 'ojayugma'], ['Kendradi 角宮力', 'kendradi'], ['Drekkana 三分力', 'drekkana'],
    ['Sthana 位置力（小計）', 'sthana'], ['Dig 方位力', 'dig'],
    ['Nathonnatha 晝夜力', 'nathonnatha'], ['Paksha 月相力', 'paksha'], ['Tribhaga 三分時力', 'tribhaga'], ['年月日時主力', 'vmdh'], ['Ayana 赤緯力', 'ayana'], ['Yuddha 星戰', 'yuddha'],
    ['Kala 時間力（小計）', 'kala'], ['Cheshta 運動力', 'cheshta'], ['Naisargika 自然力', 'naisargika'], ['Drik 相位力', 'drik'],
    ['總計（Virupa）', 'total'], ['總計（Rupa）', 'rupa'], ['最低需求（Virupa）', 'required'], ['強度比', 'ratio'],
  ];
  const seven = [0, 1, 2, 3, 4, 5, 6];
  sheets.push({
    name: 'Shadbala', widths: [24, 10, 10, 10, 10, 10, 10, 10],
    rows: [['項目', ...seven.map((p) => PLANETS_FULL[p])],
      ...SB.map(([label, k]) => [label, ...seven.map((p) => (k === 'ratio' || k === 'rupa' ? r2(c.shadbala[p][k]) : r1(c.shadbala[p][k])))]),
      ['運動狀態', ...seven.map((p) => c.shadbala[p].cheshtaState)]],
  });

  // 6. 二十七宿
  const occ = Array.from({ length: 27 }, () => []);
  c.planets.forEach((p) => occ[p.nakshatra.index].push(PLANETS[p.id]));
  occ[c.asc.nakshatra.index].push('上升');
  sheets.push({
    name: '二十七宿', widths: [5, 18, 8, 10, 10, 8, 14],
    rows: [['#', '梵文名', '中文名', '起點黃經', '終點黃經', '宿主', '所在星曜'],
      ...NAKSHATRAS.map((n, i) => [i + 1, n[0], n[1], r2(i * NAK_SPAN), r2((i + 1) * NAK_SPAN), PLANETS[DASHA_ORDER[i % 9]], occ[i].join(' ')])],
  });

  // 7. 九分盤資訊
  const ni = c.navamsaInfo;
  const list = (ids, asc) => [...ids.map((i) => PLANETS_FULL[i]), asc ? '上升' : ''].filter(Boolean).join('、') || '無';
  sheets.push({
    name: '九分盤資訊', widths: [26, 12, 10, 12],
    headerRows: [0, 3, 6, 18],
    rows: [
      ['九分盤＋本命盤同星座（Vargottama）'], [list(ni.vargottama, ni.ascVargottama)], [],
      ['九分盤滋養之位（Pushkara Navamsa）'], [list(ni.pushkara, ni.ascPushkara)], [],
      ['九分盤凶險點（64th Navamsa）', '星座', '宮主星', '恆星黃經'],
      ...ni.n64.map((o) => [o.id === 'asc' ? '上升' : PLANETS_FULL[o.id], SIGNS[o.sign], PLANETS[o.lord], r2(o.lon)]),
      [],
      ['時間主宰星', '年 Varsha', '月 Masa', '日 Dina', '時 Hora'],
      ['', PLANETS_FULL[c.timeLords.varsha], PLANETS_FULL[c.timeLords.masa], PLANETS_FULL[c.timeLords.dina], PLANETS_FULL[c.timeLords.hora]],
    ],
  });

  // 8. 分盤（長表）
  const status = (p) => [p.exalt && '廟旺', p.debil && '落陷', p.own && '本宮', p.mt && 'MT'].filter(Boolean).join(' ');
  const vrows = [['分盤', '分盤名稱', '星曜', '狀態', '宮位', '星座', '分盤度數']];
  c.vargas.forEach((v) => {
    vrows.push([v.code, `${v.name}（${v.sanskrit}）${v.extra ? '＊' : ''}`, '上升', '', 1, SIGNS[v.ascSign], r2(v.ascDeg)]);
    v.planets.forEach((p) => vrows.push([v.code, `${v.name}（${v.sanskrit}）${v.extra ? '＊' : ''}`, PLANETS_FULL[p.id], status(p), p.house, SIGNS[p.sign], r2(p.deg)]));
  });
  sheets.push({ name: '分盤(D1-D60)', widths: [6, 26, 8, 12, 6, 10, 10], rows: vrows });

  // 9. 分盤總表（一張表看全部）
  sheets.push({
    name: '分盤總表', widths: [22, ...Array(10).fill(12)],
    rows: [['分盤', '上升', ...c.planets.map((p) => PLANETS_FULL[p.id]), '時間誤差容忍（分鐘，早／晚）'],
      ...c.vargas.map((v) => [`${v.code} ${v.name}`, SIGNS[v.ascSign], ...v.planets.map((p) => `${SIGNS[p.sign]} ${p.house}宮`), `${v.tolerance.before.toFixed(1)} / ${v.tolerance.after.toFixed(1)}`])],
  });

  // 10–13. 運程
  const dRow = (chain, p) => [...chain.map((x) => PLANETS[x]), PLANETS[p.lord], fmtLocal(p.start, off), fmtLocal(p.end, off), chain.length < 2 ? r2((p.end - p.start) / c.dashaYearDays) : r2(p.end - p.start), now >= p.start && now < p.end ? '← 目前' : ''];
  const levelSheet = (name, depth, filter) => {
    const head = [...LEVEL_NAMES.slice(0, depth + 1), '開始（當地時間）', '結束（當地時間）', depth < 2 ? '長度（年）' : '長度（日）', ''];
    const rows = [head];
    const walk = (list, lv, chain) => list.forEach((p) => {
      if (lv === depth) rows.push(dRow(chain, p));
      else if (!filter || filter(lv, p)) walk(children(p), lv + 1, [...chain, p.lord]);
    });
    walk(c.dashas, 0, []);
    return { name, widths: [...Array(depth + 1).fill(7), 18, 18, 10, 8], rows };
  };
  sheets.push(levelSheet('大運中運', 1));
  sheets.push(levelSheet('小運', 2));
  sheets.push(levelSheet('小小運', 3));
  const curMaha = currentPath(c.dashas, now, 1)[0];
  const prana = levelSheet('Prana(目前大運)', 4, (lv, p) => lv > 0 || p === curMaha);
  if (!curMaha) prana.rows.push(['（匯出時不在此 120 年週期內）']);
  sheets.push(prana);

  // 14. 說明
  sheets.push({
    name: '說明', widths: [110],
    rows: [['欄位與算法說明（可一併提供給 AI 解讀）'],
      ['本檔由「吠陀占星排盤」網頁產生，天文計算使用 Swiss Ephemeris（Moshier 星曆）。'],
      [`黃道：恆星黃道，Ayanamsa = ${ayanName}。宮位：整宮制。羅睺／計都：平均交點。`],
      ['分盤：依 Parashara（BPHS）。D2 為 Parashara Hora；D30 偶數星座落金牛、處女、雙魚、摩羯、天蠍。分盤度數＝黃經×N 取 30 餘數。'],
      ['D5、D6、D8、D11 不在 Parashara 16 分盤內，採常見算法：D5 每 6°，奇數星座依序落牡羊、水瓶、射手、雙子、天秤，偶數星座依序落金牛、處女、雙魚、摩羯、天蠍；D6 每 5°，奇數星座從牡羊、偶數從天秤起算；D8 每 3.75°，本位從牡羊、固定從射手、變動從獅子起算；D11 每 30/11°，從牡羊連續循環計數。'],
      ['與宮主關係：五重關係（自然關係＋臨時關係），指行星與其所在星座宮主星的關係。'],
      ['Baladi 狀態：奇數星座 0–6° 嬰兒、6–12° 少年、12–18° 青年、18–24° 老年、24–30° 瀕死；偶數星座反向。'],
      ['Shadbala 單位為 Virupa（60 Virupa = 1 Rupa）；強度比＝總分÷最低需求，≥1 為足夠。'],
      ['Bhava Bala：宮主星 Shadbala＋宮位方位力＋行星對宮中點的相位力。'],
      [`Vimshottari：以月亮星宿起運，一年 ${c.dashaYearDays} 天；日期為出生地當地時間。Prana 只列出匯出時所在大運。`],
      ['分盤總表的時間誤差容忍：出生時間提早／延後幾分鐘，該分盤上升星座會改變；數字越小越需要精確出生時間。'],
    ],
    headerRows: [0],
  });
  return sheets;
}

export async function exportXlsx(c) {
  const blob = await makeXlsx(buildSheets(c));
  const b = c.meta.birth;
  const pad = (n) => String(n).padStart(2, '0');
  const name = `vedic-chart_${b.year}-${pad(b.month)}-${pad(b.day)}_${pad(b.hour)}${pad(b.minute)}.xlsx`;
  return { blob, name };
}
