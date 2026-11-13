// 用參考截圖（台中 1988-07-19 23:30、女）檢查奇門排盤
import { loadSwe } from './node-setup.mjs';
import { localToJd, sb } from '../js/qimen-calendar.js';
import { computeQimen, dayun, liuren, GRID, PALACE_NAME } from '../js/qimen-chart.js';

const swe = await loadSwe();
const jd = localToJd({ year: 1988, month: 7, day: 19, hour: 23, minute: 30 }, 480);
const ju = +process.argv[2] || 0;
const c = computeQimen(swe, { jd, offsetMin: 480, method: process.argv[3] || 'chaibu', juOverride: ju || null });
console.log('四柱', [c.pillars.year, c.pillars.month, c.pillars.day, c.pillars.hour].map(sb).join(' '));
console.log('節氣', c.term.name, '下個', c.term.next, '農曆', c.lunar.text);
console.log('局', c.yang ? '陽遁' : '陰遁', c.ju, '局（自動', c.juAuto, c.juTerm, ['上', '中', '下'][c.yuan], '元）');
console.log('旬首', c.xunHead, '(' + c.xunStem + ')', '值符', c.zhifuStar, '值使', c.zhishiDoor, '空亡', c.hourKong, '馬', c.horse);
for (const row of GRID) console.log(row.map((p) => p === 5 ? '   中    ' : `${c.palaces[p].god}${c.palaces[p].heaven.padEnd(2)}${c.palaces[p].star.padEnd(2)}${c.palaces[p].door}/${c.palaces[p].earth}`.padEnd(10)).join(' | '));
for (const p of [4, 9, 2, 3, 7, 8, 1, 6]) { const x = c.palaces[p]; console.log(PALACE_NAME[p], '對宮', x.oppositeHeaven, '擊刑', x.jixing, '入墓', x.rumu, '門迫', x.menpo, '空', x.kong, '馬', x.horse, '得地', x.starGround, '得時', x.starTime); }
console.log('命宮', PALACE_NAME[c.dayPalace], '時干宮', PALACE_NAME[c.hourPalace]);
console.log('六壬', JSON.stringify(liuren(c.pillars)));
console.log('大運', JSON.stringify(dayun(swe, c, false)));
