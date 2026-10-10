"""口播对齐：文稿已知，只需要找出每个标点断点落在音频的哪个时刻。不依赖语音识别模型。

两级动态规划：
  1. 分段：每个空行分段处对到一个长停顿（各段语速一致 ＋ 停顿越长越像分段）。
  2. 段内：每个标点断点对到一个停顿；逗号处 TTS 有时不停，所以也允许落在「没有停顿」的时刻（每 0.05s 一个候选，有罚分）。
代价 = 每个短语的语速偏离（对数平方）＋ 短语内部跳过的停顿（越长越罚）＋ 断点类型与停顿长度不符。

用法：python3 align.py 口播.wav 口播稿.txt > 时间轴.json
"""
import json, math, re, subprocess, sys

wav, txt = sys.argv[1], sys.argv[2]
raw = open(txt, encoding='utf-8').read().strip()

# 文稿 → 段 → 短语（按标点断开），记下每个短语后面的断点类型：句末 / 句中
paras = []
for para in [p for p in raw.split('\n') if p.strip()]:
    ph, kd, buf = [], [], ''
    for x in re.split(r'([，。；：？！]|——)', para):
        if re.fullmatch(r'[，。；：？！]|——', x or ''):
            if buf.strip(): ph.append(buf.strip()); kd.append('end' if x in '。？！' else 'mid')
            buf = ''
        else: buf += x
    if buf.strip(): ph.append(buf.strip()); kd.append('end')
    paras.append((ph, kd))

def syl(s):                                           # 估计音节数（按实际读法）
    s = s.replace('7×24', '七乘二十四').replace('360', '三六零').replace('500', '五百').replace('Work', '沃克')
    return max(len(re.findall(r'[一-鿿]', s)) + len(re.findall(r'[A-Za-z]', s)), 1)

def silences(noise, d):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-i', wav, '-af', f'silencedetect=noise={noise}dB:d={d}', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r'silence_start: ([0-9.]+)', out)]
    en = [float(x) for x in re.findall(r'silence_end: ([0-9.]+)', out)]
    return list(zip(st, en + [total] * (len(st) - len(en))))

total = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav],
                             capture_output=True, text=True).stdout)
coarse, fine = silences(-40, 0.12), silences(-36, 0.06)
head = coarse[0][1] if coarse and coarse[0][0] < 0.05 else 0.0
tail = coarse[-1][0] if coarse and coarse[-1][1] > total - 0.05 else total

def speech_in(a, b, gaps):                            # a..b 之间去掉停顿后的说话时长
    return (b - a) - sum(max(0, min(g1, b) - max(g0, a)) for g0, g1 in gaps)

# ---------- 1. 分段 ----------
PS = [sum(syl(p) for p in ph) for ph, _ in paras]
inner = [g for g in coarse if g[0] > head + 0.05 and g[1] < tail - 0.05]
rate = sum(PS) / speech_in(head, tail, coarse)
N, M, INF = len(paras) - 1, len(inner), 1e18
def pcost(i, a, b):
    sp = speech_in(a, b, inner)
    return (math.log(max(sp, 0.05) / (PS[i] / rate))) ** 2 * 20 + sum(25 * max(0, (g1 - g0) - 0.6) for g0, g1 in inner if a < g0 and g1 < b)
def gcost(g): return 40 * max(0, 0.75 - (g[1] - g[0]))
dp = [[INF] * M for _ in range(N)]; bk = [[-1] * M for _ in range(N)]
for j in range(M): dp[0][j] = pcost(0, head, inner[j][0]) + gcost(inner[j])
for i in range(1, N):
    for j in range(i, M):
        for p in range(i - 1, j):
            if dp[i - 1][p] < INF:
                v = dp[i - 1][p] + pcost(i, inner[p][1], inner[j][0]) + gcost(inner[j])
                if v < dp[i][j]: dp[i][j], bk[i][j] = v, p
j = min(range(M), key=lambda jj: dp[N - 1][jj] + pcost(N, inner[jj][1], tail) if dp[N - 1][jj] < INF else INF)
pick = [0] * N
for i in range(N - 1, -1, -1): pick[i] = j; j = bk[i][j]
bounds = [head] + [x for j in pick for x in inner[j]] + [tail]
pspans = [(bounds[2 * i], bounds[2 * i + 1]) for i in range(len(paras))]

# ---------- 2. 段内 ----------
out = []
for pi, ((ph, kd), (a, b)) in enumerate(zip(paras, pspans)):
    S = [syl(p) for p in ph]
    gaps = [g for g in fine if g[0] > a + 0.03 and g[1] < b - 0.03]
    r = sum(S) / speech_in(a, b, gaps)
    # 候选断点：真实停顿 (g0,g1)，或没有停顿的时刻 (t,t)
    cand = gaps + [(t, t) for t in [a + 0.05 * k for k in range(1, int((b - a) / 0.05))]
                   if not any(g0 - 0.08 <= t <= g1 + 0.08 for g0, g1 in gaps)]
    cand.sort()
    def scost(i, x, y):
        sp = speech_in(x, y, gaps)
        skipped = [g for g in gaps if x < g[0] and g[1] < y]
        return (math.log(max(sp, 0.05) / (S[i] / r))) ** 2 * 8 + sum(6 * (g1 - g0) ** 2 + (2 if g1 - g0 > 0.3 else 0) for g0, g1 in skipped)
    def bcost(i, g):
        L = g[1] - g[0]
        if L == 0: return 1.2 if kd[i] == 'mid' else 6     # 逗号处不停常见；句号处不停少见
        return 4 * max(0, (0.3 if kd[i] == 'end' else 0.1) - L)
    n, m = len(ph) - 1, len(cand)
    if n == 0: spans = [(a, b)]
    else:
        D = [[INF] * m for _ in range(n)]; K = [[-1] * m for _ in range(n)]
        for j in range(m): D[0][j] = scost(0, a, cand[j][0]) + bcost(0, cand[j])
        for i in range(1, n):
            for j in range(m):
                bc = bcost(i, cand[j])
                for p in range(j):
                    if D[i - 1][p] < INF and cand[p][1] < cand[j][0]:
                        v = D[i - 1][p] + scost(i, cand[p][1], cand[j][0]) + bc
                        if v < D[i][j]: D[i][j], K[i][j] = v, p
        j = min(range(m), key=lambda jj: D[n - 1][jj] + scost(n, cand[jj][1], b) if D[n - 1][jj] < INF else INF)
        pk = [0] * n
        for i in range(n - 1, -1, -1): pk[i] = j; j = K[i][j]
        bb = [a] + [x for j in pk for x in cand[j]] + [b]
        spans = [(bb[2 * i], bb[2 * i + 1]) for i in range(len(ph))]
    for i, (p, (x, y)) in enumerate(zip(ph, spans)):
        out.append({'para': pi, 'text': p, 'kind': 'para' if i == len(ph) - 1 else kd[i], 'start': round(x, 3), 'end': round(y, 3),
                    'syl': S[i], 'rate': round(S[i] / max(speech_in(x, y, gaps), 0.05), 2)})

json.dump({'audio': wav, 'duration': round(total, 3), 'speech': [round(head, 3), round(tail, 3)], 'phrases': out},
          sys.stdout, ensure_ascii=False, indent=1)
