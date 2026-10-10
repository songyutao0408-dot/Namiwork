// 纳米Work企业版 产品片 · 字幕（烧进画面）。字幕行和时间来自 eras.js 的 VO.subs（由 video/audio/build_timeline.py 生成，同时导出 out/字幕.srt）。
// 位置：画面底部居中，基线 y=1010；画面里的说明文字都在 y≤930，不进字幕带。
(() => {
const { clamp } = U;
const W = 1920, Y = 1010, SIZE = 44, FADE = 0.12;
window.GLOBAL_OVERLAY = (c, t) => {
  const s = VO.subs.find(x => t >= x.start && t < x.end); if (!s) return;
  const a = clamp((t - s.start) / FADE) * clamp((s.end - t) / FADE); if (a <= 0) return;
  c.save(); c.globalAlpha = a;
  c.font = `${SIZE}px "Inter", "PuHui-Bold"`; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.letterSpacing = '1px';
  c.lineJoin = 'round'; c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = 6;           // 细描边 + 柔和阴影：亮色光斑上也看得清
  c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 14; c.shadowOffsetY = 2;
  c.strokeText(s.text, W / 2, Y);
  c.shadowColor = 'transparent'; c.fillStyle = '#ffffff'; c.fillText(s.text, W / 2, Y);
  c.restore();
};
})();
