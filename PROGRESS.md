# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 952 — [bounded MAIN worker, 2026-08-05] ISSUES #79 CLOSED: airborne FLY/Dig sprite hidden through the fight-menu handoff

- **State:** master `21128f7a`, clean. Red-verified Tier-1 pins + fix committed.
- **Did:** ground truth (`docs/fly-semi-invisible-off-ground-truth.md`) said the
  consumption chain "looks wired end-to-end" — and the resolution path is
  (Tier-1-pinned). The break was the **fight-menu draw path**: the turn boundary
  hands the scene to `renderGeneratedBattleCommandPresentation` →
  `drawBattle2ActionMenuWindow`, which drew the fieldArt opponent/player sprites
  unconditionally — so the airborne opponent's sprite reappeared for the entire
  turn-boundary menu idle (~1200 of the staged trace's frames 333-1523). Fix is
  generic: `BattleCommandPresentationState` gains a persistent
  `spriteVisibility {player,opponent}`; `settledCommandForResolutionHandoff`
  threads it from the orchestrator `battlePresentationBoundaries` (already
  updated by `commitCompletedResolutionCommand` on every sprite-visibility
  receipt); the render view exposes it; `drawBattle2ActionMenuWindow` gates the
  sprite draws on it with the healthbox untouched (real
  `OpponentHandleSpriteInvisibility` semantics — Dig/Fly hides sprite only,
  recall hides both); the resolution confirmHandoff branch passes the
  resolution view's own visibility. Pins: `tests/flySemiInvisibleSceneOffPresentation.test.ts`
  (4 tests, each red-verified before the fix): (1) OFF-kernel ONIX-SPLASH vs
  MURKROW-FLY charge + locked strike — sprite hidden from the charge moveend
  through the strike, healthbox always true, restored at the strike moveend;
  (2) DIG sibling same toggle, healthbox never hidden; (3) fight-menu handoff
  carries `spriteVisibility.opponent === false` after the charge; (4) the
  fight-menu renderer's hidden-opponent frame differs from the visible frame
  only in the sprite region.
- **Next:** #81 torment message, #80 party-menu inventory, #55 provenance
  wiring, #78's recall-span slice 4.
- **Notes:** full `npm test` **730 files / 6,991 passed / 1 skipped**, build
  green, typecheck green, smoke 347/347, and insurance
  `compare:differential --base a0b9ad9a` **384/384 byte-identical**
  (battle-command-generated-off 128/128, turn15-fly-strike 256/256 — the
  canonical Fly window unmoved).

---

## 951 — [bounded MAIN worker, 2026-08-05] ISSUES #78 slices 1-3 landed: mid-battle switch cadence + materialize + healthbox slide

- **State:** master `db74b38c`, clean. Three green commits on top of the #77
  merge: slice 1 `f0890416`, slices 2/3 `db74b38c`. Smoke **347/347**,
  typecheck green, orchestrator/turn-portability/evidence suites green, and
  insurance `compare:differential --base d0a28fc3` **579/579 byte-identical**
  (battle-command-generated-off 128/128, turn15-sendout-rung6 195/195,
  turn15-fly-strike 256/256 — forced-switch-after-faint windows unmoved).
  Ground truth: `docs/mid-battle-switch-presentation-ground-truth.md` §2/§3/§6.
- **Did:** (1) **Slice 1 — cadence (closes 78(b)):** `SWITCH_IN_TIMING`
  `minimumFrames` 1→**91** (`SWITCH_IN_SPAN_FRAMES`, cited to `Cmd_switchinanim`
  battle_scripts_1.s:3122: the 1140-1230 `CONTROLLER_SWITCHINANIM` lifetime).
  With the app's 24f SWITCHINMON message + 1f party-summary hide, the
  opponent's move lands at the source's 116-frame gap exactly; "Go! …!"
  persists via latestMessage. Red-verified Tier-1 pin. (2) **Slices 2/3 —
  materialize + healthbox slide (closes 78(a)):** `midBattleSwitchInAt` keys
  the send-in on the switch-in command's own phaseElapsed: ball throw (45f,
  TranslateAnimHorizontalArc shape (24,68)), ball-release emerge
  (`sAffineAnim_Battler_Emerge` entered at accumulator 76 = pa 862, RAM ramp
  862→697→…→256 over 1188-1199, Tier-1 pinned via floor(0x10000/acc)), then
  settled; healthbox slide 110→0 @ 5 px/frame over 1205-1227
  (`StartHealthboxSlideIn` pokeball.c:1241-1269, Tier-1 pinned). Scene
  renderer owns the switch-in battler's pixels; generic draws gated.
- **Next:** slice 4 — recall-side span: `STRINGID_RETURNMON` shows ~35f vs
  real 82f (outgoing mon's return-to-ball scale-up 256→736 + teardown
  unmodeled). Then wire the scout's `scratch-mid-battle-switch-dense-*-off`
  traces into `tools/compare/appTrace.ts` (app stage at the fixture's
  fight-menu-open checkpoint) to execute the §6 dense-compare acceptance —
  the slices are Tier-1 + differential-verified but not pixel-compared. Then
  #79 Fly probe, #81 torment, #80 party-menu inventory, #55 provenance.
- **Notes:** forced-switch SEND OUT (`presenting-switch-in` phase) is
  untouched — driven by the party-select clock, not the command duration.
  `turn15-fly-strike` app-vs-oracle is 229/256 pre-existing (canonical Battle-2
  partial window); the differential proves my change moved nothing. Ball throw
  arc geometry is modeled (same source shape) but not brute-force pixel-fit —
  named in ISSUES #78's remainder for the dense compare.

---

## 950 — [supervisor salvage, 2026-08-05] #77 CLOSED: effectiveness/crit messages hold `B_WAIT_TIME_LONG` on the live route

- **State:** master at the docs commit following `7adbd559`, clean. The
  live-route fix is committed: `STRINGID_SUPEREFFECTIVE`/`NOTVERYEFFECTIVE`/
  `CRITICALHIT` now carry `WAITMESSAGE_LONG_TIMING` (64 frames post-typing,
  named for the source `B_WAIT_TIME_LONG`, `battle.h:324`) instead of
  `holdFrames: 0` — the user-reported "flashes for a fraction of a second"
  cadence bug. `STRINGID_USEDMOVE` untouched (no `waitmessage` in source —
  its pacing is animation/HP-driven). Old-value pins red-verified; negative
  pins added. Focused suite, typecheck, smoke **347/347**, and
  `compare:differential -- battle-command-generated-off.json --base 82563164`
  **128/128 byte-identical** (supervisor-run post-salvage).
- **Did:** worker was cap-killed (exit 124, 45-min cap) after its fix commit
  with one uncommitted type-only test narrowing; supervisor kept the
  narrowing (typecheck needs it), ran the remaining verification, deleted
  ISSUES #77, and wrote this entry. Ground truth + re-runnable oracle
  verifier live in `docs/battle-message-hold-cadence-ground-truth.md` +
  `tools/probe/verify-message-hold-cadence.ts` (merged earlier, ALL CHECKS
  PASSED twice).
- **Next:** #78 switch-presentation scout is completing in the side lane;
  then #55 scaffold provenance wiring (receipt §7), #79 Fly probe, #81
  torment message, #80 party-menu inventory, RECORD/RETIRE/lobby/REST.
- **Notes:** the scout flagged other `holdFrames: 0` ids for a follow-up
  audit only where a source `waitmessage` is unambiguous; the worker's
  final message lists none it was confident in — treat as a small future
  scout, not silent debt.

---

## 949 — [bounded MAIN worker, 2026-08-05] #76 Confuse Ray crash fixed: confusion message family resolves + reachable-gap census

- **State:** master `26579665`, clean. ISSUES #76 deleted (fixed); confusion
  family branches + repro tests + census docs + mechanicLab probe committed.
- **Did:** (1) Red-verified repro: HAUNTER CONFUSE_RAY vs MURKROW through the
  real full-turn reducer + presentation seam threw
  `battleStringResolver: unsupported control segment {B_EFF_NAME_WITH_PREFIX}
  in STRINGID_PKMNWASCONFUSED`. Root cause: confusion is a STATUS2 write
  (applyConfusionStatus2Mutation) that emits no `set-battler-status-data`
  receipt, so the generic fallback's pendingStatusMessageBattler bridge never
  fired — the one status-infliction id the generic path could not resolve.
  (2) Fix (red→green): `prepareMessage` now attaches `effectBattler` to
  STRINGID_PKMNWASCONFUSED (applySetMoveEffect already wrote it to the move's
  target) + three new messageLines branches — PKMNWASCONFUSED
  (`{B_EFF_NAME_WITH_PREFIX}` ← effectBattler payload), and
  PKMNISCONFUSED/PKMNHEALEDCONFUSION/PKMNFATIGUECONFUSION
  (`{B_ATK_NAME_WITH_PREFIX}` ← action snapshot's own attacker). Pinned by
  `tests/confuseRayInflictionPresentationRepro.test.ts` +
  `tests/confusedAdmissionPresentation.test.ts`. (3) Oracle spot-check:
  mechanicLab OFF trace (`tools/battle-lab/mechanic-confuse-ray-haunter-
  murkrow-off.json`, overrides.parties, all-opponent-slots-SPLASH) — the ROM
  inflicts confusion (status2=3, confusionTurns=3 at frame 112+); a
  pixel-check probe (`tools/confuseMessagePixelCheck.ts`) overlays the app's
  battle-window + "Foe MURKROW became\nconfused!" text onto the oracle
  message-hold frames: **0/38400 px differ at frames 140-160** (box ~108,
  typing 108-140 — typing cadence is #77, out of scope). (4) Census:
  regenerated `docs/printstring-literal-census.md` (confusion family now
  explicit; 207 ids → 86 explicit + 83 generic + 38 UNRESOLVED, unchanged
  count) and authored `docs/battle-string-resolver-reachable-gap-census.md`
  verifying the status-infliction family (paralysis/poison/burn/sleep already
  covered via the status1 bridge + explicit -BY branches) and splitting the 38
  remaining UNRESOLVED ids into Factory-plausible (incl. #81's
  STRINGID_PKMNCANTUSEMOVETORMENT) vs structurally out-of-Factory-scope.
- **Next:** MAIN: provenance wiring into `winTerminalWindowStage` per receipt
  §7, then #78 switch-presentation scout; SIDE: #77 message-hold timing scout.
  The next resolver gap (census list) should be picked up by a repro test
  first, per the census doc's enforced pattern.
- **Notes:** status1-infliction "was X" ids resolve via the generic fallback's
  status-data bridge; the confusion family was the only STATUS2-written
  infliction id and is now explicit. Smoke **347/347** at commit; full
  `npm test` + build pending at entry write.

