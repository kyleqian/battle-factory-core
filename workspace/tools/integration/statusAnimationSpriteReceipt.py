#!/usr/bin/env python3
"""Build tools/integration/fixtures/status-animation-sprite-audit.json (+ trimmed raw) from batch output (pure python3).

usage: statusAnimationSpriteReceipt.py <batch-rawdir> [--write]
Per scenario x run window: create/destroy stream (slot/template/tags/bank, frame relative to activation), occupied
before/at-end/after sets, net-zero, late (post-end) changes, palette tag loads/frees, OBJ unfaded-bank changes, and the
spriteOrderEventModel 'array' variant hit/miss over the window.  Committed raw keeps only change rows of each window.
"""
import collections, hashlib, importlib.util, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FIX = ROOT / "tools/integration/fixtures"
OUT_RAW = FIX / "status-animation-sprite-raw"
RECEIPT = FIX / "status-animation-sprite-audit.json"
spec = importlib.util.spec_from_file_location("som", ROOT / "tools/integration/spriteOrderEventModel.py")
som = importlib.util.module_from_spec(spec); spec.loader.exec_module(som)

STATUS_TABLE = {"Status_Poison": "PSN", "Status_Confusion": "CONFUSION", "Status_Burn": "BRN", "Status_Infatuation": "INFATUATION",
                "Status_Sleep": "SLP", "Status_Paralysis": "PRZ", "Status_Freeze": "FRZ", "Status_Curse": "CURSED",
                "Status_Nightmare": "NIGHTMARE"}
TRAP = {"Status_BindWrap", "Status_FireSpin", "Status_Whirlpool", "Status_Clamp", "Status_SandTomb"}


def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def shab(b): return hashlib.sha256(b).hexdigest()
def slots(mask): return [i for i in range(64) if mask >> i & 1]


def model_per_frame(d):
    rows = [{"n": r[0], "tf": r[1], "order": list(bytes.fromhex(r[2])), "mask": int(r[3], 16), "act": r[4], "mv": r[5], "keys": None}
            for r in d["rows"]]
    seq = som.frames_of(rows, d["lastFrame"])
    F = [s for s in seq[0][1]["order"] if not seq[0][1]["mask"] >> s & 1]
    res, prev = {}, seq[0][1]
    for n, r in seq[1:]:
        F, _ = som.step(F, prev["order"], prev["mask"], r["mask"], "array")
        obs = som.free_order(r["order"], r["mask"])
        res[n] = F == obs
        if not res[n]:
            res[n] = (False, F[:8], obs[:8])
            F = obs
        prev = r
    return res


def analyse(d, mres):
    out = []
    for w in d["windows"]:
        fr = w["frames"]
        act = w["activationFrame"]
        endf = w["endFrame"]
        creates, destroys, late = [], [], []
        prevtags, tagloads, tagfrees = fr[0]["tags"], [], []
        bank_base = fr[0]["banks"]
        for f in fr[1:]:
            rel = f["n"] - act
            for s, i in sorted(f["creates"].items(), key=lambda kv: int(kv[0])):
                creates.append([rel, int(s), i["template"], i["tileTag"], i["palTag"], i["bank"], i["callback"]])
            for s, i in sorted(f["destroyed"].items(), key=lambda kv: int(kv[0])):
                destroys.append([rel, int(s), i["template"] if i else None, i["tileTag"] if i else None])
            if f["n"] > endf and (f["creates"] or f["destroyed"]):
                late.append(f["n"] - endf)
            for b, (a, c) in enumerate(zip(prevtags, f["tags"])):
                if a != c:
                    (tagloads if c != 0xFFFF else tagfrees).append([rel, b, hex(c if c != 0xFFFF else a)])
            prevtags = f["tags"]
        bank_changes = [b for b in range(16) if bank_base[b] != fr[-1]["banks"][b]]
        # unfaded OBJ writes during the window (any frame), not just net
        transient = sorted({b for f in fr for b in range(16) if f["banks"][b] != bank_base[b]})
        hits = sum(1 for f in fr if mres.get(f["n"]) is True)
        miss = [f["n"] for f in fr if f["n"] in mres and mres[f["n"]] is not True]
        before, after = w["before"], w["after"]
        scr = w["script"]
        side = "player" if scr["attacker"] % 2 == 0 else "opponent"
        out.append({"label": w["label"], "kind": "status-table" if w["label"] in STATUS_TABLE else "turn-trap(General_TurnTrap)" if w["label"] in TRAP else "other-general",
                    "status": STATUS_TABLE.get(w["label"]), "affectedSide": side, "attackerBattler": scr["attacker"], "targetBattler": scr["target"],
                    "activationFrame": act, "activationTraceFrame": w["activationTraceFrame"], "endFrame": endf, "lifetime": w["lifetime"],
                    "windowFrames": [w["windowLo"], w["windowHi"]], "scriptEntryOffset": scr["offset"],
                    "occupiedBefore": slots(before), "occupiedAtEnd": slots(w["atEnd"]), "occupiedAfter": slots(after),
                    "freeOrderHeadBefore": som.free_order(list(bytes.fromhex(fr[0]["order"])), before)[:10],
                    "freeOrderHeadAfter": som.free_order(list(bytes.fromhex(fr[-1]["order"])), after)[:10],
                    "freeOrderChanged": som.free_order(list(bytes.fromhex(fr[0]["order"])), before) != som.free_order(list(bytes.fromhex(fr[-1]["order"])), after),
                    "netZero": before == after, "netZeroAtEnd": before == w["atEnd"],
                    "creates": creates, "destroys": destroys, "lateChangeFramesAfterEnd": late,
                    "palette": {"tagLoads": tagloads, "tagFrees": tagfrees, "unfadedBanksNetChanged": bank_changes,
                                "unfadedBanksChangedAnyFrame": transient},
                    "model": {"hit": hits, "miss": len(miss), "missFrames": miss[:5], "frames": len(fr)}})
    return out


def trim(d):
    wins = []
    for w in d["windows"]:
        rows, prev = [], None
        for f in w["frames"]:
            cur = (f["order"], f["mask"], f["act"], tuple(f["tags"]), tuple(f["banks"]))
            if cur != prev or f["creates"] or f["destroyed"]:
                row = {"n": f["n"], "order": f["order"], "mask": f["mask"], "act": f["act"]}
                if prev is None or prev[3] != cur[3]:
                    row["tags"] = f["tags"]
                if prev is None or prev[4] != cur[4]:
                    row["banks"] = f["banks"]
                if f["creates"]:
                    row["creates"] = f["creates"]
                if f["destroyed"]:
                    row["destroyed"] = f["destroyed"]
                rows.append(row)
            prev = cur
        wins.append({"label": w["label"], "script": w["script"], "activationFrame": w["activationFrame"], "endFrame": w["endFrame"],
                     "windowFrames": [w["windowLo"], w["windowHi"]], "changeRows": rows})
    return {"schema": "status-animation-sprite-raw-window/v1", "windows": wins}


def main():
    batch = Path(sys.argv[1])
    write = "--write" in sys.argv
    scen = {}
    for f0 in sorted(batch.glob("*-0.json")):
        sid = f0.name[:-7]
        f1 = f0.with_name(sid + "-1.json")
        d0, d1 = json.loads(f0.read_text()), json.loads(f1.read_text())
        t0, t1 = trim(d0), trim(d1)
        b0, b1 = json.dumps(t0, separators=(",", ":")).encode(), json.dumps(t1, separators=(",", ":")).encode()
        if write:
            OUT_RAW.mkdir(parents=True, exist_ok=True)
            (OUT_RAW / f"{sid}-0.json").write_bytes(b0 + b"\n")
            (OUT_RAW / f"{sid}-1.json").write_bytes(b1 + b"\n")
        sc = json.loads((batch / "scenarios" / f"{sid}.json").read_text())
        mres = model_per_frame(d0)
        wins = analyse(d0, mres)
        wins1 = analyse(d1, model_per_frame(d1))
        scen[sid] = {"seed": sc["seed"], "traceFrames": sum(s["frames"] for s in sc["trace"]["segments"]),
                     "fullRunSha256": [sha(f0), sha(f1)], "windowRawSha256": [shab(b0), shab(b1)],
                     "fullRunsIdentical": f0.read_bytes() == f1.read_bytes(), "windowRawIdentical": b0 == b1,
                     "analysisIdentical": wins == wins1,
                     "wholeRunModel": {"hit": sum(v is True for v in mres.values()), "miss": sum(v is not True for v in mres.values())},
                     "windows": wins}
    # per status x affected side summary over all non-first-scenario windows
    agg = collections.defaultdict(list)
    for sid, s in scen.items():
        for w in s["windows"]:
            agg[(w["label"], w["affectedSide"])].append((sid, w))
    summary = []
    for (label, side), ws in sorted(agg.items()):
        sigs = collections.Counter(json.dumps([[c[0], c[1], c[2]] for c in w["creates"]] + [["d", x[0], x[1], x[2]] for x in w["destroys"]] if True else 0)
                                   for _, w in ws)
        ncreate = collections.Counter(len(w["creates"]) for _, w in ws)
        summary.append({"label": label, "kind": ws[0][1]["kind"], "side": side, "windows": len(ws), "scenarios": sorted({s for s, _ in ws}),
                        "freeOrderChangedWindows": sum(w["freeOrderChanged"] for _, w in ws),
                        "freeOrderHeadTransitions": sorted({json.dumps([w["freeOrderHeadBefore"][:6], w["freeOrderHeadAfter"][:6]]) for _, w in ws}),
                        "allNetZero": all(w["netZero"] for _, w in ws), "netZeroWindows": sum(w["netZero"] for _, w in ws),
                        "createCountDistribution": dict(ncreate), "distinctCreateDestroyStreams": len(sigs),
                        "lifetimes": sorted({w["lifetime"] for _, w in ws}),
                        "modelHit": sum(w["model"]["hit"] for _, w in ws), "modelMiss": sum(w["model"]["miss"] for _, w in ws),
                        "anyTagLoad": sorted({t[2] for _, w in ws for t in w["palette"]["tagLoads"]}),
                        "anyTagFree": sorted({t[2] for _, w in ws for t in w["palette"]["tagFrees"]}),
                        "anyLateChange": any(w["lateChangeFramesAfterEnd"] for _, w in ws)})
    pins = {k: sha(ROOT / v) for k, v in {
        "probe": "tools/integration/statusAnimationSpriteProbe.py", "batch": "tools/integration/statusAnimationSpriteBatch.py",
        "receiptBuilder": "tools/integration/statusAnimationSpriteReceipt.py", "model": "tools/integration/spriteOrderEventModel.py",
        "battle_anim_scripts.s": "reference/pokeemerald/data/battle_anim_scripts.s", "battle_anim.c": "reference/pokeemerald/src/battle_anim.c",
        "battle_anim_status_effects.c": "reference/pokeemerald/src/battle_anim_status_effects.c", "sprite.c": "reference/pokeemerald/src/sprite.c",
        "pokeemerald.gba": "reference/pokeemerald/pokeemerald.gba"}.items()}
    receipt = {"schema": "status-animation-sprite-audit/v1", "profile": "battle-scene-on (direct mGBA, independent processes)", "pins": pins,
               "totals": {"scenarios": len(scen), "fullRunsIdentical": sum(s["fullRunsIdentical"] for s in scen.values()),
                          "windowRawIdentical": sum(s["windowRawIdentical"] for s in scen.values()),
                          "windows": sum(len(s["windows"]) for s in scen.values()),
                          "statusTableWindows": sum(w["kind"] == "status-table" for s in scen.values() for w in s["windows"])},
               "summaryByLabelAndSide": summary, "scenarios": scen}
    print(json.dumps(receipt["totals"]))
    if write:
        RECEIPT.write_text(json.dumps(receipt, indent=1) + "\n")
        print("wrote", RECEIPT)


if __name__ == "__main__":
    main()
