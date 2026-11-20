#!/usr/bin/env python3
"""Emulator-free tests for the frame catcher's plan and ROM driver (tools/frame-catcher/plan.py; run: python3 -m unittest tools.test_frame_catcher)."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "frame-catcher"))

import plan as fc  # noqa: E402


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


if __name__ == "__main__":
    unittest.main()
