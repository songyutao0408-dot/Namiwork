"""口播 + 配乐 → 成片音轨。

  uv run --with numpy python mix.py   # 读 口播.wav 和 ../out/配乐.wav，写 ../out/混音.wav

- 口播放在成片 VO.offset 秒处（eras.js 的 VO 块），配乐从 0 秒开始。
- 配乐在有人声时自动压低（ducking）：人声包络 → 起 80ms、回 450ms 的平滑 → 最多压 7dB。
- 先把人声和配乐各自调到目标响度，再混合；最后用 ffmpeg loudnorm 两遍法整体到 -15 LUFS、真峰 -1.5 dBTP。
"""
import json, re, subprocess, wave
from pathlib import Path
import numpy as np

HERE = Path(__file__).parent; OUT = HERE.parent / 'out'
SR = 48000
src = (HERE.parent / 'engine' / 'demos' / 'namiwork' / 'eras.js').read_text(encoding='utf-8')
VO = json.loads(re.search(r'window\.VO = (\{.*?\});\n', src).group(1))

def load(p, sr=SR):                                       # 任意 wav → 48k 立体声 float
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-ar', str(sr), '-ac', '2', '-f', 's16le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, '<i2').reshape(-1, 2).astype(np.float64) / 32768
def lufs(x):                                              # 用 ffmpeg 量积分响度
    tmp = OUT / '_tmp.wav'; save(tmp, x)
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(tmp), '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    tmp.unlink(); return float(re.findall(r'I:\s+(-?[0-9.]+) LUFS', r)[-1])
def save(p, x):
    with wave.open(str(p), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())

music = load(OUT / '配乐.wav'); voice_raw = load(HERE / '口播.wav')
N = len(music); voice = np.zeros_like(music)
i = int(round(VO['offset'] * SR)); j = min(N, i + len(voice_raw)); voice[i:j] = voice_raw[:j - i]

voice *= 10 ** ((-16 - lufs(voice)) / 20)                 # 人声 -16 LUFS
music *= 10 ** ((-23 - lufs(music)) / 20)                 # 配乐铺底 -23 LUFS（再被 ducking 压）

# ducking：10ms 帧的人声电平 → 是否在说话 → 平滑成增益
hop = 480; fr = voice[:N // hop * hop, 0].reshape(-1, hop)
db = 10 * np.log10((fr ** 2).mean(1) + 1e-12); talk = (db > db.max() - 40).astype(float)
g = np.zeros_like(talk); a_up, a_dn = 1 - np.exp(-1 / 8), 1 - np.exp(-1 / 45)   # 起 80ms / 回 450ms
for k in range(1, len(talk)): g[k] = g[k - 1] + (a_up if talk[k] > g[k - 1] else a_dn) * (talk[k] - g[k - 1])
gain_db = -7.0 * g; gain = np.interp(np.arange(N), np.arange(len(g)) * hop + hop / 2, 10 ** (gain_db / 20))
mix = voice + music * gain[:, None]

pre = OUT / '_pre.wav'; save(pre, mix)
m = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(pre), '-af', 'loudnorm=I=-15:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
st = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(pre), '-af',
                f"loudnorm=I=-15:TP=-1.5:LRA=11:measured_I={st['input_i']}:measured_TP={st['input_tp']}:measured_LRA={st['input_lra']}:measured_thresh={st['input_thresh']}:offset={st['target_offset']}:linear=true",
                '-ar', str(SR), str(OUT / '混音.wav')], check=True)
pre.unlink()
print('混音 ->', OUT / '混音.wav', f"（混合前 {st['input_i']} LUFS，配乐在人声下平均压 {-gain_db[talk > 0].mean():.1f} dB）")
