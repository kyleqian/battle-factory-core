#!/usr/bin/env python3
"""prep45: Random2 / Random scan of a battle-animation script (pure python3, reads reference/pokeemerald only).

usage (from workspace/): prep45RandomScan.py <script label> ...
Follows call / goto / jumpargeq / choosetwoturnanim subroutines, expands the createsprite-wrapping macros of
asm/macros/battle_anim_script.inc, maps every sprite template to its callback and every visual task to its function, and reports
any callee (sprite callbacks, StoreSpriteCallbackInData6, CreateTask, task func reassignments; depth <= 4) whose body calls Random2 /
Random. "none" = no draw site reachable from the script by these edges.
"""
import re, sys, glob
S = open("reference/pokeemerald/data/battle_anim_scripts.s").read().split("\n")
labels = {}
for i, l in enumerate(S):
    m = re.match(r"^(\w+):", l)
    if m: labels[m.group(1)] = i
MAC = {}
for blk in re.findall(r"\.macro (\w+)(.*?)\.endm", open("reference/pokeemerald/asm/macros/battle_anim_script.inc").read(), re.S):
    t = re.findall(r"(?:\.4byte|createsprite) (g\w+Template)", blk[1])
    if t: MAC[blk[0]] = t
C = {f: open(f).read() for f in glob.glob("reference/pokeemerald/src/battle_anim*.c")}
def body(label, seen):
    if label in seen: return []
    seen.add(label); out = []
    i = labels[label] + 1
    while i < len(S) and not re.match(r"^\w+:", S[i]):
        l = S[i].strip(); out.append(l)
        m = re.match(r"(call|goto|jumpargeq \S+ \S+|jumpifcontest|choosetwoturnanim|jumpreteq \S+)\s*(.*)", l)
        if m:
            for t in re.findall(r"\b([A-Z]\w+)\b", m.group(2)):
                if t in labels: out += body(t, seen)
        if l.startswith("end") or l.startswith("goto"): break
        i += 1
    return out
def func(name):
    for f, src in C.items():
        m = re.search(r"\n(?:static )?void " + name + r"\(struct (?:Sprite \*sprite|Sprite\* sprite|Sprite \*)\)\s*\{", src) or re.search(r"\n(?:static )?void " + name + r"\(u8 taskId\)\s*\{", src)
        if m:
            j = m.end(); depth = 1
            while depth: depth += {"{": 1, "}": -1}.get(src[j], 0); j += 1
            return f, src[m.start():j]
    return None, ""
def scan(name, depth=0, seen=None):
    seen = seen or set()
    if name in seen or depth > 4: return []
    seen.add(name); f, b = func(name); hits = []
    if "Random2" in b or "Random()" in b: hits.append(f"{name} ({f.split('/')[-1]})")
    for callee in set(re.findall(r"callback\s*=\s*(\w+)|StoreSpriteCallbackInData6\(sprite, (\w+)\)|CreateTask\((\w+)|gTasks\[taskId\]\.func\s*=\s*(\w+)", b)):
        for c in callee:
            if c: hits += scan(c, depth + 1, seen)
    return hits
for lab in sys.argv[1:]:
    lines = body(lab, set())
    templates = set(re.findall(r"createsprite (\w+)", "\n".join(lines)))
    for l in lines:
        w = l.split(" ")[0]
        if w in MAC: templates |= set(MAC[w])
    tasks = set(re.findall(r"createvisualtask (\w+)", "\n".join(lines)))
    hits = []
    for t in sorted(templates):
        m = re.search(r"const struct SpriteTemplate " + t + r"\b[^;]*?\.callback = (\w+)", "".join(C.values()), re.S)
        if m: hits += [f"{t}->{h}" for h in scan(m.group(1))]
    for t in sorted(tasks): hits += [f"task {h}" for h in scan(t)]
    print(lab, "templates", len(templates), "tasks", len(tasks), "RANDOM:", sorted(set(hits)) or "none")
