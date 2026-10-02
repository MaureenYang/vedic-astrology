// 命盤繪圖（SVG）：南印度式（星座固定）與北印度式（宮位固定）
import { SIGNS_SHORT, PLANETS } from './constants.js?v=202610020939';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// items: [{label, sub, retro, asc}] 依星座分組
function groupBySign(varga, showDeg) {
  const g = Array.from({ length: 12 }, () => []);
  varga.planets.forEach((p) => g[p.sign].push({ id: p.id, text: PLANETS[p.id] + (p.retro ? 'ᴿ' : ''), deg: showDeg ? Math.floor(p.deg) + '°' : '' }));
  return g;
}

function planetLines(items, x, y, w, maxPerRow, fontSize, lineH) {
  const rows = [];
  for (let i = 0; i < items.length; i += maxPerRow) rows.push(items.slice(i, i + maxPerRow));
  const startY = y - ((rows.length - 1) * lineH) / 2;
  return rows.map((row, r) => {
    const txt = row.map((it) => `<tspan class="pl pl-${it.id}">${esc(it.text)}</tspan>${it.deg ? `<tspan class="pd" dx="1">${it.deg}</tspan>` : ''}`).join('<tspan dx="4"> </tspan>');
    return `<text x="${x}" y="${startY + r * lineH}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}">${txt}</text>`;
  }).join('');
}

const SOUTH_POS = [[0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [3, 0], [2, 0], [1, 0], [0, 0]]; // [row, col] 依星座

export function southChart(varga, { size = 360, title = '', showDeg = false } = {}) {
  const c = size / 4;
  const groups = groupBySign(varga, showDeg);
  let cells = '';
  for (let s = 0; s < 12; s++) {
    const [r, col] = SOUTH_POS[s];
    const x = col * c, y = r * c;
    const isAsc = varga.ascSign === s;
    cells += `<rect x="${x}" y="${y}" width="${c}" height="${c}" class="cell${isAsc ? ' asc' : ''}"/>`;
    cells += `<text x="${x + 5}" y="${y + 14}" class="signlbl">${SIGNS_SHORT[s]}</text>`;
    if (isAsc) cells += `<line x1="${x}" y1="${y + c * 0.28}" x2="${x + c * 0.28}" y2="${y}" class="ascline"/><text x="${x + c - 5}" y="${y + 14}" text-anchor="end" class="asclbl">上升</text>`;
    cells += planetLines(groups[s], x + c / 2, y + c / 2 + 6, c, 3, size / 22, size / 17);
  }
  const center = `<text x="${size / 2}" y="${size / 2 - 8}" text-anchor="middle" class="ctitle">${esc(title)}</text><text x="${size / 2}" y="${size / 2 + 14}" text-anchor="middle" class="csub">南印度式</text>`;
  return `<svg viewBox="0 0 ${size} ${size}" class="chart" role="img" aria-label="${esc(title)}"><rect x="0" y="0" width="${size}" height="${size}" class="frame"/>${cells}<rect x="${c}" y="${c}" width="${2 * c}" height="${2 * c}" class="center"/>${center}</svg>`;
}

export function northChart(varga, { size = 360, title = '', showDeg = false } = {}) {
  const W = size, h = W / 2, q = W / 4;
  const A = [0, 0], B = [W, 0], C = [W, W], D = [0, W], T = [h, 0], R = [W, h], Bm = [h, W], L = [0, h], O = [h, h];
  const P1 = [q, q], P2 = [3 * q, q], P3 = [3 * q, 3 * q], P4 = [q, 3 * q];
  const polys = [[T, P2, O, P1], [A, T, P1], [A, P1, L], [L, P1, O, P4], [L, P4, D], [D, P4, Bm], [Bm, P4, O, P3], [Bm, P3, C], [C, P3, R], [R, P3, O, P2], [R, P2, B], [B, P2, T]];
  const groups = groupBySign(varga, showDeg);
  let out = '';
  polys.forEach((poly, i) => {
    const sign = (varga.ascSign + i) % 12;
    const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length, cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
    const big = poly.length === 4;
    out += `<polygon points="${poly.map((p) => p.join(',')).join(' ')}" class="cell${i === 0 ? ' asc' : ''}"/>`;
    // 星座編號放在靠中心的角落
    const near = poly.reduce((best, p) => (Math.hypot(p[0] - h, p[1] - h) < Math.hypot(best[0] - h, best[1] - h) ? p : best));
    const t = big ? 0.62 : 0.55;
    const nx = cx + (near[0] - cx) * t, ny = cy + (near[1] - cy) * t;
    out += `<text x="${nx}" y="${ny}" text-anchor="middle" dominant-baseline="middle" class="signnum">${sign + 1}</text>`;
    out += planetLines(groups[sign], cx, cy + (big ? -4 : 0), 0, big ? 3 : 2, size / (big ? 22 : 25), size / 18);
  });
  return `<svg viewBox="0 0 ${W} ${W}" class="chart north" role="img" aria-label="${esc(title)}"><rect x="0" y="0" width="${W}" height="${W}" class="frame"/>${out}<text x="${h}" y="${W - 6}" text-anchor="middle" class="csub">${esc(title)}・北印度式</text></svg>`;
}

export function drawChart(style, varga, opts) {
  return style === 'north' ? northChart(varga, opts) : southChart(varga, opts);
}
