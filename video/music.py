# A calm ambient bed for the demo video, composed in code (no samples, nothing to license).
#   python music.py <seconds>   → audio/music.wav (48 kHz stereo)
# Warm detuned pad over a slow I–vi–IV–V-ish progression in D, a soft sub, and a quiet
# plucked figure that comes in after the cold open. Simple multi-tap reverb for air.
import sys, wave, numpy as np

SR = 48000
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 270.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)

def hz(m):  # midi → Hz
    return 440.0 * 2 ** ((m - 69) / 12)

# D major-ish, soft and open: Dmaj9, Bm9, Gmaj7(#11), A6sus
CHORDS = [
    [50, 57, 62, 66, 69, 76],   # D  A  D  F# A  E
    [47, 54, 61, 62, 66, 73],   # B  F# C# D  F# C#
    [43, 50, 59, 62, 66, 73],   # G  D  B  D  F# C#
    [45, 52, 59, 61, 64, 71],   # A  E  B  C# E  B
]
BAR = 8.0  # seconds per chord: slow
pad = np.zeros((N, 2))
for k in range(int(DUR // BAR) + 2):
    start = k * BAR - 2.0  # overlap for smooth crossfades
    seg = (t >= start) & (t < start + BAR + 4.0)
    if not seg.any():
        continue
    lt = t[seg] - start
    env = np.clip(lt / 3.0, 0, 1) * np.clip((BAR + 4.0 - lt) / 3.0, 0, 1)
    env = env ** 1.6
    chord = CHORDS[k % len(CHORDS)]
    for i, m in enumerate(chord):
        f = hz(m)
        for det, pan in ((-0.0035, 0.25), (0.0035, 0.75)):
            ph = rng.uniform(0, 2 * np.pi)
            # soft "saw-ish" tone: a few decaying harmonics
            v = sum(np.sin(2 * np.pi * f * (1 + det) * h * lt + ph * h) / (h ** 1.8) for h in (1, 2, 3, 4))
            amp = 0.05 if m < 55 else 0.032
            pad[seg, 0] += v * env * amp * (1 - pan)
            pad[seg, 1] += v * env * amp * pan

# gentle low-pass: moving average, applied twice
def lp(x, n):
    k = np.ones(n) / n
    return np.stack([np.convolve(x[:, c], k, mode="same") for c in range(2)], axis=1)
pad = lp(lp(pad, 9), 9)

# slow breathing swell
pad *= (0.85 + 0.15 * np.sin(2 * np.pi * t / 23.0))[:, None]

# sub bass on chord roots
sub = np.zeros(N)
for k in range(int(DUR // BAR) + 1):
    s, e = int(k * BAR * SR), int(min(DUR, (k + 1) * BAR) * SR)
    lt = t[s:e] - k * BAR
    env = np.clip(lt / 1.5, 0, 1) * np.clip((BAR - lt) / 1.5, 0, 1)
    sub[s:e] += np.sin(2 * np.pi * hz(CHORDS[k % 4][0] - 12) * lt) * env * 0.06

# quiet plucked figure (enters after ~22 s), notes from the current chord
pl = np.zeros((N, 2))
step = BAR / 8
for i in range(int(DUR / step)):
    st = i * step
    if st < 22 or rng.random() < 0.35:
        continue
    chord = CHORDS[int(st // BAR) % 4]
    m = chord[rng.integers(2, len(chord))] + 12
    s = int(st * SR)
    L = int(2.4 * SR)
    lt = np.arange(min(L, N - s)) / SR
    v = (np.sin(2 * np.pi * hz(m) * lt) + 0.3 * np.sin(4 * np.pi * hz(m) * lt)) * np.exp(-lt * 2.2) * 0.018
    p = rng.uniform(0.3, 0.7)
    pl[s:s + len(lt), 0] += v * (1 - p)
    pl[s:s + len(lt), 1] += v * p

mix = pad + pl + sub[:, None]

# multi-tap reverb for air
rev = np.zeros_like(mix)
for d, g in ((0.031, 0.32), (0.047, 0.28), (0.071, 0.24), (0.113, 0.2), (0.167, 0.16), (0.251, 0.12), (0.379, 0.09)):
    n = int(d * SR)
    rev[n:, 0] += mix[:-n, 1] * g
    rev[n:, 1] += mix[:-n, 0] * g
mix = mix + lp(rev, 31) * 0.8

# fade in/out, normalise to -14 dBFS peak-ish (it sits under the voice)
fade = np.clip(t / 4.0, 0, 1) * np.clip((DUR - t) / 6.0, 0, 1)
mix *= fade[:, None]
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.2
pcm = (np.clip(mix, -1, 1) * 32767).astype("<i2")
with wave.open("audio/music.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f"music.wav {DUR:.1f}s")
