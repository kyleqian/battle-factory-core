"""Round replay, the ROM side (docs/parity-mac/round-replay.md): one whole Battle Factory round on the real ROM, closed loop with the engine.

Usage (cwd = workspace/, through tools/run-mgba-probe.py like every mGBA probe):
  python3 tools/run-mgba-probe.py OUT.json -- python3 tools/audio/romRoundDriver.py OUT.json REQ.json --seed N --profile off|on \
      --policy census|ai-v1|random-v1|power-v1 --swap never|weakest|random --dir WORKDIR [--challenge C] [--frames CAP] [--frame-budget N] [--prompt-delay K@N] [--symbols 0|1] [--rounds R] [--draft first|strongest] [--search-wins N] [--stop-on-loss] [--stage-rents N] [--heard S,G]

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
# battledBrainFlags (global.h 0xD00): the Factory's heard-speech bits, 1 << 8 silver, 1 << 9 gold (frontier_util.c:596-605).
SB2_BATTLED_BRAIN_FLAGS, HEARD_SILVER_BIT, HEARD_GOLD_BIT = 0xD00, 1 << 8, 1 << 9
FLAG_SYS_FACTORY_GOLD = 0x8CD
# Noland's lines in the battle room script (BattleFactoryBattleRoom scripts.inc:113-167), found by their text pointers in the script's bytecode.
BRAIN_SCRIPT_RANGE = ("BattleFrontier_BattleFactoryBattleRoom_EventScript_BattleNoland", "BattleFrontier_BattleFactoryBattleRoom_Text_NolandImFactoryHead")
BRAIN_TEXTS = ("NolandImFactoryHead", "ShakeOutKnowledgeBringItOn", "HarderLookThanLastTime", "AllRightBringItOn", "NolandLetsSeeFrontierPass",
               "ReceivedKnowledgeSymbol", "NextTimeNoHoldsBarred", "OutOfMyLeagueLetsSeePass", "KnowledgeSymbolTookGoldenShine", "LastTimeILoseToYou")
RENTAL_MON_SIZE = 12  # struct RentalMon: u16 monId, u32 personality (+4), u8 ivs (+8), u8 abilityNum (+9)
CONTROLLER_CHOOSE_ACTION, PLAYER_CONTROLLER_FLAG = 18, 1
TASK_SIZE, TASK_COUNT = 40, 16
# struct FactorySwapScreen (battle_factory_screen.c:131-159; FRONTIER_PARTY_SIZE = 3, actionsData 4-aligned at +24)
SWAP_MENU_CURSOR, SWAP_CURSOR, SWAP_PLAYER_MON, SWAP_ENEMY_MON, SWAP_IN_ENEMY, SWAP_YESNO_CURSOR, SWAP_MON_SWAPPED = 0, 3, 18, 19, 20, 22, 32
STATE_CHOOSE_MONS_HANDLE_INPUT, STATE_MENU_HANDLE_INPUT, STATE_YESNO_HANDLE_INPUT = 1, 3, 5  # battle_factory_screen.c:1120-1125
SWAP_MENU_SWAP = 1  # sSwap_MenuOptionFuncs: SUMMARY, SWAP, RECHOOSE
# struct FactorySelectScreen (battle_factory_screen.c:102-123): mons[6] at +12, each struct FactorySelectableMon 108 bytes (selectedId at +4)
SELECT_MENU_CURSOR, SELECT_CURSOR, SELECT_YESNO_CURSOR, SELECT_MONS, SELECT_MON_SIZE, SELECT_MON_SELECTED = 0, 3, 7, 12, 108, 4
SELECT_MENU_RENT = 1  # sSelect_MenuOptionFuncs: SUMMARY, RENT / DESELECT, OTHERS
STATE_CHOOSE_MONS_INVALID = 11
PULSE = 16  # one press every 16 frames (the lab / driver idiom for message waits)
BETWEEN_FRAME_CAP = 30000
STATIC_NAMES = ("sFactorySelectScreen", "Select_Task_HandleChooseMons", "Select_Task_HandleMenu", "Select_Task_HandleYesNo", "Select_Task_OpenSummaryScreen",
                "sFactorySwapScreen", "sGlobalScriptContext", "sPerformedRentalSwap", "Swap_CB2", "Swap_HandleQuitSwappingResponse", "Swap_HandleAcceptMonResponse", "Swap_Task_HandleChooseMons", "Swap_Task_HandleMenu", "Swap_Task_HandleYesNo",
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
        self.text_sites = self.brain_text_sites()

    def brain_text_sites(self):
        """{text: [end of each script command that names it]}: the msgbox's loadword / the message command hold the text pointer; while the line
        shows, the script pointer (message, then waitmessage / waitfanfare: +1, +2) or the callstd's return address (msgbox: +2) sits just past it.
        A `call` right after a msgbox leaves its return address at +7 on the stack for the whole battle, so a line counts only up to +3."""
        nm = romDecisionDriver.parse_nm(subprocess.run(["nm", str(sep.REF / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout)
        lo, hi = (nm[n][0] for n in BRAIN_SCRIPT_RANGE)
        code = bytes(self.u8(a) for a in range(lo, hi))
        sites = {}
        for text in BRAIN_TEXTS:
            ptr = nm["BattleFrontier_BattleFactoryBattleRoom_Text_" + text][0].to_bytes(4, "little")
            at = [lo + i + 4 for i in range(len(code) - 3) if code[i:i + 4] == ptr]
            if not at:
                raise SystemExit(f"romRoundDriver: no script command names the text {text}")
            sites[text] = at
        return sites

    def script_positions(self):
        ctx = self.st["sGlobalScriptContext"]
        depth = min(self.u8(ctx), 20)
        return [self.u32(ctx + 8)] + [self.u32(ctx + 0x0C + 4 * i) for i in range(depth)]

    def heard_bits(self):
        flags = self.u16(self.save2() + SB2_BATTLED_BRAIN_FLAGS)
        return {"silver": int(bool(flags & HEARD_SILVER_BIT)), "gold": int(bool(flags & HEARD_GOLD_BIT))}

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

    def task_follow_up(self, func):
        """tFollowUpTaskPtrHi/Lo (data[6], data[7]) of the live task running `func`: which prompt a swap-screen YES/NO answers."""
        base = self.sym["gTasks"]
        for i in range(TASK_COUNT):
            t = base + i * TASK_SIZE
            if self.u8(t + 4) and self.u32(t) & ~1 == func:
                return ((self.o.read_u16(t + 8 + 12) << 16) | self.o.read_u16(t + 8 + 14)) & ~1
        return None

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
            "performedRentalSwap": self.u8(self.st["sPerformedRentalSwap"]), "factorySymbols": self.lab._factory_symbol_count(),
            "heardBrainSpeech": self.heard_bits(),
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

    def rental_mon_ids(self):
        s2 = self.save2()
        return [self.u16(s2 + SB2_RENTAL_MONS + i * RENTAL_MON_SIZE) for i in range(6)]

    def first_selectable_positions(self, set_ids):
        """The round replay's draft rule (soundCensusRomReplay.ts firstSelectablePositions): the first three rentals with no species twice."""
        picked = []
        for i, set_id in enumerate(set_ids):
            species = self.lab.catalog.mon(set_id).species
            if len(picked) < 3 and all(self.lab.catalog.mon(set_ids[j]).species != species for j in picked):
                picked.append(i)
        if len(picked) != 3:
            raise RoundError(f"no three selectable rentals in {set_ids}")
        return picked

    def strongest_positions(self):
        """The unbroken run's draft rule (soundCensusRomReplay.ts strongestPositions): the three rentals with the highest stat totals (max HP + the five
        stats, read from the select screen's own Pokemon), no species twice, ties to the lower position, in that order."""
        ptr = self.u32(self.st["sFactorySelectScreen"])
        mons = []
        for i in range(6):
            base = ptr + SELECT_MONS + i * SELECT_MON_SIZE
            data = base + 8
            mons.append((self.u16(base), sum(self.u16(data + off) for off in (88, 90, 92, 94, 96, 98))))
        order = sorted(range(6), key=lambda i: (-mons[i][1], i))
        picked = []
        for i in order:
            species = self.lab.catalog.mon(mons[i][0]).species
            if len(picked) < 3 and all(self.lab.catalog.mon(mons[j][0]).species != species for j in picked):
                picked.append(i)
        return picked, [m[1] for m in mons]

    def select_buttons(self, positions):
        """One frame of the rental select screen: rent `positions` in order (cursor, A, RENT, A), then YES to "Are these three OK?"."""
        ptr = self.u32(self.st["sFactorySelectScreen"])
        if ptr == 0:
            return [], None
        live = dict(self.tasks())
        st = self.st
        if st["Select_Task_OpenSummaryScreen"] in live:
            raise RoundError("the rental screen opened a summary")
        selected = [self.u8(ptr + SELECT_MONS + i * SELECT_MON_SIZE + SELECT_MON_SELECTED) for i in range(6)]
        todo = [p for p in positions if not selected[p]]
        if st["Select_Task_HandleChooseMons"] in live:
            state = live[st["Select_Task_HandleChooseMons"]]
            if state == STATE_CHOOSE_MONS_INVALID:
                raise RoundError("the rental screen refused a rental (same species): the draft rule picked an illegal team")
            if state != STATE_CHOOSE_MONS_HANDLE_INPUT or not todo:
                return [], None
            cursor = self.u8(ptr + SELECT_CURSOR)
            if cursor != todo[0]:
                return (["RIGHT"] if cursor < todo[0] else ["LEFT"]), "choose"
            return ["A"], "choose"
        if st["Select_Task_HandleMenu"] in live and live[st["Select_Task_HandleMenu"]] == STATE_MENU_HANDLE_INPUT:
            menu = self.u8(ptr + SELECT_MENU_CURSOR)
            return (["DOWN"] if menu < SELECT_MENU_RENT else ["UP"] if menu > SELECT_MENU_RENT else ["A"]), "menu"
        if st["Select_Task_HandleYesNo"] in live and live[st["Select_Task_HandleYesNo"]] == STATE_YESNO_HANDLE_INPUT:
            if todo:
                raise RoundError(f"the rental screen asks to confirm before rentals {todo} are taken")
            return (["A"] if self.u8(ptr + SELECT_YESNO_CURSOR) == 0 else ["UP"]), "confirm"
        return [], None

    def swap_buttons(self, want):
        """One frame of the swap screen for decision `want` (accept: playerPartyIndex p, opponentPartyIndex q; cancel: at "player" (B on the own
        list) or "enemy" (own Pokemon p, SWAP, then B on the beaten trainer's list), then YES to "Quit swapping?"). Presses only at an input state."""
        ptr = self.u32(self.st["sFactorySwapScreen"])
        if ptr == 0:
            return [], None
        live = dict(self.tasks())
        enemy, cursor = self.u8(ptr + SWAP_IN_ENEMY), self.u8(ptr + SWAP_CURSOR)
        st = self.st
        cancel = want.get("type") == "cancel"
        if st["Swap_TaskCantHaveSameMons"] in live:
            raise RoundError("the swap screen refused the chosen Pokemon (same species as a kept one): the swap policy picked an illegal swap")
        if st["Swap_Task_HandleChooseMons"] in live and live[st["Swap_Task_HandleChooseMons"]] == STATE_CHOOSE_MONS_HANDLE_INPUT:
            if cancel and (want["at"] == "player" or enemy):
                return ["B"], "cancel"
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
            follow = self.task_follow_up(st["Swap_Task_HandleYesNo"])
            quit_prompt = follow == st["Swap_HandleQuitSwappingResponse"]
            if follow not in (st["Swap_HandleQuitSwappingResponse"], st["Swap_HandleAcceptMonResponse"]):
                raise RoundError(f"the swap screen's YES/NO answers an unknown prompt ({follow})")
            if quit_prompt != cancel:
                raise RoundError("the swap screen asks to quit swapping, but the decision is a swap" if quit_prompt
                                 else "the swap screen asks to accept a Pokemon, but the decision is to cancel")
            yes = self.u8(ptr + SWAP_YESNO_CURSOR) == 0
            return (["A"] if yes else ["UP"]), "quit" if quit_prompt else "accept"
        if st["Swap_Task_Exit"] in live:
            return [], "exit"
        return [], None


def drive_between(rom, swap, cap, progress, prompt_delay=0, new_round=False, draft_rule="first", stop_at_draft=False):
    """new_round: from the end of a round (a loss, or the seventh win) through the Lobby (the result text, the save, the record prompt), the
    attendant (the player stands facing him: A talks; take the challenge, Level 50, save YES), the walk, the new draft (the rental screen,
    driven by select_buttons with the draft rule) to the next round's first action menu. Every YES/NO there is answered A."""
    """From the end of a won battle to the next battle's first action menu (see the module docstring)."""
    o, st = rom.o, rom.st
    # NO at the prompt for a kept team; YES for a swap and for a cancel (which then backs out of the swap screen).
    decline = swap is None or swap.get("type") not in ("accept", "cancel")
    frames, phase_pulse = 0, 0
    rng_prev, watch_prev = rom.u32(rom.sym["gRngValue"]), rom.watch()
    changes, seen_field, swap_screen, answered, exit_seen, last, prompt_open = [], False, False, None, None, None, 0
    draft_positions = None
    brain_texts = progress.setdefault("brainTexts", [])
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
        for v in rom.script_positions():
            for text, ends in rom.text_sites.items():
                if any(e <= v <= e + 3 for e in ends) and (not brain_texts or brain_texts[-1] != text):
                    brain_texts.append(text)
        if frames >= cap:
            raise RoundError(f"the screens between battles did not reach the next action menu in {cap} frames (last state {last})")
        live = dict(rom.tasks())
        buttons, state = [], "other"
        select_live = rom.u32(st["sFactorySelectScreen"]) != 0 and any(f in live for f in (st["Select_Task_HandleChooseMons"], st["Select_Task_HandleMenu"],
                                                                                         st["Select_Task_HandleYesNo"], st["Select_Task_OpenSummaryScreen"]))
        if select_live:
            if not new_round:
                raise RoundError("the rental screen opened between two battles of a round")
            if stop_at_draft:
                # the run's end (stop_at_draft): the next challenge's rental screen is open, everything of the last round's end has played
                progress["reachedDraft"] = True
                break
            choose_ready = live.get(st["Select_Task_HandleChooseMons"]) == STATE_CHOOSE_MONS_HANDLE_INPUT
            if draft_positions is None and choose_ready:
                draft = rom.rental_mon_ids()
                if draft_rule == "strongest":
                    draft_positions, totals = rom.strongest_positions()
                else:
                    draft_positions, totals = rom.first_selectable_positions(draft), None
                progress["draft"] = {"rentalMons": draft, "positions": draft_positions, "rule": draft_rule, "statTotals": totals}
            phase_pulse = (phase_pulse + 1) % 4
            pressed, what = rom.select_buttons(draft_positions) if draft_positions is not None else ([], None)
            state = f"select-{what}"
            buttons = pressed if phase_pulse == 0 else []
        elif cb2 == st["Swap_CB2"]:
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
        elif st["Task_HandleYesNoInput"] in live and new_round:
            # the Lobby's "Okay to save before the challenge?" (and the save's own overwrite question): YES
            state = "yesno-lobby"
            phase_pulse = (phase_pulse + 1) % PULSE
            buttons = ["A"] if phase_pulse == 0 else []
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
                            "draws": lcg_distance(rng_prev, rng), "rentalMonsAfter": rom.rental_mon_ids()})
        rng_prev, watch_prev = rng, watch
    final = list(rom.watch())
    # The roll is the last change that produced the battle's final trainer and sets (the trainer alone is not enough: factory_init writes trainer 0,
    # and 0 is a trainer the next roll can pick).
    rolls = [c for c in changes if c["after"] == final]
    generation = None
    if rolls:
        c = rolls[-1]
        generation = {"frame": c["frame"], "rngBefore": c["rngBefore"], "rngAfter": c["rngAfter"], "draws": c["draws"], "rentalMonsAfter": c["rentalMonsAfter"]}
    progress.update({"frames": frames, "generation": generation, "watchChanges": changes[-6:], "swapPrompt": answered, "swapScreen": swap_screen,
                     "swap": {"decision": swap, "rom": exit_seen}, "transitions": transitions[-40:]})
    del progress["swapTrace"][:-12]
    return progress


def run_engine(args, setup_paths, out_path, known_k=(), variants=()):
    env = dict(os.environ, ROM_REPLAY_ROUND="1", ROM_REPLAY_SYMBOLS=str(args["symbols"]), ROM_REPLAY_DRAFT=args["draft"],
               ROM_REPLAY_HEARD="" if args["heard"] is None else ",".join(map(str, args["heard"])))
    if args["challenge"] is not None:
        env["ROM_REPLAY_CHALLENGE"] = str(args["challenge"])
    cmd = ["node", "--experimental-strip-types", "--no-warnings", "tools/integration/soundCensusRomReplay.ts", "round", f"--seed={args['seed']}",
           f"--scene={args['scene']}", "--round=1", f"--setups={','.join(map(str, setup_paths))}", f"--swap={args['swap']}", f"--policy={args['policy']}",
           f"--out={out_path}", "--events=1"]
    if args["frameBudget"]:
        cmd.append(f"--frame-budget={args['frameBudget']}")
    if known_k:
        cmd.append("--known-k=" + ",".join(str(k) for k in known_k))
    if variants:
        cmd.append("--player-variants=" + ",".join(str(v) for v in variants))
    if args["searchWins"]:
        cmd.append(f"--search-wins={args['searchWins']}")
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
            "symbols": int(opt("--symbols", "0")), "draft": opt("--draft", "first"), "searchWins": int(opt("--search-wins", "0")),
            "stopOnLoss": "--stop-on-loss" in rest, "stageRents": None if opt("--stage-rents") in (None, "") else int(opt("--stage-rents")),
            "heard": None if opt("--heard") in (None, "") else [int(x) for x in opt("--heard").split(",")]}
    # --prompt-delay K@N: wait K more frames at the swap prompt after battle N (0-based) before answering (genuine input timing: it moves the RNG cursor
    # of everything rolled after it, like a slower player). Battles 0..N are unchanged.
    delay_k, delay_at = (int(x) for x in opt("--prompt-delay", "0@-1").split("@"))
    # --rounds R: play R rounds back to back; after a round ends (lost, drawn, or won at the seventh battle) the ROM plays the Lobby and the next draft.
    rounds = int(opt("--rounds", "1"))
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
    # --stage-rents N: start the run from rent count N instead (for a chain whose next draft wraps the count at 256, fix 46); battle 1's draft was
    # already built by the lab, so N first counts at the next round's draft.
    staging_fix["rentsCount"] = request["rentalSwapCount"] if args["stageRents"] is None else args["stageRents"]
    oracle.write_u16(s2 + SB2_FACTORY_RENTS, staging_fix["rentsCount"])
    if args["symbols"]:
        # --symbols 1|2: the Factory symbols (FLAG_SYS_FACTORY_SILVER, FLAG_SYS_FACTORY_GOLD) a save holds after beating Noland once / twice; they decide
        # Noland's battles (GetFrontierBrainStatus, frontier_util.c:1656-1693). The lab sets the silver one the same way for a factoryBrain staging.
        lab._set_factory_symbol_flag(battle_lab.FLAG_SYS_FACTORY_SILVER)
        if args["symbols"] >= 2:
            lab._set_factory_symbol_flag(FLAG_SYS_FACTORY_GOLD)
        staging_fix["silverSymbol"] = lab._factory_symbol_count()
    if args["heard"] is not None:
        # --heard S,G: the heard-speech bits (battledBrainFlags, FRONTIER_DATA_HEARD_BRAIN_SPEECH) the save starts with.
        flags = rom.u16(s2 + SB2_BATTLED_BRAIN_FLAGS) & ~(HEARD_SILVER_BIT | HEARD_GOLD_BIT)
        flags |= (HEARD_SILVER_BIT if args["heard"][0] else 0) | (HEARD_GOLD_BIT if args["heard"][1] else 0)
        oracle.write_u16(s2 + SB2_BATTLED_BRAIN_FLAGS, flags)
    staging_fix["frontier"] = {"symbols": lab._factory_symbol_count(), "heardBrainSpeech": rom.heard_bits()}
    funcs = romDecisionDriver.resolve_funcs(sep.REF)
    result = {"schema": "rom-round-drive/v1", "seed": args["seed"], "scene": args["scene"], "policy": args["policy"], "swap": args["swap"], "promptDelay": [delay_k, delay_at],
              "challenge": request["challengeNum"], "request": request, "stagingFix": staging_fix, "battles": [], "error": None}
    setup_paths, generation, prior = [], None, None
    try:
        rounds_done = 0
        for n in range(7 * rounds):
            setup = rom.setup(descriptor, generation)
            path = work / f"setup-{n}.json"
            path.write_text(json.dumps(setup, separators=(",", ":")))
            setup_paths.append(path)
            engine = run_engine(args, setup_paths, work / "engine.json", [] if prior is None else [p["engineDrawsBeforeActionMenu"] for p in prior],
                                [] if prior is None else [p.get("playerVariant", 0) for p in prior])
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
            if drive["outcome"] == 1 and setup["round"]["battleNum"] < 6:
                entry["between"] = {}
                drive_between(rom, b.get("swapAfter"), BETWEEN_FRAME_CAP, entry["between"], delay_k if n == delay_at else 0)
                generation = entry["between"]["generation"]
                continue
            rounds_done += 1
            if rounds_done >= rounds or (args["stopOnLoss"] and not (drive["outcome"] == 1 and setup["round"]["battleNum"] == 6)):
                # The epilogue: the screens after the run's last battle (Noland's symbol or none, the Lobby, the next challenge's start), driven to
                # the next draft screen and recorded; then the save's symbols and heard bits.
                entry["between"] = {"epilogue": True}
                drive_between(rom, None, BETWEEN_FRAME_CAP, entry["between"], new_round=True, stop_at_draft=True)
                entry["between"]["afterRound"] = {"factorySymbols": rom.lab._factory_symbol_count(), "heardBrainSpeech": rom.heard_bits()}
                break
            entry["between"] = {"newRound": True}
            drive_between(rom, None, BETWEEN_FRAME_CAP, entry["between"], new_round=True, draft_rule=args["draft"])
            generation = entry["between"]["generation"]
    except RoundError as e:
        result["error"] = str(e)
    result["seconds"] = round(time.time() - t0, 1)
    out.write_text(json.dumps(result, separators=(",", ":")))


if __name__ == "__main__":
    main()
