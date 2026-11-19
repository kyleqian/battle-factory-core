#!/usr/bin/env python3
"""Emulator-free tests for tools/audio/romDecisionDriver.py and soundEventProbe.drive_lab (run: python3 -m unittest tools.test_rom_decision_driver)."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "audio"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import romDecisionDriver as rd  # noqa: E402
from test_sound_event_probe_args import load_probe  # noqa: E402

FUNCS = {"HandleInputChooseAction": 0x1000, "HandleInputChooseMove": 0x2000, "WaitForMonSelection": 0x3000, "Task_HandleChooseMonInput": 0x4000}
MAP = """ .text          0x08057458     0x5cc0 src/battle_controller_player.o
 .text          0x08100000      0x100 src/battle_controller_pokedude.o
"""
NM = """08057458 t HandleInputChooseAction
0810001c t HandleInputChooseAction
0805a000 t HandleInputChooseMove
08059000 t WaitForMonSelection
0806a000 T Task_HandleChooseMonInput
         U undefined_thing
08000000 r some_rodata
"""


def obs(func="other", action=0, move=0, slot=0, tasks=(), outcome=0, sig=0, order=None):
    return {**({} if order is None else {"partyOrder": order}), "func": {"action": 0x1001, "move": 0x2001, "party": 0x3001}.get(func, 0x9001), "actionCursor": action, "moveCursor": move,
            "slotId": slot, "partyTasks": [0x4000] if tasks else [], "outcome": outcome, "sig": sig}


def run(driver, observations):
    """One step per observation; returns the buttons list per frame."""
    out = []
    for o in observations:
        out.append(driver.step(o))
        driver.advanced()
    return out


class StaticHelpersTest(unittest.TestCase):
    def test_player_text_range(self):
        self.assertEqual(rd.player_text_range(MAP), (0x08057458, 0x08057458 + 0x5CC0))
        with self.assertRaises(SystemExit):
            rd.player_text_range("nothing")

    def test_parse_nm_keeps_duplicates_and_drops_noise(self):
        nm = rd.parse_nm(NM)
        self.assertEqual(nm["HandleInputChooseAction"], [0x08057458, 0x0810001C])
        self.assertNotIn("undefined_thing", nm)
        self.assertNotIn("some_rodata", nm)

    def test_pick_funcs_prefers_the_player_copy(self):
        funcs = rd.pick_funcs(rd.parse_nm(NM), rd.player_text_range(MAP))
        self.assertEqual(funcs["HandleInputChooseAction"], 0x08057458)
        self.assertEqual(funcs["Task_HandleChooseMonInput"], 0x0806A000)

    def test_pick_funcs_rejects_an_ambiguous_name(self):
        nm = rd.parse_nm(NM.replace("08057458 t HandleInputChooseAction", "09000000 t HandleInputChooseAction"))
        with self.assertRaises(SystemExit):
            rd.pick_funcs(nm, rd.player_text_range(MAP))

    def test_load_decisions_validates(self):
        good = [{"kind": "move", "slot": 3, "menuOpenFrame": 1, "commitFrame": 9}, {"kind": "switch", "partyIndex": 2, "menuOpenFrame": 20, "commitFrame": 30}]
        self.assertEqual(rd.load_decisions({"decisions": good}), good)
        self.assertEqual(rd.load_decisions(good), good)
        for bad in ({"kind": "move", "slot": 4}, {"kind": "switch", "partyIndex": 6}, {"kind": "item"}, {"kind": "move"}):
            with self.assertRaises(SystemExit):
                rd.load_decisions([bad])

    def test_rle_merges_equal_neighbours(self):
        self.assertEqual(rd.rle([[], [], ["A"], [], ["A"], ["A"]]),
                         [{"frames": 2, "buttons": []}, {"frames": 1, "buttons": ["A"]}, {"frames": 1, "buttons": []}, {"frames": 2, "buttons": ["A"]}])
        self.assertEqual(rd.rle([]), [])


class RomDriverTest(unittest.TestCase):
    def test_classify_masks_the_thumb_bit_and_checks_the_party_task(self):
        d = rd.RomDriver([], FUNCS)
        self.assertEqual(d.classify(obs("action")), "action")
        self.assertEqual(d.classify(obs("move")), "move")
        self.assertEqual(d.classify(obs("party", tasks=True)), "party-choose")
        self.assertEqual(d.classify(obs("party")), "party-other")
        self.assertEqual(d.classify(obs("other")), "other")

    def test_action_menu_moves_the_cursor_to_fight_then_presses_a(self):
        d = rd.RomDriver([{"kind": "move", "slot": 0}], FUNCS)
        self.assertEqual(d.step(obs("action", action=3)), ["LEFT"])
        d.advanced()
        self.assertEqual(d.step(obs("action", action=3)), [])  # release frame after a press
        d.advanced()
        self.assertEqual(d.step(obs("action", action=2)), ["UP"])
        d.advanced()
        d.step(obs("action", action=2))
        d.advanced()
        self.assertEqual(d.step(obs("action", action=0)), ["A"])

    def test_a_forced_move_decision_is_consumed_at_the_action_menu(self):
        # parity-mac: forced Struggle / Encore turns open no move menu on the ROM (battle_main.c:4184-4197)
        d = rd.RomDriver([{"kind": "move", "slot": 2, "forced": True}, {"kind": "move", "slot": 1}], FUNCS)
        self.assertEqual(run(d, [obs("action", action=0), obs("action", action=0)]), [["A"], []])
        self.assertEqual(d.index, 1)
        self.assertEqual(d.anchors, [{"index": 0, "kind": "move", "menuOpenFrame": 0, "commitFrame": 1}])
        # the action handler is still installed on the commit frames: no second decision is consumed there
        self.assertEqual(d.step(obs("action", action=0)), [])
        self.assertEqual(d.index, 1)
        d.advanced()
        d.step(obs("other"))
        d.advanced()
        # the next turn's action menu, then its move menu, take decision 1 as usual
        self.assertEqual(run(d, [obs("action", action=0), obs("action", action=0), obs("move", move=1)])[-1], ["A"])
        self.assertTrue(d.done())

    def test_move_menu_navigates_the_2x2_grid_and_records_the_anchor(self):
        d = rd.RomDriver([{"kind": "move", "slot": 3}], FUNCS)
        frames = [obs("move", move=0), obs("move", move=0), obs("move", move=1), obs("move", move=1), obs("move", move=3)]
        self.assertEqual(run(d, frames), [["RIGHT"], [], ["DOWN"], [], ["A"]])
        self.assertTrue(d.done())
        self.assertEqual(d.anchors, [{"index": 0, "kind": "move", "menuOpenFrame": 0, "moveMenuFrame": 0, "commitFrame": 5}])

    def test_commit_frame_still_showing_the_move_menu_is_not_reentered(self):
        d = rd.RomDriver([{"kind": "move", "slot": 0}, {"kind": "move", "slot": 1}], FUNCS)
        first = run(d, [obs("move", move=0), obs("move", move=0)])
        self.assertEqual(first[0], ["A"])
        self.assertEqual(d.index, 1)
        self.assertEqual(first[1], [])  # release frame
        # the old handler is still installed on the next frame: pulse instead of consuming decision 1
        self.assertEqual(d.step(obs("move", move=0)), [])
        self.assertEqual(d.index, 1)

    def test_party_menu_uses_slot_id_closed_loop(self):
        d = rd.RomDriver([{"kind": "switch", "partyIndex": 2}], FUNCS)
        seq = run(d, [obs("party", slot=0, tasks=True), obs("party", slot=0, tasks=True), obs("party", slot=1, tasks=True),
                      obs("party", slot=1, tasks=True), obs("party", slot=2, tasks=True)])
        self.assertEqual(seq, [["DOWN"], [], ["DOWN"], [], ["A"]])
        self.assertEqual(d.anchors, [])  # bal1: a real switch's anchor stays open until the SEND OUT confirm (or the menu closing)
        d.step(obs("other"))
        self.assertEqual(d.anchors[0]["kind"], "switch")
        up = rd.RomDriver([{"kind": "switch", "partyIndex": 1}], FUNCS)
        self.assertEqual(up.step(obs("party", slot=3, tasks=True)), ["UP"])

    def test_menu_slot_follows_gBattlePartyCurrentOrder_after_a_roar(self):
        order = [0x10, 0x23, 0x45]  # seed 11: Roar swapped battle slots 0 and 1 (SwitchPartyOrder); party id 0 now sits in menu slot 1
        self.assertEqual([rd.menu_slot_for_party_id(order, i) for i in range(6)], [1, 0, 2, 3, 4, 5])
        self.assertEqual([rd.menu_slot_for_party_id([0x01, 0x23, 0x45], i) for i in range(6)], list(range(6)))
        self.assertEqual([rd.menu_slot_for_party_id(None, i) for i in range(3)], [0, 1, 2])
        d = rd.RomDriver([{"kind": "switch", "partyIndex": 0}], FUNCS)
        self.assertEqual(d.step(obs("party", slot=0, tasks=True, order=order)), ["DOWN"])  # not the fainted slot 0
        d.advanced(); d.step(obs("party", slot=0, tasks=True, order=order)); d.advanced()
        self.assertEqual(d.step(obs("party", slot=1, tasks=True, order=order)), ["A"])
        d.advanced(); d.step(obs("other"))
        self.assertEqual(d.anchors[0]["kind"], "switch")

    def test_party_submenu_and_message_waits_pulse_a_with_a_17_frame_period(self):
        d = rd.RomDriver([{"kind": "switch", "partyIndex": 1}], FUNCS)
        presses = [i for i, b in enumerate(run(d, [obs("other", sig=i) for i in range(40)])) if b == ["A"]]
        self.assertEqual(presses[0], 15)
        self.assertEqual(presses[1] - presses[0], 17)  # 16 pulse phases + the release frame

    def test_outcome_stops_the_driver(self):
        d = rd.RomDriver([{"kind": "move", "slot": 0}], FUNCS)
        self.assertIsNone(d.step(obs("move", outcome=2)))

    def test_after_the_outcome_the_drive_runs_on_until_the_end_turn_handler(self):
        # parity-mac: the deciding turn is still running when gBattleOutcome is set (ROM seed 1181: a pending Future Sight rolls after it)
        funcs = {**FUNCS, "HandleEndTurn_BattleWon": 0x7000, "HandleEndTurn_BattleLost": 0x7100}
        d = rd.RomDriver([], funcs)
        running = {**obs("other", outcome=1), "mainFunc": 0x5001}
        out = []
        for _ in range(20):
            out.append(d.step(running))
            d.advanced()
        self.assertNotIn(None, out)  # still driving
        self.assertIn(["A"], out)  # and pulsing A for the remaining messages
        self.assertIsNone(d.step({**obs("other", outcome=1), "mainFunc": 0x7001}))  # Thumb bit masked: the handler started
        # an observation without mainFunc (older probes) keeps the old behaviour
        self.assertIsNone(rd.RomDriver([], funcs).step(obs("other", outcome=1)))

    def test_unplanned_menus_raise(self):
        with self.assertRaises(rd.DriverError) as cm:
            rd.RomDriver([], FUNCS).step(obs("action"))
        self.assertEqual(cm.exception.reason, "action menu without a move decision")
        with self.assertRaises(rd.DriverError):
            rd.RomDriver([{"kind": "switch", "partyIndex": 1}], FUNCS).step(obs("move"))
        with self.assertRaises(rd.DriverError):
            rd.RomDriver([{"kind": "move", "slot": 0}], FUNCS).step(obs("party", tasks=True))

    # parity-mac fourth pass: voluntary switches, refusal probes, refused decisions.
    SEL = {**FUNCS, "HandleTurnActionSelectionState": 0x8000}

    def test_a_voluntary_switch_goes_to_pokemon_then_picks_the_party_slot(self):
        d = rd.RomDriver([{"kind": "switch", "partyIndex": 2, "voluntary": True}], FUNCS)
        self.assertEqual(d.step(obs("action", action=1)), ["LEFT"])
        d.advanced(); d.step(obs("action", action=0)); d.advanced()  # release frame
        self.assertEqual(d.step(obs("action", action=0)), ["DOWN"])
        d.advanced(); d.step(obs("action", action=2)); d.advanced()
        self.assertEqual(d.step(obs("action", action=2)), ["A"])
        self.assertEqual((d.index, d.opened), (0, 1))  # one anchor, not consumed at the action menu
        d.advanced(); d.step(obs("other")); d.advanced()
        self.assertEqual(d.step(obs("party", slot=0, tasks=True)), ["DOWN"])
        d.advanced(); d.step(obs("party", slot=1, tasks=True)); d.advanced()
        self.assertEqual(d.step(obs("party", slot=1, tasks=True)), ["DOWN"])
        d.advanced(); d.step(obs("party", slot=2, tasks=True)); d.advanced()
        self.assertEqual(d.step(obs("party", slot=2, tasks=True)), ["A"])
        d.advanced(); d.step(obs("other"))
        self.assertEqual((d.index, d.pending), (1, "real"))

    CLOSE = {**FUNCS, "Task_ClosePartyMenuAndSetCB2": 0x4800}

    def test_a_real_switch_commits_at_the_send_out_confirm_not_the_first_a(self):
        # bal1: the first A in the party menu only opens SEND OUT / SHIFT / SUMMARY; CursorCb_SendMon (the confirm) starts Task_ClosePartyMenuAndSetCB2
        for decision in ({"kind": "switch", "partyIndex": 1}, {"kind": "switch", "partyIndex": 1, "voluntary": True}):
            d = rd.RomDriver([decision], self.CLOSE)
            self.assertEqual(d.step(obs("party", slot=1, tasks=True)), ["A"])
            self.assertEqual(d.anchors, [])
            for _ in range(40):  # the submenu: the pulse presses A again 16 frames later; the party menu stays up
                d.advanced()
                d.step({**obs("party", slot=1, tasks=True), "partyTasks": [0x4000]})
            self.assertEqual(d.anchors, [])
            d.advanced(); d.step({**obs("party", slot=1), "partyTasks": [0x4800]})  # the frame after the confirm A
            frame = d.frame
            self.assertEqual(len(d.anchors), 1)
            self.assertEqual(d.anchors[0]["commitFrame"], frame)
            self.assertGreater(frame, 40)
            self.assertTrue(d.done())

    def test_a_refusal_probe_still_closes_at_its_first_a(self):
        d = rd.RomDriver([{"kind": "switch-refused", "partyIndex": 1}], self.CLOSE)
        self.assertEqual(d.step(obs("party", slot=1, tasks=True)), ["A"])
        self.assertEqual(d.anchors[0]["commitFrame"], 1)

    def test_a_forced_replacement_at_the_action_menu_is_unplanned(self):
        with self.assertRaises(rd.DriverError):
            rd.RomDriver([{"kind": "switch", "partyIndex": 1}], FUNCS).step(obs("action"))

    def test_the_action_menu_again_without_a_turn_is_a_refused_decision(self):
        sel = {"mainFunc": 0x8001}
        d = rd.RomDriver([{"kind": "move", "slot": 0}, {"kind": "move", "slot": 1}], self.SEL)
        run(d, [{**obs("action"), **sel}, {**obs("other"), **sel}, {**obs("move"), **sel}, {**obs("other"), **sel}])
        self.assertEqual((d.index, d.pending, d.left_selection), (1, "real", False))
        with self.assertRaises(rd.DriverError) as cm:
            run(d, [{**obs("other"), **sel}] * 3 + [{**obs("action"), **sel}])
        self.assertEqual(cm.exception.dump["reason"], "rom-refused-decision")
        # the same menus with a turn in between (gBattleMainFunc left the selection function) are a normal next turn
        d = rd.RomDriver([{"kind": "move", "slot": 0}, {"kind": "move", "slot": 1}], self.SEL)
        run(d, [{**obs("action"), **sel}, {**obs("other"), **sel}, {**obs("move"), **sel}, {**obs("other"), "mainFunc": 0x9001}, {**obs("other"), **sel}])
        self.assertEqual(d.step({**obs("action"), **sel}), ["A"])
        self.assertIsNone(d.pending)

    def test_a_move_refusal_probe_expects_the_action_menu_without_a_turn(self):
        sel = {"mainFunc": 0x8001}
        d = rd.RomDriver([{"kind": "move-refused", "slot": 1}, {"kind": "move", "slot": 0}], self.SEL)
        out = run(d, [{**obs("action"), **sel}, {**obs("other"), **sel}, {**obs("move"), **sel}, {**obs("move", move=1), **sel}, {**obs("move", move=1), **sel}])
        self.assertEqual(out, [["A"], [], ["RIGHT"], [], ["A"]])
        self.assertEqual((d.index, d.pending), (1, "probe"))
        run(d, [{**obs("other"), **sel}] * 2)
        # refused as expected: the ROM re-opens the MOVE menu (battle_main.c:4380-4389) and the real decision is taken there
        self.assertEqual(d.step({**obs("move", move=1), **sel}), ["LEFT"])
        self.assertIsNone(d.pending)
        # a turn that ran after the probe means the ROM took it
        d = rd.RomDriver([{"kind": "move-refused", "slot": 0}, {"kind": "move", "slot": 0}], self.SEL)
        run(d, [{**obs("action"), **sel}, {**obs("other"), **sel}, {**obs("move"), **sel}, {**obs("other"), "mainFunc": 0x9001}])
        with self.assertRaises(rd.DriverError) as cm:
            d.step({**obs("action"), **sel})
        self.assertEqual(cm.exception.dump["reason"], "rom-accepted-refused-decision")

    def test_after_a_move_probe_a_switch_decision_backs_out_of_the_move_menu(self):
        sel = {"mainFunc": 0x8001}
        d = rd.RomDriver([{"kind": "move-refused", "slot": 0}, {"kind": "switch", "partyIndex": 1, "voluntary": True}], self.SEL)
        run(d, [{**obs("action"), **sel}, {**obs("other"), **sel}, {**obs("move"), **sel}, {**obs("other"), **sel}])
        self.assertEqual(d.step({**obs("move"), **sel}), ["B"])  # the re-opened move menu
        d.advanced(); d.step({**obs("other"), **sel}); d.advanced()
        self.assertEqual(d.step({**obs("action"), **sel}), ["DOWN"])  # POKEMON

    def test_a_refused_real_move_shows_the_move_menu_again(self):
        sel = {"mainFunc": 0x8001}
        d = rd.RomDriver([{"kind": "move", "slot": 0}, {"kind": "move", "slot": 1}], self.SEL)
        run(d, [{**obs("action"), **sel}, {**obs("other"), **sel}, {**obs("move"), **sel}, {**obs("other"), **sel}])
        with self.assertRaises(rd.DriverError) as cm:
            d.step({**obs("move"), **sel})
        self.assertEqual(cm.exception.dump["reason"], "rom-refused-decision")

    def test_a_switch_refusal_probe_pulses_a_then_backs_out_with_b(self):
        sel = {"mainFunc": 0x8001}
        d = rd.RomDriver([{"kind": "switch-refused", "partyIndex": 1}, {"kind": "move", "slot": 0}], self.SEL)
        run(d, [{**obs("action"), **sel}, {**obs("action"), **sel}, {**obs("action", action=2), **sel}, {**obs("other"), **sel}])
        run(d, [{**obs("party", slot=0, tasks=True), **sel}, {**obs("party", slot=1, tasks=True), **sel}])
        self.assertEqual(d.step({**obs("party", slot=1, tasks=True), **sel}), ["A"])
        self.assertEqual((d.index, d.pending), (1, "probe"))
        d.advanced()
        pressed = [b for b in run(d, [{**obs("party", slot=1, tasks=True, sig=i), **sel} for i in range(400)]) if b]
        self.assertIn(["A"], pressed[:4])
        self.assertEqual(pressed[-1], ["B"])
        self.assertEqual(d.step({**obs("action", action=2), **sel}), ["UP"])  # back at the action menu, no turn ran: the real decision starts

    def test_a_committed_switch_that_keeps_the_party_menu_open_is_refused_by_the_rom(self):
        d = rd.RomDriver([{"kind": "switch", "partyIndex": 0}], FUNCS)
        self.assertEqual(d.step(obs("party", slot=0, tasks=True)), ["A"])
        d.advanced()
        with self.assertRaises(rd.DriverError) as cm:
            run(d, [obs("party", slot=0, tasks=True, sig=i) for i in range(rd.PARTY_COMMIT_FRAME_CAP + 5)])
        self.assertEqual(cm.exception.dump["reason"], "rom-refused-switch")

    def test_watchdog_fires_after_a_frozen_signature_with_a_state_dump(self):
        d = rd.RomDriver([{"kind": "move", "slot": 0}], FUNCS, watchdog=50)
        with self.assertRaises(rd.DriverError) as cm:
            run(d, [obs("other", sig=7)] * 80)
        self.assertEqual(cm.exception.reason, "no progress for 50 frames")
        self.assertEqual(cm.exception.dump["reason"], "watchdog")
        self.assertEqual(cm.exception.dump["nextDecision"], {"kind": "move", "slot": 0})

    def test_a_moving_signature_resets_the_watchdog(self):
        d = rd.RomDriver([{"kind": "move", "slot": 0}], FUNCS, watchdog=50)
        run(d, [obs("other", sig=i // 40) for i in range(200)])


class FakeOracle:
    """A tiny scripted ROM: the move menu is shown from frame 3; pressing A there sets gBattleOutcome."""

    def __init__(self):
        self.symbols = {k: 0x1000 * (i + 1) for i, k in enumerate(
            ["gBattleMons", "gTasks", "gCurrentMove", "gRngValue", "gLastMoves", "gPartyMenu", "gBattlerControllerFuncs", "gActionSelectionCursor",
             "gMoveSelectionCursor", "gBattlePartyCurrentOrder", "gBattleOutcome", "gBattlescriptCurrInstr", "gBattleMainFunc", "gBattleControllerExecFlags"])}
        self.frame, self.outcome, self.log = 0, 0, []

    def read_u8(self, addr):
        return self.outcome if addr == self.symbols["gBattleOutcome"] else 0

    def read_u16(self, addr):
        return 0

    def read_u32(self, addr):
        if addr == self.symbols["gBattlerControllerFuncs"]:
            return FUNCS["HandleInputChooseMove"] | 1 if self.frame >= 3 else 0x9001
        return self.frame // 100

    def advance(self, buttons):
        self.log.append(buttons)
        self.frame += 1
        if buttons == ["A"] and self.frame > 3:
            self.outcome = 1


class DriveLabTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.probe = load_probe()

    def test_closed_loop_run_records_segments_anchors_and_timeline(self):
        oracle = FakeOracle()
        result = self.probe.drive_lab(oracle, FUNCS, [{"kind": "move", "slot": 0}])
        self.assertEqual(result["stop"], "outcome")
        self.assertEqual(result["decisionsConsumed"], 1)
        self.assertEqual(result["outcome"], 1)
        self.assertEqual(sum(s["frames"] for s in result["segments"]), result["frames"])
        self.assertEqual(result["segments"][-1]["buttons"], ["A"])
        self.assertEqual(result["anchors"][0]["kind"], "move")
        self.assertEqual(result["timeline"][0][0], 0)

    def test_observation_carries_the_party_order_bytes(self):
        result = self.probe.drive_lab(FakeOracle(), FUNCS, [{"kind": "move", "slot": 0}])
        self.assertEqual(result["lastObs"]["partyOrder"], [0, 0, 0])

    def test_frame_cap_stops_a_run_that_never_ends(self):
        result = self.probe.drive_lab(FakeOracle(), FUNCS, [{"kind": "move", "slot": 1}, {"kind": "move", "slot": 0}], cap=20)
        self.assertEqual(result["stop"], "frame-cap")
        self.assertEqual(result["frames"], 20)


class SegmentDiffTest(unittest.TestCase):
    def test_segments_compare_ordered_lists_and_ignore_menu_se(self):
        import soundSegmentDiff as sd
        engine = {"decisions": [{"menuOpenFrame": 0, "commitFrame": 5}, {"menuOpenFrame": 20, "commitFrame": 25}],
                  "sound": [[6, "se", 171, 63], [7, "se", 13, 63], [26, "se", 15, None]]}
        drive = {"drive": {"anchors": [{"menuOpenFrame": 0, "commitFrame": 50}, {"menuOpenFrame": 200, "commitFrame": 250}]}}
        rom = {"events": [{"frame": 2, "kind": "se", "id": 5, "pan": None}, {"frame": 60, "kind": "se", "id": 171, "pan": 63},
                          {"frame": 90, "kind": "se", "id": 13, "pan": 63}, {"frame": 260, "kind": "se", "id": 152, "pan": 63}]}
        out = sd.diff(engine, drive, rom, {"se", "cry"}, {5})
        by = {s["segment"]: s for s in out["segments"]}
        self.assertTrue(by["menu0"]["same"] and by["res0"]["same"] and by["menu1"]["same"])
        self.assertEqual(by["res1"]["firstDiff"], {"index": 0, "engine": ("se", 15, None), "rom": ("se", 152, 63)})
        self.assertEqual(out["firstDiffering"], "res1")


if __name__ == "__main__":
    unittest.main()
