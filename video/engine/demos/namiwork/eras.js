// 纳米Work企业版 产品片（无声测试版）· 发布会语法 t2 · 13 镜，约 78 秒
//   预览：在 video/engine 起本地服务，打开 index.html?film=demos/namiwork
//   渲染：见 video/README.md
window.PUNCH = 0;                                   // 发布会片不要拍点冲击
window.SCENE_DIR = 'demos/namiwork';
window.SCENE_LIBS = ['demos/namiwork/common.js', 'demos/namiwork/scenes.js'];
const BP = { type: 'blurPush', dur: 0.55 };
window.ERAS = [
  { id: 's01', dur: 5.0 },                          // 开场提问
  { id: 's02', dur: 5.5, transition: BP },          // AI 时代，答案变了
  { id: 's03', dur: 6.0, transition: BP },          // 从获客到成交
  { id: 's04', dur: 5.0, transition: BP },          // 产品亮相
  { id: 's05', dur: 6.5, transition: BP },          // 专家团队 · 500+
  { id: 's06', dur: 6.0, transition: BP },          // 五大场景
  { id: 's07', dur: 6.5, transition: BP },          // 一句话出稿
  { id: 's08', dur: 6.0, transition: BP },          // 技能复用
  { id: 's09', dur: 7.0, transition: BP },          // 直连业务系统
  { id: 's10', dur: 5.5, transition: BP },          // 不绑定生态
  { id: 's11', dur: 7.0, transition: BP },          // 安全
  { id: 's12', dur: 6.5, transition: BP },          // 7×24
  { id: 's13', dur: 6.0, transition: BP },          // 落版
];
