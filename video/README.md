# 纳米Work企业版 产品片（配音版）

用 `.claude/skills/huashu-art-motion` 里的动画引擎，以代码绘制、渲染成 mp4：1920×1080 / 60fps / 约 112 秒，带旁白、字幕和配乐。分镜见 [分镜表.md](分镜表.md)。

## 目录

```
video/
├── 分镜表.md
├── audio/                      # 声音：口播、对齐、配乐、混音
│   ├── 口播稿.txt              # 文字稿（唯一来源）
│   ├── 口播.wav                # Gemini 3.8 Flash TTS 合成的旁白（音色 Kore，24kHz 单声道）
│   ├── align.py                # 口播 ↔ 文稿对齐（静音检测 + 动态规划，不需要语音识别模型）
│   ├── 时间轴.json             # align.py 的输出：每个短语的起止时间
│   ├── build_timeline.py       # 时间轴 → 词级时间点 + 字幕，写进 eras.js 的 VO 块，并导出 out/字幕.srt
│   ├── bgm.py                  # 配乐（代码合成，原创，无采样）
│   └── mix.py                  # 口播 + 配乐 → 混音（配乐随人声自动压低，整体 -15 LUFS）
├── engine/                     # 渲染工程
│   ├── demos/namiwork/         # 本片代码
│   │   ├── eras.js             # 镜头表：每镜从哪句话开始（由 VO 时间点算出）；文件开头的 VO 块是生成的
│   │   ├── common.js           # 共用：光斑底、字体、玻璃卡、图标
│   │   ├── scenes.js           # 13 个镜头；每个元素的出场挂在口播时间点上
│   │   └── subtitles.js        # 字幕层（烧进画面）
│   └── lib, engine.js, …       # 符号链接，指向 skill 里的引擎（不重复存一份）
└── out/                        # 渲染输出（不进 git）：成片 mp4、配乐.wav、混音.wav、字幕.srt
```

## 从头出片

依赖：[uv](https://docs.astral.sh/uv/)、ffmpeg、Playwright Chromium。

```bash
cd video/audio
python3 align.py 口播.wav 口播稿.txt > 时间轴.json      # 1. 对齐（换了口播才需要重跑）
python3 build_timeline.py 时间轴.json                    # 2. 写 eras.js 的 VO 块 + out/字幕.srt
uv run --with numpy python bgm.py ../out/配乐.wav         # 3. 配乐（片长、速度按时间轴算）
uv run --with numpy python mix.py                        # 4. 混音 → out/混音.wav

cd ../engine                                             # 5. 渲染（约 40 分钟）
uv run --with playwright python render.py --film demos/namiwork --audio ../out/混音.wav --out ../out/纳米Work企业版_配音版.mp4
# 只导出某几个时刻的静帧（秒）
uv run --with playwright python render.py --film demos/namiwork --stills 5,33,76 --out ../out/stills
```

如果本机已经装了某个版本的 Playwright 浏览器，`--with playwright` 要指定匹配的版本，例如 `--with playwright==1.56.0`，否则会提示找不到浏览器。

## 预览（拖时间轴）

```bash
cd video/engine && python3 -m http.server 8000
# 浏览器打开 http://localhost:8000/index.html?film=demos/namiwork （预览没有声音）
```

## 改片子

- **改文案**：改 `audio/口播稿.txt` → 重新合成口播（见下）→ 从第 1 步重跑。画面上的提炼文字在 `scenes.js` 里，跟着改。
- **重新合成口播**：Gemini TTS 用 `streamGenerateContent?alt=sse` 流式接口（非流式请求会超过环境网关约 30 秒的超时）。导演说明里不要列出文稿以外的词，否则模型可能把它们读进去；合成后用 `gemini-3.5-transcribe` 转写一遍核对。
- **改某个元素的出场时刻**：`scenes.js` 里 `v('p12')` 表示第 12 句开口（本镜局部时间），`v('erp')` 表示说到「ERP」；可用的时间点见 `eras.js` 的 `VO.marks`，新的词级时间点加在 `build_timeline.py` 的 `MARKS` 里。
- **改字幕断行**：`build_timeline.py` 的 `SUBS`（每行必须是文稿里的一段连续文字）。
- **配乐**：`bgm.py` 顶部注释写了段落与镜头的对应；音量在 `mix.py`（配乐铺底 -23 LUFS，人声下再压 7dB）。
