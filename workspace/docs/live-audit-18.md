# Live audit 18 (S10A side lane, 2026-10-10): the live claims of this morning's folds (hide66, fly63 re-land, sw67, land68)

Method = audits 16 / 17 (battle-lab scenarios with the explicit lab seed 305420349, ISSUES #154; one probe to derive the consumer
fixtures; a check that replays the history through the production hosts as the orchestrator does and renders the production live
view with the CHAIN lend and the ENTRY lend against two more fresh direct-mGBA probe processes, r1 == r2 per-row digests), extended
(`audit18Check.ts` header) with: turns from the ROM's own `gBattleResults.battleTurnCounter`, `beginLiveSpriteOrderTurn(promptShown =
!playerLocked)`, every body marked as the orchestrator marks it (`markLiveSpriteOrderDeferredBody`), Dive words recorded in a presentation
host pinned at the RAM `gRng2Value` of each Dive activation (prep65's method), Random2 consumers (Wish / Water Pulse) pinned the same way,
the Substitute doll, the orchestrator's geometry-plan callback with the displayed field + lent order, production's hide in
`view.visibility` checked against the ROM's own battler-sprite `invisible` flags at every activation, and production's decline reason for
every non-live window. Master `3dd7835fd` (src `afcf8175`), unpatched. No shared oracle was touched. Evidence:
`tools/integration/fixtures/audit-18/`.

## 1. Results first

**442 consumer windows, 164 scenarios** (SNORLAX / GOLEM hiders and CHANSEY consumers on both sides; MAGNETON / CASTFORM Shock Wave users;
PIKACHU / SNORLAX Substitute owners). **Production's hide equals the ROM's on 442 / 442** (`hideAgree`; 183 windows with the other
battler invisible in the ROM). **No production DEFECT found.** Every live hidden-span window equals its no-unit control (0 px or the
consumer's own control residual), except one named TIMING-PHASE pair and one unexplained 1-row pair (below).

### Defect table

| Unit -> consumer | Verdict | px (before -> after) | Evidence |
|---|---|---|---|
| (none) | — | — | No window needed a production patch: no `.diff` was written. |

### Non-defect verdicts

| Windows | Residual | Evidence | Verdict |
|---|---|---|---|
| **Light Screen 113 by the PLAYER right after the opponent's Dive SETUP** (`dive-{snorlax,golem}-light-screen-ply-c0`, diver hidden) | 148 px, 8 rows, ages 69..81, x 78..86 y 91..105 (ROM ffd6d6 CHANSEY vs live ffffff sparkle) | Lag ages **[]** vs **[68, 69]** in the no-unit control, the Shock Wave chains and the opponent-side Light Screen with a hidden player diver (`lag.txt`, 2 fresh counter runs, identical). The lend is right: the resolved Dive deferred lend == the ROM free order at activation (`lends.txt`, all 64 slots; occupied prefix [62, 60, 0, 63, 1, 61, 6, 8, 2] in the ROM too). | **TIMING-PHASE** (lag-frame class, the Sky Uppercut mechanism of audit 17): an invisible OPPONENT sprite lets the ROM skip the 68 / 69 lag frames, so the sparkle runs 2 frames ahead from age 70. Not patched (a hidden-other lag profile would be a new D4 key). |
| **Sandstorm 201 in the Fly hidden span with GOLEM hidden** (`fly-golem-sandstorm-{ply,opp}-c0`) | 20,921 px, ONE row (age 162, the whole BG: ROM ffffff vs live fdf8f5) | Lag ages [4, 5, 163, 164] identical to the control and to `fly-snorlax` / `bounce-golem` / `dig-golem` / `dive-golem` Sandstorm (all 0 px). Hide agrees. | **OPEN** (unclassified; not lag, not hide, not order). 1 row of 168 in 2 windows; GOLEM + Fly only. |
| **Iron Defense 334** (every window, incl. the no-unit control) | before: 31,990 (opp) / 33,022 (ply) px in the CONTROL; flashes at ages 3 / 11 / 20 / 30 one frame off | `ablation/check-ctl-snorlax-iron-defense-*-offset0.json` (audit 17's framing) vs the main receipts at `ageOffset -1` (the accepted 101-frame window of `tools/compare/fixtures/iron-defense-*.json`): **31,990 / 33,022 -> 0**; with it all 54 Iron Defense windows (32 hidden) are 0 px | **ARTIFACT** (fixture framing) |
| **Rest 156** message box | 379 px every row (before the fix) | the ROM prints `trysetrest`'s string before `attackanimation` ("went to sleep!" / "slept and became healthy!"); with it 0 px | **ARTIFACT** (fixture text) |
| **Dig 91 setup (turn 0)** of the CONSUMER (incl. in the other battler's Dig span) | 114,270 / 133,965 px, message box rows y 123..135 only, equal to the control | `BattleScriptFirstChargingTurn` prints `STRINGID_EMPTYSTRING3` before `attackanimation`: the box keeps the PREVIOUS message (context-dependent); not modelled by the fixture | **ARTIFACT** (fixture text), = control |
| **Bulk Up 339 on CHANSEY** (every window, incl. the no-unit control) | 38,812 (opp) / 32,675 (ply) px, ages 2..62, the user's tint (ROM f77373 vs live b54231) | identical in all 82 windows and the control; lag [] everywhere; the ROM body is 108 rows vs production's 104-frame window accepted on PRIMEAPE only; `ageOffset` +-1 does not zero it (27,283 / 36,538 px) | **= CONTROL** (the consumer's own baseline; not caused by any unit / chain / hide). Outside this audit; flagged for a species audit. |
| Shock Wave chains (sw67) | 40 / 40 windows **0 px** (Water Pulse, Light Screen, Thunderbolt, a second Shock Wave; MAGNETON class + CASTFORM class, both sides) | needs the orchestrator's plan callback with the displayed field + lent order (`liveMoveGeometrySpriteOrderPlanText(…, field, lentFree)`); audit 16 / 17's callback passed species only and every consumer after a Shock Wave then declined "no EXACT plan: body 351" | **EXACT** |
| SUBSTITUTE_FADE (land68) | 17 / 17 **0 px**: Ice Beam at the doll, the owner's Substitute right after the fade, Ice Beam after the fade (incl. the KO of PIKACHU) | doll from the history (`field.<side>.substituteDoll`) | **EXACT** (the switch after the KO is not modelled) |

### Coverage (`receipts/verdicts.txt`; H = the OTHER battler invisible in the ROM at activation)

| Family | windows | H: 0 px / = control / other / fallback | visible: 0 px / = control / other / fallback |
|---|---|---|---|
| Fly 19 (SNORLAX, GOLEM) | 52 | 24 / 10 / 2 (Sandstorm OPEN) / 0 | 8 / 8 / 0 / 0 |
| Bounce 340 | 52 | 24 / 12 / 0 / 0 | 10 / 8 / 0 / 0 |
| Dig 91 (incl. the other battler's Dig, Earthquake at the hidden Dig user) | 98 | 35 / 12 / 0 / 12 | 19 / 8 / 0 / 12 |
| Dive 291 (incl. Light Screen / Ice Beam / Double Team) | 96 | 36 / 10 / 2 (Light Screen TIMING-PHASE) / 4 | 19 / 10 / 1 (control drift, below) / 14 |
| no-unit controls (13 consumers x 2 sides) | 85 | — | 51 / 28 / 0 / 6 |
| Shock Wave 351 | 40 | — | 40 / 0 / 0 / 0 |
| Substitute fade | 17 | — | 17 / 0 / 0 / 0 |

Per consumer, hidden span: Safeguard, Wish, Rest, Sandstorm (bar the Fly+GOLEM row), Iron Defense, Double Team, Earthquake at a hidden
Dig user (9 windows), Light Screen (opponent side) all 0 px; Bulk Up = control; Dig setup = control (text ARTIFACT).

**Fallbacks (safe direction; production's own decline):** 24 Dig windows = the consumer's Dig after its own Dig ("sprite-order lend
unknown", the control has it too); **18 Dive windows: every order-dependent consumer (Double Team, Ice Beam) after a PLAYER Dive**
declines ("unclassified (case-local gate)": the Dive deferred lend resolves to null across the player's locked unleash turn); after an
OPPONENT Dive they are live and 0 px with lend == ROM. `lends.txt` (22 windows, the resolved lend vs the ROM free order at activation):
opponent diver 8 / 8 live and equal; player diver: 3 hidden-span windows live and equal, 9 fallbacks (above), and the 2 Light Screens
after the player's unleash live with a deferred lend that resolves to null (their 2,658 px = the Light Screen control's own row).

**audit-17 method correction.** A PLAYER-locked strike turn (the player charged Fly / Bounce / Dig / Dive) runs with no action prompt;
the orchestrator calls `beginLiveSpriteOrderTurn(…, promptShown = false)`, which invalidates the order host ("command resolution
without an action prompt"). audit 17 grouped turns by 1334-frame prompt cycles (the locked turn falls inside the setup turn's cycle) and
always passed `true`, so its opponent-side "after the strike, order KNOWN" rows describe a lend production does not make (production
falls back there for order-dependent consumers; the safe direction). `ablation/check-fly-snorlax-bulk-up-opp-prompt-always.json` shows
the lend flip (order 0 -> 1 on the locked-turn windows).

**Missed strikes.** A two-turn strike that plays no body (missed, or the charger fully paralysed) shows the charger again
(MOVEEND_ATTACKER_VISIBLE -> the orchestrator's sprite-visibility receipt); audit 17's inference ("the other battler's SECOND body")
misses it when the other battler plays no body in that turn. The per-turn rule (`AUDIT18_NO_MISS_RULE`) is needed for
`bounce-golem-bulk-up-opp-c4`: without it the checker hides nothing while the ROM hides GOLEM (168,196 px; `ablation/`); with it the
hide agrees and the window = control.

### Lag-frame counters (`receipts/lag.txt`: 442 windows, 2 fresh counter processes per scenario, r1 == r2 on all)

| Consumer | hidden | visible | control |
|---|---|---|---|
| Light Screen, player (opponent hidden by Dive) | **[]** | [68, 69] | [68, 69] |
| Light Screen, opponent (player hidden by Dive) | [68, 69] | [68, 69] | [68, 69] |
| Safeguard [67, 68]; Sandstorm [4, 5, 163, 164]; Iron Defense [1, 2, 66, 67]; Double Team [133, 134]; Dig [190, 191] / strike [33, 34]; Bulk Up, Wish, Rest, Earthquake [] | same | same | same |
| Shock Wave (sw67 chains) | — | [263, 264] or [264, 265] (opp [259, 260] / [260, 261]) | [264, 265] / [259, 260] |
| Thunderbolt [105]; Water Pulse [156, 157]; Ice Beam [199, 200] (no hidden-span body: they miss a hidden target) | — | same | same |

The only hidden-vs-visible phase change is the Light Screen one (named above); the Shock Wave variants are 0 px both ways.

### Target 3: census battle 713 (`receipts/c713/`)

`audit18Census713.ts` (liveShareCensus + the orchestrator's host state per command) on master and on `82690e775` (git archive):

- Command 11: SPOINK's Bounce SETUP (opponent hidden). Before its strike, CLAMPERL faints and DROWZEE is sent out: the player's forced
  switch-in reshows the battle with SPOINK still semi-invulnerable.
- **Master:** the order host carries the hidden battler (fly63 re-land / hide66) and its reshow invalidates on it
  (`liveSpriteOrderHost.ts:228` "reshow with a hidden battler"); `liveSpriteAllocatorReseedable` then fails, the allocator stays
  unknown from command 12 on, and the allocator-plan consumers **14 BARRIER (player) / 15 MAGIC COAT (opponent)** decline "sprite
  allocator history unknown". **82690e775:** the order host did not know the hide, modelled an ordinary reshow (order `known`), re-seeded
  the allocator (`alloc true`) and rendered both live. The only other status change is command 9 (Double Team, fallback -> live).
- **Was 82690e775's live render right?** Source says yes for the allocator model: the reshow re-creates every present battler's sprite
  (`reshow_battle_screen.c` `CreateBattlerSprite`) and sets `invisible = battlerData[b].invisible` (`:272`), which Scene ON never sets
  (hide66 §1), so the ROM shows SPOINK again after the reshow with the ordinary occupancy; production's view also shows both
  (`spriteShown [true, true]` at 12..17 on both trees). So master's invalidation is fail-closed (a lost-live, not a hidden defect class).
  **Not ROM-staged** (no battle-lab reshow-with-a-semi-invulnerable-battler scenario was built in the time box).

## 2. Reproducibility

`audit18Run.sh` run A produced the committed receipts; run B (fresh dirs, started 15 minutes after A) was compared by `audit18Compare.py`:
**414 / 442 windows identical** (digests r1 / r2, px, rows, live, decline, order, chain and entry), **15 ROM-drift** (windows whose own
receipt had r1 != r2: in run A one fresh probe of the pair rendered a different trajectory — Wish, Water Pulse, the later Ice Beams,
a Light Screen control; all r1 == r2 in run B), **13 DIFFERS with r1 == r2 in both runs — every one a no-unit CONTROL window**
(`ctl-snorlax-water-pulse-opp` 4: 964..1,154 px in A, 0 in B; `ctl-snorlax-earthquake` 3: 4,784 / 5,200 px in A, 0 in B;
`ctl-snorlax-dig-ply` c2..c7 6: fallback windows, px differ). **No non-control window differs between the batches, and the verdicts are
the same in both** (run B: the same 4 DIFF windows — the 2 Light Screen TIMING-PHASE + the 2 Fly+GOLEM Sandstorm rows; every hidden-span
window 0 px or = control; the same fallbacks). This is ISSUES #154's cross-batch drift: both fresh probes inside one check process agree,
but a later batch can stage a different ROM trajectory for the same scenario + lab seed. The derive probes of two sessions 34 minutes
apart were identical on all 164 scenarios (frames + `gRng2Value` at every activation), so the drift is sporadic per process, not a fixed
wall-clock offset. One run-A probe (`bounce-snorlax-rest-ply`) diverged so far that its window frames were not dumped; the check now
records such a run as `diverged` (px -1) instead of crashing, and that scenario was re-checked once for the committed receipts.
Every TEXT receipt of run B is byte-identical to the committed one (derive.txt, derive-vs-committed.txt, lag.txt, lends.txt, c713/master.jsonl, c713/b50c4dabd.jsonl, c713/diff.txt, all 6 ablation receipts). Byte-identical per-window receipts across batches are therefore NOT achievable for these stagings; the comparer separates drift from real
reproduction failures (0 here).

## 3. Not reached

- SANDSTORM_CONTINUES / WISH_HEAL as consumers (general animations; `liveView` renders move bodies only); Surf at a hidden diver;
  hidden-span Light Screen under Fly / Bounce / Dig (only Dive staged); the switch-in after a KO.
- A ROM staging of battle 713's reshow-with-a-hidden-battler (target 3 is source-level).
- The Fly+GOLEM Sandstorm row and the Bulk Up-on-CHANSEY baseline (both = OPEN, outside the chain question).

## 4. Reproduction (from workspace/; direct mGBA only; production src is never patched)

Gates on the final tree: `npm test` 1,602 files / 13,180 tests passed (44 files / 223 tests skipped), 0 failed; `npm run build` green;
`npm run test:smoke` 8 / 448; `git diff --check` clean; no tracked file outside the audit18 set was modified (no TypeScript under tests/).

```
sh tools/integration/audit18Run.sh <fresh-receipt-dir> <fresh-scratch-dir>   # ~13 min: stage == committed -> probe -> derive == committed
    # -> check (2 fresh runs / scenario) -> summary / verdicts -> lag counters -> Dive lends -> ablations -> battle 713 (master + 82690e775)
    # -> audit18Compare.py vs tools/integration/fixtures/audit-18/receipts
AUDIT18_LENDS_ONLY=1 node --experimental-strip-types --no-warnings tools/integration/audit18Check.ts tools/integration/fixtures/audit-18/fixtures dive-snorlax-light-screen-ply /dev/null
node --experimental-strip-types --no-warnings tools/integration/audit18Check.ts tools/integration/fixtures/audit-18/fixtures dive-snorlax-light-screen-ply <out.json>
python3 tools/integration/audit18Lag.py tools/integration/fixtures/audit-18/fixtures <fresh-dir>
```

Tools: `audit18Stage.py`, `audit18Probe.py` (prep48Probe + `rng2` / `turnCounter` / `status2`), `audit18Probes.py`,
`audit18Fixtures.py`, `audit18Check.ts`, `audit18Summary.py`, `audit18Verdicts.py`, `audit18Lag.py`, `audit18CensusPatch.py` ->
`audit18Census713.ts`, `audit18Battle713.py`, `audit18Compare.py`, `audit18Run.sh`. Receipts: `scenarios/` (164), `fixtures/` (442),
`receipts/{check/,summary.txt,verdicts.txt,lag.txt,lends.txt,ablation/,c713/,derive.txt}`. No RGB dumps.
