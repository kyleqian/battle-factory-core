#!/usr/bin/env python3
"""Emulator-free tests for the frame catcher's plan, ROM driver and Pokemon records (tools/frame-catcher/plan.py, mons.py; run: python3 -m
unittest tools.test_frame_catcher)."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "frame-catcher"))

import plan as fc  # noqa: E402
import mons  # noqa: E402
import struct  # noqa: E402


def engine(frames, menus, buttons):
    return {"frames": frames, "menus": menus, "buttons": buttons}


class Helpers(unittest.TestCase):
    def test_new_buttons_is_the_press_that_starts(self):
        self.assertEqual(fc.new_buttons("LEFT", "LEFT+DOWN"), "DOWN")
        self.assertEqual(fc.new_buttons("", "A"), "A")
        self.assertEqual(fc.new_buttons("A", "A"), "A")  # a held button (key repeat): the held set

    def test_lcg_back_inverts_lcg(self):
        for x in (0, 1, 0xDEADBEEF, 936957621):
            self.assertEqual(fc.lcg_back(fc.lcg(x)), x)

    def test_steering(self):
        self.assertEqual(fc.steer_button("battle.action", "0", "3"), "RIGHT")
        self.assertEqual(fc.steer_button("battle.action", "1", "3"), "DOWN")
        self.assertIsNone(fc.steer_button("battle.action", "3", "3"))
        self.assertEqual(fc.steer_button("draft.cursor", "0", "5"), "LEFT")
        self.assertEqual(fc.steer_button("battle.party", "2", "7"), "DOWN")
        self.assertEqual(fc.steer_button("battle.party", "7", "0"), "UP")
        self.assertIsNone(fc.steer_button("summary", "x", "y"))
        self.assertEqual(fc.rom_sig("battle.party", "cancel"), "7")


class PlanTest(unittest.TestCase):
    def setUp(self):
        # action menu frames 10-19 (cursor 0, then 2 after DOWN at 14), A at 18 leaves it; free A at 30; fight menu 40-49, A at 45
        self.eng = engine(60,
                          [[0, None, None], [10, "battle.action", "0"], [15, "battle.action", "2"], [19, None, None],
                           [40, "battle.fight", "0"], [46, None, None]],
                          [[14, "DOWN"], [16, ""], [18, "A"], [20, ""], [30, "A"], [32, ""], [45, "A"], [47, ""]])

    def test_anchors_and_effects(self):
        p = fc.Plan(self.eng)
        self.assertEqual([a["kind"] for a in p.anchors], ["battle.action", "battle.fight"])
        a = p.anchors[0]
        self.assertEqual((a["start"], a["end"], a["sig"]), (10, 18, "0"))
        self.assertEqual([(e["offset"], e["buttons"], e["from"], e["to"], e["leaves"]) for e in a["effects"]],
                         [(4, "DOWN", "0", ["battle.action", "2"], False), (8, "A", "2", [None, None], True)])
        self.assertEqual([(f["offset"], f["buttons"]) for f in p.free[1]], [(11, "A")])  # after the action menu's end (frame 19)
        self.assertEqual(p.tail, 60 - 45)


class DriverTest(unittest.TestCase):
    def run_driver(self, eng, rom_menu_at, frames=80):
        """rom_menu_at(frame, pressed buttons so far) -> (kind, sig) | None. Returns the presses per frame."""
        notes = []
        d = fc.Driver(fc.Plan(eng), lambda what, **kw: notes.append((what, kw)))
        presses, menu = [], rom_menu_at(0, [])
        for f in range(frames):
            b = d.step(f, menu, None)
            if b is None:
                break
            presses.append(b)
            menu = rom_menu_at(f + 1, presses)
        return presses, notes, d

    def test_replays_menu_presses_at_their_offsets_and_free_presses_between(self):
        eng = engine(40, [[0, None, None], [10, "battle.action", "0"], [15, "battle.action", "2"], [19, None, None]],
                     [[14, "DOWN"], [16, ""], [18, "A"], [20, ""], [30, "A"], [32, ""]])

        def rom(f, presses):
            # the ROM's menu opens 5 frames later than the engine's; DOWN moves the cursor, A closes the menu
            if f < 15:
                return None
            pressed = ["+".join(p) for p in presses]
            if "A" in pressed[15:]:
                return None
            return ("battle.action", "2" if "DOWN" in pressed[15:] else "0")
        presses, notes, d = self.run_driver(eng, rom)
        first_down = next(i for i, p in enumerate(presses) if p == ["DOWN"])
        first_a = next(i for i, p in enumerate(presses) if p == ["A"])
        self.assertEqual(first_down, 15 + 4)
        self.assertGreaterEqual(first_a, 15 + 8)
        # the free A after the menu: 11 frames after the ROM's menu closed
        closed = first_a + 1
        self.assertIn(["A"], presses[closed + 1:])
        self.assertEqual(d.ai, 1)
        self.assertFalse([n for n in notes if n[0] == "cursor-differs-before-press"])

    def test_steers_a_cursor_that_is_elsewhere_before_the_choice(self):
        eng = engine(30, [[0, None, None], [5, "battle.party", "0"], [8, "battle.party", "1"], [10, "battle.party", "2"],
                          [12, "battle.party", "cancel"], [14, None, None]],
                     [[7, "DOWN"], [8, ""], [9, "DOWN"], [10, ""], [11, "DOWN"], [12, ""], [13, "A"], [14, ""]])
        state = {"slot": 1, "open": True, "last": []}  # the ROM's cursor starts one slot down

        def rom(f, presses):
            if not state["open"] or f < 5:
                return None if not state["open"] else None
            p = presses[-1] if presses else []
            if p != state["last"] and p:
                if p == ["DOWN"]:
                    state["slot"] = {0: 1, 1: 2, 2: 7, 7: 0}[state["slot"]]
                elif p == ["UP"]:
                    state["slot"] = {0: 7, 1: 0, 2: 1, 7: 2}[state["slot"]]
                elif p == ["A"]:
                    state["open"] = False
                    state["chosen"] = state["slot"]
                    return None
            state["last"] = p
            return ("battle.party", str(state["slot"]))
        presses, notes, d = self.run_driver(eng, rom, 200)
        self.assertEqual(state.get("chosen"), 7)  # A on CANCEL, as the engine did
        self.assertTrue([n for n in notes if n[0] == "cursor-differs-before-press"])
        self.assertTrue(d.steer_frames)

    def test_no_free_press_at_an_unplanned_rom_menu(self):
        eng = engine(40, [[0, None, None]], [[5, "A"], [7, ""], [20, "A"], [22, ""]])
        presses, notes, d = self.run_driver(eng, lambda f, p: ("field.yesno", "0") if f >= 3 else None, 40)
        self.assertFalse([p for p in presses[3:] if p])
        self.assertTrue([n for n in notes if n[0] == "unplanned-rom-menu"])

    def test_a_sound_only_press_in_a_menu_is_made_once(self):
        # the forced party menu 10-29: RIGHT at 14 moves the cursor; B at 20 changes nothing and plays SE_FAILURE (party_menu.c:1382-1384);
        # A at 26 leaves. Without the sound the B would not be in the plan (the ROM never got it and played no SE_FAILURE).
        eng = engine(40, [[0, None, None], [10, "battle.party", "0"], [15, "battle.party", "1"], [27, None, None]],
                     [[14, "RIGHT"], [16, ""], [20, "B"], [22, ""], [26, "A"], [28, ""]])
        eng["sounds"] = [[15, {"kind": "se", "id": 5}], [20, {"kind": "se", "id": 32}], [27, {"kind": "se", "id": 5}]]
        a = fc.Plan(eng).anchors[0]
        self.assertEqual([(e["offset"], e["buttons"], e.get("still", False)) for e in a["effects"]],
                         [(4, "RIGHT", False), (10, "B", True), (16, "A", False)])
        self.assertEqual([e["buttons"] for e in fc.Plan({**eng, "sounds": []}).anchors[0]["effects"]], ["RIGHT", "A"])
        state = {"slot": 0, "open": True, "last": [], "b": 0}

        def rom(f, presses):
            if not state["open"] or f < 10:
                return None
            p = presses[-1] if presses else []
            if p != state["last"] and p:
                if p == ["RIGHT"]:
                    state["slot"] = 1
                elif p == ["B"]:
                    state["b"] += 1
                elif p == ["A"]:
                    state["open"] = False
                    return None
            state["last"] = p
            return ("battle.party", str(state["slot"]))
        presses, notes, d = self.run_driver(eng, rom, 80)
        self.assertEqual(state["b"], 1)  # pressed once, not retried for an effect it cannot have
        self.assertFalse(state["open"])
        self.assertFalse([n for n in notes if n[0] in ("press-without-effect", "anchor-left-early")])


class M4aRestartTest(unittest.TestCase):
    """Rollout's SE_M_HEADBUTT is started again on 10 frames in a row; the frame-end m4a RAM of frames 2-10 is the same."""
    PLAYER, TRACKS = 0x3007000, 0x3006000

    def ram(self, clock=0, tempo_c=0, status=0, flags=0x83, wait=0):
        info = bytearray(0x40)
        info[4:8] = status.to_bytes(4, "little")
        info[8] = 1  # one track
        info[0xC:0x10] = clock.to_bytes(4, "little")
        info[0x22:0x24] = tempo_c.to_bytes(2, "little")
        info[0x2C:0x30] = self.TRACKS.to_bytes(4, "little")
        track = bytearray(0x50)
        track[0] = flags
        track[1] = wait
        mem = {self.PLAYER: bytes(info), self.TRACKS: bytes(track)}
        return lambda a, n: mem[a][:n]

    def test_a_live_track_that_did_not_move_was_restarted(self):
        self.assertTrue(fc.m4a_restarted(self.ram(), self.ram(), [self.PLAYER]))
        self.assertTrue(fc.m4a_restarted(self.ram(), self.ram(), {self.PLAYER: "SE1"}))  # romRun passes its {address: name} map

    def test_a_playing_or_finished_or_paused_song_was_not(self):
        self.assertFalse(fc.m4a_restarted(self.ram(clock=1), self.ram(clock=2), [self.PLAYER]))  # a tick
        self.assertFalse(fc.m4a_restarted(self.ram(tempo_c=75), self.ram(tempo_c=0), [self.PLAYER]))  # between ticks
        self.assertFalse(fc.m4a_restarted(self.ram(wait=3), self.ram(wait=2), [self.PLAYER]))
        self.assertFalse(fc.m4a_restarted(self.ram(flags=0), self.ram(flags=0), [self.PLAYER]))  # every track ended
        self.assertFalse(fc.m4a_restarted(self.ram(status=0x80000000), self.ram(status=0x80000000), [self.PLAYER]))  # stopped


class SoundAttributionTest(unittest.TestCase):
    def test_press_frames(self):
        import compare as cmp
        self.assertEqual(cmp.press_frames([[1, "LEFT"], [2, ""], [5, "LEFT"], [6, "LEFT+DOWN"], [7, "DOWN"], [9, ""]]), {1, 5, 6})

    def test_a_press_sound_on_the_frame_its_menu_opened_counts_for_the_menu_that_took_the_press(self):
        import compare as cmp
        # ours: A at 100 opens the next menu on 100 (a stretch boundary); its SE_SELECT goes to the stretch before. A cry there stays.
        sounds = [[100, {"kind": "se", "id": 5}], [100, {"kind": "cry", "id": 16}], [104, {"kind": "se", "id": 5}], [200, {"kind": "se", "id": 5}]]
        out = cmp.attribute_press_sounds(sounds, {100, 104}, {100, 200})
        self.assertEqual([f for f, _ in out], [99, 100, 104, 200])

    def test_only_a_steer_press_s_own_select_is_left_out(self):
        import compare as cmp
        # seed 3's fight menu: the ROM driver steers RIGHT (7793) and DOWN (7799); the player's own B follows at 7804
        sounds = [[7782, {"kind": "se", "id": 5}], [7793, {"kind": "se", "id": 5}], [7799, {"kind": "se", "id": 5}], [7804, {"kind": "se", "id": 5}]]
        self.assertEqual(cmp.steer_sounds(sounds, [7793, 7799]), {1, 2})

    def test_the_same_sound_twice_on_one_frame_counts_once(self):
        import compare as cmp
        se = {"kind": "se", "id": 5, "pan": None}
        # ours logs both SE_SELECTs of the YES / NO's NO; the ROM log has one (its second MPlayStart is a no-op)
        out = cmp.sound_compare([[15173, se], [15181, se], [15181, se]], [[15962, se], [15970, se]], 15165, 15200, 15953, 15990)
        self.assertEqual((out["class"], out["missingInOurs"], out["extraInOurs"]), ("timing", [], []))  # one frame apart, nothing unmatched

    def test_a_volume_set_to_the_volume_it_has_is_dropped(self):
        import compare as cmp
        duck = lambda v: {"kind": "duck", "id": 469, "volume": v}
        # the summary's cry ducks and restores; CloseSummaryScreen restores again (a no-op the ROM log leaves out); a new BGM is at full volume
        sounds = [[10, duck(85)], [40, duck(256)], [62, duck(256)], [70, {"kind": "bgm", "id": 476}], [80, duck(256)], [90, duck(85)]]
        self.assertEqual([f for f, _ in cmp.drop_unchanged_volume(sounds)], [10, 40, 70, 90])

    def test_a_cry_stop_after_the_cry_is_over_is_dropped(self):
        import compare as cmp
        cry, stop = {"kind": "cry", "id": 240}, {"kind": "stop", "id": None, "player": "cry"}
        duck = lambda v: {"kind": "duck", "id": 469, "volume": v}
        # the cry (ducked, restored once over); a close long after: its stop cuts nothing. A stop during a cry stays.
        sounds = [[3707, duck(85)], [3707, cry], [3749, duck(256)], [3953, stop], [4100, duck(85)], [4100, cry], [4120, stop], [4120, duck(256)]]
        self.assertEqual([f for f, _ in cmp.drop_silent_cry_stops(sounds)], [3707, 3707, 3749, 4100, 4100, 4120, 4120])

    def test_a_press_the_rom_side_cannot_read_is_made_once(self):
        # the summary's contest-moves page: A opens move select (the engine's sig changes, the ROM's stays "?"), then B leaves
        eng = engine(30, [[0, None, None], [10, "summary", "contestMoves:0:-"], [14, "summary", "contestMoves:0:0"], [24, None, None]],
                     [[13, "A"], [15, ""], [23, "B"], [25, ""]])
        state = {"a": 0, "open": True, "last": []}

        def rom(f, presses):
            if not state["open"] or f < 10:
                return None
            p = presses[-1] if presses else []
            if p != state["last"] and p:
                if p == ["A"]:
                    state["a"] += 1
                elif p == ["B"]:
                    state["open"] = False
                    return None
            state["last"] = p
            return ("summary", "?")
        presses, notes, d = DriverTest.run_driver(DriverTest(), eng, rom, 80)
        self.assertEqual(state["a"], 1)
        self.assertFalse(state["open"])


class MonRecordTest(unittest.TestCase):
    """mons.with_personality: a select-screen rental re-stored with the engine's personality (romRun.patch_select_mons). Seed 6's GROWLITHE
    (set 136, nature 6, genderRatio 63, abilities Intimidate / Flash Fire): the ROM drew 2844908581 (female, Flash Fire), ours 347824006
    (male, Intimidate)."""
    ROM_P, ENGINE_P, OT = 2844908581, 347824006, 416049562

    def record(self, personality, ability_bit, species=58):
        growth = struct.pack("<HHIBBH", species, 0, 156250, 0, 0, 0)
        attacks = struct.pack("<4H4B", 52, 53, 44, 36, 25, 15, 25, 20)
        evs = bytes([0, 255, 0, 255, 0, 0]) + bytes(6)
        ivs = sum(3 << (5 * k) for k in range(6)) | (ability_bit << 31)
        misc = struct.pack("<BBHII", 0, 0, 0, ivs, 0)
        raw = bytearray(mons.POKEMON_SIZE)
        struct.pack_into("<7H", raw, 86, 148, 148, 97, 66, 81, 92, 71)
        raw[84] = 50
        return mons.encrypt_mon(bytes(raw), [growth, attacks, evs, misc], personality, self.OT), [growth, attacks, evs, misc]

    def test_the_engine_personality_is_stored_with_the_rom_record_kept(self):
        raw, logical = self.record(self.ROM_P, self.ROM_P & 1)
        new = mons.with_personality(raw, self.ENGINE_P, self.OT, two_abilities=True)
        self.assertEqual(struct.unpack_from("<II", new, 0), (self.ENGINE_P, self.OT))
        out, ok = mons.decrypt_mon(new)
        self.assertTrue(ok)
        self.assertEqual(out[:3], logical[:3])  # species, experience, moves, PP, EVs untouched
        self.assertNotEqual(self.ROM_P % 24, self.ENGINE_P % 24)  # the substructures moved
        self.assertEqual(struct.unpack_from("<I", out[3], 4)[0] & 0x7FFFFFFF, struct.unpack_from("<I", logical[3], 4)[0] & 0x7FFFFFFF)  # IVs
        self.assertEqual((mons.ability_num(raw), mons.ability_num(new)), (1, 0))  # Flash Fire -> Intimidate
        self.assertEqual(new[80:], raw[80:])  # level, HP and stats: the nature is the same
        self.assertEqual((mons.gender(self.ROM_P, 63), mons.gender(self.ENGINE_P, 63)), ("female", "male"))

    def test_a_one_ability_species_keeps_its_ability_bit(self):
        raw, _ = self.record(self.ROM_P, 0, species=292)
        new = mons.with_personality(raw, self.ENGINE_P + 25, self.OT, two_abilities=False)  # odd personality, same nature
        self.assertEqual(mons.ability_num(new), 0)
        self.assertEqual(mons.species_of(new), 292)

    def test_another_nature_is_refused(self):
        raw, _ = self.record(self.ROM_P, 1)
        with self.assertRaises(ValueError):
            mons.with_personality(raw, self.ENGINE_P + 1, self.OT, two_abilities=True)

    def test_gender_ratios(self):
        self.assertEqual([mons.gender(0x12345600 | b, 63) for b in (0, 62, 63, 255)], ["female", "female", "male", "male"])
        self.assertEqual([mons.gender(7, r) for r in (0, 0xFE, 0xFF)], ["male", "female", "genderless"])


if __name__ == "__main__":
    unittest.main()
