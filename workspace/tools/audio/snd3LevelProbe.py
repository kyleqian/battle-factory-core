#!/usr/bin/env python3
"""snd3 level probe: is an SE louder in the game than in its recording? (lds1m lead 7, docs/snd3-pan-recordings.md section 5)

  PYTHONPATH=/srv/pokebench/vendor/libmgba-py /srv/pokebench/vendor/mgba-venv/bin/python tools/audio/snd3LevelProbe.py [OUT.json]

Canonical Factory state = the rental screen, so a RIGHT press there is a real in-game SE_SELECT (battle_factory_screen.c, SE2). Runs, all
deterministic (the same state, the same warm-up):
  A  silenced state (the recorder's own clean state): in-game press vs register-poked PlaySE(5): trimmed RMS, length, SE2 player / track bytes
  B  BGM playing, muted with m4aMPlayVolumeControl (what lds1m did): in-game press minus the same run without the press, per frame, vs the solo run
  C  BGM playing at full volume: the same subtraction; the SE takes DirectSound channels (maxChans 5) from the BGM, so the difference is not the SE
Nothing is written to the repo; it only measures.
"""
import array, json, math, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from soundRecorder import Recorder, ffi, say  # noqa: E402

rec = Recorder(26758)
o = rec.o
SE2 = rec.player_of(5)
W_CLEAN, W_BGM, N, AT = 30, 90, 45, 4
state_bgm = bytes(ffi.buffer(rec.core.save_raw_state()))
rec.prepare()
state_clean = rec.clean


def pcm():
    n = rec.audio.available
    buf = ffi.new("short[%i]" % (2 * n))
    got = rec.audio.read_into(buf, n)
    return list(array.array("h", bytes(ffi.buffer(buf, 4 * got))))


def rms(a):
    return math.sqrt(sum(x * x for x in a) / max(1, len(a)))


def run(state, how, warm, mute=False):
    """how: None (no SE), 'press' (RIGHT in frame AT), 'poke' (PlaySE(5) at the boundary before frame AT)."""
    rec.core.load_raw_state(state)
    rec.audio.clear()
    rec.audio.set_rate(rec.rate)
    if mute:
        rec.call("m4aMPlayVolumeControl", (rec.players[0], 0xFFFF, 0))
    for _ in range(warm):
        rec.frame()
    out, dump = [], None
    for f in range(N):
        if how == "poke" and f == AT:
            rec.call("PlaySE", (5,))
        rec.o.advance(["RIGHT"] if how == "press" and f == AT else [])
        out.append(pcm())
        s = o.read_u32(SE2 + 4)
        if dump is None and how and s & 0xFFFF and not s & 0x80000000:
            trk = o.read_u32(SE2 + 0x2C)
            dump = {"player": [o.read_u8(SE2 + k) for k in range(0x30)], "track0": [o.read_u8(trk + k) for k in range(0x50)] if trk else None}
    return out, dump


def trimmed(v):
    s = [x for fr in v for x in fr]
    idx = [i for i, x in enumerate(s) if abs(x) > 2]
    t = s[idx[0]: idx[-1] + 1]
    return {"rms": round(rms(t), 1), "stereoSamples": len(t) // 2, "leadSamples": idx[0] // 2}


res = {}
press, dp = run(state_clean, "press", W_CLEAN)
poke, dk = run(state_clean, "poke", W_CLEAN)
res["A_silenced"] = {"press": trimmed(press), "poke": trimmed(poke), "player+track bytes equal": dp == dk,
                     "perFrameRms press": [round(rms(f)) for f in press[AT:AT + 22]], "perFrameRms poke": [round(rms(f)) for f in poke[AT:AT + 22]]}

base_m, _ = run(state_bgm, None, W_BGM, mute=True)
with_m, _ = run(state_bgm, "press", W_BGM, mute=True)
diff_m = [[a - b for a, b in zip(x, y)] for x, y in zip(with_m, base_m)]
solo = press
flat = lambda v, lo, hi: [x for fr in v[lo:hi] for x in fr]
res["B_bgm_muted"] = {"bgmRms": round(rms(flat(base_m, 0, N)), 1), "pressMinusBase": trimmed(diff_m), "solo": trimmed(solo),
                      "ratio rms in-game / solo": round(rms(flat(diff_m, AT, N)) / rms(flat(solo, AT, N)), 4),
                      "perFrameRms in-game": [round(rms(f)) for f in diff_m[AT:AT + 22]]}

base_f, _ = run(state_bgm, None, W_BGM)
with_f, _ = run(state_bgm, "press", W_BGM)
diff_f = [[a - b for a, b in zip(x, y)] for x, y in zip(with_f, base_f)]
res["C_bgm_full"] = {"bgmRms": round(rms(flat(base_f, AT, N)), 1), "pressMinusBase rms": round(rms(flat(diff_f, AT, N)), 1),
                     "solo rms": round(rms(flat(solo, AT, N)), 1), "gSoundInfo maxChans": o.read_u8(rec.si + 6), "masterVolume": o.read_u8(rec.si + 7), "reverb": o.read_u8(rec.si + 5)}
say(json.dumps(res, indent=1))
if len(sys.argv) > 1:
    Path(sys.argv[1]).write_text(json.dumps(res, indent=1) + "\n")
