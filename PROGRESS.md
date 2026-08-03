# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 891 — [bounded MAIN worker, 2026-08-03] ISSUES #71 Slice C LANDED — back-side hand-fit consumers documented + loud-guarded; one real latent bug found, NOT fixed (reported)

- **State:** master `e5bd18dd`. Full `npm test`: **649 files / 6,495 passed /
  1 skipped**. `npm run build` green (tsc -b + vite).
  `compare:differential -- battle-command-generated-off.json --base
  b7dbbe01 --summary`: **PASS — 128/128 byte-identical**.
  `tests/executableFrontierRatchet.test.ts` green, untouched, no barrier
  changes.
- **Did:** `docs/send-out-live-wiring-consumer-map.md` §5 Slice C — no
  dispatcher exists yet (animation lane's rung 3/4), so nothing is deleted
  or retired. At each of the 3 back-side consumer sites, added a code
  comment naming the exact species(+nature) the hand-fit is valid for
  (citing the doc) plus a throw-guard matching the existing §1e pattern:
  `drawPlayerMaterializeSettle` (ONIX back, legacy) guards on `encounter`
  (destin/jenson only — neither it nor its 2 callers carry a species
  value); `drawKabutoHSlideWobble` (KABUTO front, §2's uncatalogued 4th
  hand-fit — treated the same way since it's equally guardable) guards on
  `encounter` too, jenson-only; `drawTurn15ForcedSwitchRelease` (MAGBY
  back, forced-switch) guards on a real `species` param — all 4 current
  call sites already resolve "MAGBY" (3 fixed Turn-15 content, the 4th
  generated-route caller already gated on `view.field.player.name ===
  "MAGBY"`). All three were module-private; exported (Slice A precedent)
  for direct testability.
- **Tests:** 3 new Tier-1 cases in `tests/battleScene.test.ts`, one per
  guard — valid input draws unchanged (repeat calls / both valid encounters
  byte-identical), invalid input throws the named error.
- **Real latent bug found, NOT fixed (per the step's explicit STOP
  instruction):** `drawGeneratedPlayerMaterialize` (ONIX back, **generated**
  route, §1b) applies the same ONIX-only `playerMaterializeSettleY2`/
  `TintCoeff` tables regardless of the real per-round player species —
  confirmed this is reachable **today**, not just hypothetically: the
  already-green `factoryBattleStartIntro.test.ts` "renders every lifecycle
  phase..." case drives a KADABRA-led player party through this exact
  branch at elapsed 710/714. A naive throw guard there would crash that
  passing test. Left documented in place (comment citing this finding),
  deliberately un-guarded — guarding without fixing the underlying
  wrong-table application would only convert a silent bug into a crash on
  ordinary generated-round play. **Needs a real decision/fix, not a guard**
  — candidate: thread `art.speciesSymbol` and skip/zero the ONIX-only
  offsets for non-ONIX species until a real per-species back hand-fit
  exists (mirrors how the already-generic sibling call site at
  `battleScene.ts:34450` handles this via its `canonicalIncoming` check).
- **Next:** ISSUES #71 remaining: fix the `drawGeneratedPlayerMaterialize`
  latent bug above (new, not previously tracked); Slice D (per-tick front
  playback, gated on animation lane's rung-3 dispatcher); §1e's 56/58
  move-window patch-site retirement. Cross-lane dispatcher ask stays open.
- **Notes:** no PAPERCUT this step beyond the reachability analysis time
  itself (worth it — it caught a real bug before a guard would have shipped
  a crash).

---
## 890 — [bounded MAIN worker, 2026-08-03] ISSUES #71 Slices A+B LANDED — front terminal offsets wired at the 5 real settle hooks, RAM-confirmed

- **State:** master `32af4030`. Full `npm test`: **649 files / 6,492 passed /
  1 skipped** (+4 from this step's new suite). `npm run build` green (tsc -b
  + vite). `compare:differential -- battle-command-generated-off.json --base
  30afb56d --summary`: **PASS — 128/128 byte-identical**.
  `tests/executableFrontierRatchet.test.ts` green, untouched, no new
  recording imports, no barrier-count changes.
- **Did:** `docs/send-out-live-wiring-consumer-map.md` §5 Slice A (+ Slice
  B's species-threading acceptance) — wired `speciesFrontIdleRestOffset`
  (already-banked front-family dispatcher, `src/animation/speciesIdleAnim.ts`)
  at the 5 real live settle hooks in `battleScene.ts` (6 call sites):
  `drawGrovyleSettled`, `drawKabutoHSlideWobble`'s settle branch,
  `drawGeneratedOpponentRelease`'s `coeff===0` branch + its duplicate in
  `renderGeneratedBattleStartPlayerRelease`, `drawTurn5PidgeottoSettled`,
  `drawTurn13MurkrowSettled` — offset added directly to each draw's origin
  x/y, reusing the `:1105` import. The generated-route pair (item 3) already
  threaded the real `fieldView.fieldArt.opponent.speciesSymbol` used for
  sprite art/elevation at that exact call site, so Slice B's guard (no
  literal/shared-default species) was satisfied as written, not a separate
  fix. Exported `drawGeneratedOpponentRelease` (was module-private) so it's
  directly unit-testable.
- **Tests:** 4 new Tier-1 cases in `tests/battleScene.test.ts` — GROVYLE and
  MURKROW settled-sprite no-op pins (offset `{0,0}`, via the existing
  `pixelAtSentOut`/turn13-confirm render idioms — no visible change, proving
  the wiring is inert where expected); RATTATA positive case (staged
  `fieldView`, no existing idiom reaches the generated-route settle) —
  settles at `x2=+1` vs. an independently-blitted un-offset reference frame;
  BULBASAUR staged-`fieldView` companion guarding Slice B (settles at the
  plain origin, not a shared/literal default).
- **Oracle acceptance (program doc §7 bar):** extended
  `tools/probe/dump-onix-front-idle-anim.py`'s `SYMBOLS` table
  (`Anim_VerticalStretch`, `Anim_HorizontalSlideWobble`; `nm` addresses on
  the reference ELF). Three new minimal `battle-scene-on` mechanicLab
  scenarios (`tools/battle-lab/send-out-front-idle-{grovyle,pidgeotto,
  rattata}.json`) RAM-probed `gBattlerSpriteIds[1]` at the settled tick:
  GROVYLE `x2=0,y2=0`, PIDGEOTTO `x2=0,y2=0` (same `animNum`/`animCmdIndex`
  as GROVYLE — the §7 sibling-pair spot-check for shared `V_STRETCH`),
  RATTATA `x2=1,y2=0` (the mandatory positive case) — all three match
  `speciesFrontIdleRestOffset`'s output exactly. **Gotcha found along the
  way:** a `battle-scene-off`-profile mechanicLab scenario never dispatches
  the front idle-anim task at all (flat `SpriteCallbackDummy`/`x2=0`/
  `animNum=0` from tick 0) — only `battle-scene-on` fast-forwards through
  the real intro, matching the prior ONIX fixture's own profile, not this
  lane's default oracle. Re-ran the §4 dense-window list twice fresh
  (`battle2-kabuto-sendout-dense` 151/151, `battle2-player-sendout-dense`
  170/170, `sendout` 255/256, `battle2-jenson-sendout-text` 39/39,
  `factory-arbitrary-intro-yoshi-off` 700/751,
  `factory-arbitrary-intro-magneton-off` 703/751) — identical both runs and
  matching each window's own pre-existing accepted baseline exactly (zero
  new diffs; ONIX/RATTATA appear in none of these committed windows, per
  §3's empirical finding).
- **Next:** ISSUES #71 remaining scope: Slices C/D (ONIX-back/MAGBY-back
  hand-fit consumer guards; per-tick front playback) + the §1e 56/58
  move-window patch-site retirement — all still queued, cross-lane ask for
  the animation lane's rung-3 dispatcher stays open (see ISSUES.md #71).
  Typeref retirement slice 2 remainder (Family P+Q turn1-4 fold, see entry
  889 below) is the next queued item after that.
- **Notes:** no PAPERCUT beyond ordinary research time; the `battle-scene-
  off`-vs-`battle-scene-on` mechanicLab fast-forward gotcha above cost
  ~10min to root-cause and is worth remembering for any future front/back
  send-out probe in this codebase.

---
## 889 — [bounded MAIN worker, 2026-08-03] typeref slice 1 LANDED (Family S dead-parameter cut); slice 2 blocked, documented

- **State:** master `7ca03a17`. Full `npm test`: **649 files / 6,488 passed /
  1 skipped** (unchanged from baseline). `npm run build` green (tsc -b +
  vite). `compare:differential --base 4fe0e206 --summary` over the full §2.5
  turn 5-15 window list + `turn5-menu`/`turn5-rockslide` + insurance
  `battle-command-generated-off.json` (49 traces): **PASS — 7,466/7,466
  captures byte-identical**. `tests/executableFrontierRatchet.test.ts` green,
  untouched.
- **Did:** landed `docs/battlescene-turnN-typeref-retirement-design.md` §4
  slice 1 exactly as scoped: cut the turn5-13 predecessor-handoff parameters
  from `drawTurn6FightSubmenuWindow`..`drawTurn15FightSubmenuWindow` (10
  functions) and `drawFightSubmenuChrome`'s 9 void-marked turn5-13 slots
  (keeping its turn1-4/moveset/resolution params); truncated the ~14
  literal-null call sites in `drawLatestCompletedCommandWindow`'s dispatch
  ladder and inside each of the 10 functions' own chrome calls accordingly;
  deleted the now-dead `import type { TurnNCompletedResolutionNextCommandHandoff }`
  lines for N=5..13 (9 import refs — re-grepped each before deleting, matching
  the doc's own N=5..13 range, not just N=6..12). Every one of these was
  already provably dead (§2.2/§2.4: production always passes a non-null
  `latest`, so the deleted params only ever fed the unreachable `else`
  fallback branch) — this was a pure mechanical cut, no behavior change.
  battleScene.ts ref count **152 → 80** (72 retired: 54 Family S + 9 Family Q
  dead chrome slots + 9 imports), re-run via the doc's own §1.1 census script.
- **Next:** typeref slice 2 (Family P+Q turn1-4 fold) is the next pick but
  needs a fresh, focused session — see Notes for exactly why this session
  didn't land it. Slices 3/4a/4b/5 remain after that.
- **Notes:** slice 2 (Family P+Q turn1-4 fold) did **not** land this session
  — invoked the step brief's own documented fallback rather than rush a
  "not one pixel may move" change. Investigation found the design doc's "24
  refs / 6 functions" framing undersells the entanglement: Family Q's
  remaining 6 functions (`drawMenuIdleBaseWithOpponentHp`,
  `drawActionMenuIdleContent`, `drawActionMenuIdleWindow`,
  `drawFightSubmenuChromeTurn1Through4PP`, `drawFightSubmenuChrome`,
  `drawFightSubmenuChromeFromCurrentOwner`) are called from far more than the
  in-scope `drawFightSubmenuWindow`/`drawActionMenuIdleWindow` —
  `drawActionMenuIdleContent` alone has 9+ call sites inside Family R
  (explicitly out of scope this session, slices 3/4a/4b), each passing a
  differently-shaped positional argument list (some just `turn1NextCommandHandoff`,
  some `null, null, turn3NextCommandHandoff.hp.player, turn3NextCommandHandoff`,
  some bare `null`). Changing Family Q's signatures to read `latest` directly
  forces edits to every one of those Family R call sites. Confirmed at least
  one real semantic nuance in the process (an HP-overlay guard inside
  `drawActionMenuIdleContent` that deliberately fires for turn 2/3 lifecycle
  but explicitly excludes turn 1 — not a plain "hp changed" check), meaning
  each call site needs individual verification, not a batch swap. The
  slice-2 precondition pin test (`tests/battleSceneFightCommandPresentationTurn1Through4.test.ts`,
  banked at `a76bb338`) is still green and still the right starting point for
  whoever picks this up. ISSUES #39 updated with the same detail. No
  PAPERCUT beyond the investigation time itself.

