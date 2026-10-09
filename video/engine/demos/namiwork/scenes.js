// 纳米Work企业版 产品片 · 13 个镜头（分镜表见 video/分镜表.md）。文案来自用户提供的文字稿，画面只做提炼不加事实。
(() => {
const { clamp, lerp } = U;
const { W, H, stage, push, ZH, MIX, COL, text, gradText, card, enter, pill, icon, iconTile, flowDot } = NW;
const A = (lt, a, b) => MO.appleOut(MO.seg(lt, a, b));          // 浮现进度
const S = (lt, a, b) => MO.smooth(MO.seg(lt, a, b));
const D = id => ERAS.find(e => e.id === id).dur;
// 在一段线上按进度画出（描线）
const drawLine = (c, x0, y0, x1, y1, p, { col = 'rgba(255,255,255,0.22)', lw = 2, dash } = {}) => {
  if (p <= 0) return; c.save(); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; if (dash) c.setLineDash(dash);
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(lerp(x0, x1, p), lerp(y0, y1, p)); c.stroke(); c.restore();
};

// ① 开场提问
SCENES.s01 = { draw(c, lt, t) {
  stage(c, t); c.save(); push(c, lt, D('s01'));
  text(c, '每个老板都在想同一件事', W / 2, 380, A(lt, 0.2, 1.0), { size: 40, fam: ZH.m, color: COL.eyebrow, track: 0.12, blur: 10, dy: 16 });
  text(c, '客户从哪来？', W / 2, 580, A(lt, 0.8, 1.7), { size: 136, fam: ZH.h, track: -0.02 });
  text(c, '生意怎么做大？', W / 2, 760, A(lt, 1.7, 2.6), { size: 136, fam: ZH.h, track: -0.02 });
  c.restore();
} };

// ② AI 时代，答案变了：以前 vs 现在
SCENES.s02 = { draw(c, lt, t) {
  const bd = stage(c, t); c.save(); push(c, lt, D('s02'));
  text(c, 'AI 时代，答案变了', W / 2, 270, A(lt, 0.25, 1.1), { size: 112, fam: MIX.h, weight: '700' });
  const LX = 600, strike = S(lt, 2.5, 3.1);
  text(c, '以前', LX, 450, A(lt, 1.0, 1.6), { size: 36, fam: ZH.m, color: COL.eyebrow, track: 0.2, blur: 8, dy: 12 });
  ['人海战术', '经验', '试错'].forEach((s, i) => {
    const y = 570 + i * 140, p = MO.seg(lt, 1.2 + i * 0.18, 1.9 + i * 0.18);
    c.save(); c.globalAlpha *= lerp(1, 0.38, strike);
    const w = pill(c, s, LX, y, p, { size: 52, h: 110, padX: 52 });
    c.restore();
    if (w) drawLine(c, LX - w / 2 + 16, y, LX + w / 2 - 16, y, MO.seg(lt, 2.5 + i * 0.1, 2.9 + i * 0.1), { col: 'rgba(255,120,110,0.85)', lw: 4 });
  });
  // 箭头
  const ap = S(lt, 3.0, 3.5);
  if (ap > 0) { drawLine(c, 830, 690, lerp(830, 1040, ap), 690, 1, { col: 'rgba(255,255,255,0.5)', lw: 3 });
    c.save(); c.globalAlpha = ap; c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(lerp(830, 1040, ap) - 18, 672); c.lineTo(lerp(830, 1040, ap), 690); c.lineTo(lerp(830, 1040, ap) - 18, 708); c.stroke(); c.restore(); }
  const RX = 1360;
  text(c, '现在', RX, 450, A(lt, 3.1, 3.7), { size: 36, fam: ZH.m, color: COL.eyebrow, track: 0.2, blur: 8, dy: 12 });
  const E = enter(lt, 3.3, t, { dy: 120, rot: 0.4, side: 1, seed: 1 });
  card(c, bd, { key: 's02', cx: RX, cy: 690 + E.dy, w: 560, h: 300, ry: E.ry, sc: E.sc, a: E.a, glow: S(lt, 3.9, 4.4), sheen: MO.seg(lt, 4.1, 4.9),
    content(g, w, h) {
      iconTile(g, 'cloud', 44, 44, 92, t);
      g.font = `600 64px ${MIX.h}`; g.fillStyle = COL.hi; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.letterSpacing = '-1px';
      g.fillText('一个 AI 工作台', 44, 228);
    } });
  c.restore();
} };

// ③ 从获客到成交，整条链路跑通
SCENES.s03 = { draw(c, lt, t) {
  const bd = stage(c, t); c.save(); push(c, lt, D('s03'));
  text(c, '从获客到成交', W / 2, 300, A(lt, 0.25, 1.0), { size: 108, fam: ZH.h });
  text(c, '一个 AI 工作台，把整条链路跑通', W / 2, 392, A(lt, 0.6, 1.4), { size: 44, fam: MIX.m, color: COL.mid, track: 0, blur: 10, dy: 16 });
  const Y = 680, X0 = 330, X1 = 1590, L0 = X0 + 170, L1 = X1 - 170, run = MO.seg(lt, 2.3, 4.3);
  drawLine(c, L0, Y, L1, Y, S(lt, 1.4, 2.2), { col: 'rgba(255,255,255,0.2)', lw: 3 });
  // 跑通的那一段：亮线跟着光点走
  if (run > 0) { const g = c.createLinearGradient(L0, 0, L1, 0); g.addColorStop(0, 'rgba(143,220,255,0.9)'); g.addColorStop(1, 'rgba(170,140,255,0.9)');
    drawLine(c, L0, Y, L1, Y, MO.sineInOut(run), { col: g, lw: 4 }); flowDot(c, L0, Y, L1, Y, MO.sineInOut(run), { r: 10, tail: 0.1 }); }
  for (let k = 1; k <= 4; k++) {                                    // 中间环节（不标名字）：光点经过时点亮
    const x = lerp(L0, L1, k / 5), lit = clamp((MO.sineInOut(run) - k / 5) * 12), app = S(lt, 1.5 + k * 0.1, 1.9 + k * 0.1);
    if (app <= 0) continue;
    c.save(); c.globalAlpha = app; c.fillStyle = lit > 0 ? `rgba(143,220,255,${0.35 + 0.6 * lit})` : 'rgba(255,255,255,0.18)';
    c.beginPath(); c.arc(x, Y, 14 + 4 * lit, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2; c.stroke(); c.restore();
  }
  const node = (key, cx, label, ic, t0, glow, side) => { const E = enter(lt, t0, t, { dy: 100, rot: 0.4, side, seed: side + 2 });
    card(c, bd, { key, cx, cy: Y + E.dy, w: 300, h: 200, ry: E.ry, sc: E.sc, a: E.a, glow,
      content(g, w, h) { iconTile(g, ic, 34, 34, 80, t); g.font = `56px ${ZH.h}`; g.fillStyle = COL.hi; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(label, 34, 172); } }); };
  node('s03a', X0, '获客', 'target', 0.9, S(lt, 2.1, 2.5), -1);
  node('s03b', X1, '成交', 'check', 1.1, S(lt, 4.2, 4.6), 1);
  c.restore();
} };

// ④ 产品亮相
SCENES.s04 = { draw(c, lt, t) {
  stage(c, t); c.save(); push(c, lt, D('s04'), 0.045);
  text(c, '360 打造的企业 AI 工作台', W / 2, 360, A(lt, 0.25, 1.0), { size: 40, fam: MIX.m, color: COL.eyebrow, track: 0.1, blur: 10, dy: 16 });
  gradText(c, '纳米Work', W / 2, 630, A(lt, 0.5, 1.5), { size: 240, key: 's04', sheen: MO.seg(lt, 1.6, 2.6) });
  pill(c, '企业版', W / 2, 790, MO.seg(lt, 1.5, 2.3), { size: 48, h: 100, padX: 50, fill: 'rgba(91,140,255,0.24)', stroke: 'rgba(143,200,255,0.5)' });
  c.restore();
} };

// ⑤ 不是聊天机器人，而是一整支 AI 专家团队 · 500+
SCENES.s05 = { draw(c, lt, t) {
  stage(c, t); c.save(); push(c, lt, D('s05'));
  const st = S(lt, 1.6, 2.0);
  c.save(); c.globalAlpha = lerp(1, 0.42, st);
  text(c, '它不是一个聊天机器人', W / 2, 230, A(lt, 0.25, 1.0), { size: 56, fam: ZH.b, color: COL.mid, track: 0 });
  c.restore();
  if (st > 0) { c.save(); c.font = `56px ${ZH.b}`; const w = c.measureText('它不是一个聊天机器人').width; c.restore(); drawLine(c, W / 2 - w / 2 - 10, 212, W / 2 + w / 2 + 10, 212, st, { col: 'rgba(255,120,110,0.8)', lw: 4 }); }
  text(c, '而是一整支随时待命的 AI 专家团队', W / 2, 350, A(lt, 1.9, 2.7), { size: 80, fam: MIX.h, weight: '700' });
  // 左：计数（同一个数只数一次）
  const cp = A(lt, 2.6, 3.2);
  if (cp > 0) { const v = Math.round(TY.count(lt, 2.7, 1.1, 0, 500));
    c.save(); c.globalAlpha = clamp(cp * 1.5); c.font = `600 230px "Inter"`; c.letterSpacing = '-7px'; c.textBaseline = 'alphabetic'; c.fillStyle = '#ffffff';
    const nw = TY.tabular(c, String(v), 300, 790 + (1 - cp) * 30); c.letterSpacing = '0px';
    c.globalAlpha = MO.appleOut(MO.seg(lt, 3.6, 4.0)); c.font = `600 150px "Inter"`; c.fillStyle = COL.cyan; c.fillText('+', 300 + nw + 12, 772); c.restore(); }   // 数到 500 后再出「+」
  text(c, '多位 AI 专家，随时待命', 310, 880, A(lt, 3.2, 3.9), { size: 44, fam: MIX.m, color: COL.mid, align: 'left', track: 0, blur: 8, dy: 12 });
  // 右：专家点阵（抽象表示一支团队），从中心一圈圈弹出，随后轻轻呼吸
  const C = 18, R = 10, SP = 36, gx = 1130, gy = 560, cx = gx + (C - 1) * SP / 2, cy = gy + (R - 1) * SP / 2;
  for (let i = 0; i < C; i++) for (let j = 0; j < R; j++) {
    const x = gx + i * SP, y = gy + j * SP, d = Math.hypot(x - cx, (y - cy) * 1.4) / 360, t0 = 2.5 + d * 0.9;
    const s = MO.spring(lt - t0, { duration: 0.5, bounce: 0.2 }); if (lt <= t0) continue;
    const h = (i * 7 + j * 13) % 10, col = h < 4 ? '143,220,255' : h < 7 ? '180,160,255' : '235,235,245';
    const br = 0.55 + 0.35 * Math.sin(t * 1.8 + i * 0.7 + j * 1.3);
    c.fillStyle = `rgba(${col},${br * clamp((lt - t0) / 0.2)})`; c.beginPath(); c.arc(x, y, 7 * s, 0, Math.PI * 2); c.fill();
  }
  c.restore();
} };

// ⑥ 覆盖核心场景：五张卡
const SC6 = [['target', '营销获客'], ['pen', '内容创作'], ['play', '视频制作'], ['chart', '数据分析'], ['doc', '投标撰写']];
SCENES.s06 = { draw(c, lt, t) {
  const bd = stage(c, t); c.save(); push(c, lt, D('s06'));
  text(c, '覆盖核心业务场景', W / 2, 250, A(lt, 0.25, 1.0), { size: 84, fam: ZH.h });
  const CW = 300, GAP = 36, x0 = (W - (CW * 5 + GAP * 4)) / 2 + CW / 2;
  SC6.forEach(([ic, s], i) => {
    const E = enter(lt, 0.55 + i * 0.1, t, { dy: 160, rot: 0.5, side: (i - 2) / 2 || 0.001, seed: i });
    const cx = x0 + i * (CW + GAP), sp = MO.seg(lt, 2.6, 3.6), lx = (lerp(-200, W + 200, sp) - (cx - CW / 2)) / CW;
    card(c, bd, { key: 's06' + i, cx, cy: 610 + E.dy, w: CW, h: 360, ry: E.ry, sc: E.sc, a: E.a, sheen: sp > 0 && sp < 1 ? clamp((lx + 0.35) / 1.7) : 0,
      content(g, w, h) {
        iconTile(g, ic, 36, 40, 96, t);
        g.font = `500 28px "Inter"`; g.fillStyle = COL.lo; g.textAlign = 'right'; g.textBaseline = 'alphabetic'; g.fillText('0' + (i + 1), w - 36, 74);
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(36, 200, w - 72, 1.5);
        g.font = `52px ${ZH.h}`; g.fillStyle = COL.hi; g.textAlign = 'left'; g.fillText(s, 36, 292);
      } });
  });
  text(c, '开箱即用，上手就能干活', W / 2, 930, A(lt, 1.7, 2.5), { size: 48, fam: ZH.b, color: COL.mid, track: 0, blur: 10, dy: 16 });
  c.restore();
} };

// ⑦ 过去要找好几个人干的事 → 现在一句话就能出稿
const CHIPS = [['小红书运营', 430, 390], ['短视频投流', 960, 360], ['SEO 优化', 1490, 390], ['海报设计', 660, 510], ['宣传片制作', 1260, 510]];
SCENES.s07 = { draw(c, lt, t) {
  const bd = stage(c, t); c.save(); push(c, lt, D('s07'));
  text(c, '过去要找好几个人干的事', W / 2, 220, A(lt, 0.25, 1.0), { size: 72, fam: ZH.h });
  const BY = 700;
  const bE = enter(lt, 1.9, t, { dy: 80, rot: 0, float: 0 });
  const absorbed = MO.seg(lt, 3.3, 3.5);
  CHIPS.forEach(([s, x, y], i) => {
    const fly = MO.cubicInOut(MO.seg(lt, 2.5 + i * 0.12, 3.3 + i * 0.06)), fx = lerp(x, W / 2, fly), fy = lerp(y + MO.float(t, 6, 3.2 + i * 0.4, i), BY, fly);
    c.save(); c.globalAlpha *= 1 - MO.seg(fly, 0.7, 1);
    pill(c, s, fx, fy, MO.seg(lt, 0.6 + i * 0.14, 1.4 + i * 0.14), { size: 40, fam: MIX.b, h: 86, padX: 38, scale: lerp(1, 0.6, fly) });
    c.restore();
  });
  // 输入框：吸进五件事后，打出一句话 → 发送
  const typed = TY.typed('把这些事交给我', MO.seg(lt, 3.5, 4.3)), send = MO.seg(lt, 4.4, 4.9);
  card(c, bd, { key: 's07bar', cx: W / 2, cy: BY + bE.dy, w: 1060, h: 140, r: 70, sc: lerp(0.94, 1, bE.sp) * (1 + 0.03 * Math.sin(Math.PI * absorbed)), a: bE.a, glow: S(lt, 3.3, 3.6) * (1 - send * 0.5),
    content(g, w, h) {
      icon(g, 'chat', 74, h / 2, 54, COL.mid, t);
      g.font = `44px ${ZH.b}`; g.textBaseline = 'middle'; g.textAlign = 'left';
      if (typed) { g.fillStyle = COL.hi; g.fillText(typed, 128, h / 2 + 2); }
      else { g.fillStyle = COL.lo; g.fillText('说出你的需求…', 128, h / 2 + 2); }
      if (lt > 3.4 && lt < 4.5 && Math.floor(lt * 2.4) % 2 === 0) { const cw = typed ? g.measureText(typed).width : 0; g.fillStyle = COL.cyan; g.fillRect(132 + cw, h / 2 - 26, 4, 52); }
      const k = 1 + 0.18 * Math.sin(Math.PI * send);
      g.save(); g.translate(w - 76, h / 2); g.scale(k, k); g.fillStyle = send > 0 ? '#5b8cff' : 'rgba(255,255,255,0.14)'; g.beginPath(); g.arc(0, 0, 44, 0, Math.PI * 2); g.fill(); icon(g, 'send', 2, 0, 44, '#ffffff', t); g.restore();
    } });
  text(c, '现在，一句话就能出稿', W / 2, 890, A(lt, 4.5, 5.2), { size: 64, fam: ZH.h, color: COL.hi });
  c.restore();
} };

// ⑧ 做对一次，经验变技能，全团队一键复用
SCENES.s08 = { draw(c, lt, t) {
  const bd = stage(c, t); c.save(); push(c, lt, D('s08'));
  text(c, '做对一次，把经验变成技能', W / 2, 230, A(lt, 0.25, 1.0), { size: 80, fam: ZH.h });
  const KY = 480, E = enter(lt, 0.7, t, { dy: 120, rot: 0, float: 4 });
  card(c, bd, { key: 's08', cx: W / 2, cy: KY + E.dy, w: 400, h: 190, ry: E.ry, sc: E.sc, a: E.a, glow: S(lt, 1.6, 2.0), sheen: MO.seg(lt, 1.7, 2.5),
    content(g, w, h) { iconTile(g, 'skill', 40, 47, 96, t); g.font = `60px ${ZH.h}`; g.fillStyle = COL.hi; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText('技能', 170, 118);
      g.font = `28px ${ZH.m}`; g.fillStyle = COL.lo; g.fillText('一次做对', 172, 160); } });
  const N = 6, AY = 800;
  for (let i = 0; i < N; i++) {
    const x = W / 2 + (i - (N - 1) / 2) * 230, t0 = 2.3 + i * 0.12, ln = S(lt, t0, t0 + 0.5), arr = MO.seg(lt, t0 + 0.2, t0 + 0.9);
    drawLine(c, W / 2, KY + 100, x, AY - 64, ln, { col: 'rgba(255,255,255,0.16)', lw: 2 });
    if (arr > 0 && arr < 1) flowDot(c, W / 2, KY + 100, x, AY - 64, MO.sineInOut(arr), { r: 8 });
    const ap = MO.spring(lt - (1.0 + i * 0.08), { duration: 0.5, bounce: 0.15 }); if (lt < 1.0 + i * 0.08) continue;
    const got = S(lt, t0 + 0.85, t0 + 1.1);
    c.save(); c.globalAlpha = clamp((lt - 1.0 - i * 0.08) / 0.25); c.translate(x, AY + (1 - ap) * 40 + MO.float(t, 4, 3.3 + i * 0.3, i));
    c.fillStyle = 'rgba(255,255,255,0.08)'; c.beginPath(); c.arc(0, 0, 58, 0, Math.PI * 2); c.fill();
    c.strokeStyle = got > 0 ? `rgba(143,220,255,${0.3 + 0.6 * got})` : 'rgba(255,255,255,0.22)'; c.lineWidth = 2 + got; c.stroke();
    icon(c, 'users', 0, 4, 64, '#e8e8f0', t);
    if (got > 0) { c.save(); c.translate(40, -40); c.scale(got, got); c.fillStyle = '#5b8cff'; c.beginPath(); c.arc(0, 0, 22, 0, Math.PI * 2); c.fill(); icon(c, 'skill', 0, 0, 26, '#fff', t, 0.11); c.restore(); }
    c.restore();
  }
  text(c, '全团队一键复用', W / 2, 970, A(lt, 3.6, 4.3), { size: 56, fam: ZH.h, color: COL.cyan });
  c.restore();
} };

// ⑨ 直连 ERP / CRM / OA
const SYS = [['db', 'ERP'], ['contact', 'CRM'], ['flow', 'OA']];
SCENES.s09 = { draw(c, lt, t) {
  const bd = stage(c, t); c.save(); push(c, lt, D('s09'));
  text(c, '直连企业现有业务系统', W / 2, 190, A(lt, 0.25, 1.0), { size: 76, fam: ZH.h });
  const HY = 410, SY = 730, hE = enter(lt, 0.6, t, { dy: 100, rot: 0, float: 3 });
  SYS.forEach(([ic, s], i) => {
    const x = W / 2 + (i - 1) * 440, ln = S(lt, 1.7 + i * 0.1, 2.3 + i * 0.1);
    drawLine(c, W / 2, HY + 90, x, SY - 85, ln, { col: 'rgba(255,255,255,0.2)', lw: 2.5 });
    if (lt > 2.4) for (let k = 0; k < 2; k++) {                         // 双向数据流：循环
      const ph = ((lt - 2.4) * 0.55 + k * 0.5 + i * 0.17) % 1;
      if (k === 0) flowDot(c, W / 2, HY + 90, x, SY - 85, ph, { r: 7 }); else flowDot(c, x, SY - 85, W / 2, HY + 90, ph, { r: 6, col: '190,160,255' });
    }
  });
  card(c, bd, { key: 's09hub', cx: W / 2, cy: HY + hE.dy, w: 460, h: 180, sc: hE.sc, a: hE.a, glow: S(lt, 2.2, 2.6),
    content(g, w, h) { g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.font = `600 76px ${MIX.h}`; g.letterSpacing = '-2px';
      const gr = g.createLinearGradient(80, 0, w - 80, 0); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#ddd2ff'); gr.addColorStop(1, '#a8dcff'); g.fillStyle = gr; g.fillText('纳米Work', w / 2, 118); } });
  SYS.forEach(([ic, s], i) => {
    const x = W / 2 + (i - 1) * 440, E = enter(lt, 1.1 + i * 0.12, t, { dy: 130, rot: 0.45, side: i - 1 || 0.001, seed: i + 3 });
    card(c, bd, { key: 's09' + i, cx: x, cy: SY + E.dy, w: 340, h: 170, ry: E.ry, sc: E.sc, a: E.a,
      content(g, w, h) { iconTile(g, ic, 36, 37, 96, t); g.font = `600 64px "Inter"`; g.fillStyle = COL.hi; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.letterSpacing = '-1px'; g.fillText(s, 162, 108); } });
  });
  text(c, 'AI 直接在你的系统里干活 · 不用换平台 · 不用改流程', W / 2, 965, A(lt, 2.8, 3.6), { size: 42, fam: MIX.b, color: COL.mid, track: 0, blur: 10, dy: 14 });
  c.restore();
} };

// ⑩ 不绑定单一生态：飞书 / 钉钉 / 企业微信（只用文字，不画对方标识）
SCENES.s10 = { draw(c, lt, t) {
  stage(c, t); c.save(); push(c, lt, D('s10'));
  text(c, '不绑定任何单一生态', W / 2, 250, A(lt, 0.25, 1.0), { size: 44, fam: ZH.m, color: COL.eyebrow, track: 0.12, blur: 10, dy: 16 });
  const PY = 470, HY = 720;
  ['飞书', '钉钉', '企业微信'].forEach((s, i) => {
    const x = W / 2 + (i - 1) * 440;
    drawLine(c, x, PY + 60, W / 2, HY - 50, S(lt, 1.6 + i * 0.1, 2.1 + i * 0.1), { col: 'rgba(255,255,255,0.2)', lw: 2.5 });
    if (lt > 2.2) flowDot(c, x, PY + 60, W / 2, HY - 50, ((lt - 2.2) * 0.6 + i * 0.3) % 1, { r: 7 });
    pill(c, s, x, PY + MO.float(t, 5, 3.4 + i * 0.4, i), MO.seg(lt, 0.7 + i * 0.15, 1.5 + i * 0.15), { size: 54, h: 120, padX: 60 });
  });
  pill(c, '纳米Work', W / 2, HY, MO.seg(lt, 1.9, 2.6), { size: 50, fam: MIX.h, h: 104, padX: 52, fill: 'rgba(91,140,255,0.26)', stroke: 'rgba(143,200,255,0.55)' });
  text(c, '你用什么，它就接什么', W / 2, 930, A(lt, 2.7, 3.5), { size: 84, fam: ZH.h });
  c.restore();
} };

// ⑪ 安全：360 二十年安全基因 + 三张卡
const SEC = [['gauge', '算力消耗', '清晰可查'], ['lock', '数据权限', '分级管控'], ['trail', '每一步操作', '有迹可循']];
SCENES.s11 = { draw(c, lt, t) {
  const bd = stage(c, t); c.save(); push(c, lt, D('s11'));
  const sp = MO.spring(lt - 0.25, { duration: 0.7, bounce: 0.15 });
  if (lt > 0.25) { c.save(); c.globalAlpha = clamp((lt - 0.25) / 0.3);
    const gl = c.createRadialGradient(W / 2, 250, 0, W / 2, 250, 170); gl.addColorStop(0, 'rgba(120,180,255,0.32)'); gl.addColorStop(1, 'rgba(120,180,255,0)'); c.fillStyle = gl; c.fillRect(W / 2 - 200, 60, 400, 380);
    c.translate(W / 2, 250); c.scale(lerp(0.7, 1, sp), lerp(0.7, 1, sp)); icon(c, 'shield', 0, 0, 170, '#eef2ff', t, 0.055); c.restore(); }
  text(c, '360 二十年安全基因', W / 2, 470, A(lt, 0.6, 1.4), { size: 84, fam: MIX.h, weight: '700' });
  const CW = 460, GAP = 48, x0 = (W - (CW * 3 + GAP * 2)) / 2 + CW / 2;
  SEC.forEach(([ic, a, b], i) => {
    const E = enter(lt, 1.3 + i * 0.12, t, { dy: 150, rot: 0.5, side: i - 1 || 0.001, seed: i });
    const cx = x0 + i * (CW + GAP), sw = MO.seg(lt, 3.0, 4.0), lx = (lerp(-200, W + 200, sw) - (cx - CW / 2)) / CW;
    card(c, bd, { key: 's11' + i, cx, cy: 760 + E.dy, w: CW, h: 260, ry: E.ry, sc: E.sc, a: E.a, sheen: sw > 0 && sw < 1 ? clamp((lx + 0.35) / 1.7) : 0,
      content(g, w, h) { iconTile(g, ic, 40, 40, 88, t);
        g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.font = `36px ${ZH.b}`; g.fillStyle = COL.mid; g.fillText(a, 152, 96);
        g.font = `60px ${ZH.h}`; g.fillStyle = COL.hi; g.fillText(b, 40, 214); } });
  });
  c.restore();
} };

// ⑫ 睡前布置任务 → 醒来验收结果 · 7×24 小时
SCENES.s12 = { draw(c, lt, t) {
  const bd = stage(c, t); c.save(); push(c, lt, D('s12'));
  const LX = 470, RX = 1450, IY = 300;
  const tile = (key, x, ic, t0, glow) => { const E = enter(lt, t0, t, { dy: 80, rot: 0, float: 4, seed: x });
    card(c, bd, { key, cx: x, cy: IY + E.dy, w: 150, h: 150, r: 40, sc: E.sc, a: E.a, glow, content(g, w, h) { icon(g, ic, w / 2, h / 2, 88, '#f2f2f7', t); } }); };
  tile('s12m', LX, 'moon', 0.3, 0);
  text(c, '睡前布置任务', LX, 470, A(lt, 0.6, 1.3), { size: 56, fam: ZH.h });
  // 时间流过：弧线上的光点从月亮走到太阳
  const arc = S(lt, 1.4, 2.0), run = MO.sineInOut(MO.seg(lt, 1.8, 3.0));
  const P = q => { const x0 = LX + 110, x1 = RX - 110, cx = W / 2, cy = 110; return [(1 - q) * (1 - q) * x0 + 2 * (1 - q) * q * cx + q * q * x1, (1 - q) * (1 - q) * IY + 2 * (1 - q) * q * cy + q * q * IY]; };
  if (arc > 0) { c.save(); c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 2.5; c.setLineDash([2, 14]); c.lineCap = 'round'; c.beginPath(); for (let k = 0; k <= 60 * arc; k++) { const [x, y] = P(k / 60); k ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.restore(); }
  if (run > 0 && run < 1) for (let k = 0; k < 7; k++) { const q = run - k * 0.018; if (q < 0) continue; const [x, y] = P(q); c.fillStyle = `rgba(255,214,140,${(1 - k / 7) * 0.95})`; c.beginPath(); c.arc(x, y, 10 * (1 - k / 10), 0, Math.PI * 2); c.fill(); }
  tile('s12s', RX, 'sun', 2.6, S(lt, 2.9, 3.3));
  text(c, '醒来验收结果', RX, 470, A(lt, 2.9, 3.6), { size: 56, fam: ZH.h });
  // 中央大字
  const big = A(lt, 3.4, 4.3);
  if (big > 0) { c.save(); c.globalAlpha = clamp(big * 1.5); const b = (1 - big) * 20; if (b > 0.3) c.filter = `blur(${b.toFixed(1)}px)`;
    c.translate(0, (1 - big) * 30); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.font = `600 210px "Inter"`; c.letterSpacing = '-6px'; const w1 = c.measureText('7×24').width; c.letterSpacing = '0px'; c.font = `72px ${ZH.h}`; const w2 = c.measureText('小时').width;
    const x0 = W / 2 - (w1 + w2 + 24) / 2; c.textAlign = 'left';
    c.font = `600 210px "Inter"`; c.letterSpacing = '-6px'; const gr = c.createLinearGradient(x0, 0, x0 + w1, 0); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#ddd2ff'); gr.addColorStop(1, '#a8dcff'); c.fillStyle = gr; c.fillText('7×24', x0, 790);
    c.letterSpacing = '0px'; c.font = `72px ${ZH.h}`; c.fillStyle = COL.hi; c.fillText('小时', x0 + w1 + 24, 790); c.restore(); }
  text(c, '云端常驻，关了电脑照样干', W / 2, 900, A(lt, 4.0, 4.7), { size: 48, fam: ZH.b, color: COL.mid, track: 0, blur: 10, dy: 14 });
  c.restore();
} };

// ⑬ 落版
SCENES.s13 = { draw(c, lt, t) {
  stage(c, t); c.save(); push(c, lt, D('s13'), 0.03);
  gradText(c, '纳米Work', W / 2, 520, A(lt, 0.3, 1.3), { size: 220, key: 's13', sheen: MO.seg(lt, 1.4, 2.4) });
  pill(c, '企业版', W / 2, 670, MO.seg(lt, 1.0, 1.8), { size: 46, h: 96, padX: 48, fill: 'rgba(91,140,255,0.24)', stroke: 'rgba(143,200,255,0.5)' });
  text(c, '让 AI 真正帮你赚钱', W / 2, 850, A(lt, 1.6, 2.5), { size: 80, fam: MIX.h, weight: '700' });
  c.restore();
} };
})();
