// 纳米Work企业版 产品片 · 共用：光斑底、字体、文字、玻璃卡、图标（发布会语法 t2，见 skill references/动画语法/t2_keynote_ui.md）
// 光斑底只依赖全片时间 t → 各镜头之间背景无缝；每镜内容层另有一个极慢的线性推近。
(() => {
const { clamp, lerp } = U;
const W = 1920, H = 1080;
const BASE = '#050508';
const BLOBS = [                                                   // 紫 / 蓝 / 青 + 一点暖色；周期避开 5s
  { x: 430, y: 300, r: 760, col: [150, 90, 238], a: 0.72, ax: 220, ay: 120, period: 11, ph: 0 },
  { x: 1520, y: 260, r: 700, col: [56, 104, 255], a: 0.7, ax: 200, ay: 160, period: 13, ph: 2.1 },
  { x: 1320, y: 930, r: 560, col: [120, 214, 255], a: 0.5, ax: 260, ay: 100, period: 9.5, ph: 4 },
  { x: 520, y: 960, r: 520, col: [255, 96, 84], a: 0.4, ax: 180, ay: 90, period: 12, ph: 1.3 },
];
const bg = (c, t, { dim = 0.38 } = {}) => {
  UI.mesh(c, t, { base: BASE, blobs: BLOBS, blur: 90, scale: 0.25, grain: 0.035, key: 'nwmesh' });
  const g = c.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 1000);
  g.addColorStop(0, `rgba(0,0,0,${dim})`); g.addColorStop(1, 'rgba(0,0,0,0.1)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
};
// 背景画进离屏 → 贴到主画布，同时返回毛玻璃取样用的模糊副本
const stage = (c, t, o) => {
  const bgc = UI.scratch('nwbg', W, H), g = bgc.getContext('2d');
  bg(g, t, o); c.drawImage(bgc, 0, 0);
  return UI.backdrop(bgc, { blur: 40, key: 'nwbd' });
};
// 内容层慢推：整镜线性 1 → 1.035（发布会慢推不减速）
const push = (c, lt, dur, amt = 0.035) => { const s = 1 + amt * clamp(lt / dur); c.translate(W / 2, H / 2); c.scale(s, s); c.translate(-W / 2, -H / 2); };

// 字体：中文用思源黑 GB2312 子集（PuHui-* 是 family 名），拉丁/数字用 Inter，混排时 Inter 在前、缺字回退中文
const ZH = { m: '"PuHui-Medium"', b: '"PuHui-Bold"', h: '"PuHui-Heavy"', k: '"PuHui-Black"' };
const MIX = { m: '"Inter", "PuHui-Medium"', b: '"Inter", "PuHui-Bold"', h: '"Inter", "PuHui-Heavy"' };
const COL = { hi: '#f5f5f7', mid: 'rgba(235,235,245,0.68)', lo: 'rgba(235,235,245,0.5)', eyebrow: '#a7a7b4', blue: '#5b8cff', cyan: '#8fdcff', violet: '#c3b2ff' };

// 一行字：从模糊浮出（p 0..1），out 0..1 退场（更快、带一点上移和模糊）
const text = (c, s, x, y, p, { size = 64, fam = ZH.b, weight = '', color = COL.hi, align = 'center', track = -0.02, blur = 16, dy = 26, out = 0 } = {}) => {
  if (p <= 0 || out >= 1) return;
  c.save(); c.globalAlpha *= 1 - out;
  c.font = `${weight ? weight + ' ' : ''}${size}px ${fam}`; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'alphabetic';
  c.letterSpacing = (size * track).toFixed(2) + 'px';
  if (out > 0) { c.filter = `blur(${(out * 10).toFixed(1)}px)`; y -= out * 18; }
  TY.blurIn(c, s, x, y, p, { blur, dy });
  c.restore();
};
// 渐变大字（白 → 淡紫 → 淡青）＋光扫过：先画进离屏，再模糊浮出贴回
const gradText = (c, s, x, y, p, { size = 200, fam = MIX.b, weight = '600', key = 'gt', sheen = 0, track = -0.025 } = {}) => {
  if (p <= 0) return;
  const tw = W, th = Math.round(size * 1.9), base = Math.round(size * 1.35);
  const tx = UI.scratch('nwgt' + key, tw, th), g = tx.getContext('2d'); g.reset();
  g.font = `${weight} ${size}px ${fam}`; g.letterSpacing = (size * track).toFixed(2) + 'px'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  const w = g.measureText(s).width, gr = g.createLinearGradient(W / 2 - w / 2, 0, W / 2 + w / 2, 0);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#ddd2ff'); gr.addColorStop(1, '#a8dcff');
  g.fillStyle = gr; g.fillText(s, W / 2, base);
  if (sheen > 0 && sheen < 1) UI.sheen(g, null, sheen, { x0: W / 2 - w / 2, x1: W / 2 + w / 2, width: size * 0.65, angle: -0.38, alpha: 0.85, comp: 'source-atop' });
  c.save(); c.globalAlpha *= clamp(p * 1.5); const b = (1 - p) * 26; if (b > 0.3) c.filter = `blur(${b.toFixed(1)}px)`;
  c.drawImage(tx, x - W / 2, y - base + (1 - p) * 40); c.restore();
  return w;
};

// 毛玻璃卡：content(g, w, h) 在卡片坐标里画内容；可 3D 转（ry/rx）、缩放 sc、透明 a、光扫 sheen
const card = (c, bd, { key, cx, cy, w, h, r = 36, ry = 0, rx = 0, sc = 1, a = 1, sheen = 0, tint = 0.075, content, shadow = true, glow = 0 }) => {
  if (a <= 0) return;
  const pad = 60, tex = UI.scratch('nwcard' + key, Math.round(w + pad * 2), Math.round(h + pad * 2)), g = tex.getContext('2d'); g.reset();
  const cw = w * sc, ch = h * sc;
  UI.glass(g, { x: pad, y: pad, w, h, r, bd, sample: { x: cx - cw / 2, y: cy - ch / 2, w: cw, h: ch }, tint, stroke: 0.2, light: 0.14, shadow: false });
  if (glow > 0) {                                                  // 被点亮：描边换成蓝青渐变
    g.save(); g.globalAlpha = glow; const sg = g.createLinearGradient(pad, pad, pad + w, pad + h);
    sg.addColorStop(0, 'rgba(143,220,255,0.95)'); sg.addColorStop(1, 'rgba(160,130,255,0.75)');
    g.strokeStyle = sg; g.lineWidth = 3; g.beginPath(); g.roundRect(pad + 1.5, pad + 1.5, w - 3, h - 3, r); g.stroke();
    g.fillStyle = 'rgba(120,170,255,0.08)'; g.fill(); g.restore();
  }
  if (content) { g.save(); g.translate(pad, pad); content(g, w, h); g.restore(); }
  if (sheen > 0 && sheen < 1) UI.sheen(g, UI.rrPath(pad, pad, w, h, r), sheen, { x0: pad, x1: pad + w, width: Math.max(90, w * 0.22), angle: -0.35, alpha: 0.22 });
  c.save(); c.globalAlpha *= a;
  if (shadow) UI.shadow(c, cx - cw / 2 + 10, cy - ch / 2 + 20, cw - 20, ch - 20, r * sc, { blur: 70, oy: 34, alpha: 0.5 });
  UI.persp(c, tex, { cx, cy, w: (w + pad * 2) * sc, h: (h + pad * 2) * sc, ry, rx, persp: 1800, strip: 3, shade: 0.4 });
  c.restore();
};
// 卡片入场状态：从下方 dy 处、绕 Y 轴转 rot、0.9 倍 → 弹簧落位；落定后轻微漂浮
const enter = (lt, t0, t, { dy = 150, rot = 0.5, side = 0, dur = 0.75, bounce = 0.15, float = 6, seed = 0 } = {}) => {
  const sp = MO.spring(lt - t0, { duration: dur, bounce });
  return {
    sp, a: clamp((lt - t0) / 0.25),
    dy: (1 - sp) * dy + MO.float(t, float, 3.4 + seed * 0.45, seed * 2),
    ry: (1 - sp) * (side || 0.001) * -rot + 0.05 * Math.sin(t * 0.9 + seed),
    sc: 0.9 + 0.1 * sp,
  };
};
// 胶囊标签
const pill = (c, s, x, y, p, { size = 40, fam = ZH.b, padX = 34, h = 84, fill = 'rgba(255,255,255,0.1)', stroke = 'rgba(255,255,255,0.22)', color = COL.hi, out = 0, scale = 1 } = {}) => {
  if (p <= 0) return 0;
  c.save(); c.font = `${size}px ${fam}`; const w = c.measureText(s).width + padX * 2;
  const e = MO.spring(p * 0.6, { duration: 0.5, bounce: 0.15 });
  c.globalAlpha *= clamp(p * 3) * (1 - out);
  c.translate(x, y); const k = lerp(0.85, 1, e) * scale; c.scale(k, k); c.translate(0, (1 - e) * 24);
  c.fillStyle = fill; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, h / 2); c.fill();
  c.strokeStyle = stroke; c.lineWidth = 1.5; c.stroke();
  c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, 0, 3);
  c.restore(); return w;
};

// 线性图标（圆头等线宽，SF Symbols 气质）。单位：s = 图标边长，内部坐标 −0.5..0.5
const icon = (c, kind, x, y, s, col = '#f2f2f7', t = 0, lw = 0.07) => {
  c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
  const L = (...p) => { c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.stroke(); };
  const O = (x, y, r, fill) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); fill ? c.fill() : c.stroke(); };
  const RR = (x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); c.stroke(); };
  switch (kind) {
    case 'target': O(0, 0, 0.42); O(0, 0, 0.26); O(0, 0, 0.09 + 0.02 * Math.sin(t * 4), true); break;               // 获客
    case 'pen': L(-0.34, 0.34, -0.3, 0.16, 0.18, -0.32, 0.32, -0.18, -0.16, 0.3, -0.34, 0.34); L(0.08, -0.22, 0.22, -0.08); L(-0.42, 0.44, 0.42, 0.44); break; // 内容创作
    case 'play': RR(-0.44, -0.32, 0.88, 0.64, 0.12); c.beginPath(); c.moveTo(-0.1, -0.15); c.lineTo(0.16, 0); c.lineTo(-0.1, 0.15); c.closePath(); c.fill(); break; // 视频
    case 'chart': { const hs = [0.32, 0.55, 0.42, 0.78]; hs.forEach((h, i) => { const hh = h * (0.9 + 0.1 * Math.sin(t * 2.4 + i)); L(-0.33 + i * 0.22, 0.4, -0.33 + i * 0.22, 0.4 - hh); }); L(-0.46, 0.4, 0.46, 0.4); break; } // 数据
    case 'doc': RR(-0.32, -0.42, 0.64, 0.84, 0.1); L(-0.16, -0.18, 0.16, -0.18); L(-0.16, 0.0, 0.16, 0.0); L(-0.16, 0.18, 0.04, 0.18); break;        // 投标
    case 'chat': RR(-0.44, -0.34, 0.88, 0.58, 0.18); L(-0.2, 0.24, -0.3, 0.42, 0.0, 0.24); [-0.16, 0, 0.16].forEach(xx => O(xx, -0.05, 0.035, true)); break;
    case 'users': O(-0.16, -0.14, 0.14); c.beginPath(); c.arc(-0.16, 0.38, 0.28, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); O(0.22, -0.2, 0.11); c.beginPath(); c.arc(0.22, 0.24, 0.22, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); break;
    case 'skill': c.beginPath(); c.moveTo(0.06, -0.46); c.lineTo(-0.26, 0.06); c.lineTo(-0.02, 0.06); c.lineTo(-0.08, 0.46); c.lineTo(0.26, -0.08); c.lineTo(0.02, -0.08); c.closePath(); c.stroke(); break; // 技能：闪电
    case 'db': c.beginPath(); c.ellipse(0, -0.3, 0.36, 0.12, 0, 0, Math.PI * 2); c.stroke(); L(-0.36, -0.3, -0.36, 0.3); L(0.36, -0.3, 0.36, 0.3); c.beginPath(); c.ellipse(0, 0, 0.36, 0.12, 0, 0, Math.PI); c.stroke(); c.beginPath(); c.ellipse(0, 0.3, 0.36, 0.12, 0, 0, Math.PI); c.stroke(); break; // ERP
    case 'contact': RR(-0.42, -0.32, 0.84, 0.64, 0.1); O(-0.16, -0.06, 0.1); c.beginPath(); c.arc(-0.16, 0.24, 0.18, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); L(0.08, -0.1, 0.28, -0.1); L(0.08, 0.06, 0.24, 0.06); break; // CRM
    case 'flow': RR(-0.44, -0.4, 0.3, 0.24, 0.06); RR(0.14, -0.4, 0.3, 0.24, 0.06); RR(-0.15, 0.16, 0.3, 0.24, 0.06); L(-0.29, -0.16, -0.29, -0.02, 0, -0.02, 0, 0.16); L(0.29, -0.16, 0.29, -0.02, 0, -0.02); break; // OA
    case 'shield': c.beginPath(); c.moveTo(0, -0.46); c.lineTo(0.38, -0.32); c.lineTo(0.36, 0.04); c.quadraticCurveTo(0.3, 0.32, 0, 0.46); c.quadraticCurveTo(-0.3, 0.32, -0.36, 0.04); c.lineTo(-0.38, -0.32); c.closePath(); c.stroke(); L(-0.15, 0.0, -0.03, 0.13, 0.18, -0.12); break;
    case 'gauge': c.beginPath(); c.arc(0, 0.12, 0.42, Math.PI, 0); c.stroke(); { const a = Math.PI * (1.25 + 0.12 * Math.sin(t * 1.6)); L(0, 0.12, 0.32 * Math.cos(a), 0.12 + 0.32 * Math.sin(a)); } O(0, 0.12, 0.05, true); break; // 算力
    case 'lock': RR(-0.32, -0.04, 0.64, 0.48, 0.1); c.beginPath(); c.arc(0, -0.04, 0.2, Math.PI, 0); c.stroke(); O(0, 0.18, 0.05, true); break;          // 权限
    case 'trail': O(-0.3, 0.3, 0.07, true); O(0.3, -0.3, 0.07, true); c.setLineDash([0.07, 0.09]); c.lineDashOffset = -t * 0.3; c.beginPath(); c.moveTo(-0.3, 0.3); c.bezierCurveTo(0.2, 0.3, -0.2, -0.3, 0.3, -0.3); c.stroke(); c.setLineDash([]); break; // 留痕
    case 'moon': c.beginPath(); c.arc(0, 0, 0.36, 0.6, Math.PI * 2 - 0.6 + Math.PI * 0.0, false); c.arc(0.2, -0.12, 0.3, Math.PI * 1.75, Math.PI * 0.85, true); c.closePath(); c.stroke(); break;
    case 'sun': O(0, 0, 0.2); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + t * 0.2; L(0.3 * Math.cos(a), 0.3 * Math.sin(a), 0.42 * Math.cos(a), 0.42 * Math.sin(a)); } break;
    case 'check': L(-0.3, 0.02, -0.08, 0.24, 0.32, -0.2); break;
    case 'send': c.beginPath(); c.moveTo(-0.38, -0.34); c.lineTo(0.42, 0); c.lineTo(-0.38, 0.34); c.lineTo(-0.24, 0); c.closePath(); c.stroke(); L(-0.24, 0, 0.1, 0); break;
    case 'plug': L(-0.12, -0.44, -0.12, -0.24); L(0.12, -0.44, 0.12, -0.24); RR(-0.28, -0.24, 0.56, 0.32, 0.1); L(0, 0.08, 0, 0.44); break;
    case 'cloud': c.beginPath(); c.moveTo(-0.3, 0.24); c.arc(-0.24, 0.06, 0.18, Math.PI * 0.6, Math.PI * 1.45); c.arc(0.02, -0.08, 0.24, Math.PI * 1.1, Math.PI * 1.95); c.arc(0.26, 0.08, 0.16, Math.PI * 1.5, Math.PI * 0.45); c.closePath(); c.stroke(); break;
  }
  c.restore();
};
// 卡片内的图标底：同心圆角（子圆角 = 父圆角 − 内边距）
const iconTile = (g, kind, x, y, s, t, r = 22) => {
  g.fillStyle = 'rgba(255,255,255,0.09)'; g.beginPath(); g.roundRect(x, y, s, s, r); g.fill();
  icon(g, kind, x + s / 2, y + s / 2, s * 0.6, '#f2f2f7', t);
};
// 一束沿线流动的光点（连接线上的数据流）
const flowDot = (c, x0, y0, x1, y1, p, { r = 7, col = '143,220,255', tail = 0.12 } = {}) => {
  for (let k = 0; k < 6; k++) {
    const q = p - k * tail / 6; if (q < 0 || q > 1) continue;
    c.fillStyle = `rgba(${col},${(1 - k / 6) * 0.9})`; c.beginPath(); c.arc(lerp(x0, x1, q), lerp(y0, y1, q), r * (1 - k / 9), 0, Math.PI * 2); c.fill();
  }
};
window.NW = { W, H, bg, stage, push, ZH, MIX, COL, text, gradText, card, enter, pill, icon, iconTile, flowDot };
})();
