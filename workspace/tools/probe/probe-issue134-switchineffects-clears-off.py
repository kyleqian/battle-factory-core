#!/usr/bin/env python3
"""Read-only Battle Scene OFF receipt probe for ISSUES #134.

Run only through tools/run-mgba-probe.py.

Source under test: `battle_script_commands.c:5219-5299` `Cmd_switchineffects`.
Two clears live there:

  * `:5226` `gHitMarker &= ~HITMARKER_FAINTED(gActiveBattler)` -- UNCONDITIONAL,
    at the very top of the opcode, before the Spikes gate and before any
    ability hook runs.
  * `:5268` `gSideStatuses[side] &= ~SIDE_STATUS_SPIKES_DAMAGED` -- inside the
    `if (!AbilityBattleEffects(ABILITYEFFECT_ON_SWITCHIN, ...) && !ItemBattleEffects(...))`
    body, which an Intimidate or Trace switch-in DOES enter because
    `battle_util.c:2559-2581` sets only `STATUS3_INTIMIDATE_POKES` /
    `STATUS3_TRACE` and breaks with no `effect++` (so the call returns 0).

The port (`src/engine/battleScriptSwitchinOpcode.ts:1224`/`:1236`) returns
early from the Intimidate/Trace branches carrying neither clear, so a second
switch-in on a Spikes side takes no Spikes damage in the port. This probe
measures the stock ROM's answer.

Fixture shape (`mechanicLab` `overrides.parties`, three complete legal L50 mons
per side, no injected transient state): the opponent lead's four move slots are
all MOVE_SPIKES, so the Factory AI has exactly one legal choice; the player
leads with a MOVE_SPLASH user, switches 0 -> 1 on turn 2 (arm-dependent slot 1:
Intimidate TAUROS, or the non-Intimidate control MACHOP) and 1 -> 2 on turn 3.

Sampled every controller trace frame:
  * `gSideStatuses[0]` -- the SIDE_STATUS_SPIKES / SIDE_STATUS_SPIKES_DAMAGED
    bit transitions with their exact frames,
  * `gBattleMons[0]` species/hp/maxHp and `gBattlerPartyIndexes[0]`, so each
    entry's post-entry HP and Spikes chip are attributable,
  * `gHitMarker >> 28` (the four HITMARKER_FAINTED bits),
  * `gBattlescriptCurrInstr` resolved to `BattleScript_*+n`,
  * `gBattleMainFunc`,
  * `gDisplayedStringBattle` transitions.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit(f"usage: {sys.argv[0]} <fixture.json> <output.json>")

FIXTURE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
WORKTREE_ROOT = Path(__file__).resolve().parents[2]
PROFILE = "battle-scene-off"
DISPLAYED_STRING_BYTES = 128
BATTLE_MON_SIZE = 0x58
SIDE_TIMER_SIZE = 12
SIDE_TIMER_SPIKES_AMOUNT = 10
SIDE_STATUS_SPIKES = 1 << 4
SIDE_STATUS_SPIKES_DAMAGED = 1 << 9


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find harness root above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402


def decode_displayed(raw: list[int]) -> str:
    chars: list[str] = []
    punctuation = {
        0x00: " ", 0xAB: "!", 0xAC: "?", 0xAD: ".", 0xAE: "-",
        0xB4: "’", 0xB8: ",", 0xBA: "/", 0xF0: ":",
    }
    for value in raw:
        if value == 0xFF:
            break
        if value == 0xFE:
            chars.append("\n")
        elif value in punctuation:
            chars.append(punctuation[value])
        elif 0xA1 <= value <= 0xAA:
            chars.append(str(value - 0xA1))
        elif 0xBB <= value <= 0xD4:
            chars.append(chr(ord("A") + value - 0xBB))
        elif 0xD5 <= value <= 0xEE:
            chars.append(chr(ord("a") + value - 0xD5))
        elif value in (0xFA, 0xFB):
            chars.append("\n")
        else:
            chars.append(f"<{value:02X}>")
    return "".join(chars)


def iter_trace_frames(trace: dict):
    frame = 0
    for segment in trace["segments"]:
        for _ in range(int(segment["frames"])):
            frame += 1
            yield frame, segment.get("buttons", [])


def party_identity(mon: dict) -> dict:
    return {
        "species": mon["species"],
        "item": mon["item"],
        "abilitySlot": mon["abilitySlot"],
        "ability": mon["ability"],
        "moves": mon["moves"],
    }


def main() -> None:
    fixture = json.loads(FIXTURE_PATH.read_text())
    request = validate_request(fixture, PROFILE)
    reference = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(
        reference / "pokeemerald.gba",
        reference / "pokeemerald.map",
        ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json",
    )
    lab = BattleLab(oracle, PROFILE)
    lab.prepare(request)
    symbols = oracle.symbols
    parties = lab.snapshot()["parties"]

    side_statuses_addr = symbols["gSideStatuses"]
    hit_marker_addr = symbols["gHitMarker"]
    curr_instr_addr = symbols["gBattlescriptCurrInstr"]
    main_func_addr = symbols["gBattleMainFunc"]
    party_indexes_addr = symbols["gBattlerPartyIndexes"]
    battle_mons_addr = symbols["gBattleMons"]
    side_timers_addr = symbols["gSideTimers"]

    script_symbols = sorted(
        (address, name)
        for name, address in symbols.items()
        if name.startswith("BattleScript_")
    )

    def resolve_script(address: int) -> str:
        if address == 0:
            return "0"
        best: tuple[int, str] | None = None
        for symbol_address, name in script_symbols:
            if symbol_address <= address and (best is None or symbol_address >= best[0]):
                best = (symbol_address, name)
        if best is None or address - best[0] > 0x400:
            return f"0x{address:08x}"
        offset = address - best[0]
        return best[1] if offset == 0 else f"{best[1]}+{offset}"

    def read_side_status() -> int:
        return oracle.read_u16(side_statuses_addr)

    def read_spikes_layers() -> int:
        return oracle.read_u8(side_timers_addr + SIDE_TIMER_SPIKES_AMOUNT)

    def read_player_active() -> dict:
        return {
            "partyIndex": oracle.read_u8(party_indexes_addr),
            "species": oracle.read_u16(battle_mons_addr),
            "hp": oracle.read_u16(battle_mons_addr + 0x28),
            "maxHp": oracle.read_u16(battle_mons_addr + 0x2C),
        }

    def read_message() -> str:
        return decode_displayed([
            oracle.read_u8(symbols["gDisplayedStringBattle"] + offset)
            for offset in range(DISPLAYED_STRING_BYTES)
        ])

    initial_side = read_side_status()
    initial_active = read_player_active()
    previous_side = initial_side
    previous_active = initial_active
    previous_layers = read_spikes_layers()
    previous_message = read_message()
    previous_fainted_bits = (oracle.read_u32(hit_marker_addr) >> 28) & 0xF

    side_status_events: list[dict] = []
    spikes_layer_events: list[dict] = []
    entry_events: list[dict] = []
    hp_events: list[dict] = []
    hit_marker_events: list[dict] = []
    message_events: list[dict] = []

    # One window per player-side entry. gBattlerPartyIndexes[0] flips a couple
    # of frames before gBattleMons[0] is reloaded, so the window -- not the
    # flip frame -- is what carries the entrant's species/HP.
    def open_window(frame: int, party_index: int) -> dict:
        window = {
            "frame": frame,
            "partyIndex": party_index,
            "species": None,
            "maxHp": None,
            "hpAfterLoad": None,
            "hpAfterEntry": None,
            "spikesDamage": 0,
            "spikesLayersAtEntry": None,
            "sideStatusAtWindowEnd": None,
            "spikesDamagedBitAtWindowEnd": None,
            "hpTransitions": [],
        }
        entry_events.append(window)
        return window

    current_window = open_window(0, initial_active["partyIndex"])
    current_window["species"] = initial_active["species"]
    current_window["maxHp"] = initial_active["maxHp"]
    current_window["hpAfterLoad"] = initial_active["hp"]

    for frame, buttons in iter_trace_frames(request["trace"]):
        oracle.advance(buttons)
        side_now = read_side_status()
        active_now = read_player_active()
        fainted_bits = (oracle.read_u32(hit_marker_addr) >> 28) & 0xF

        if side_now != previous_side:
            side_status_events.append({
                "frame": frame,
                "from": previous_side,
                "to": side_now,
                "spikesBefore": bool(previous_side & SIDE_STATUS_SPIKES),
                "spikesAfter": bool(side_now & SIDE_STATUS_SPIKES),
                "spikesDamagedBefore": bool(previous_side & SIDE_STATUS_SPIKES_DAMAGED),
                "spikesDamagedAfter": bool(side_now & SIDE_STATUS_SPIKES_DAMAGED),
                "battleScript": resolve_script(oracle.read_u32(curr_instr_addr)),
                "battleMainFunc": oracle.read_u32(main_func_addr),
            })
            previous_side = side_now

        layers_now = read_spikes_layers()
        if layers_now != previous_layers:
            spikes_layer_events.append({
                "frame": frame,
                "from": previous_layers,
                "to": layers_now,
                "battleScript": resolve_script(oracle.read_u32(curr_instr_addr)),
            })
            previous_layers = layers_now

        if active_now["partyIndex"] != previous_active["partyIndex"]:
            current_window = open_window(frame, active_now["partyIndex"])
        if active_now["species"] != previous_active["species"] and current_window["species"] is None:
            current_window["species"] = active_now["species"]
            current_window["maxHp"] = active_now["maxHp"]
            current_window["hpAfterLoad"] = active_now["hp"]
            current_window["spikesLayersAtEntry"] = layers_now
        if active_now["hp"] != previous_active["hp"] and current_window["hpAfterLoad"] is not None:
            script = resolve_script(oracle.read_u32(curr_instr_addr))
            transition = {
                "frame": frame,
                "from": previous_active["hp"],
                "to": active_now["hp"],
                "battleScript": script,
            }
            current_window["hpTransitions"].append(transition)
            hp_events.append({**transition, "partyIndex": active_now["partyIndex"],
                              "species": active_now["species"], "maxHp": active_now["maxHp"]})
            if script.startswith("BattleScript_SpikesOn"):
                current_window["spikesDamage"] += previous_active["hp"] - active_now["hp"]
        current_window["hpAfterEntry"] = active_now["hp"]
        current_window["sideStatusAtWindowEnd"] = side_now
        current_window["spikesDamagedBitAtWindowEnd"] = bool(side_now & SIDE_STATUS_SPIKES_DAMAGED)
        previous_active = active_now

        if fainted_bits != previous_fainted_bits:
            hit_marker_events.append({
                "frame": frame,
                "from": previous_fainted_bits,
                "to": fainted_bits,
                "battleScript": resolve_script(oracle.read_u32(curr_instr_addr)),
            })
            previous_fainted_bits = fainted_bits

        message = read_message()
        if message and message != previous_message:
            message_events.append({"frame": frame, "text": message})
        previous_message = message

    final_snapshot = lab.snapshot()
    result = {
        "schema": "issue134-switchineffects-clears-off-semantic-receipt/v1",
        "fixture": str(FIXTURE_PATH.as_posix()),
        "oracleProfile": PROFILE,
        "seed": request["seed"],
        "sampledEveryTraceFrame": True,
        "constants": {
            "SIDE_STATUS_SPIKES": SIDE_STATUS_SPIKES,
            "SIDE_STATUS_SPIKES_DAMAGED": SIDE_STATUS_SPIKES_DAMAGED,
        },
        "symbols": {
            "gSideStatuses": side_statuses_addr,
            "gHitMarker": hit_marker_addr,
            "gBattlescriptCurrInstr": curr_instr_addr,
            "gBattleMainFunc": main_func_addr,
            "gBattlerPartyIndexes": party_indexes_addr,
            "gBattleMons": battle_mons_addr,
            "gSideTimers": side_timers_addr,
        },
        "parties": {
            side: [party_identity(mon) for mon in parties[side]]
            for side in ("player", "opponent")
        },
        "initial": {
            "sideStatuses0": initial_side,
            "playerActive": initial_active,
            "spikesLayers0": previous_layers if not spikes_layer_events else spikes_layer_events[0]["from"],
        },
        "sideStatusEvents": side_status_events,
        "spikesLayerEvents": spikes_layer_events,
        "entryEvents": entry_events,
        "playerActiveHpEvents": hp_events,
        "hitMarkerFaintedEvents": hit_marker_events,
        "messageEvents": message_events,
        "final": {
            "sideStatuses0": read_side_status(),
            "spikesLayers0": read_spikes_layers(),
            "playerActive": read_player_active(),
            "playerParty": [
                {"species": mon["species"], "hp": mon["hp"], "maxHp": mon["maxHp"]}
                for mon in final_snapshot["parties"]["player"]
            ],
            "opponentActiveSpecies": final_snapshot["battlers"]["opponent"]["species"],
        },
        "framebufferSha256": hashlib.sha256(oracle.screen_rgb()).hexdigest(),
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(
        f"wrote {OUTPUT_PATH}: sideStatusEvents={len(side_status_events)} "
        f"entries={len(entry_events)} hpEvents={len(hp_events)} "
        f"messages={len(message_events)}",
        flush=True,
    )


if __name__ == "__main__":
    main()
