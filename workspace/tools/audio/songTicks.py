#!/usr/bin/env python3
"""ROM song loop structure (aud244b): tick offsets of track 1's loop (GOTO target label -> GOTO) from sound/songs/midi/<song>.s.

Songs go through the committed tests/fixtures/data/audio-sound-sources.json `songLoops` (the aud238 extractor already resolved PATT / PEND
calls); the two looping SEs (SE_LOW_HEALTH, SE_M_GUST) are single-track songs without patterns, so their W waits are summed directly here.
Tempo: `TEMPO, n` is n * 2 BPM; the m4a player advances `BPM / 150` ticks per VBlank (tempoI / 150), so a loop is an integer number of
frames exactly when its tick count * 150 / BPM is an integer.
"""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MIDI = ROOT / "reference/pokeemerald/sound/songs/midi"
SOURCES = ROOT / "tests/fixtures/data/audio-sound-sources.json"


def song_loops():
    return {r["songId"]: r for r in json.loads(SOURCES.read_text())["songLoops"]}


def parse_se_track(name):
    """Single-track SE: returns {loops, loopStartTick, loopEndTick, totalTicks, tempoBpm}. Raises on PATT / REPT (not used by the two loopers)."""
    tick, labels, loop, tempo = 0, {}, None, 150
    src = (MIDI / f"{name}.s").read_text()
    body = src.split("@**************** Track 1", 1)[1].split("@*****", 1)[0]
    for line in body.splitlines():
        line = line.split("@", 1)[0]
        m = re.match(r"^(\w+):\s*$", line)
        if m:
            labels[m.group(1)] = tick
            continue
        if re.search(r"\b(PATT|PEND|REPT)\b", line):
            raise ValueError(f"{name}: pattern / repeat commands need the songLoops extractor")
        m = re.search(r"\.byte\s+TEMPO\s*,\s*150\*\w+/2", line)
        if m:
            tbs = int(re.search(rf"\.equ\s+{name}_tbs,\s*(\d+)", src).group(1))
            tempo = 150 * tbs
        m = re.search(r"\bW(\d+)\b", line)
        if m and ".byte" in line:
            tick += int(m.group(1))
        if re.match(r"\s*\.byte\s+GOTO", line):
            loop = {"gotoTick": tick}
        m = re.match(r"\s*\.word\s+(\w+)", line)
        if m and loop is not None and "target" not in loop:
            loop["target"] = m.group(1)
    if loop is None:
        return {"loops": False, "loopStartTick": None, "loopEndTick": None, "totalTicks": tick, "tempoBpm": tempo}
    return {"loops": True, "loopStartTick": labels[loop["target"]], "loopEndTick": loop["gotoTick"], "totalTicks": loop["gotoTick"], "tempoBpm": tempo}


def frames_per_loop(ticks, bpm):
    return ticks * 150 / bpm


if __name__ == "__main__":
    for n in ("se_low_health", "se_m_gust"):
        r = parse_se_track(n)
        print(n, r, "frames per loop", frames_per_loop(r["loopEndTick"] - r["loopStartTick"], r["tempoBpm"]))
    for sid, r in sorted(song_loops().items()):
        if r["loops"] and sid in (354, 412, 469, 471, 476):
            bpm = r["tempoBpm"][-1][1]
            print(r["song"], sid, r["loopStartTick"], r["loopEndTick"], bpm, "frames per loop", frames_per_loop(r["loopEndTick"] - r["loopStartTick"], bpm))
