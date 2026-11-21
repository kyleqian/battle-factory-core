#!/usr/bin/env python3
"""Frame catcher (README.md, "Pick rounds"): seed scan for a targeted sweep: make engine-only traces for many seeds, then pick the set of traces that
together show the most moves / items / abilities the earlier sweeps never showed.

  python3 tools/frame-catcher/pickTraces.py make GAME OUTDIR --seeds 0-199 --scenes on,off --policy coverage-fight --battles 7 --jobs 6
  python3 tools/frame-catcher/pickTraces.py pick GAME OUTDIR --seen DIR1,DIR2 --count 30 [--on-share 0.65]
"""
import argparse, glob, json, os, re, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

USED = re.compile(r"used ([A-Z0-9 \-’']+?)!")


def norm(s):
    return s.replace("’", "'").replace("-", " ").strip()


def pool(game):
    mons = json.load(open(f"{game}/src/data/gen/battle-frontier-mons.json"))["entries"]
    moves = {norm(m.replace("MOVE_", "").replace("_", " ")) for e in mons for m in e["moves"] if m != "MOVE_NONE"}
    items = {norm(e["itemName"].replace("BATTLE_FRONTIER_ITEM_", "").replace("_", " ")) for e in mons}
    return moves, items


ABILITY_HINTS = ["INTIMIDATE", "STATIC", "ROUGH SKIN", "EFFECT SPORE", "FLAME BODY", "POISON POINT", "CUTE CHARM", "SYNCHRONIZE",
                 "SPEED BOOST", "SHED SKIN", "TRACE", "DRIZZLE", "DROUGHT", "SAND STREAM", "PRESSURE", "LIGHTNINGROD", "VOLT ABSORB",
                 "WATER ABSORB", "FLASH FIRE", "LEVITATE", "WONDER GUARD", "STURDY", "SHADOW TAG", "ARENA TRAP", "MAGNET PULL",
                 "NATURAL CURE", "LIQUID OOZE", "SUCTION CUPS", "SOUNDPROOF", "RAIN DISH", "COLOR CHANGE", "IMMUNITY", "INSOMNIA",
                 "VITAL SPIRIT", "OWN TEMPO", "OBLIVIOUS", "INNER FOCUS", "LIMBER", "KEEN EYE", "HYPER CUTTER", "CLEAR BODY",
                 "WHITE SMOKE", "SHIELD DUST", "TRUANT", "PLUS", "MINUS", "FORECAST", "DAMP", "STICKY HOLD", "STENCH", "SWIFT SWIM"]
OTHER_HINTS = ["sandstorm", "hail", "rain", "sunlight", "Substitute", "SUBSTITUTE", "Baton", "Perish", "Destiny", "Future", "Doom",
               "Curse", "Spikes", "spikes", "Leech", "seeded", "Wrap", "Bind", "Clamp", "Whirlpool", "Fire Spin", "FIRE SPIN", "Sand Tomb",
               "confused", "infatuat", "Taunt", "taunt", "Encore", "encore", "Disable", "disabled", "Torment", "Yawn", "drowsy",
               "Nightmare", "frozen", "burned", "badly poisoned", "fell asleep", "paralyzed", "critical hit", "One-hit KO", "flinched",
               "Protect", "protected", "Endure", "endured", "Reflect", "LIGHT SCREEN", "Safeguard", "Mist", "Ingrain", "Wish", "Snatch",
               "Magic Coat", "Transform", "transformed", "Struggle", "Recharge", "must recharge", "Rollout", "Uproar", "uproar",
               "Bide", "Counter", "Mirror Coat", "Rage", "Thrash", "Outrage", "Petal Dance", "Focus", "Charge", "Imprison", "Grudge"]


def features(text, moves, items):
    used = {norm(m) for m in USED.findall(text)} & moves
    f = {("move", m) for m in used}
    f |= {("item", i) for i in items if i in norm(text)}
    f |= {("ability", a) for a in ABILITY_HINTS if f"’s {a}" in text or f"'s {a}" in text}
    f |= {("event", h.lower()) for h in OTHER_HINTS if h in text}
    return f


def cmd_make(a):
    os.makedirs(a.out, exist_ok=True)
    lo, hi = (int(x) for x in a.seeds.split("-"))
    jobs = [(s, sc) for s in range(lo, hi + 1) for sc in a.scenes.split(",")]
    mk = f"{a.game}/tools/frame-catcher/makeTrace.mjs"

    def run(job):
        s, sc = job
        out = os.path.abspath(f"{a.out}/s{s}-{sc}-{a.tag}.json")
        if os.path.exists(out):
            return out
        r = subprocess.run(["node", "--experimental-strip-types", "--no-warnings", mk, out, "--seed", str(s), "--scene", sc, "--policy",
                            a.policy, "--battles", str(a.battles), "--max-frames", str(a.max_frames), "--game", a.game] + (["--lobby-tail", str(a.lobby_tail)] if a.lobby_tail else []),
                           cwd=a.game, capture_output=True, text=True)
        print(r.stdout.strip() or r.stderr.strip()[-300:], flush=True)
        return out

    with ThreadPoolExecutor(a.jobs) as ex:
        list(ex.map(run, jobs))


def cmd_pick(a):
    moves, items = pool(a.game)
    seen = set()
    for d in a.seen.split(","):
        for f in glob.glob(f"{d}/*.lines.txt"):
            seen |= features(open(f).read(), moves, items)
    cand = {}
    for f in glob.glob(f"{a.out}/*.lines.txt"):
        t = open(f).read()
        cand[f.replace(".lines.txt", ".json")] = (features(t, moves, items), t.count("-- battle"))
    print(f"pool: {len(moves)} moves, {len(items)} items; seen before: {sum(1 for k in seen if k[0]=='move')} moves, "
          f"{sum(1 for k in seen if k[0]=='item')} items, {sum(1 for k in seen if k[0]=='ability')} abilities, "
          f"{sum(1 for k in seen if k[0]=='event')} events; candidates {len(cand)}")
    # weights: a move's animation is drawn only in Scene ON, so a move counts fully only there
    def gain(path, have):
        fs, _ = cand[path]
        on = "-on-" in os.path.basename(path)
        g = 0.0
        for k in fs - have:
            g += (1.0 if on else 0.35) if k[0] == "move" else 1.0
        return g
    have = set(seen)
    picked = []
    n_on = round(a.count * a.on_share)
    for i in range(a.count):
        want_on = sum(1 for p in picked if "-on-" in p) < n_on
        pool_paths = [p for p in cand if p not in picked and (("-on-" in os.path.basename(p)) == want_on)] or \
                     [p for p in cand if p not in picked]
        best = max(pool_paths, key=lambda p: (gain(p, have), -cand[p][1]))
        g = gain(best, have)
        if g <= 0:
            break
        new = cand[best][0] - have
        have |= cand[best][0]
        picked.append(best)
        print(f"{i+1:2d} {os.path.basename(best)} +{g:.1f}: " + ", ".join(sorted(f"{k[1]}" for k in new))[:400])
    print(f"after: {sum(1 for k in have if k[0]=='move')} moves, {sum(1 for k in have if k[0]=='item')} items, "
          f"{sum(1 for k in have if k[0]=='ability')} abilities, {sum(1 for k in have if k[0]=='event')} events")
    unseen = sorted(m for m in moves if ("move", m) not in have)
    print(f"moves still unseen ({len(unseen)}):", ", ".join(unseen))
    json.dump(picked, open(f"{a.out}/picked.json", "w"), indent=1)


p = argparse.ArgumentParser()
sub = p.add_subparsers(dest="cmd", required=True)
m = sub.add_parser("make"); m.add_argument("game"); m.add_argument("out"); m.add_argument("--seeds", default="0-99")
m.add_argument("--scenes", default="on,off"); m.add_argument("--policy", default="coverage-fight"); m.add_argument("--battles", type=int, default=7)
m.add_argument("--max-frames", type=int, default=140000); m.add_argument("--jobs", type=int, default=6); m.add_argument("--tag", default="cf"); m.add_argument("--lobby-tail", type=int, default=0)
k = sub.add_parser("pick"); k.add_argument("game"); k.add_argument("out"); k.add_argument("--seen", required=True)
k.add_argument("--count", type=int, default=30); k.add_argument("--on-share", type=float, default=0.65)
a = p.parse_args()
cmd_make(a) if a.cmd == "make" else cmd_pick(a)
