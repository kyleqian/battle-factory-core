"""Log every sound the ROM starts in a short window as (frame, kind, id, pan/mode).

Read-only dev probe (docs/s11-audio-design.md). The libmgba-py binding exposes no
debugger, so "breakpoints" are a single-step loop that compares the Thumb PC with
function entries (PC == symbol + 2 is the first instruction, r0..r3 still hold
the arguments) -- the same technique as tools/probe/trace-factory-construction-rng.py.

  python3 tools/run-mgba-probe.py OUT.json -- python3 tools/audio/soundEventProbe.py OUT.json draft [--frames N]
  python3 tools/run-mgba-probe.py OUT.json -- python3 tools/audio/soundEventProbe.py OUT.json lab REQUEST.json [--frames N] [--log-setup]

`frame` is 1-based: an event during the k-th advance is reported at frame k, the
first frame whose capture can show its effect. `lab` replays a battle-lab request
(mechanicLab / factoryLegal) and logs only its trace window unless --log-setup.
"""
import bisect, json, re, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from emerald_core import EmeraldOracle  # noqa: E402
from battle_lab import BattleLab, validate_request  # noqa: E402

REF = (ROOT / "reference/pokeemerald").resolve()
HOOKS = ["m4aSongNumStart", "m4aSongNumStop", "PlayCryInternal", "PlaySE12WithPanning", "PlaySE1WithPanning",
         "PlaySE2WithPanning", "SE12PanpotControl", "PlayBGM", "PlayFanfare", "PlayFanfareByFanfareNum"]
SE_CALLERS = {"PlaySE", "PlaySE12WithPanning", "PlaySE1WithPanning", "PlaySE2WithPanning"}
BGM_CALLERS = {"PlayBGM", "PlayNewMapMusic", "FadeInNewBGM", "FadeOutAndPlayNewMapMusic", "FadeOutAndFadeInNewMapMusic"}
FANFARE_CALLERS = {"PlayFanfare", "PlayFanfareByFanfareNum", "WaitFanfare", "Task_Fanfare"}
CRY_MODES = ["NORMAL", "DOUBLES", "ENCOUNTER", "HIGH_PITCH", "ECHO_START", "FAINT", "ECHO_END", "ROAR_1", "ROAR_2",
             "GROWL_1", "GROWL_2", "WEAK_DOUBLES", "WEAK"]


def s8(v):
    v &= 0xFF
    return v - 256 if v & 0x80 else v


def load_defines(path, prefix_re):
    names = {}
    for m in re.finditer(r"#define\s+(%s\w*)\s+(\d+)" % prefix_re, path.read_text()):
        names.setdefault(int(m.group(2)), m.group(1))
    return names


def main():
    out, mode, rest = Path(sys.argv[1]), sys.argv[2], sys.argv[3:]
    frames_cap = int(rest[rest.index("--frames") + 1]) if "--frames" in rest else None
    oracle = EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map", HARNESS / "oracle/bootstrap/factory.json")
    syms = sorted((a, n) for n, a in oracle.symbols.items() if a)
    addrs = [a for a, _ in syms]
    hooks = [n for n in HOOKS if oracle.symbols.get(n)]
    entry = {oracle.symbols[n] + 2: n for n in hooks}
    songs = load_defines(REF / "include/constants/songs.h", r"(?:SE|MUS)_")
    species = load_defines(REF / "include/constants/species.h", r"SPECIES_")
    cpu, core = oracle.core.cpu, oracle.core
    state = {"frame": 0, "log": True, "steps": 0}
    calls, events, pending = [], [], {}

    def caller(lr):
        i = bisect.bisect_right(addrs, (lr & ~1) - 2) - 1
        return syms[i][1] if i >= 0 else None

    def on_hook(name):
        g = [int(cpu.gprs[i]) & 0xFFFFFFFF for i in range(4)]
        via = caller(g_lr())
        row = {"frame": state["frame"], "fn": name, "via": via, "r0": g[0], "r1": g[1]}
        if name == "PlayCryInternal":
            sp = int(cpu.gprs[13]) & 0xFFFFFFFF
            m = oracle.read_u8(sp)
            ev = {"frame": row["frame"], "kind": "cry", "id": g[0], "name": species.get(g[0]),
                  "pan": s8(g[1]), "volume": s8(g[2]), "priority": g[3] & 0xFF,
                  "mode": CRY_MODES[m] if m < len(CRY_MODES) else m, "via": via}
            events.append(ev)
        elif name in ("PlaySE12WithPanning", "PlaySE1WithPanning", "PlaySE2WithPanning"):
            pending["pan"] = s8(g[1])
        elif name == "m4aSongNumStart":
            kind = ("se" if via in SE_CALLERS else "bgm" if via in BGM_CALLERS else
                    "fanfare" if via in FANFARE_CALLERS else "direct")
            pan = pending.pop("pan", None) if via in {"PlaySE12WithPanning", "PlaySE1WithPanning", "PlaySE2WithPanning"} else None
            events.append({"frame": row["frame"], "kind": kind, "id": g[0], "name": songs.get(g[0]), "pan": pan, "via": via})
        elif name == "SE12PanpotControl":
            events.append({"frame": row["frame"], "kind": "pan", "id": None, "name": None, "pan": s8(g[0]), "via": via})
        elif name == "m4aSongNumStop":
            events.append({"frame": row["frame"], "kind": "stop", "id": g[0], "name": songs.get(g[0]), "pan": None, "via": via})
        calls.append(row)

    def g_lr():
        return int(cpu.gprs[14]) & 0xFFFFFFFF

    def stepping_advance(buttons):
        oracle._set_buttons(list(buttons))
        start = core.frame_counter
        state["frame"] += 1
        while core.frame_counter == start:
            name = entry.get(int(cpu.pc))
            if name and state["log"]:
                on_hook(name)
            core.step()
            state["steps"] += 1
        oracle._screen_stale = False
        oracle.frame += 1

    t0 = time.time()
    if mode == "draft":
        oracle.new_session()
        script = [([], 20), (["RIGHT"], 2), ([], 20), (["A"], 2), ([], 40), (["B"], 2), ([], 30)]
        segments = [{"frames": n, "buttons": b} for b, n in script]
        label = "draft: 20 idle, RIGHT x2, 20 idle, A x2, 40 idle, B x2, 30 idle (canonical Battle Factory draft anchor)"
    else:
        request = validate_request(json.loads(Path(rest[0]).read_text()), "battle-scene-on")
        label = f"lab {Path(rest[0]).name}"
        lab = BattleLab(oracle, "battle-scene-on")
        if "--log-setup" in rest:
            oracle.advance = stepping_advance
        else:
            state["log"] = False
        lab.prepare(request)
        state["log"] = True
        state["frame"] = 0
        segments = request["trace"]["segments"]
    done = 0
    for seg in segments:
        for _ in range(seg["frames"]):
            if frames_cap is not None and done >= frames_cap:
                break
            stepping_advance(seg.get("buttons", []))
            done += 1
    out.write_text(json.dumps({
        "schema": "audio-sound-events/v1", "window": label, "profile": "battle-scene-on", "frames": done,
        "hooks": {n: f"0x{oracle.symbols[n]:08x}" for n in hooks}, "steps": state["steps"],
        "seconds": round(time.time() - t0, 1),
        "events": events, "calls": calls,
    }, indent=1))


main()
