# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 999 — [bounded MAIN worker, 2026-08-08] battleScene canonical-split slices 1+2 LANDED: 194 symbols moved to battleSceneCanonical.ts — differential 1369/1369 byte-identical (both slices)

- **State:** master `c40a98a4`, tree clean. Slice 1 `4736842a` + slice 2 `c40a98a4` (a concurrent docs commit `aa8304c3` landed between them; it touched nothing under src/). `npm test` **768 files / 7298 passed / 1 skipped** exit 0, `npm run build` exit 0, `npm run typecheck` exit 0, `npm run test:smoke` **366/366**, both ratchets green (animationBoundary 3/3 + executableFrontier 6/6).
- **Differential (app-vs-app, per slice, exact command per design §5):** slice 1 vs `4736842a^`(`95e6d156`) and slice 2 vs `c40a98a4^`(`aa8304c3`) — **BOTH 1369/1369 byte-identical, exit 0**: turn1-rockslide-off 256, turn2-dragonbreath-off 237, turn5-faint 110, turn5-switchin 241, turn13-dragonbreath-faint 141, turn15-fly-strike 256, battle-command-generated-off 128.
- **Slice 1 (unreachable pair):** `BALL_WIDGETS_SETTLED_TICK` + `TURN5_SITRUS_RING_RENDER_LAG` moved verbatim into the new `src/engine/battleSceneCanonical.ts`, re-exported from `battleScene.ts` (zero callers; TURN5 gained `export` — the only edit, forced by the re-export). **The module-eval invariant guard did NOT move** (see blocker below).
- **Slice 2 (self-contained literal constants):** **192 const declarations** (canonical-only, AST-pure-literal initializers — zero free value identifiers of any kind) moved verbatim + re-exported; bodies byte-identical (191/192 auto-verified; the 1 flagged block differs only by the forced `export ` insert). Canonical gains one type-only import (`RgbColor` from `./bg.ts`); **no animation imports → boundary ratchet holds.**
- **Partition after the two slices:** battleScene.ts 36,897 → **36,658 lines** (wc); canonical 634 lines. Script reconciles at the NEW total: **LIVE 248 / CANONICAL 378 / SHARED 405 + residual 0 = 1031 == 1031 RECONCILED**, acyclicity still CLEAN. 1,225 − 194 = 1,031 ✓ (194 = 2 slice-1 + 192 slice-2).
- **Blockers/deviations (reported per brief, not silently worked around):** (a) **The guard at old:10318 cannot move in slice 1** — it reads `ONIX_SITRUS_ROTATE_RENDER_LAG` (canonical-only, stays in battleScene.ts); moving it forces a canonical→battleScene import that, combined with battleScene's mandatory re-exports, forms an ESM cycle whose module-eval read hits **TDZ (`ReferenceError: Cannot access before initialization`)**, verified empirically in both CJS and native ESM. The guard stays ACTIVE in battleScene.ts (reads TURN5 via the new import) and can move in slice 4 when ONIX + its consumers move together. (b) **The doc's "281 zero-ref leaves" is not reproducible** — the committed partition script emits no such list, and the doc's representative `INITIAL_BATTLE_SCENE_STATE` is not zero-ref (it references imported `CLOSED_FIGHT_SUBMENU_STATE` + internal `BattleSceneState`). Under the doc's stated definition (AST, property/type-aware) the true counts are 244 zero-ref symbols / 226 const-let, of which **192 are pure-literal consts** (moved). 34 zero-ref consts reference imported values (incl. `BATTLE2_TURN1_KERNEL`→`stageBattle2Turn1Kernel`) — deferred to slice 3. (c) Deferred: `INITIAL_BATTLE_SCENE_STATE` (internal type annotation), `ONIX_SITRUS_ROTATE_RENDER_LAG` (guard dep), and the two `let` caches `turn10OnixDarkPaletteCache`/`menuHealthboxPlayerContentMask` (TS forbids reassigning an import; not literal constants).
- **Next:** supervisor reviews; slice 3 moves the 34 import-referencing zero-ref consts + 38 AST dependency leaves (canonical imports shared/live from battleScene.ts). Watch the TDZ guard: once slice 4 moves `ONIX_SITRUS_ROTATE_RENDER_LAG` + `ONIX_SITRUS_IDENTITY_RENDER_TICK` + `onixSitrusRotateMatrix` + `turn5SitrusRingMatrix`, the guard can move too.
- **Notes:** no PAPERCUTS of my own. One more concurrent-harness artifact: `aa8304c3` committed between my slices (docs-only, no src change, slice-2 base verified unaffected).

## 998 — [bounded MAIN worker, 2026-08-08] battleScene.ts canonical-split PARTITION + DESIGN (no code moved): script + doc landed — LIVE 248 / CANONICAL 572 / SHARED 405, cut verified CLEAN

- **State:** master `2520322b`, tree clean after this commit. `npm run typecheck` exit 0, `npm run build` exit 0 (nothing production touched). Partition script run TWICE → byte-identical output (deterministic; no network/oracle).
- **Deliverables (re-runnable script + one design doc):** `tools/report/battlescene-split-partition.ts` + `docs/battlescene-canonical-split-design.md`. NO production code, test, or oracle change.
- **Partition (identifier-based reachability, limitation documented in the doc):** battleScene.ts = **1,225 top-level symbols** (448 fns incl. 199 turn-named, 730 const/let, 36 iface, 11 type; 280 export decls / 282 exported syms) → **LIVE 248 / 20,588 lines**, **CANONICAL 572 / 5,302 lines** (incl. 2 unreachable-anywhere consts `BALL_WIDGETS_SETTLED_TICK`, `TURN5_SITRUS_RING_RENDER_LAG`), **SHARED 405 / 3,131 lines**. 248+572+405 = 1225 **RECONCILED** every run. **Cut feasibility = CLEAN**: no LIVE/SHARED symbol references a CANONICAL-only symbol (0 leaked edges), so moving CANONICAL into `src/engine/battleSceneCanonical.ts` is a one-way move (new file imports SHARED/LIVE from battleScene.ts; no cycle).
- **Entry surfaces measured (two brief corrections):** 5 engine files import **44 total / 43 unique** (core 34 ✓, **summaryInfoPage 1 — brief said 8**, factoryBattleStartIntro 5 ✓, factoryRoundBattleOrchestrator 2 ✓, stagedBattleTurn 2 ✓). tests/ + tools/probe/ import **234 symbols across 31 test files + 9 probe files** (files total **46, brief said 54**). 280 export decls ✓, 199/448 turn-named ✓.
- **Slice plan (in doc §6, standing acceptance = §5 differential):** the seven-trace differential command was verified and **one name corrected — `turn1-rockslide` → `turn1-rockslide-off`** (bare name does not resolve; the other six exist). Slices: (1) scaffold + the 2 unreachable consts + the file's only module-eval guard (battleScene.ts:10318), (2) the **281 self-contained literal consts**, (3) the remaining **41 leaves** (322 total canonical-only leaves), (4) the 248 non-leaf canonical-only in topological batches, final = entry-point flip in core.ts + ~46 caller import-path updates. Honest scope statement in doc: this is a same-module-graph move; canonical code STILL SHIPS in the bundle (no bundle-size win; the canonical branch is not injectable — out of program).
- **Hazards called out:** (a) `tests/animation/animationBoundaryRatchet.test.ts` pins the engine/animation boundary from BOTH sides; the canonical cluster demonstrably needs `../animation/*` (e.g. onixSitrusRotateMatrix → heldItemHeal.ts), so a new src/engine file importing animation needs either re-export through battleScene.ts or a deliberate ratchet widening — a cross-program decision, not a drive-by; (b) ~46 importing files need path updates at the final slice.
- **Next:** supervisor reviews the design; the next step makes the actual cut per the slice plan (MOVE NOTHING was this step's hard rule).
- **Notes:** no PAPERCUTS of my own. One concurrent-harness artifact worth flagging: while I worked, the side-lane fix `cac9cda3` was committed in the main tree and **swept my in-progress script into its commit** — it is byte-identical to my final script, so no harm, but a plain `git commit` from a concurrent actor staged untracked main-tree files. PROGRESS #997's differential (3055/3055) and all my numbers re-verified unchanged after the concurrent `2520322b` merge (battleScene.ts/core.ts untouched by it).

## 997 — [bounded MAIN worker, 2026-08-08] #39 slices 1+2: slice-1 remainder LANDED, slice 2 verified already-landed — differential 3055/3055 byte-identical

- **State:** master `f3f5754c`, clean. `npm run typecheck` + `npm run build` exit 0; `npm run test:smoke` **347/347**; `tests/battleSceneHealthboxFactories.test.ts` **6/6** (one per factory, 2 HP values each — pre-existing, satisfies slice-2 acceptance). Full `npm test` NOT run (worker rule).
- **Finding — slice 2 is mis-scoped, already landed 2026-08-02:** the six-family-C parameterization is commit `4d767598` (ancestor of HEAD): all six factories take `name`/`level`/`maxHp` (gender for kabuto/magby) and every call site threads its constant explicitly (`ONIX_MENU_BATTLER`, `KABUTO_SENDOUT_BATTLER`, `TURN5_SWITCHIN`/`TURN13_SWITCHIN` locals). No slice-2 work remains; nothing to land or change.
- **Landing (slice-1 remainder):** the `hp === 142` literal in `murkrowHealthboxContentForHp`'s cache-miss branch (battleScene.ts:11449) now reads `TURN13_SWITCHIN.replacementHp.max` (verified `max === 142`, MURKROW Lv50) — behavior-preserving, completing slice 1's two-literal swap (`PIDGEOTTO_MAX_HP` was already adapter-derived).
- **Differential vs clean parent `8f6f2577`:** PASS — **3055/3055 captures byte-identical across 17 traces**: turn5-switchin 241, turn5-sitrus-a 110, -b 82, -c 181, -d 133, turn13-switchin 242, turn14-fly-miss 213, turn15-fly-strike 256, turn6-rockslide-a 255, -b 105, turn7-rockslide-a/b/c/d 256/256/256/19, turn8-bind-a 256, -b 66, insurance battle-command-generated-off **128/128**. Exit 0.
- **Next:** supervisor retires #39's slice-1+2 rows (dossier's §4 rows 1-2); nothing else open from this step.
- **Notes:** no PAPERCUTS. Committed `f3f5754c` (the one-literal fix); slice-2 code already in history.

## 996 — [bounded MAIN worker, 2026-08-08] #39 dispatcher slice 7 (turn-2 fold) ALREADY LANDED — verified, no code changes made; tree green throughout

- **State:** master `e6165e8b`, clean. `npm run typecheck` + `npm run build` exit 0; `npm run test:smoke` **347/347**; all 6 touched test files **458/458** (incl. `turn2ResolutionAdapterEquivalence.test.ts` 7/7 proving the generic receipt via `resolveTurn2LatestCompletedCommandHandoff`/`turn2FightCommandPresentationFromLatest`/`turn2CompletedResolutionNextCommandHandoffFromLatest`, mirroring turn-1's slice-6 shape). Full `npm test` NOT run (worker rule).
- **Finding — the step is mis-scoped, the fold was already landed 2026-08-02:** the turn-2 epoch/content fold was committed as `3a3a168a` (bridge) + `8518520b` (fold) and supervisor-verified the same day (archive entry 861: "six oracle pins exact (256/256, 237/237, 254/255 #61-residual, 161/161, 256/256, 128/128)"). The current tree is past the whole dispatcher migration: `tools/census-next-command-handoffs.sh` reports **BattleSceneState handoff fields 0, drawFightSubmenuWindow handoff params 0, currentPPForActiveMon handoff params 0, initial/advance handoff entries 0** — i.e. beyond even slice 10's final-cut acceptance. `turn2NextCommandHandoff` state field is gone from battleScene/core/battleMenu; generic content (`turn2FightCommandPresentationFromLatest`, `isTurn2LatestCompletedCommandLifecycleActive`, `resolveTurn2LatestCompletedCommandHandoff`) drives live state. The acceptance's differential cannot even run as prescribed: `--base e6165e8b` == HEAD, and the harness rightly refuses ("a differential against itself proves nothing").
- **Evidence run anyway vs. the true pre-fold parent `3005e9c2`:** `turn2-endeavor-off` **256/256** and `turn2-dragonbreath-off` **237/237** byte-identical — exactly slice 7's own two turn-2 windows, confirming the fold was pixel-neutral there. `turn3-rockslide-off` 161/161 too. `turn3-endeavor-off` reads 227/255 with a persistent 41px diff — that drift is from LATER landed slices (8/9 turn-3/4 folds + typeref retirements, all post-dating the fold), not from slice 7, and matches nothing this step was asked to touch.
- **Next:** supervisor should retire/tick #39's slice-7 row (and confirm the whole 1-10 ladder is recorded done — census is already at the final-cut target). No engine work remains for this slice.
- **Notes:** no PAPERCUTS. No src/test edits made — the correct action was to verify and report the mis-scope, per the brief.

## 995 — [supervisor, 2026-08-08] Orient + round 1: `animation-main` folded and union-verified, ISSUES #80 CLOSED (395/395 supervisor-rerun), Castform Forecast barrier RETIRED — plus a 3-day CPU leak killed

- **State:** master at this entry's commit, clean. **Union baseline verified
  independently after the fold: full `npm test` 768 files / 7288 passed /
  1 skipped, exit 0; `npm run build` exit 0.** DEFERRED.md: no open entries.
- **Fold:** `animation-main` merged into master at orient — **fast-forward**,
  6 commits (`8fc77bdb..06077049`): MOVE_DETECT promoted exact (inventory
  122→123), MOVE_IRON_TAIL staged with its 135-frame measured window and
  `ironTailProbe.py`. The lane merged master into itself first, so the fold
  needed no conflict resolution. That lane stayed live and is still
  committing; later commits are the next orient fold's.
- **Round 1 (2 DeepSeek workers, both productive, 0 lost):**
  - MAIN — ISSUES #80's last gap: the app opened the party-menu action submenu
    **3 frames early**. `SUBMENU_OPEN_VISUAL_DELAY = 3` + a `submenuOpenElapsed`
    counter now gate the action window, the message-window swap and the CANCEL
    suppression; the mon-icon stall and close fade are untouched. Dense-a
    **392 → 395/395**, fast loop 920:965 46/46. **Supervisor reran the compare
    independently: 395/395.** ISSUES #80 deleted in full.
  - SIDE — ROADMAP S10 gate-4: the last `unsupported-branch` barrier in
    `battleScriptTryCastformDataChangeOpcode.ts` is **retired, not narrowed**.
    `Cmd_trycastformdatachange` now writes the durable SET_BATTLER_TYPE pair
    and `gBattleStruct->formToChangeInto`, and pushes the real
    `BattleScript_CastformChange` continuation (modeled as the machine's
    `call`); `B_SCR_OP_DOCASTFORMCHANGEANIMATION` is registered alongside.
    Ratchet pin 1 → 0. A live Forecast Castform rental (Frontier sets 204/309)
    used to halt the kernel the moment weather turned on; it now changes form
    and type. **Supervisor verification: 58/58 across the four acceptance
    files, plus an independent red-verify — neutralizing the durable type
    write turned 9 tests red across 3 files before restore.**
- **Next:** #39 dispatcher slice 7 (turn-2 epoch/content fold, main) and the
  `Cmd_datahpupdate` substitute-fade barrier (side, and note it carries a
  latent bug: source re-checks `substituteHP == 0` after BOTH branches, so
  exact-lethal damage to a Substitute must fade and today does not).
- **Notes:** at orient the host carried **three orphaned
  `probeEvolutionBasic.ts` node processes, PPID 1, started 2026-08-04 and
  still running 3 days later** at 43-81% CPU each — load average 12 on 16
  cores before any worker launched, and the baseline suite was running at
  roughly a fifth of normal speed. Killed; PAPERCUTS entry added with the
  orient-time detection command. Worth repeating at every orient.

## 994 — [bounded MAIN worker, 2026-08-08] ISSUES #80 FULLY CLOSED: 3-frame submenu open delay landed — dense-a **392 → 395/395 byte-exact**, #80 entry deleted

- **State:** master at this entry's commit, clean. Typecheck + `npm run build`
  green, `npm run test:smoke` **347/347**, touched test files **48/48**
  (battlePartySelect 20/20 incl. the new 3-frame open-edge pin + visual bind
  11/11 + partySelect 17/17). Fast loop 920:965 **46/46** (was 43/46). Dense-a
  spec extended 923-925 (+3) → **395/395 byte-exact, twice-run**. Keep-green
  all held: party-menu-status-item-off **251/251**,
  mid-battle-switch-pacing-b-off **153/153**, battle-command-generated-off
  **128/128**. Full `npm test` NOT run (worker rule — supervisor after merge).
- **Did (per `docs/fade-layer-forensics.md` §10(d)):** the A-press edge sets
  `submenuOpen` (state rendered at 923), but oracle frames 923-925 still show
  the pre-open state — wide "Choose a POKéMON." 21x2 window + CANCEL button,
  no action window, no cursor — and the whole SHIFT/SUMMARY/CANCEL window +
  swapped 16x2 "Do what with this {PKMN}?" window pop together at 926, one
  frame, no animation. Measured at 923-925: the app-drawn extras are exactly
  the action-window frame+interior+3 labels+cursor (144,96)-(238,159) and the
  swapped message window (0,128)-(128,143), replacing the oracle's wide window
  (8,136)-(176,152) and CANCEL button; icon/left/right-column regions 0 diff.
  Added `SUBMENU_OPEN_VISUAL_DELAY = 3` + a `submenuOpenElapsed` counter
  (0 on the A-press edge, +1/tick while `submenuOpen`); the action window
  (`submenuWindowVisible`), the message-window swap, and the CANCEL pokeball
  suppression are now gated on it. The mon-icon +2 stall (`submenuOpened`) and
  the confirm-edge/close-fade are untouched — frames 926+ byte-identical.
  Tier-1 pin red-verified: neutralizing the delay to 0 fails the new test's
  pre-open loop (elapsed 0/1/2 render the open state, [74,74,107] at (141,140)
  vs white). Forced projection maps open submenu to `submenuOpenElapsed = 3`.
- **Next:** supervisor verify + full `npm test`. ISSUES #80 deleted in full —
  the last open item (this 3-frame edge) is closed; nothing else open.
- **Notes:** no PAPERCUTS. Commits `75bf7ce2` (the delay) + `dcef570d` (spec
  + pin) + this docs commit.

## 992 — [bounded MAIN worker, 2026-08-08] ISSUES #80 Class B LANDED (last open-fade defect): per-sprite draw-origin offsets — dense-a **341 → 354/354 byte-exact**, open window fully closed

- **State:** master `8a70a108`, clean. Typecheck + `npm run build` green,
  `npm run test:smoke` **347/347**; touched test files **37/37**
  (battlePartySelect 19/19 incl. the new Class B pin + inbattlePartyMenuVisualBind
  8/8 + factoryVoluntarySwitchSeam 10/10). Dense-a spec extended
  `766/768/770-780` (341 → **354 frames**), **354/354 twice-run byte-exact**
  (fast loop 763:781 **19/19**). Keep-green all held: party-menu-status-item-off
  **251/251**, mid-battle-switch-pacing-b-off **153/153**,
  battle-command-generated-off **128/128**. Full `npm test` NOT run (worker
  rule — supervisor after merge).
- **Did (per `docs/fade-layer-forensics.md` §9 RAM probe, re-measured fresh):**
  the player healthbox sprite's real `y2` steps 0→1 at oracle frame **770**
  (`openElapsed 7`) and the player back sprite's real `y2` steps 1→0 at frame
  **779** (`openElapsed 16`) — confirmed pixel-side that the oracle's shifted
  content = `settled(y−1)` in the box region, the newly-revealed top row 74 is
  the app's own floor (both byte-exact), and the slanted corner pixels come out
  right because the sprite's transparency travels with it. Applied as per-sprite
  **draw-origin** offsets (`healthboxShift +1` / `backSpriteShift −1`) gated on
  `openElapsed` inside `drawBattle2ActionMenuWindow` (threaded through
  `renderGeneratedBattleCommandPresentation` → `drawBattleScene[ObjOnly]` +
  `PartySelectCloseRenderAssets`), so both the full draw and the obj-only
  scratch carry the same offset and the Class A alpha-coverage composite guard
  still holds. Tier-1 pin: rendered settled action-menu scene — healthbox
  top-frame row at 74 at e=6 → 75 at e=7 (floor revealed above), back-sprite
  ear tip appears at (86,58) only at e=16; both constants pinned; **each
  red-verified independently** (neutralizing one shift fails its own
  assertions). Also swept up a latent stale pin: `factoryVoluntarySwitchSeam
  .test.ts` asserted 14/40 for the close fade while the constants landed 15/39
  earlier (prior worker missed it) — now aligned and green.
- **Next:** supervisor verify + full `npm test`; the last #80 item is the
  SEND OUT/SUMMARY/CANCEL submenu-window geometry (~4461px at 926-963, never
  spec-captured; a side lane is measuring it).
- **Notes:** the two prior row-shift attempts failed on the sprite's own
  boundary (27 bad pixels); drawing at the changed coordinate resolves them by
  construction. No PAPERCUTS.
