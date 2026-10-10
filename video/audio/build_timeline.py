"""口播时间轴 → 片子：把 align.py 的短语时间换算成「词级时间点」和「字幕」，写进 eras.js 的 VO 块。

  python3 build_timeline.py 时间轴.json   # 改写 ../engine/demos/namiwork/eras.js 的 VO 块，同时写 ../out/字幕.srt

时间点（marks）：用「上下文|词」定位文稿中的一个位置，按短语内的说话时长（去掉停顿）按音节插值；
  离某个停顿的结束点 0.3s 以内就吸附过去（词通常紧跟停顿开始）。
字幕：下面 SUBS 里按语义手工断行，每行必须是文稿的连续片段；时间同样按字位置换算。
"""
import json, re, subprocess, sys
from pathlib import Path

HERE = Path(__file__).parent
ERAS = HERE.parent / 'engine' / 'demos' / 'namiwork' / 'eras.js'
OFFSET = 0.6                     # 口播在成片里的起点（秒）：先让画面和配乐起来

# 词级时间点：名字 → 「上下文|词」（| 前是上下文，时间取 | 处）
MARKS = {
    'rh': '以前你靠|人海战术', 'jy': '人海战术、|靠经验', 'sc': '靠经验、|靠试错',
    'gzt': '现在，|一个AI工作台', 'jnb': '一个AI工作台|就能帮你', 'hk': '从|获客到成交', 'cj': '获客到|成交',
    'nmw1': '这就是|纳米Work', 'qyb1': '这就是纳米Work|企业版',
    'n500': '|500多位', 'cov': '500多位AI专家|覆盖', 'sc1': '覆盖|营销获客', 'sc2': '营销获客、|内容创作', 'sc3': '内容创作、|视频制作',
    'sc4': '视频制作、|数据分析', 'sc5': '数据分析、|投标撰写',
    'ch1': '|小红书运营', 'ch2': '小红书运营、|短视频投流', 'ch3': '短视频投流、|SEO优化', 'ch4': 'SEO优化、|海报设计', 'ch5': '海报设计、|宣传片制作',
    'erp': '现有的|ERP', 'crm': 'ERP、|CRM', 'oa': 'CRM、|OA',
    'fs': '|飞书', 'dd': '飞书、|钉钉', 'wx': '钉钉、|企业微信',
    'yd': '7×24小时|云端常驻', 'qyb3': '纳米Work企业版，让|AI' ,
}
# 字幕行：按语义断行，每行是文稿的一段连续文字（标点在显示时换成空格）
SUBS = [
    '每个老板都在想同一件事', '客户从哪来，生意怎么做大',
    'AI时代，答案变了', '以前你靠人海战术、靠经验、靠试错', '现在，一个AI工作台', '就能帮你从获客到成交', '把整条链路跑通',
    '这就是纳米Work企业版', '360打造的企业AI工作台',
    '它不是一个聊天机器人', '而是一整支随时待命的AI专家团队', '500多位AI专家', '覆盖营销获客、内容创作、视频制作', '数据分析、投标撰写等核心场景', '开箱即用，上手就能干活',
    '小红书运营、短视频投流、SEO优化', '海报设计、宣传片制作', '过去要找好几个人干的事', '现在一句话就能出稿', '做对一次，还能把经验变成技能', '全团队一键复用',
    '更关键的是，它不只是工具', '而是真正能融进你业务的平台', '纳米Work可以直连企业现有的', 'ERP、CRM、OA等业务系统', 'AI直接在你的系统里干活', '不用换平台，不用改流程',
    '同时不绑定任何单一生态', '飞书、钉钉、企业微信', '你用什么它就接什么',
    '安全方面，360二十年安全基因打底', '算力消耗清晰可查', '数据权限分级管控', '每一步操作都有迹可循',
    '睡前布置任务，醒来验收结果', '7×24小时云端常驻', '关了电脑照样干',
    '纳米Work企业版', '让AI真正帮你赚钱',
]

al = json.load(open(sys.argv[1], encoding='utf-8'))
script = (HERE / '口播稿.txt').read_text(encoding='utf-8').strip()
out = subprocess.run(['ffmpeg', '-hide_banner', '-i', al['audio'], '-af', 'silencedetect=noise=-36dB:d=0.05', '-f', 'null', '-'],
                     capture_output=True, text=True).stderr       # 短语内部的细停顿（列举的顿号处）
fine = list(zip(map(float, re.findall(r'silence_start: ([0-9.]+)', out)), map(float, re.findall(r'silence_end: ([0-9.]+)', out))))

def weight(ch):                                           # 每个字符占几个音节
    if re.match(r'[一-鿿]', ch): return 1.0
    if re.match(r'[A-Za-z]', ch): return 1.0
    return 0.0
SPECIAL = {'7×24': 5, '360': 3, '500': 2, 'Work': 2}      # 按读法：七乘二十四 / 三六零 / 五百 / 沃克

# 每个短语在文稿中的字符区间
spans, pos = [], 0
for p in al['phrases']:
    k = script.index(p['text'], pos); spans.append((k, k + len(p['text']), p)); pos = k + len(p['text'])

def char_weights(s):
    w = [weight(c) for c in s]
    for key, n in SPECIAL.items():
        for m in re.finditer(re.escape(key), s):
            for i in range(m.start(), m.end()): w[i] = n / len(key)
    return w

def time_at(ci):                                          # 文稿第 ci 个字符开始说的时刻（口播音频时间）
    for a, b, p in spans:
        if a <= ci <= b:
            s, e = p['start'], p['end']
            w = char_weights(script[a:b]); frac = sum(w[:ci - a]) / max(sum(w), 1e-6)
            gaps = [(g0, g1) for g0, g1 in fine if s < g0 and g1 < e]
            total = (e - s) - sum(g1 - g0 for g0, g1 in gaps); target = frac * total
            t, acc = s, 0.0                               # 沿说话时间走，跳过停顿
            for g0, g1 in gaps + [(e, e)]:
                if acc + (g0 - t) >= target: t = t + (target - acc); break
                acc += g0 - t; t = g1
            else: t = e
            if 0 < ci - a:                                # 吸附到附近停顿的结束点
                near = [(g0, g1) for g0, g1 in gaps if g0 - 0.3 < t < g1 + 0.3]
                if near: t = min(near, key=lambda g: min(abs(g[0] - t), abs(g[1] - t)))[1]
            return t if ci < b else e
    # 落在标点上：取下一个短语的开头
    nxt = [p['start'] for a, b, p in spans if a > ci]
    return nxt[0] if nxt else spans[-1][2]['end']

def locate(pat):
    ctx, word = pat.split('|'); k = script.index(ctx + word); return k + len(ctx)

f = lambda x: round(x + OFFSET, 3)
marks = {}
for i, (a, b, p) in enumerate(spans): marks[f'p{i}'] = f(p['start']); marks[f'p{i}e'] = f(p['end'])
for name, pat in MARKS.items(): marks[name] = f(time_at(locate(pat)))

subs, pos = [], 0
for s in SUBS:
    k = script.index(s, pos); pos = k + len(s)
    a = time_at(k); b = max(p['end'] for x, y, p in spans if x < pos and y >= pos) if any(x < pos <= y for x, y, _ in spans) else time_at(pos)
    # 行尾若在短语中间：取该处时刻
    inside = [(x, y, p) for x, y, p in spans if x < pos < y]
    if inside: b = time_at(pos)
    subs.append({'text': re.sub(r'[，、。；：——]+', '  ', s).strip(), 'start': a, 'end': b})
for i, s in enumerate(subs):                              # 前后衔接：间隔短于 0.6s 就连上，避免闪；否则尾部多留 0.25s
    s['start'] = s['start'] - 0.08
    nxt = subs[i + 1]['start'] - 0.08 if i + 1 < len(subs) else None
    s['end'] = nxt if nxt is not None and nxt - s['end'] < 0.6 else s['end'] + 0.25
for s in subs: s['start'], s['end'] = f(s['start']), f(s['end'])

vo = {'offset': OFFSET, 'audioDur': al['duration'], 'end': f(al['phrases'][-1]['end']), 'marks': marks, 'subs': subs}
src = ERAS.read_text(encoding='utf-8')
block = '// <VO> 由 video/audio/build_timeline.py 生成，不要手改\nwindow.VO = ' + json.dumps(vo, ensure_ascii=False, separators=(',', ':')) + ';\n// </VO>'
src = re.sub(r'// <VO>.*?// </VO>', lambda m: block, src, flags=re.S) if '// <VO>' in src else src + '\n' + block + '\n'
ERAS.write_text(src, encoding='utf-8')

def ts(x): h, r = divmod(x, 3600); m, s = divmod(r, 60); return f'{int(h):02}:{int(m):02}:{int(s):02},{int(round((s % 1) * 1000)) % 1000:03}'
out = HERE.parent / 'out'; out.mkdir(exist_ok=True)
(out / '字幕.srt').write_text(''.join(f"{i + 1}\n{ts(s['start'])} --> {ts(s['end'])}\n{s['text']}\n\n" for i, s in enumerate(subs)), encoding='utf-8')
for k in MARKS: print(f'{k:6} {marks[k]:7.2f}', file=sys.stderr)
for s in subs: print(f"{s['start']:7.2f}-{s['end']:7.2f} {s['text']}", file=sys.stderr)
