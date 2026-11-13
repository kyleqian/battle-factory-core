#!/usr/bin/env python3
"""aud244b loop cutter: raw song recordings (soundRecorder.py --kinds bgm,fanfare,seloop) -> one cut WAV + JSON per sound.

  python3 tools/audio/loopCut.py FULL_DIR CUT_DIR [--only KEY,..] [--window N] [--table FILE]

Looping sounds (bgm, seloop). The recorder logs the player's tick `clock` per frame, so the ROM loop boundaries (GOTO target tick
`loopStartTick` + k * (`loopEndTick` - `loopStartTick`)) are known in frames, and through the per-frame sample counts in samples (S_k).
Pass 0 (intro tails, first voice start-ups) is not steady state, so the loop body is taken from a later pass a >= 1: for every pass pair (a, a+1)
the end E = S_(a+1) + d is searched over +-SEARCH samples for the best match of the audio that FOLLOWS it in the recording (what the ROM plays
after the loop end) with the audio at S_a (max abs difference over `--window` samples, 2 channels). The best pair wins.
Cut file = rec[0 : S_0] (the intro, ROM-exact) + rec[S_a : E] (the steady-state loop body), loopStart = S_0, loopEnd = S_0 + (E - S_a).
Reported per song: nominal vs chosen end, seam max abs / rms difference (window after the wrap vs the ROM continuation), the same over the
whole loop body (pass a+1 vs the body), the junction difference (end of the intro vs the end of pass a-1, the context the spliced body had).
One-shot sounds (fanfares) are copied unchanged with `loops: false`.
"""
import argparse, array, json, math, wave
from pathlib import Path

SEARCH_FRAMES = 1.5          # +- this many frames of samples around the nominal loop end
STRIDE = 4                   # coarse search decimation
JUNCTION = 512               # samples compared at the intro -> loop junction


def read_wav(path):
    with wave.open(str(path)) as w:
        return array.array("h", w.readframes(w.getnframes())), w.getnchannels(), w.getframerate()


def write_wav(path, samples, channels, rate):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(channels)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(samples.tobytes())


def diff_stats(a, i, j, n):
    """(max abs, rms) of a[2i:2(i+n)] - a[2j:2(j+n)] over both channels."""
    x, y = a[2 * i:2 * (i + n)], a[2 * j:2 * (j + n)]
    n2 = min(len(x), len(y))
    if n2 == 0:
        return None
    d = [abs(p - q) for p, q in zip(x, y)]
    return max(d), math.sqrt(sum(v * v for v in d) / n2)


def coarse_score(a, i, j, n):
    return sum(abs(a[2 * (i + k)] - a[2 * (j + k)]) + abs(a[2 * (i + k) + 1] - a[2 * (j + k) + 1]) for k in range(0, n, STRIDE))


def pass_bounds(meta):
    loop = meta["loop"]
    t0, period = loop["loopStartTick"], loop["loopEndTick"] - loop["loopStartTick"]
    clocks, cum = meta["clockFrames"], [0]
    for n in meta["frameSamples"]:
        cum.append(cum[-1] + n)
    out = []
    for k in range(meta["passes"] + 1):
        frame = next(i for i, c in enumerate(clocks) if c >= t0 + k * period)
        out.append({"pass": k, "tick": t0 + k * period, "frame": frame, "sample": max(0, cum[frame] - meta["onsetSamples"])})
    return out


def seam_stats(a, s, e, window):
    """Max abs / rms difference between the audio after the wrap point (a[e:], what the ROM plays next) and after the loop start (a[s:]), and the same for the audio before
    them (a[:e] is what the loop body ends with, a[:s] is what preceded the loop start)."""
    fwd = diff_stats(a, s, e, window)
    bwd = diff_stats(a, s - window, e - window, window)
    return max(fwd[0], bwd[0]), math.sqrt((fwd[1] ** 2 + bwd[1] ** 2) / 2), fwd, bwd


def best_end(a, s, nominal, rate, window):
    """Search E near `nominal` (a sample index): best match of a[E:E+window] with a[s:s+window] (and a[E-window:E] with a[s-window:s])."""
    span = int(SEARCH_FRAMES * rate / 59.7275) + 8
    n_total = len(a) // 2
    coarse = []
    for d in range(-span, span + 1):
        if nominal + d + window <= n_total and s - window >= 0:
            coarse.append((coarse_score(a, s, nominal + d, 2048), d))
    coarse.sort()
    best = None
    for _, d0 in coarse[:6]:
        for d in range(d0 - STRIDE, d0 + STRIDE + 1):
            e = nominal + d
            if e + window > n_total:
                continue
            m, r, fwd, bwd = seam_stats(a, s, e, window)
            if best is None or (m, r) < (best[0], best[1]):
                best = (m, r, d, fwd, bwd)
    return best


MAX_PASSES_PER_LOOP = 4      # loop body = m ROM passes: a loop whose frame count is not a multiple of 8 puts the DirectSound samples on a different 512-cycle output-grid phase
EXACT_TOLERANCE = 16         # a candidate m within max(this, 1.5 x the best m's seam) of the best seam is accepted; the smallest such m wins


def cut_loop(meta, a, window):
    rate = meta["rate"]
    b = pass_bounds(meta)
    n_total = len(a) // 2
    margin = int(SEARCH_FRAMES * rate / 59.7275) + 8 + window
    cands = []
    for m in range(1, MAX_PASSES_PER_LOOP + 1):
        for k in range(1, len(b) - m):
            s, nom = b[k]["sample"], b[k + m]["sample"]
            if nom + margin > n_total:
                continue
            mx, r, d, fwd, bwd = best_end(a, s, nom, rate, window)
            cands.append({"passes": m, "pass": k, "start": s, "nominalEnd": nom, "end": nom + d, "endShift": d, "seamMax": mx, "seamRms": round(r, 2), "fwd": fwd, "bwd": bwd})
    per_m = {}
    for c in cands:
        if c["passes"] not in per_m or (c["seamMax"], c["seamRms"]) < (per_m[c["passes"]]["seamMax"], per_m[c["passes"]]["seamRms"]):
            per_m[c["passes"]] = c
    floor = min(c["seamMax"] for c in per_m.values())
    best = next(per_m[m] for m in sorted(per_m) if per_m[m]["seamMax"] <= max(EXACT_TOLERANCE, 1.5 * floor))
    s, e = best["start"], best["end"]
    s0 = b[0]["sample"]
    body = a[2 * s:2 * e]
    cut = array.array("h", a[:2 * s0]) + body
    loop_start, loop_end = s0, s0 + (e - s)
    body_len = e - s
    whole = diff_stats(a, s, e, min(body_len, n_total - e))
    j_n = min(JUNCTION, s0, s)
    junction = diff_stats(a, s0 - j_n, s - j_n, j_n) if j_n else None
    short = diff_stats(a, s, e, 256)
    sig_rms = math.sqrt(sum(v * v for v in body[::7]) / max(1, len(body[::7])))
    return cut, {
        "loopStartSamples": loop_start, "loopEndSamples": loop_end, "loopLengthSamples": loop_end - loop_start, "introSamples": s0,
        "loopPasses": best["passes"], "sourcePass": best["pass"], "sourceStartSample": s, "sourceEndSample": e, "nominalEndShift": best["endShift"],
        "seamWindowSamples": window, "seamMaxAbsDiff": best["seamMax"], "seamRmsDiff": best["seamRms"],
        "seamForwardMaxAbsDiff": best["fwd"][0], "seamBackwardMaxAbsDiff": best["bwd"][0],
        "bodyMaxAbsDiff": whole[0], "bodyRmsDiff": round(whole[1], 2), "junctionMaxAbsDiff": junction[0] if junction else None,
        "seamShortMaxAbsDiff": short[0], "seamShortRmsDiff": round(short[1], 2), "junctionSamples": j_n, "bodyRms": round(sig_rms, 1),
        "candidates": [{k: c[k] for k in ("passes", "pass", "endShift", "seamMax", "seamRms")} for c in cands],
        "loopFrames": (e - s) * 59.7275 / rate, "passBoundaries": b,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("full")
    ap.add_argument("cut")
    ap.add_argument("--only", default="")
    ap.add_argument("--window", type=int, default=8192)
    ap.add_argument("--table", default="")
    args = ap.parse_args()
    full, out = Path(args.full), Path(args.cut)
    out.mkdir(parents=True, exist_ok=True)
    want = set(args.only.split(",")) if args.only else None
    table = []
    for jf in sorted(full.glob("*.json")):
        meta = json.loads(jf.read_text())
        if want and meta["key"] not in want:
            continue
        a, ch, rate = read_wav(full / meta["file"])
        assert ch == 2 and rate == meta["rate"], jf
        stem = meta["file"].replace("-full.wav", "")
        rec = {k: meta[k] for k in ("key", "kind", "via", "name", "songId", "player", "rate", "channels", "onsetSamples", "framesRecorded", "lengthFrames", "loop") if k in meta}
        rec["id"] = meta.get("id") or meta.get("songId")
        rec["fullSha256"] = meta["sha256"]
        if meta["loop"]["loops"]:
            cut, info = cut_loop(meta, a, args.window)
            rec.update(info)
        else:
            cut = a
            rec["loops"] = False
        rec["loops"] = bool(meta["loop"]["loops"])
        rec["file"] = f"{stem}.wav"
        rec["lengthSamples"] = len(cut) // 2
        rec["peak"] = max(max(cut), -min(cut))
        rec["rms"] = round(math.sqrt(sum(v * v for v in cut[::5]) / max(1, len(cut[::5]))), 2)
        write_wav(out / rec["file"], cut, 2, rate)
        (out / f"{stem}.json").write_text(json.dumps(rec) + "\n")
        row = {k: rec.get(k) for k in ("key", "name", "loops", "loopStartSamples", "loopEndSamples", "loopPasses", "sourcePass", "nominalEndShift", "seamMaxAbsDiff", "seamRmsDiff", "seamForwardMaxAbsDiff", "seamBackwardMaxAbsDiff", "seamShortMaxAbsDiff", "bodyMaxAbsDiff", "bodyRmsDiff", "junctionMaxAbsDiff", "bodyRms", "peak", "lengthSamples")}
        table.append(row)
        print(json.dumps(row))
    if args.table:
        Path(args.table).write_text(json.dumps(table, indent=1) + "\n")


if __name__ == "__main__":
    main()
