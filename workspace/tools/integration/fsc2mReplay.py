#!/usr/bin/env python3
"""fsc2m: rewrite a lab's trace as the explicit button schedule a fsc2mProbe.py run used, so soundEventProbe.py `lab` replays the same frames.

usage: fsc2mReplay.py <lab.json> <probe.json> <out-lab.json>
"""
import json, sys
lab, probe = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
presses, total = set(probe["presses"]), probe["frameCount"]
segments, frame = [], 1
while frame <= total:
    a = frame in presses
    end = frame
    while end + 1 <= total and ((end + 1) in presses) == a and (not a):
        end += 1
    segments.append({"frames": end - frame + 1, "buttons": ["A"] if a else []})
    frame = end + 1
lab["trace"]["segments"] = segments
json.dump(lab, open(sys.argv[3], "w"))
