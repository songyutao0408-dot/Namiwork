"""纳米Work企业版 产品片 · 配乐（原创，代码合成，无采样、无版权素材）。

  uv run --with numpy python bgm.py ../out/配乐.wav

轻快、温暖的科技感铺底：柔和钢琴动机 + 铺底和弦 + 拨弦琶音 + 轻脉冲，D 大调，I–V/3–vi–IV 四小节循环。
速度按片子算：第 44 小节的强拍正好落在落版「纳米Work」出现的那一刻（eras.js 里 s13 那句开口）。
段落跟着镜头走：
  0–2 小节  引子：铺底 + 稀疏钢琴                    （开场提问）
  2–10     加入拨弦琶音                              （AI 时代 → 产品亮相）
  10–25    加入低音与轻脉冲                          （专家团队 → 技能复用）
  25–40    琶音加高八度，略亮                          （业务系统 → 安全）
  40–44    收：只留铺底与钢琴                          （睡前布置 → 醒来验收）
  44–      主和弦落定，余响到片尾
"""
import json, re, sys, wave
from pathlib import Path
import numpy as np

SR = 48000
HERE = Path(__file__).parent
src = (HERE.parent / 'engine' / 'demos' / 'namiwork' / 'eras.js').read_text(encoding='utf-8')
VO = json.loads(re.search(r'window\.VO = (\{.*?\});\n', src).group(1))
TOTAL = VO['end'] + 3.0                                   # = eras.js 的 FILM_DURATION
HIT_BAR = 44
T_HIT = VO['marks']['p41']                                # 落版那句开口
BAR = T_HIT / HIT_BAR; BEAT = BAR / 4
N = int(TOTAL * SR) + 1
rng = np.random.default_rng(7)
L = np.zeros(N); Rt = np.zeros(N)

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def add(sig, t0, pan=0.0, gain=1.0):                      # pan: -1 左 … 1 右（等功率）
    i = int(round(t0 * SR)); j = min(N, i + len(sig))
    if j <= i: return
    a = (pan + 1) * np.pi / 4
    L[i:j] += sig[:j - i] * gain * np.cos(a); Rt[i:j] += sig[:j - i] * gain * np.sin(a)

# 和弦（MIDI）：D, A/C#, Bm, G；收尾段 G, A, Bm, Asus4
D, A_C, Bm, G, A, Asus = [50, 57, 62, 66, 69], [49, 57, 61, 64, 69], [47, 54, 62, 66, 69], [43, 55, 59, 62, 67], [45, 57, 61, 64, 69], [45, 57, 62, 64, 69]
LOOP = [D, A_C, Bm, G]
def chord(bar):
    if bar >= HIT_BAR: return D
    if bar >= 40: return [G, A, Bm, Asus][bar - 40]
    return LOOP[bar % 4]

# ---------- 音色 ----------
def piano(f, dur=3.0, vel=1.0):
    t = np.arange(int(dur * SR)) / SR; s = np.zeros_like(t)
    for n in range(1, 9):
        fn = f * n * np.sqrt(1 + 0.0004 * n * n)        # 轻微非谐
        if fn > 9000: break
        s += np.sin(2 * np.pi * fn * t) * (1 / n ** 1.3) * np.exp(-t * (0.9 + 0.55 * n)) * (0.55 if n > 3 else 1)
    att = np.minimum(1, t / 0.006)
    return s * att * vel * 0.32

def pluck(f, dur=0.9, vel=1.0):
    t = np.arange(int(dur * SR)) / SR
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) * np.exp(-t * 9) + 0.12 * np.sin(6 * np.pi * f * t) * np.exp(-t * 14)
    return s * np.exp(-t * 5.5) * np.minimum(1, t / 0.003) * vel * 0.16

def pad(notes, t0, t1, gain=1.0):
    dur = t1 - t0 + 1.2; t = np.arange(int(dur * SR)) / SR
    env = np.minimum(1, t / 0.7) * np.clip((dur - t) / 1.2, 0, 1)
    for k, m in enumerate(notes):
        f = hz(m + 12 if m < 52 else m); sl = np.zeros_like(t); sr_ = np.zeros_like(t)
        for d, side in ((-7, -1), (0, 0), (7, 1)):     # 三层失谐（音分），左右展开
            fd = f * 2 ** (d / 1200); ph = rng.uniform(0, 2 * np.pi)
            v = sum(np.sin(2 * np.pi * fd * n * t + ph * n) / n ** 2.2 for n in range(1, 6))
            sl += v * (0.5 - 0.35 * side); sr_ += v * (0.5 + 0.35 * side)
        lfo = 1 + 0.12 * np.sin(2 * np.pi * (0.13 + 0.02 * k) * t + k)
        i = int(round(t0 * SR)); j = min(N, i + len(t))
        L[i:j] += (sl * env * lfo)[:j - i] * gain * 0.045; Rt[i:j] += (sr_ * env * lfo)[:j - i] * gain * 0.045

def kick(vel=1.0):
    t = np.arange(int(0.35 * SR)) / SR
    f = 48 + 70 * np.exp(-t * 28); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 11) * vel * 0.38

def shaker(vel=1.0):
    n = rng.standard_normal(int(0.09 * SR)); n = np.diff(np.diff(n, prepend=0), prepend=0)   # 两次差分 ≈ 高通
    t = np.arange(len(n)) / SR
    return n * np.exp(-t * 55) * np.minimum(1, t / 0.004) * vel * 0.02

# ---------- 编排 ----------
bars = int(np.ceil(TOTAL / BAR))
for b in range(bars):
    t0 = b * BAR; ch = chord(b)
    if b < HIT_BAR: pad(ch, t0, t0 + BAR, gain=0.8 if b < 2 or b >= 40 else 1.0)
    if b >= HIT_BAR: break
    top = sorted(ch)[-3:]
    # 钢琴动机：每小节 3 个音（1 拍、2.5 拍、3.5 拍），两小节一问一答
    mot = [(0, top[2] + 12, 0.9), (1.5, top[1] + 12, 0.6), (2.5, top[0] + 12, 0.65)] if b % 2 == 0 else [(0, top[1] + 12, 0.8), (2, top[2] + 12, 0.55)]
    pv = 0.75 if 10 <= b < 40 else 1.0                     # 中段有琶音，钢琴退一点
    for beat, m, v in mot: add(piano(hz(m), vel=v * pv), t0 + beat * BEAT, pan=0.15 * np.sin(m))
    if 2 <= b < 40:                                       # 拨弦八分琶音
        arp = [ch[0] + 12, ch[2], ch[3], ch[2] + 12, ch[3] + 12, ch[2] + 12, ch[3], ch[1] + 12]
        for k in range(8):
            m = arp[k] + (12 if b >= 25 and k % 2 else 0)
            v = (0.9 if k % 2 == 0 else 0.6) * (0.75 if b < 10 else 1.0)
            add(pluck(hz(m), vel=v), t0 + k * BEAT / 2, pan=-0.45 if k % 2 == 0 else 0.45)
    if 10 <= b < 40:                                      # 低音 + 轻脉冲
        root = min(ch) - 12 if min(ch) >= 43 else min(ch)
        for beat in (0, 2):
            t = np.arange(int(BEAT * 1.9 * SR)) / SR
            bs = (np.sin(2 * np.pi * hz(root) * t) + 0.25 * np.sin(4 * np.pi * hz(root) * t)) * np.minimum(1, t / 0.02) * np.exp(-t * 1.6) * 0.22
            add(bs, t0 + beat * BEAT)
            add(kick(0.8 if beat == 0 else 0.6), t0 + beat * BEAT)
        for k in range(8): add(shaker(1.0 if k % 2 else 0.5), t0 + k * BEAT / 2, pan=0.3)
# 落版：主和弦 + 钢琴三音 + 长铺底
th = HIT_BAR * BAR
pad(D + [76], th, TOTAL - 0.5, gain=1.1)
for k, m in enumerate([62, 66, 69, 74, 78]): add(piano(hz(m + 12), dur=6.0, vel=0.7), th + k * 0.06, pan=-0.3 + 0.15 * k)
add(piano(hz(38), dur=6.0, vel=0.9), th)

# ---------- 混响（指数衰减噪声脉冲响应，FFT 卷积）----------
def reverb(x, sec=2.6, seed=0):
    r = np.random.default_rng(seed); n = int(sec * SR)
    ir = r.standard_normal(n) * np.exp(-np.arange(n) / SR * 6.9 / sec)
    F = np.fft.rfft(ir); fr = np.fft.rfftfreq(n, 1 / SR); ir = np.fft.irfft(F / (1 + (fr / 4500) ** 2), n)   # 暗一点
    ir /= np.sqrt(np.sum(ir ** 2)); m = len(x) + n
    size = 1 << (m - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[:len(x)]
wetL, wetR = reverb(L, seed=1), reverb(Rt, seed=2)
L, Rt = L + 0.28 * wetL, Rt + 0.28 * wetR

# 首尾淡入淡出，峰值归一到 -3 dBFS
fade = np.ones(N); fi = int(0.8 * SR); fo = int(2.0 * SR)
fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo) ** 1.5
L *= fade; Rt *= fade
pk = max(np.abs(L).max(), np.abs(Rt).max()); L, Rt = L / pk * 0.708, Rt / pk * 0.708
out = Path(sys.argv[1] if len(sys.argv) > 1 else HERE.parent / 'out' / '配乐.wav'); out.parent.mkdir(parents=True, exist_ok=True)
pcm = (np.stack([L, Rt], 1) * 32767).astype('<i2')
with wave.open(str(out), 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f'{out}  {TOTAL:.2f}s  BPM {60 / BEAT:.2f}  落版强拍 {T_HIT:.2f}s（第 {HIT_BAR} 小节）')
