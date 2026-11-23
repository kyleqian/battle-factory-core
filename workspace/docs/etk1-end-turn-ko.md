# etk1: end-of-turn knock-out presentation and press timing (S11 #219 / fnt1 "Not landed" (d))

Outcome: **no engine change.** The Level 50 labs do not reproduce finding (A) (the "fainted!" box waiting on, or flashing behind, the previous end-turn message) in either scene, so no rule was ported. Finding (B) (a win by an end-of-turn KO printing "Player defeated" ~24 frames early) has no lab yet and stays open. `src/` is untouched, so T2, the census digests and the engine tests are those of the base commit.

## Labs (tools/integration/etk1Labs.py -> tools/battle-lab/etk1-<case>-{on,off}.json)

Current HP cannot be set in a lab, so the player's lead is a Rattata L20 (HP 48) that Belly Drums (turn 1) and then Growls, and the foe's Leech Seed (-6 a turn) or Toxic (-3, -6, -9, -12) knocks it out at the end of turn 4. Foe: Rattata L49, one move in all four slots. Growl replaces Splash because the engine is 39 (OFF) / 29 (ON) frames early after the Splash "But nothing happened!" / Growl stat-drop print in the same turn (other timing families, out of scope); with Growl the OFF labs are exact. No Substitute (a faint behind one adds the substitute-to-mon animation, ~+41 ROM frames).

- `leech-hold`, `poison-hold`: no presses after the turn-4 selection.
- `leech-spam`, `poison-spam`: A every 30 frames after it (the 2-frame A at frames 3788/3818 etc.).
- `perish-hold`, `perish-spam`: the player's Perish Song lead, foe Rattata L40 (slower, so the player is first in turn order in both the ROM and the engine; at L50 the speed tie made the order differ and the engine's foe count print came after the KO).

Everything is `labCompare.sh` with the default scene, evidence in `.integration/evidence/etk1/` (b-g1 hold, b-g2 spam, b-p4 perish).

## ROM rows and what was measured

`BattleScript_LeechSeedTurnPrintAndUpdateHp` (`printfromtable; waitmessage 64; tryfaintmon`) -> `BattleScript_FaintAttacker` (`playfaintcry`, `dofaintanimation`, `printstring STRINGID_ATTACKERFAINTED` with a `\p` wait and no `waitmessage`) -> `BattleScript_GiveExp` / `HandleFaintedMon`. Poison is `BattleScript_PoisonTurnDmg` -> the same `FaintAttacker`. Perish Song is `PerishSongTakesLife` (`printstring; waitmessage; orword; healthbarupdate; datahpupdate; tryfaintmon`) -> `FaintAttacker`.

| lab (first glyph, ENG - ROM) | sap / tick print | "fainted!" print |
|---|---|---|
| leech-hold OFF | 0 | 0 |
| poison-hold OFF | -2 | +1 |
| leech-hold ON | -29 (Growl offset carried) | -29 |
| poison-hold ON | -29 | -28 |
| perish-hold OFF | -46 (cast -> first count gap, below) | -48 |
| perish-hold ON | -47 | -49 |

So the end-turn print -> faint chain is the ROM's: the sap / tick / TakesLife print holds 64 rows, then the faint cry + animation, then the press-waiting "fainted!" box; ON carries only the earlier Growl offset (equal at the sap print), and the sap -> "fainted!" interval is equal (leech OFF 0, ON 0; poison OFF +3, ON +1; perish 290 ROM / 288 ENG).

Press timing (OFF spam labs): the engine's "fainted!" box starts waiting at frame 3809 (leech) / 3749 (poison), the first A at 3788 / 3728 is before the print in the ROM too (print at 3792 / 3732) and is ignored by both, and the A at 3818 / 3758 is the one accepted: ROM script leaves `FaintAttacker` at 3826 / 3766 (+8), the engine's dismissal at 3819 / 3759. Same press, so no press-wait rule differs. The earlier catcher-run symptom (o14on DODRIO, o5off SLAKING at Open) is therefore not an end-turn-KO rule gap at this level; it needs its own reproduction (suspects: the Open-level party / HP and the forced-party-menu hand-off, not the message gates).

Lab-stage limit: the engine lab stage throws "max HP does not match rental record" once the player's lead faints and the press is accepted, so the spam labs compare only up to the accepted press (`tools/integration/etk1Press.ts` prints the engine's commands and the frame of the throw).

## What stays open

- (B) win by an end-of-turn KO: the oracle lab needs exactly three foe Pokemon, so the last one has to be poisoned after two others are KO'd (Seismic Toss, then Toxic + Toss on the third: needs a 4-turn trace with the opponent's replacement prompts); not built. The wtl1 `winTailHoldRows` rule only covers a MoveEnd receipt run followed by `STRINGID_PLAYERDEFEATEDTRAINER1`.
- Perish Song cast -> first end-turn count print: ROM 128 rows after the FAINTINTHREE print, engine 111 (-17, both scenes). etp1 already found "Perish Song label +1 / second-battler +5" and withdrew it because it moved ais2 windows by 258 / 219 frames (docs/etp1-end-turn-prints.md); not re-attempted here.
- Splash "But nothing happened!" (-39 OFF) and Growl stat-drop (-29 ON) second-message offsets seen while building the labs.
- Engine lab stage cannot run past a player faint accept (rental-record max HP check).
