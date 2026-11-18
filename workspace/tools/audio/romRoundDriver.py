"""Round replay, the ROM side (docs/parity-mac/round-replay.md): one whole Battle Factory round on the real ROM, closed loop with the engine.

Usage (cwd = workspace/, through tools/run-mgba-probe.py like every mGBA probe):
  python3 tools/run-mgba-probe.py OUT.json -- python3 tools/audio/romRoundDriver.py OUT.json REQ.json --seed N --profile off|on \
      --policy census|ai-v1|random-v1|power-v1 --swap never|weakest|random --dir WORKDIR [--challenge C] [--frames CAP] [--frame-budget N] [--prompt-delay K@N] [--symbols 0|1]

REQ.json is the factoryLegal request of the round's first battle (`soundCensusRomReplay.ts request --round=1`). The lab stages that battle as for a single
replay (oracle/battle_lab.py prepare). From then on nothing is staged: the ROM plays the round itself.

For every battle n of the round:
  1. at the battle's first action menu, write WORKDIR/setup-n.json (the shape of `soundEventProbe.py lab --setup-out` plus `round`: the battle number,
     streak, trainer, gFrontierTempParty, the trainer history, the six rentalMons records, and the RNG record of the frame that rolled this battle's trainer);
  2. run the engine (`soundCensusRomReplay.ts round` on setup-0..n): it replays battles 0..n on the round orchestrator and gives battle n's decisions and,
     after a win, the test player's swap decision;
  3. drive battle n with those decisions (soundEventProbe.drive_lab: the closed-loop decision driver, the ROM timeline, the wide states);
  4. after a win of battles 1..6, drive the screens between the battles by their RAM state (drive_between): the win text, the heal, GO ON, the trainer roll,
     the swap prompt (B = NO, A = YES; before an ordinary trainer or the Factory Head), the swap screen (own Pokemon, SWAP, the beaten trainer's Pokemon, YES), the walk, the next trainer's intro, up to the
     next battle's first action menu. No A is pressed once the player's controller holds the choose-action command (the lab's own rule).
The round ends at a loss, after the seventh battle, or at an error. OUT.json gets every battle's drive and between-battle record.

Two staging writes are added to the lab's. frontier.trainerIds[0] = the staged trainer: the lab writes gTrainerBattleOpponent_A only, but the game remembers
battle 1's trainer in trainerIds[0] (GenerateOpponentMons, battle_factory.c:327-329) and never rolls it again in the round (:316-325); the checkpoint's own
trainerIds[0] is the canonical draft's trainer. factoryRentsCount[0][0] = the request's rentalSwapCount: the lab writes it to the doubles count (SB2_FACTORY_RENTS).
"""
import json, os, subprocess, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import soundEventProbe as sep  # noqa: E402  (EmeraldOracle, BattleLab, validate_request, drive_lab, REF, HARNESS, PROFILES)
import romDecisionDriver  # noqa: E402
import battle_lab  # noqa: E402  (on sys.path through soundEventProbe)

WORKSPACE = Path(__file__).resolve().parents[2]
# include/global.h struct BattleFrontier offsets in SaveBlock2. factoryRentsCount[0][0] (singles, Level 50) is at 0xDF2: factoryRecordWinStreaks[2][2]
# ends there and factoryRecordRentsCount starts at 0xDFA; the header's "0xDF6" comment (copied by oracle/battle_lab.py) is [1][0], the doubles count.
SB2_BATTLE_NUM, SB2_TRAINER_IDS, SB2_FACTORY_STREAK, SB2_FACTORY_RENTS, SB2_RENTAL_MONS = 0xCB2, 0xCB4, 0xDE2, 0xDF2, 0xE70
RENTAL_MON_SIZE = 12  # struct RentalMon: u16 monId, u32 personality (+4), u8 ivs (+8), u8 abilityNum (+9)
CONTROLLER_CHOOSE_ACTION, PLAYER_CONTROLLER_FLAG = 18, 1
TASK_SIZE, TASK_COUNT = 40, 16
# struct FactorySwapScreen (battle_factory_screen.c:131-159; FRONTIER_PARTY_SIZE = 3, actionsData 4-aligned at +24)
SWAP_MENU_CURSOR, SWAP_CURSOR, SWAP_PLAYER_MON, SWAP_ENEMY_MON, SWAP_IN_ENEMY, SWAP_YESNO_CURSOR, SWAP_MON_SWAPPED = 0, 3, 18, 19, 20, 22, 32
STATE_CHOOSE_MONS_HANDLE_INPUT, STATE_MENU_HANDLE_INPUT, STATE_YESNO_HANDLE_INPUT = 1, 3, 5  # battle_factory_screen.c:1120-1125
SWAP_MENU_SWAP = 1  # sSwap_MenuOptionFuncs: SUMMARY, SWAP, RECHOOSE
PULSE = 16  # one press every 16 frames (the lab / driver idiom for message waits)
BETWEEN_FRAME_CAP = 30000
STATIC_NAMES = ("sFactorySwapScreen", "sGlobalScriptContext", "sPerformedRentalSwap", "Swap_CB2", "Swap_Task_HandleChooseMons", "Swap_Task_HandleMenu", "Swap_Task_HandleYesNo",
                "Swap_Task_Exit", "Swap_TaskCantHaveSameMons", "Task_HandleYesNoInput", "CB2_Overworld", "BattleMainCB2")
# The swap prompt's YES/NO box: before an ordinary trainer (AskSwapMon) and before the Factory Head (AskSwapBeforeHead), as [start, end) label pairs.
SWAP_PROMPT_LABELS = (("BattleFrontier_BattleFactoryPreBattleRoom_EventScript_AskSwapMon", "BattleFrontier_BattleFactoryPreBattleRoom_EventScript_SwapMons"),
                      ("BattleFrontier_BattleFactoryPreBattleRoom_EventScript_AskSwapBeforeHead", "BattleFrontier_BattleFactoryPreBattleRoom_EventScript_WalkToBattleRoomLv50"))


class RoundError(Exception):
    pass


def lcg(x):
    return (x * 0x41C64E6D + 0x6073) & 0xFFFFFFFF


def lcg_distance(a, b, limit=200000):
    for n in range(limit + 1):
        if a == b:
            return n
        a = lcg(a)
    return None


def statics():
    """Addresses of file-static symbols (absent from the linker map) from the ELF's symbol table."""
    ref = sep.REF
    for tool in ("arm-none-eabi-nm", "nm"):
        try:
            text = subprocess.run([tool, str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
            break
        except (FileNotFoundError, subprocess.CalledProcessError):
            continue
    else:
        raise SystemExit("romRoundDriver: no nm available to read the ELF")
    nm = romDecisionDriver.parse_nm(text)
    out = {}
    for name in STATIC_NAMES:
        addrs = nm.get(name, [])
        if len(addrs) != 1:
            raise SystemExit(f"romRoundDriver: cannot resolve {name}: {addrs}")
        out[name] = addrs[0] & ~1
    return out


class Rom:
    def __init__(self, oracle, lab):
        self.o, self.lab, self.sym, self.st = oracle, lab, oracle.symbols, statics()

    def u8(self, a): return self.o.read_u8(a)
    def u16(self, a): return self.o.read_u16(a)
    def u32(self, a): return self.o.read_u32(a)

    def save2(self):
        return self.u32(self.sym["gSaveBlock2Ptr"])

    def cb2(self):
        return self.u32(self.sym["gMain"] + 4) & ~1

    def tasks(self):
        base = self.sym["gTasks"]
        return [(self.u32(base + i * TASK_SIZE) & ~1, self.o.read_u16(base + i * TASK_SIZE + 8)) for i in range(TASK_COUNT) if self.u8(base + i * TASK_SIZE + 4)]

    def watch(self):
        return (self.u16(self.sym["gTrainerBattleOpponent_A"]), *(self.u16(self.sym["gFrontierTempParty"] + 2 * i) for i in range(3)))

    def menu_issued(self):
        return self.u8(self.sym["gBattleBufferA"]) == CONTROLLER_CHOOSE_ACTION and self.u32(self.sym["gBattleControllerExecFlags"]) & PLAYER_CONTROLLER_FLAG != 0

    def action_menu_ready(self):
        return (self.cb2() == self.st["BattleMainCB2"] and self.u8(self.sym["gBattlersCount"]) == 2
                and self.u8(self.sym["gBattleBufferA"]) == CONTROLLER_CHOOSE_ACTION and self.u32(self.sym["gBattleControllerExecFlags"]) == PLAYER_CONTROLLER_FLAG)

    def script_return_address(self):
        ctx = self.st["sGlobalScriptContext"]
        depth = self.u8(ctx)
        return self.u32(ctx + 0x0C + 4 * (depth - 1)) if depth else None

    def round_facts(self, generation):
        s2 = self.save2()
        return {
            "battleNum": self.u16(s2 + SB2_BATTLE_NUM), "factoryWinStreak": self.u16(s2 + SB2_FACTORY_STREAK), "rentsCount": self.u16(s2 + SB2_FACTORY_RENTS),
            "performedRentalSwap": self.u8(self.st["sPerformedRentalSwap"]),
            "trainerId": self.u16(self.sym["gTrainerBattleOpponent_A"]),
            "frontierTempParty": [self.u16(self.sym["gFrontierTempParty"] + 2 * i) for i in range(3)],
            "trainerIds": [self.u16(s2 + SB2_TRAINER_IDS + 2 * i) for i in range(7)],
            "rentalMons": [{"monId": self.u16(b), "personality": self.u32(b + 4), "ivs": self.u8(b + 8), "abilityNum": self.u8(b + 9)}
                           for b in (s2 + SB2_RENTAL_MONS + i * RENTAL_MON_SIZE for i in range(6))],
            "generation": generation,
        }

    def setup(self, descriptor, generation):
        """The action-menu read-back of `soundEventProbe.py lab --setup-out`, plus the round facts. A party box caught half encrypted (an AI frame can end
        inside GetMonData) is read again after an idle frame; idle frames at the action menu change nothing (no Random() in a Frontier battle's VBlank)."""
        o, sym = self.o, self.sym
        for _ in range(12):
            snap = self.lab.snapshot()
            if all(m["checksumValid"] for side in snap["parties"].values() for m in side):
                break
            o.advance([])
        else:
            raise RoundError("a party record stayed unreadable at the action menu")
        return {"descriptor": descriptor, "snapshot": snap,
                "randomTurnNumber": o.read_u16(sym["gRandomTurnNumber"]),
                "opponentReply": [o.read_u8(sym["gBattleBufferB"] + 0x200 + i) for i in range(4)],
                "opponentAiSimulatedRng": [o.read_u8(o.read_u32(o.read_u32(sym["gBattleResources"]) + 0x14) + 0x18 + i) for i in range(4)],
                "lastMoves": [o.read_u16(sym["gLastMoves"] + 2 * i) for i in range(2)],
                "round": self.round_facts(generation)}

    def swap_buttons(self, want):
        """One frame of the swap screen for decision `want` (accept: playerPartyIndex p, opponentPartyIndex q). Presses only at an input state."""
        ptr = self.u32(self.st["sFactorySwapScreen"])
        if ptr == 0:
            return [], None
        live = dict(self.tasks())
        enemy, cursor = self.u8(ptr + SWAP_IN_ENEMY), self.u8(ptr + SWAP_CURSOR)
        st = self.st
        if st["Swap_TaskCantHaveSameMons"] in live:
            raise RoundError("the swap screen refused the chosen Pokemon (same species as a kept one): the swap policy picked an illegal swap")
        if st["Swap_Task_HandleChooseMons"] in live and live[st["Swap_Task_HandleChooseMons"]] == STATE_CHOOSE_MONS_HANDLE_INPUT:
            target = want["opponentPartyIndex"] if enemy else want["playerPartyIndex"]
            if cursor != target:
                return (["RIGHT"] if cursor < target else ["LEFT"]), "choose"
            return ["A"], "choose"
        if st["Swap_Task_HandleMenu"] in live and live[st["Swap_Task_HandleMenu"]] == STATE_MENU_HANDLE_INPUT:
            if enemy:
                raise RoundError("the swap screen opened its menu on the beaten trainer's list")
            menu = self.u8(ptr + SWAP_MENU_CURSOR)
            return (["DOWN"] if menu < SWAP_MENU_SWAP else ["UP"] if menu > SWAP_MENU_SWAP else ["A"]), "menu"
        if st["Swap_Task_HandleYesNo"] in live and live[st["Swap_Task_HandleYesNo"]] == STATE_YESNO_HANDLE_INPUT:
            if not enemy:
                raise RoundError("the swap screen asks to quit swapping: the drive pressed B or CANCEL")
            yes = self.u8(ptr + SWAP_YESNO_CURSOR) == 0
            return (["A"] if yes else ["UP"]), "accept"
        if st["Swap_Task_Exit"] in live:
            return [], "exit"
        return [], None


def drive_between(rom, swap, cap, progress, prompt_delay=0):
    """From the end of a won battle to the next battle's first action menu (see the module docstring)."""
    o, st = rom.o, rom.st
    decline = swap is None or swap.get("type") != "accept"
    frames, phase_pulse = 0, 0
    rng_prev, watch_prev = rom.u32(rom.sym["gRngValue"]), rom.watch()
    changes, seen_field, swap_screen, answered, exit_seen, last, prompt_open = [], False, False, None, None, None, 0
    labels = [(rom.sym[a], rom.sym[b]) for a, b in SWAP_PROMPT_LABELS]
    transitions = []
    swap_trace = progress.setdefault("swapTrace", [])
    progress["transitions"] = transitions
    while True:
        cb2 = rom.cb2()
        if cb2 == st["CB2_Overworld"]:
            seen_field = True
        if seen_field and rom.action_menu_ready():
            break
        if frames >= cap:
            raise RoundError(f"the screens between battles did not reach the next action menu in {cap} frames (last state {last})")
        live = dict(rom.tasks())
        buttons, state = [], "other"
        if cb2 == st["Swap_CB2"]:
            swap_screen, state = True, "swap"
            if decline:
                raise RoundError("the swap screen opened although the decision is to keep the team")
            phase_pulse = (phase_pulse + 1) % 4
            pressed, what = rom.swap_buttons(swap)
            state = f"swap-{what}"
            ptr = rom.u32(st["sFactorySwapScreen"])
            names = {v: k for k, v in st.items()}
            swap_trace.append((frames, what, [names.get(f, hex(f)) for f in live], [live[f] for f in live],
                               *((rom.u8(ptr + SWAP_IN_ENEMY), rom.u8(ptr + SWAP_CURSOR), rom.u8(ptr + SWAP_MENU_CURSOR)) if ptr else ()), pressed if phase_pulse == 0 else []))
            del swap_trace[:-80]
            if what == "exit" and exit_seen is None:
                ptr = rom.u32(st["sFactorySwapScreen"])
                exit_seen = {"playerMonId": rom.u8(ptr + SWAP_PLAYER_MON), "cursorPos": rom.u8(ptr + SWAP_CURSOR), "monSwapped": rom.u8(ptr + SWAP_MON_SWAPPED)}
            buttons = pressed if phase_pulse == 0 else []
        elif st["Task_HandleYesNoInput"] in live:
            state = "yesno"
            ret = rom.script_return_address()
            if ret is None or not any(lo <= ret < hi for lo, hi in labels):
                raise RoundError(f"a YES/NO box other than the swap prompt is open (script return address {ret})")
            if answered is None:
                answered = "no" if decline else "yes"
                prompt_open = frames
            phase_pulse = (phase_pulse + 1) % PULSE
            # --prompt-delay: the player waits at the prompt (overworld frames: one VBlank Random() each), then answers.
            waiting = frames - prompt_open < prompt_delay
            buttons = (["B"] if decline else ["A"]) if phase_pulse == 0 and not waiting else []
        elif cb2 == st["BattleMainCB2"] and seen_field and rom.menu_issued():
            state = "menu-issued"
        else:
            phase_pulse = (phase_pulse + 1) % PULSE
            buttons = ["A"] if phase_pulse == 0 else []
        if state != last:
            transitions.append((frames, state))
            last = state
        o.advance(buttons)
        frames += 1
        rng, watch = rom.u32(rom.sym["gRngValue"]), rom.watch()
        if watch != watch_prev:
            changes.append({"frame": frames, "before": list(watch_prev), "after": list(watch), "rngBefore": rng_prev, "rngAfter": rng,
                            "draws": lcg_distance(rng_prev, rng)})
        rng_prev, watch_prev = rng, watch
    final = list(rom.watch())
    rolls = [c for c in changes if c["after"] == final and c["before"][0] != final[0]]
    generation = None
    if rolls:
        c = rolls[-1]
        generation = {"frame": c["frame"], "rngBefore": c["rngBefore"], "rngAfter": c["rngAfter"], "draws": c["draws"]}
    progress.update({"frames": frames, "generation": generation, "watchChanges": changes[-6:], "swapPrompt": answered, "swapScreen": swap_screen,
                     "swap": {"decision": swap, "rom": exit_seen}, "transitions": transitions[-40:]})
    del progress["swapTrace"][:-12]
    return progress


def run_engine(args, setup_paths, out_path, known_k=()):
    env = dict(os.environ, ROM_REPLAY_ROUND="1", ROM_REPLAY_SYMBOLS=str(args["symbols"]))
    if args["challenge"] is not None:
        env["ROM_REPLAY_CHALLENGE"] = str(args["challenge"])
    cmd = ["node", "--experimental-strip-types", "--no-warnings", "tools/integration/soundCensusRomReplay.ts", "round", f"--seed={args['seed']}",
           f"--scene={args['scene']}", "--round=1", f"--setups={','.join(map(str, setup_paths))}", f"--swap={args['swap']}", f"--policy={args['policy']}",
           f"--out={out_path}", "--events=1"]
    if args["frameBudget"]:
        cmd.append(f"--frame-budget={args['frameBudget']}")
    if known_k:
        cmd.append("--known-k=" + ",".join(str(k) for k in known_k))
    if out_path.exists():
        out_path.unlink()
    proc = subprocess.run(cmd, cwd=WORKSPACE, env=env, capture_output=True, text=True)
    if proc.returncode != 0 or not out_path.exists():
        raise RoundError(f"engine round replay failed (rc {proc.returncode}): {proc.stderr[-1500:]}")
    return json.loads(out_path.read_text())


def main():
    out, req_path, rest = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3:]
    if out.exists():
        raise SystemExit(f"romRoundDriver: refusing stale output path (delete it first): {out}")
    opt = lambda name, default=None: rest[rest.index(name) + 1] if name in rest else default  # noqa: E731
    args = {"seed": int(opt("--seed")), "scene": opt("--profile", "off"), "policy": opt("--policy", "census"), "swap": opt("--swap", "never"),
            "challenge": None if opt("--challenge") in (None, "") else int(opt("--challenge")), "frameBudget": opt("--frame-budget"),
            "symbols": int(opt("--symbols", "0"))}
    # --prompt-delay K@N: wait K more frames at the swap prompt after battle N (0-based) before answering (genuine input timing: it moves the RNG cursor
    # of everything rolled after it, like a slower player). Battles 0..N are unchanged.
    delay_k, delay_at = (int(x) for x in opt("--prompt-delay", "0@-1").split("@"))
    work = Path(opt("--dir"))
    work.mkdir(parents=True, exist_ok=True)
    cap = int(opt("--frames", str(sep.DRIVE_FRAME_CAP)))
    profile, bootstrap = sep.PROFILES[args["scene"]]
    oracle = sep.EmeraldOracle(sep.REF / "pokeemerald.gba", sep.REF / "pokeemerald.map", sep.HARNESS / "oracle/bootstrap" / bootstrap)
    request = json.loads(req_path.read_text())
    request["profile"] = profile
    request.pop("replay", None)
    request = sep.validate_request(request, profile)
    if request["mode"] != "factoryLegal" or request["battleNum"] != 0:
        raise SystemExit("romRoundDriver: a round starts from a factoryLegal staging of battle number 0")
    t0 = time.time()
    lab = sep.BattleLab(oracle, profile)
    descriptor = {k: v for k, v in lab.prepare(request).items() if k != "preCheckpointCaptures"}
    rom = Rom(oracle, lab)
    s2 = rom.save2()
    staging_fix = {"trainerIds0Before": rom.u16(s2 + SB2_TRAINER_IDS), "trainerIds0": request["trainerId"],
                   "rentsCountBefore": rom.u16(s2 + SB2_FACTORY_RENTS), "rentsCount": request["rentalSwapCount"]}
    oracle.write_u16(s2 + SB2_TRAINER_IDS, request["trainerId"])
    # The lab writes rentalSwapCount to the doubles count (see SB2_FACTORY_RENTS): stage the singles count the round goes on with.
    oracle.write_u16(s2 + SB2_FACTORY_RENTS, request["rentalSwapCount"])
    if args["symbols"]:
        # --symbols 1: the silver Factory symbol (FLAG_SYS_FACTORY_SILVER), as a player has it after beating silver Noland at streak 21; with it the seventh
        # battle of challenge 5 is gold Noland (GetFrontierBrainStatus, frontier_util.c:1656-1693). The lab sets it the same way for a factoryBrain staging.
        lab._set_factory_symbol_flag(battle_lab.FLAG_SYS_FACTORY_SILVER)
        staging_fix["silverSymbol"] = lab._factory_symbol_count()
    funcs = romDecisionDriver.resolve_funcs(sep.REF)
    result = {"schema": "rom-round-drive/v1", "seed": args["seed"], "scene": args["scene"], "policy": args["policy"], "swap": args["swap"], "promptDelay": [delay_k, delay_at],
              "challenge": request["challengeNum"], "request": request, "stagingFix": staging_fix, "battles": [], "error": None}
    setup_paths, generation, prior = [], None, None
    try:
        for n in range(7):
            setup = rom.setup(descriptor, generation)
            path = work / f"setup-{n}.json"
            path.write_text(json.dumps(setup, separators=(",", ":")))
            setup_paths.append(path)
            engine = run_engine(args, setup_paths, work / "engine.json", [] if prior is None else [p["engineDrawsBeforeActionMenu"] for p in prior])
            battles = engine["battles"]
            if prior is not None:
                for i, (a, b) in enumerate(zip(prior, battles)):
                    if a["decisions"] != b["decisions"] or a.get("swapAfter") != b.get("swapAfter"):
                        raise RoundError(f"the engine replayed battle {i} differently on a later run (not deterministic)")
            prior = battles
            if len(battles) <= n:
                raise RoundError(f"the engine stopped before battle {n}: {engine.get('roundError')}")
            b = battles[n]
            drive = sep.drive_lab(oracle, funcs, romDecisionDriver.load_decisions(b["decisions"]), cap, lab)
            entry = {"battleIndex": n, "setup": str(path), "drive": drive, "between": None}
            result["battles"].append(entry)
            if b["error"] is not None:
                raise RoundError(f"engine error in battle {n}: {b['error']}")
            if drive["stop"] != "outcome":
                raise RoundError(f"the ROM drive of battle {n} stopped: {drive['stop']}")
            if drive["outcome"] != 1 or n == 6:
                break
            entry["between"] = {}
            drive_between(rom, b.get("swapAfter"), BETWEEN_FRAME_CAP, entry["between"], delay_k if n == delay_at else 0)
            generation = entry["between"]["generation"]
    except RoundError as e:
        result["error"] = str(e)
    result["seconds"] = round(time.time() - t0, 1)
    out.write_text(json.dumps(result, separators=(",", ":")))


if __name__ == "__main__":
    main()
