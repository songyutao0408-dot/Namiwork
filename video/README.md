# 纳米Work企业版 产品片

用 `.claude/skills/huashu-art-motion` 里的动画引擎，以代码绘制、渲染成 mp4。分镜见 [分镜表.md](分镜表.md)。

## 目录

```
video/
├── 分镜表.md
├── engine/                     # 渲染工程
│   ├── demos/namiwork/         # 本片代码（自己写的部分）
│   │   ├── eras.js             # 镜头表：顺序、每镜时长、转场
│   │   ├── common.js           # 共用：光斑底、字体、玻璃卡、图标
│   │   └── scenes.js           # 13 个镜头
│   └── lib, engine.js, …       # 符号链接，指向 skill 里的引擎（不重复存一份）
└── out/                        # 渲染输出（不进 git）
```

## 渲染

依赖：[uv](https://docs.astral.sh/uv/)、ffmpeg、Playwright Chromium。

```bash
cd video/engine
# 整片（约 78 秒，1080p 60fps）
uv run --with playwright python render.py --film demos/namiwork --out ../out/纳米Work企业版.mp4
# 只导出某几个时刻的静帧（秒）
uv run --with playwright python render.py --film demos/namiwork --stills 4.6,21.1 --out ../out/stills
```

如果本机已经装了某个版本的 Playwright 浏览器，`--with playwright` 要指定匹配的版本，例如 `--with playwright==1.56.0`，否则会提示找不到浏览器。

## 预览（拖时间轴）

```bash
cd video/engine && python3 -m http.server 8000
# 浏览器打开 http://localhost:8000/index.html?film=demos/namiwork
```

## 改片子

- 改文案、改时长：`demos/namiwork/scenes.js` 里每个镜头的文字，`eras.js` 里每段的 `dur`（秒）。
- 加配音：先拿到口播音频，按音频时间轴重排各段 `dur`，渲染时加 `--audio 口播.wav`。
