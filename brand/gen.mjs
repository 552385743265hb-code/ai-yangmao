import { writeFileSync } from 'node:fs';
const C = { sky1:'#cfe6f3', sky2:'#eaf5ee', h1:'#c3e2aa', h2:'#a0cf85', h3:'#7bb565', h4:'#5f9c4c', wool:'#ffffff', edge:'#c9d1c2', face:'#2c2a27', tag:'#f4b91c', tagInk:'#2a1f00', tagSoft:'#fbeec4', fence:'#a9845a', sun:'#f7c948', ink:'#1c2921', orange:'#eb6834' };
// 侧身的羊（与网页羊群同一画法）
function sheep(x, y, s, flip = 1) {
  const rx = 26, ry = 16, n = 12, br = 11;
  let b = ''; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; b += `<circle cx="${(Math.cos(a)*rx*.9).toFixed(1)}" cy="${(Math.sin(a)*ry*.85-3).toFixed(1)}" r="${(br*(i%3?1:1.12)).toFixed(1)}"/>`; }
  const core = `<ellipse cx="0" cy="-3" rx="${rx}" ry="${ry}"/>`;
  return `<g transform="translate(${x},${y}) scale(${flip*s},${s})">
    <ellipse cx="0" cy="25" rx="27" ry="4.5" fill="${C.h4}" opacity=".35"/>
    <circle cx="${rx+2}" cy="-6" r="4.5" fill="${C.wool}" stroke="${C.edge}" stroke-width="1.5"/>
    <g fill="${C.face}"><rect x="-17" y="9" width="4.6" height="15" rx="2.2"/><rect x="-8" y="11" width="4.6" height="14" rx="2.2"/><rect x="6" y="11" width="4.6" height="14" rx="2.2"/><rect x="14" y="9" width="4.6" height="15" rx="2.2"/></g>
    <g fill="${C.wool}" stroke="${C.edge}" stroke-width="2.4">${core}${b}</g><g fill="${C.wool}">${core}${b}</g>
    <g transform="translate(-29,-10) rotate(-12)">
      <circle cx="1" cy="-10" r="5.5" fill="${C.wool}" stroke="${C.edge}" stroke-width="1.4"/>
      <ellipse cx="0" cy="0" rx="8.8" ry="11.2" fill="${C.face}"/>
      <ellipse cx="-8.8" cy="-6" rx="6.2" ry="2.7" transform="rotate(-25 -8.8 -6)" fill="${C.face}"/>
      <ellipse cx="8.8" cy="-7" rx="6.2" ry="2.7" transform="rotate(25 8.8 -7)" fill="${C.face}"/>
      <g transform="translate(10.5,-5)"><rect x="-3.2" y="-1" width="7.4" height="8.5" rx="2" fill="${C.tag}" stroke="${C.face}" stroke-width=".8"/><circle cx=".5" cy="1.9" r="1.1" fill="${C.face}"/></g>
      <circle cx="-3" cy="-2" r="1.9" fill="#fff"/><circle cx="-3.4" cy="-2.3" r=".7" fill="${C.face}"/>
    </g></g>`;
}
function hill(W, y0, amp, ph, col) {
  let d = `M0,${W} L0,${y0}`; const st = 5;
  for (let i = 1; i <= st; i++) { const x = W*i/st, y = y0+Math.sin(i*1.3+ph)*amp, cx = W*(i-.5)/st, cy = y0+Math.sin((i-.5)*1.3+ph)*amp-amp*.7; d += ` Q${cx|0},${cy|0} ${x|0},${y|0}`; }
  return `<path d="${d} L${W},${W} Z" fill="${col}"/>`;
}
const W = 1024;
// ---------- 群头像：牧场里的羊群 ----------
let fence = ''; for (let x = 40; x < W; x += 118) fence += `<path d="M${x},${492} L${x+2},${420}"/>`;
const rays = [...Array(12)].map((_, i) => { const a = i/12*Math.PI*2, cx = 742, cy = 250; return `<path d="M${(cx+Math.cos(a)*92).toFixed(0)},${(cy+Math.sin(a)*92).toFixed(0)} L${(cx+Math.cos(a)*120).toFixed(0)},${(cy+Math.sin(a)*120).toFixed(0)}"/>`; }).join('');
const cloud = (x, y, s) => `<g transform="translate(${x},${y}) scale(${s})" fill="#fff" opacity=".95"><ellipse cx="0" cy="0" rx="62" ry="28"/><circle cx="-24" cy="-18" r="26"/><circle cx="20" cy="-26" r="33"/><circle cx="52" cy="-6" r="21"/></g>`;
let tufts = ''; [[170,760],[300,860],[820,800],[700,905],[520,930],[120,900]].forEach(([x,y]) => tufts += `<path d="M${x},${y} l7,-20 l7,20 l6,-14 l6,14"/>`);
let flowers = ''; [[230,820],[760,870],[880,760],[420,900]].forEach(([x,y]) => flowers += `<g transform="translate(${x},${y})"><circle r="9" fill="#fff"/><circle r="4" fill="${C.tag}"/></g>`);
const group = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W}" width="${W}" height="${W}">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.sky1}"/><stop offset=".62" stop-color="${C.sky2}"/></linearGradient></defs>
  <rect width="${W}" height="${W}" fill="url(#sky)"/>
  <g stroke="${C.sun}" stroke-width="14" stroke-linecap="round">${rays}</g><circle cx="742" cy="250" r="72" fill="${C.sun}"/>
  ${cloud(290, 230, 1.25)}${cloud(660, 330, .8)}
  ${hill(W, 470, 26, .3, C.h1)}
  <g fill="none" stroke="${C.fence}" stroke-width="10" stroke-linecap="round" opacity=".8">${fence}<path d="M0,445 L1024,440"/><path d="M0,475 L1024,472"/></g>
  ${hill(W, 560, 30, 2.1, C.h2)}${hill(W, 700, 22, 4.2, C.h3)}
  <g fill="none" stroke="${C.h4}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${tufts}</g>${flowers}
  ${sheep(700, 640, 4.2, -1)}
  ${sheep(430, 700, 7.2, 1)}
</svg>`;
// ---------- 机器人头像：举着大喇叭的羊 ----------
let woolHead = ''; [...Array(9)].forEach((_, i) => { const a = -Math.PI + i/8*Math.PI; woolHead += `<circle cx="${(512+Math.cos(a)*170).toFixed(0)}" cy="${(420+Math.sin(a)*120).toFixed(0)}" r="78"/>`; });
let woolBody = ''; [...Array(9)].forEach((_, i) => { const a = Math.PI + i/8*Math.PI; woolBody += `<circle cx="${(512+Math.cos(a)*230).toFixed(0)}" cy="${(1010+Math.sin(a)*190).toFixed(0)}" r="92"/>`; }); woolBody += `<ellipse cx="512" cy="1000" rx="250" ry="170"/>`;
const waves = [0,1,2].map(i => `<path d="M${838+i*46},${360-i*40} Q${880+i*62},${520} ${838+i*46},${680+i*40}" />`).join('');
const bot = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W}" width="${W}" height="${W}">
  <rect width="${W}" height="${W}" fill="${C.tagSoft}"/>
  <rect x="0" y="880" width="${W}" height="144" fill="${C.h2}"/><path d="M0,930 Q256,900 512,930 T1024,925 L1024,1024 L0,1024 Z" fill="${C.h3}"/>
  <g fill="${C.wool}" stroke="${C.edge}" stroke-width="10">${woolBody}</g><g fill="${C.wool}">${woolBody}</g>
  <g fill="${C.wool}" stroke="${C.edge}" stroke-width="10">${woolHead}</g><g fill="${C.wool}">${woolHead}</g>
  <ellipse cx="300" cy="455" rx="120" ry="46" transform="rotate(-22 300 455)" fill="${C.face}"/>
  <ellipse cx="724" cy="455" rx="120" ry="46" transform="rotate(22 724 455)" fill="${C.face}"/>
  <g transform="translate(262,470) rotate(-22)"><rect x="-38" y="-20" width="84" height="98" rx="22" fill="${C.tag}" stroke="${C.face}" stroke-width="8"/><circle cx="4" cy="12" r="12" fill="${C.face}"/></g>
  <ellipse cx="512" cy="560" rx="172" ry="212" fill="${C.face}"/>
  <circle cx="450" cy="520" r="26" fill="#fff"/><circle cx="574" cy="520" r="26" fill="#fff"/>
  <circle cx="456" cy="526" r="11" fill="${C.face}"/><circle cx="568" cy="526" r="11" fill="${C.face}"/>
  <ellipse cx="512" cy="660" rx="58" ry="30" fill="#3d3a36"/>
  <g transform="translate(560,640) rotate(-8)">
    <path d="M0,-36 L230,-150 L230,150 L0,36 Z" fill="${C.tag}" stroke="${C.tagInk}" stroke-width="12" stroke-linejoin="round"/>
    <rect x="-58" y="-40" width="70" height="80" rx="18" fill="${C.orange}" stroke="${C.tagInk}" stroke-width="12"/>
    <ellipse cx="230" cy="0" rx="34" ry="150" fill="${C.orange}" stroke="${C.tagInk}" stroke-width="12"/>
    <rect x="30" y="30" width="44" height="110" rx="18" fill="${C.orange}" stroke="${C.tagInk}" stroke-width="12"/>
  </g>
  <g fill="none" stroke="${C.orange}" stroke-width="24" stroke-linecap="round" opacity=".9">${waves}</g>
</svg>`;
const page = svg => `<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style></head><body>${svg}</body></html>`;
writeFileSync('group.svg', group); writeFileSync('bot.svg', bot);
writeFileSync('group.html', page(group)); writeFileSync('bot.html', page(bot));
