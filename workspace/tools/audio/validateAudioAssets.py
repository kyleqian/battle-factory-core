#!/usr/bin/env python3
"""aud244a spot validation: decode committed OGGs (libvorbisfile via ctypes) and compare with the raw recorder captures.

  python3 tools/audio/validateAudioAssets.py [--raw DIR] [--keys KEY,KEY,...] [--out FILE]

Per key: decoded slice vs raw WAV (Pearson correlation, SNR in dB at lag 0), RMS, peak/clipping of the decoded audio, recorded
length in frames vs the ROM-log duration (cries: cry start -> the BGM-duck restore `IsCryPlaying` event in the aud237..aud243
logs, +-2 frames expected from the duck task's polling) or vs the channel-activity duration (SEs: audible frames must end
within [lengthFrames - 4, lengthFrames + 8]). Pure python3 + libvorbisfile.so.3; no emulator.
"""
import argparse, array, collections, ctypes, glob, json, math, wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AUDIO = ROOT / "src/assets/gen/audio"
FPS = 59.7275
DEFAULT_KEYS = ["se:5:none", "se:16:63", "se:139:-63", "cry:19:FAINT", "cry:95:WEAK", "cry:19:NORMAL"]


def decode_ogg(path):
    vf = ctypes.CDLL("libvorbisfile.so.3")
    vf.ov_info.restype = ctypes.POINTER(ctypes.c_int * 4)
    ovf = ctypes.create_string_buffer(4096)
    if vf.ov_fopen(str(path).encode(), ovf) != 0:
        raise RuntimeError(f"ov_fopen failed: {path}")
    info = vf.ov_info(ovf, -1).contents
    channels, rate = info[1], info[2]
    out, buf, bit = bytearray(), ctypes.create_string_buffer(65536), ctypes.c_int(0)
    while True:
        n = vf.ov_read(ovf, buf, 65536, 0, 2, 1, ctypes.byref(bit))
        if n <= 0:
            break
        out += buf.raw[:n]
    vf.ov_clear(ovf)
    return array.array("h", bytes(out)), channels, rate


def pearson_snr(a, b):
    n = min(len(a), len(b))
    sa = sb = saa = sbb = sab = err = 0.0
    for i in range(n):
        x, y = a[i], b[i]
        sa += x; sb += y; saa += x * x; sbb += y * y; sab += x * y; err += (x - y) ** 2
    cov = sab - sa * sb / n
    corr = cov / math.sqrt(max((saa - sa * sa / n) * (sbb - sb * sb / n), 1e-9))
    snr = 10 * math.log10(max(sbb, 1e-9) / max(err, 1e-9))
    return corr, snr


def rom_cry_durations():
    """(species, mode) -> [frames from the cry event to the next IsCryPlaying duck restore] over the committed logs."""
    out = collections.defaultdict(list)
    for f in sorted(glob.glob(str(ROOT / "tools/audio/fixtures/*.json"))):
        ev = json.loads(Path(f).read_text()).get("events") or []
        for i, e in enumerate(ev):
            if e.get("kind") != "cry":
                continue
            for d in ev[i + 1:i + 8]:
                if d["kind"] == "duck" and d.get("via") == "IsCryPlaying" and d.get("volume") == 256:
                    out[(e["id"], e["mode"])].append(d["frame"] - e["frame"])
                    break
                if d["kind"] == "cry":
                    break
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", default=str(ROOT / ".integration/evidence/aud244a/raw"))
    ap.add_argument("--audio", default=str(AUDIO))
    ap.add_argument("--keys", default=",".join(DEFAULT_KEYS))
    ap.add_argument("--out", default="")
    a = ap.parse_args()
    audio = Path(a.audio)
    manifest = json.loads((audio / "manifest.json").read_text())
    cry_logs = rom_cry_durations()
    report, decoded_cache = [], {}
    for key in a.keys.split(","):
        m = manifest["sounds"][key]
        raw_meta = next(json.loads(Path(f).read_text()) for f in glob.glob(f"{a.raw}/*.json") if json.loads(Path(f).read_text())["key"] == key)
        w = wave.open(f"{a.raw}/{raw_meta['file']}")
        raw = array.array("h", w.readframes(w.getnframes()))
        if m["file"] not in decoded_cache:
            decoded_cache[m["file"]] = decode_ogg(audio / m["file"])
        dec, ch, rate = decoded_cache[m["file"]]
        assert ch == m["channels"] and rate == m["sampleRate"], (ch, rate, m)
        s0, n = m["offsetSamples"] * ch, m["lengthSamples"] * ch
        d = dec[s0:s0 + n]
        corr, snr = pearson_snr(d, raw)
        rms = math.sqrt(sum(x * x for x in d) / len(d))
        spf = rate / FPS
        audible = [i for i in range(0, len(raw), ch) if max(abs(raw[i + c]) for c in range(ch)) > 2]
        audible_end_frames = (m["onsetSamples"] + (audible[-1] // ch + 1)) / spf
        row = {"key": key, "file": m["file"], "channels": ch, "sampleRate": rate, "lengthSamples": m["lengthSamples"], "lengthFrames": m["lengthFrames"],
               "decodedSamples": len(dec) // ch, "corr": round(corr, 4), "snrDb": round(snr, 1), "rms": round(rms, 1), "peak": max(max(d), -min(d)),
               "clipped": sum(1 for x in d if x >= 32767 or x <= -32768), "audibleEndFrames": round(audible_end_frames, 1)}
        if m["kind"] == "cry":
            log = cry_logs.get((m["species"], m["mode"]), [])
            row["romLogFrames"] = sorted(set(log))
            row["lengthMatchesLog"] = any(abs(x - m["lengthFrames"]) <= 2 for x in log)
        else:
            row["lengthMatchesActivity"] = m["lengthFrames"] - 4 <= audible_end_frames <= m["lengthFrames"] + 8
        report.append(row)
        print(json.dumps(row))
    # whole-set cry duration check against every ROM-log (species, mode) with a duck-restore pair
    diffs = []
    for (sp, mode), frames in sorted(cry_logs.items()):
        m = manifest["sounds"].get(f"cry:{sp}:{mode}")
        if m:
            diffs += [(f"cry:{sp}:{mode}", f, m["lengthFrames"]) for f in frames]
    off = [d for d in diffs if abs(d[1] - d[2]) > 2]
    summary = {"cryLogPairs": len(diffs), "within2Frames": len(diffs) - len(off), "outside": off[:20]}
    print(json.dumps(summary))
    if a.out:
        Path(a.out).write_text(json.dumps({"spot": report, "cryLogSummary": summary}, indent=1) + "\n")


if __name__ == "__main__":
    main()
