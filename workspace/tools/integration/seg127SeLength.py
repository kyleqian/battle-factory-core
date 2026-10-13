#!/usr/bin/env python3
"""seg127 (S10A / ISSUES #168 SA2 prep; docs/seg127-status-se-gate.md): source length of a battle SE in rows (VBlank m4a ticks).

usage: seg127SeLength.py <song> [<song> ...]      (e.g. se_effective; reads reference/pokeemerald/sound/songs/midi/<song>.s)
Per track: ticks until FINE (sum of Wxx waits; the song files of the effectiveness SEs use no GOTO / PATT / tempo change after tick 0).
m4a timing (m4a.c MPlayStart / MPlayMain): a fresh song starts with tempoI 150, tempoC 0, so the first VBlank after the start runs
exactly tick 0 (which executes TEMPO t: tempoI = 2 t from then on); every later VBlank adds tempoI to tempoC and runs one tick per 150.
The player's status keeps its track bits while any track exists; the track whose wait sum is T processes FINE on tick T, and the
first tick with no track left sets MUSICPLAYER_STATUS_PAUSE. Printed: T (longest track), tempoI, the VBlank index of tick T and of
tick T + 1 (the predicted last "playing" VBlank is between them; the probe measures it).
"""
import math, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
for song in sys.argv[1:]:
    src = open(os.path.join(ROOT, "reference/pokeemerald/sound/songs/midi", song + ".s")).read()
    tbs = int(re.search(rf"\.equ\s+{song}_tbs,\s*(\d+)", src).group(1))
    tempos = re.findall(r"TEMPO\s*,\s*(\d+)\*\w+_tbs/2", src)
    assert len(tempos) == 1, (song, tempos)
    assert not re.search(r"\b(GOTO|PATT|PEND|REPT)\b", src), song
    tempo_i = int(tempos[0]) * tbs // 2 * 2
    tracks = re.split(r"\n\w+_\d+:\n", src)[1:]
    ticks = [sum(int(w) for w in re.findall(r"\.byte\s+W(\d\d)\b", t.split("FINE")[0])) for t in tracks]
    t = max(ticks)
    frame_of = lambda n: 0 if n == 0 else math.ceil((n * 150) / tempo_i)  # tick n >= 1 runs on the VBlank where 150 + ... crosses
    print(f"{song}: tracks {ticks}, T {t}, tempoI {tempo_i}, tick T at VBlank {frame_of(t)}, tick T+1 at VBlank {frame_of(t + 1)}")
