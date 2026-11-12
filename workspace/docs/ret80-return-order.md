# ret80 (S10A side lane, 2026-10-10): Return 216's sprite-order plan keyed on its power level

## 1. Results

**Both rungs landed.** Live audit 20 (`docs/live-audit-20.md` §1.3) found the latent defect. Production lent plan 117 after every
Return. Plan 117 is ReturnMedium's (friendship 61..91), but the Factory sends friendship 255, which runs ReturnStrongest.

- **Rung 1 (fail closed).** `orderEventOf` (`src/engine/liveSpriteOrderHost.ts`) now reads the request's friendship and computes the
  power level with `returnPowerLevel`, a copy of `AnimTask_GetReturnPowerLevel`. Only Medium keeps `216` (plan 117).
- **Rung 2 (the Strongest plan).** ReturnStrongest is keyed as **30216**, with its ROM plan as production plan 222 (31 creates). The
  key works the way Magnitude's 20222 does. Weak and Strong still invalidate: they are measured on only one pair each, so they get no row.

| Check | Before (b2ed6f8c2) | After (ret80) |
|---|---|---|
| Audit 20 windows with a Return 216 earlier in the history: lend == ROM (π) | **0 / 15** (8 Part B + 7 controls) | **15 / 15** |
| Audit 20 windows without a Return earlier | 38 / 44 | 38 / 44 (unchanged; the 6 are audit 20's ARBOK entry rows) |
| Swift / Shock Wave / Water Pulse after a 255 Return, both sides (26 windows, 20 with a Return earlier): lend == ROM | 12 / 20 | **20 / 20** |
| The same 26 windows, dense production live render vs the ROM (r1 == r2) | 26 / 26 live, 0 px | **26 / 26 live, 0 px** (every row exact) |
| ReturnStrongest per-frame plan check, direct mGBA, both sides | n/a | **12 / 12** instances exact, 588 allocation windows |
| ReturnMedium re-check against plan 117 | n/a | 2 / 2 exact |

**Before the fix there were wrong lends but no wrong pixels.** In the 8 wrong base windows, Swift, Shock Wave and Water Pulse use
only the first free slots, and those match: base `[4, 3, 21, 20, 5, ...]` vs ROM `[4, 3, 5, 7, 21, 20, ...]`. So the earlier claims
were not drawn wrong. A consumer that reaches deeper into the free list would have been drawn wrong.

**Census.** Live-share 0..999, base b2ed6f8c2 vs final, one process each:
- **123 live → fallback, 0 fallback → live** (30 battles);
- live share by count 94.17 → 93.73 %, by frames 97.94 → 97.28 %;
- command key sequence, `battleDigestExcludingFrames` and `battleDigest` are identical; 0 render throws.

**The kernel sends friendship 0 for every census Return, not 255.** Every flip is a Return 216 body (47) or a later body. Their
declines are `order host: Return power level 0 body`, or a case-local gate after that invalidation. So rung 2's key is never reached in
the census, and only the rung-1 fail-closed path fires. The supervisor accepted a negative delta for rung 1.

**FINDING (gameplay, outside this grant).** The ROM's Battle Factory sets friendship 0 for rentals (`battle_factory.c:459`) and for
opponents (`:820`). It also writes every move through `SetMonMoveAvoidReturn` (`battle_factory.c:913-919`), which turns
MOVE_RETURN into MOVE_FRUSTRATION:
- **The ROM Factory has no Return.** Those sets carry Frustration at friendship 0, i.e. 102 power.
- Production keeps Return, with friendship 0.
- `docs/next-adapters-prep18.md` §4 claims "255 for every Return user". It cites `battle_tower.c`, the generic frontier fill, which the
  Factory does not use.
- Production's live Return adapter draws a 282-frame body: the ReturnStrongest length (audit 20's ROM body is 282 frames).
  Friendship 0 would select ReturnWeak.

## 2. Source

- `data/battle_anim_scripts.s:8924-8938` `Move_RETURN`: `createvisualtask AnimTask_GetReturnPowerLevel`, then `jumpreteq 0..3` to
  ReturnWeak (`:8939`), ReturnMedium (`:8949`), ReturnStrong (`:8962`) or ReturnStrongest (`:8991`, plus `ReturnStrongestHit` `:9051`).
- `src/battle_anim_effects_3.c:5060-5073` `AnimTask_GetReturnPowerLevel` on `gAnimFriendship`:
  - `< 60` gives 0;
  - `> 60 && < 92` gives 1;
  - `> 91 && < 201` gives 2;
  - `> 200` gives 3;
  - **60 matches no range and keeps 0.**
- `gAnimFriendship` comes from the controller buffer's MOVE_ANIMATION byte 10 (`battle_controller_player.c:2477`,
  `battle_controller_opponent.c:1457`). That is the kernel's 5th MOVE_ANIMATION argument (`battleMoveAnimationRequest().friendship`).
- **Plan 117 is ReturnMedium's shape:** dip, dip, lunge, hitsplat, `Cf;D0;Cf;D1;Cf;Cf;D2;D3`. Audit 19's fixtures pass friendship 70,
  which is Medium.

## 3. ROM evidence (`tools/integration/fixtures/ret80/`)

- `ret80Probe.py` runs direct mGBA through `plans69Probe.scenario` / `prep43Probe.run`:
  - Strongest: `mechanic-return-<side>-dragonair-<other>-onix` (friendship 255), both sides;
  - 3 (attacker, defender) pairs: Dragonair 148 / Onix 95, Snorlax 143 / Golbat 42, Golbat 42 / Snorlax 143;
  - each at lab seeds 305420349 and 7, always pinned;
  - controls: the medium, strong and weak scenarios, one pair per side.
- Every job runs twice in fresh processes (A == B, 18 / 18 jobs). A second whole batch reproduced `units.json` and `check.json`
  byte-identically (r1 == r2).
- `ret80Extract.py` writes `units.json` and `ret80Check.ts` writes `check.json`. The check applies the plan through the production plan
  cursor from the ROM's F at the unit start, and checks F, creates and destroys after every allocation window. Results:
  - `body 216 strongest`: 12 / 12;
  - `body 216 medium`: 2 / 2;
  - Strong (`Cf;D0;Cf;D1;Cf;D2;Cf;D3;Cf;Cf/D4;Cf/D5;Cf/D6;D7`) and Weak (`Cf;D0;Cf;Cf;D2;D1`) are classified only.
- `ret80PlanRows.ts` writes `plan-rows.json` with rows `30216:player` / `30216:opponent`. `spriteOrderProductionTable.ts` appends it
  after plans69, and the table is regenerated, not hand-edited.
- From the entry state, 30216 ends at `[3, 4, 5, 7, 21, 20, 19, 18, ...]`. That equals audit 20's
  `reproduce/return216-rom-order.txt` (first inactive frame `[..., 2, 3, 4, 5, 7, 21, 20, 19]`).

**Audit 20's windows** (`ret80Lends.sh` writes `audit20-lends/`):
- audit 19 / 20 fixtures hard-code friendship `"70"`, so `ret80Rekey.py` copies them and sets each 216 body's friendship argument to the
  scenario's staged party value (255 for every Return user; nothing else changes);
- the Part B fixtures are the committed ones;
- the controls are re-staged and re-probed as `audit20Extra.sh` does (`controls-derive.txt` == audit 20's);
- run 2 == run 1 on every file.

**Consumers** (`ret80Consumers.sh` writes `consumers/`):
- `ret80ConsumerStage.py` builds 6 scenarios from `pb-fly-wingull-opp-s2` (seed 305420351):
  - the opponent leads with Shelgon 372 (255, 4× Return) against the player's 4× consumer;
  - or the player leads with that Shelgon against a Snorlax 143 with 4× the consumer.
- The `pb-` prefix makes `audit20Fixtures.py` window every body.
- The rest is audit 20's pipeline: probes, fixtures, rekey, then `audit20Check.ts` (lends, plus the dense render with 2 fresh probes
  per scenario). It runs in this tree and in a git-archive tree of b2ed6f8c2: `summary.txt` / `summary-base.txt`,
  `lends*.txt`. A fresh runner pass gave the same lends and summary as the first manual pass.

## 4. Census

`tools/integration/fixtures/ret80-live-receipt.json` lists every live → fallback command with its decline after the change.
Grouped by move and decline:
- RETURN: 34 (power level 0) + 13 (case-local);
- DRAGON DANCE: 20 + 8;
- CURSE: 13;
- DOUBLE TEAM: 6;
- ICE BEAM: 5;
- AIR CUTTER: 4;
- MUD-SLAP: 3 + 2;
- THUNDERBOLT: 3;
- FRUSTRATION: 3 + 1;
- SEISMIC TOSS: 1 + 2;
- MEGAHORN: 2;
- FIRE BLAST, HORN DRILL, DREAM EATER: 1 each.

The tree src hashes are in the receipt. Before the fix, every one of these bodies was lent plan 117's order after a Weak-branch Return.
That order is wrong too: ReturnWeak is `Cf;D0;Cf;Cf;D2;D1`, measured in §3.

## 5. Reproduction (from workspace/; direct mGBA only)

```
PYTHONPATH=../../vendor/libmgba-py ../../vendor/mgba-venv/bin/python \
  tools/integration/ret80Probe.py <fresh> --jobs 12
python3 tools/integration/ret80Extract.py <fresh> <fresh>/units.json        # == fixtures/ret80/units.json
node --experimental-strip-types tools/integration/ret80Check.ts <fresh>/units.json <fresh>/check.json   # == check.json
node --experimental-strip-types tools/integration/ret80PlanRows.ts <fresh>/check.json <fresh>/plan-rows.json  # == plan-rows.json
node --experimental-strip-types tools/integration/spriteOrderProductionTable.ts   # regenerates src/engine/spriteOrderProductionPlans.ts
sh tools/integration/ret80Lends.sh <fresh>                 # audit 20's 15 windows, before / after
sh tools/integration/ret80Consumers.sh <fresh> b2ed6f8c2   # consumers after Return, this tree + base
sh tools/integration/ret80Census.sh <fresh> b2ed6f8c2      # census base vs HEAD (~18 min)
```

## 6. Follow-ups (not done)

- Tooling mirrors that key bodies themselves (`spriteOrderCrossBodyCorpusReplay.ts`, `orderCrossBodyRouteScan.ts`,
  `prep45CorpusReplay.ts`) still key every Return as 216. They are not production; fold71 left the same gap for 20222.
- `audit19Fixtures.py` / `audit20Fixtures.py` derive friendship `"70"`. Future audits that cover Return should derive the staged value,
  as `ret80Rekey.py` does.
- ReturnWeak and ReturnStrong rows each need more species pairs before they can be folded (one pair per side so far). **ReturnWeak
  is the branch the census reaches (friendship 0).** Folding it as a power-level-0 key would recover the 123 commands, if Return
  should exist in the Factory at all (see the FINDING in §1).
