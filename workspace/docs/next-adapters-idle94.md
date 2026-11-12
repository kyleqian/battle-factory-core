# idle94 (S10A timing fidelity, 2026-10-11): the "accepted window starts after the ROM activation" convention, quantified and banked

Base: master `e3af65432` (production src `081a0570`). Evidence only, new files only. The production change is a TEMP PATCH
(`tools/integration/fixtures/idle94/idle94-lead-rows.diff`). It was applied only to git-archive copies of the base under the gitignored
scratch dir. Direct mGBA only (no shared oracle), with an explicit lab seed in every scenario. Every probe job ran twice in fresh
processes, r1 == r2 byte for byte (138 / 138 outputs, `receipts/probe-sha256.json`).

## 1. Results first

| Question | Answer | Evidence |
|---|---|---|
| How many live adapters start their accepted window after the activation? | **lead N > 0 on 100 of 552 adapter-sides (51 moves; Double Team and Faint Attack on their one known side), N = 1..19. The census covers them with 5,124 live commands and 29,798 lead frames.** N = 0 on 447. N < 0 on 2 (Bind -2, 26 commands). Unknown on 3 (no ledger row: Double Team opp, Rock Slide ply, Faint Attack opp; the other side is known: 1 / 0 / 4) | `fixtures/idle94/table/` (table.tsv: one row per adapter x side, with the source of every number) |
| Trail (ROM first inactive minus production end) | **-1 on 257 / 353 known sides**: production's last row IS the ROM's first inactive (cleanup) frame. 0 on 15. Other values on the rest (variants, multi-body ledgers, census-mode durations). 199 sides have no ROM first-inactive frame in any committed receipt | same |
| What does the ROM show on the N lead rows? | **The idle field with the fully printed "X used Y!" text, byte-identical to the frame before the activation and to window row 0 (production age 0), on 20 / 20 scenarios.** The ROM writes OAM / palette / IO during the lead rows (sprite gfx and palette loads, affine mode, blend setup), but none of it is visible. Bulk Up 3 / 2 / 3 rows, Taunt 9 / 8 / 9, Swagger 6 / 5 / 0..6, Scary Face 3 / 2 / 3, the lead-0 controls none | `receipts/compare-r1.json` (`leadRows`, `leadOamChanged` / `leadPalChanged` / `leadIoChanged`) |
| Does ordinary play keep the frame AFTER the body aligned? | **No. Each body loses L = pre + N + trail + post frames.** pre = activation - attackanimation = 3 and post = waitanimation release - first inactive = 2 on 20 / 20. Production starts the command where the ROM reaches `attackanimation`, and the next command starts D frames later. **Bulk Up 8, Swagger 12, Taunt 14, Scary Face 22, the lead-0 controls (Swords Dance, Agility) 4** (both sides, 2 species pairs, r1 == r2). Predictions matched 16 / 20. Scary Face was predicted 8: the ROM keeps the script active 14 more rows after production's last row, and they are static | `predictions.json` (committed `8452a157a` / `80f5c9700` before the probes), `receipts/compare-r1.json` |
| Are the lead rows reproducible from inputs production already has? | **Yes, for 40 of the 49 lead moves.** Their lead rows equal production's own age-0 frame (the ROM row it is accepted on), on both sides. Flamethrower's are NOT static (first change at A+8 of N = 15). 8 moves had no body in the template scenario (Recover / Milk Drink / Synthesis fail at full HP, Encore with no prior move, Thunder Punch / Spark vs a Ground target, Supersonic / Dynamic Punch missed): unproven, left out | `lead-scan/check-r1.json` (98 scenarios x2) |
| **BANKED temp patch** | `liveMoveIdleLeadRows` + `LIVE_MOVE_IDLE_LEAD_ROWS` (40 ids). A live move-animation command lasts D + N, and its effect age is max(0, elapsed - N): rows 0..N-1 show the age-0 frame, then the unchanged body. A Substitute-swap composite keeps 0 | `idle94-lead-rows.diff` (1 file, +25 / -5) |
| Patch proof | **Routes 8 / 8** (Bulk Up / Swagger / Taunt / Scary Face x player / opponent, census battles 154 / 398 / 3 / 6 / 286 / 165 / 6 / 24). Patched lead rows equal the base age-0 framebuffer (live, age 0). Patched row N+k equals base row k (sha, age, live) for every k. The next command's first row is equal. r1 == r2 in both trees. With the ROM's lead row == window row 0 (above) and that row's accepted 0 px dense proof, **the lead rows are 0 px by transitivity**. This is not a direct dense ROM-vs-production diff of the lab scenarios | `receipts/render-check.json` |
| Census delta (seeds 0..999, ten `--index-from` shards per tree) | **27,516 commands in both trees. The command KEY sequence and battleDigestExcludingFrames are identical (10 / 10 shards). 0 status changes (live 26,181 both). 3,842 commands moved by exactly +N** (3,835 live, plus 7 presentation-stage fallbacks: Castform-form Ember x6 and one Scary Face, which present the field for the adapter's duration). One Substitute-swap command stays at +0. Every other command is +0 (0 mismatches). **+20,853 frames** (3,959,685 -> 3,980,538). Largest movers: Bite +3,230, Psychic +3,100, Shadow Ball +2,410, Toxic +1,134 | `census-delta.json`, `census-base-summary.json`, `census-patched-digests.json` |
| Test pins the patch moves | **30 tests in 16 files**, all ordinary-route age / row sequences of lead moves, e.g. Bulk Up `expected [ Array(108) ] to deeply equal [ Array(104) ]`. One more failure is environment-only (below). Patched copy: 17 files / 31 tests failed, 1,604 files / 13,277 tests passed | `pins.json` |

**Flagged for the supervisor (out of this step, not investigated further):**

- **STATS_CHANGE.** Production's `stat` command lasts 2 frames (`STAT_TIMING`). The ROM plays `General_StatsChange` for 75 active frames: Bulk Up
  PRIMEAPE ON f179..254, and also with Battle Scene OFF (f102..177, with screen changes f109..167). On every stat-change event the ordinary
  timeline is about 80 frames short in both scene modes, more than the lead.
- **Scene OFF status moves.** The ROM's `attackanimation` -> `BattleScript_Pausex20` -> `waitanimation` span is 35 frames (20 / 20).
  Production's OFF route has no command for it when there is no hit receipt (`battleResolutionPresentation.ts`: "An attack receipt
  without a hit receipt ... continue"). Route b154 OFF goes "HERACROSS used BULK UP!" (24 frames) -> `stat` directly.

## 2. Mechanism (source + ROM)

`Cmd_attackanimation` (`battle_script_commands.c:1743`) runs one frame after the script reaches it (F_att). It emits the controller's
move animation, and `gAnimScriptActive` rises 3 frames after F_att (A). The script waits on `waitanimation` (X+1) and reaches X+2 two frames
after the first inactive frame E (F_after = E + 2). With Battle Scene OFF the same byte pushes `BattleScript_Pausex20` (`pause
B_WAIT_TIME_SHORT`), so F_after - F_att = 1 + 32 + 1 + 1 = 35.

Production (`battleResolutionPresentation.ts` MOVE_ANIMATION): the move-animation command directly follows the "used X!" message
command. Its 24 frames equal the ROM's printstring -> F_att span (route b154). Production age 0 is therefore displayed on the frame
equivalent to F_att, and the ROM image it shows there is row A+N. The command lasts D (`liveMoveAnimationDuration`), so the next command
starts at F_att + D, against the ROM's F_after. The screen from the last "used X!" glyph through A+N is a single image (20 / 20:
F_att..A+N all one sha). That is why every displayed image is still a ROM image while the timeline is short.

| Move (both sides, 2 species pairs) | N | D | E - A | pre | post | trail | L = frames lost per body | lead rows |
|---|---|---|---|---|---|---|---|---|
| Bulk Up 339 (PRIMEAPE-ONIX, HERACROSS-SNORLAX) | 4 | 104 | 107 | 3 | 2 | -1 | **8** | static x4 |
| Swagger 207 (HYPNO-ONIX, PERSIAN-SNORLAX) | 7 | 161 | 168 | 3 | 2 | 0 | **12** | static x4 |
| Taunt 269 (MURKROW-SHUCKLE, MURKROW-SNORLAX) | 10 | 125 | 134 | 3 | 2 | -1 | **14** | static x4 |
| Scary Face 184 (RHYHORN-SHUCKLE, PUPITAR-SNORLAX) | 4 | 190 | 207 | 3 | 2 | 13 | **22** | static x4 |
| controls: Swords Dance 14 / Agility 97 (SCYTHER / DODRIO vs ONIX) | 0 | 70 / 87 | 69 / 86 | 3 | 2 | -1 | **4** | (none) |

ROM rows after production's last row up to F_after: static (equal to production's last row) on 16 / 20. Swagger's 2 rows are not static
(trail 0: production does not show the cleanup row).

## 3. FOLD INSTRUCTIONS

1. Apply `tools/integration/fixtures/idle94/idle94-lead-rows.diff` (from the repo top: `patch -p1 < workspace/tools/...diff`; `git apply` run
   from inside the tree silently skips it). Rerun `sh tools/integration/idle94Run.sh <fresh-out-dir> --census` on the fold's base: every
   receipt must be SAME. On a newer base, regenerate the table / census and expect only the census columns to move.
2. Move the pins listed in section 4. Each moves by exactly +N frames for the 40 ids, and nothing else moves.
3. Follow-ups, measured here but not banked:
   - **pre (3 rows)**: equally reproducible. F_att..A-1 is the same static image on 20 / 20 scenarios, 6 moves, both sides, and it applies to
     EVERY live body (lead 0 included). This needs the same mechanism with N + 3 (a universal +3 per live body), but first prove it on a
     damaging move: the hit-animation path has its own `1 + interveningInstructions` accounting.
   - **post + trail (+1 for trail -1)**: the tail rows equal production's last row on 16 / 20. Swagger (trail 0) and Scary Face (14 static active
     rows) need per-move tails.
   - Flamethrower (lead rows not static), the 8 unproven lead moves (stage a scenario where the move lands), Bind (-2), and the 3 sides without
     a ledger row.
   - The two flagged timeline gaps above (STATS_CHANGE, OFF status pause) are larger than the lead. They are main-lane timing questions.

## 4. Pins the patch moves

Patched copy (`git archive e3af65432` + the diff), `npm test`: **17 files / 31 tests failed, 1,604 files / 13,277 tests passed**
(44 / 223 skipped). Each of the 30 pins asserts a lead move's ordinary-route per-row age sequence `[0..D-1]` (or its row count).
After the fold they become `[0 x (N+1), 1..D-1]` (N + D rows). They are listed in `tools/integration/fixtures/idle94/pins.json`, which
also gives each assertion's first line:

- `tests/animation/liveAnchor2MoveAdapters.test.ts` (1): completes ordinary 'TAIL_GLOW' and preserves ON/OFF rules and RNG
- `tests/animation/liveAnchor3MoveAdapters.test.ts` (2): completes ordinary 'BULK_UP' and preserves ON/OFF rules and RNG; completes ordinary 'SWAGGER' and preserves ON/OFF rules and RNG
- `tests/animation/liveAnchorMoveAdapters.test.ts` (7): completes ordinary 'ACID' and preserves ON/OFF rules and RNG; completes ordinary 'HARDEN' and preserves ON/OFF rules and RNG; completes ordinary 'IRON_DEFENSE' and preserves ON/OFF rules and RNG; completes ordinary 'METAL_CLAW' and preserves ON/OFF rules and RNG; completes ordinary 'SLUDGE' and preserves ON/OFF rules and RNG; completes ordinary 'SLUDGE_BOMB' and preserves ON/OFF rules and RNG; completes ordinary 'WATER_GUN' and preserves ON/OFF rules and RNG
- `tests/animation/liveHBufferS1MoveAdapters.test.ts` (1): completes ordinary 'DRAGON_BREATH' and preserves ON/OFF rules and RNG
- `tests/animation/liveNext5MoveAdapters.test.ts` (2): completes ordinary 'DIZZY_PUNCH' and preserves ON/OFF rules and RNG; completes ordinary 'SCARY_FACE' and preserves ON/OFF rules and RNG
- `tests/animation/liveOrderConsumerMoveAdapters.test.ts` (4): plays ordinary BLAZE_KICK (seed 322, streak 28, slot 0, BLAZIKEN) with the adapter active every age; plays ordinary DRAGON_RAGE (seed 37, streak 14, slot 3, CHARMELEON) with the adapter active every age; plays ordinary EMBER (seed 4, streak 7, slot 1, MAGCARGO) with the adapter active every age; renders Blaze Kick as a LATER body after a modelled opponent Sunny Day (seed 43, streak 28, slot 0)
- `tests/animation/livePhysical2bMoveAdapters.test.ts` (1): reaches and completes ordinary 'RAZOR_LEAF' requests with ON/OFF state and RNG parity
- `tests/animation/livePhysical2cMoveAdapters.test.ts` (2): completes ordinary 'COVET' and preserves ON/OFF rules and RNG; restarts Super Fang and Covet through complete fresh bodies on consecutive commands
- `tests/animation/livePrep2MoveAdapters.test.ts` (2): Explosion: the body ages with the attacker at HP 0, then the replacement screen is the documented boundary; completes ordinary 'FUTURE_SIGHT' and preserves ON/OFF rules and RNG
- `tests/animation/livePrep5MoveAdapters.test.ts` (1): completes ordinary 'TAUNT' and preserves ON/OFF rules and RNG
- `tests/animation/livePrep6MoveAdapters.test.ts` (2): completes ordinary 'KNOCK_OFF' and preserves ON/OFF rules and RNG; completes ordinary 'SELF_DESTRUCT' and preserves ON/OFF rules and RNG
- `tests/animation/livePrep7MoveAdapters.test.ts` (1): completes ordinary 'FAKE_TEARS' and preserves ON/OFF rules and RNG
- `tests/animation/livePrep9MoveAdapters.test.ts` (1): completes ordinary 'ABSORB' and preserves ON/OFF rules and RNG
- `tests/animation/liveStatusMoveAdapters.test.ts` (1): restarts a legal generated Confusion command with the current displayed field
- `tests/playableAnimationIntegration.test.ts` (1): renders both opponent damaging and no-hit moves from generated command input through cleanup
- `tests/playableContactAnimationLifecycle.test.ts` (1): renders each Twineedle hit, then KO/replacement before the next target's hits

Environment-only, NOT a pin: `tests/appDifferential.test.ts > app-differential CLI guards > reports a missing trace before creating
a worktree`. The patched copy carried a local one-commit `git init` (used to cut the diff), so `--base 'HEAD^'` does not name a commit.
The plain HEAD archive copy passes it.

## 4b. Gates (evidence only)

- `npm test` in a git-archive copy of `68d402eac`: **1,621 files / 13,308 tests passed** (44 / 223 skipped), 0 failed. `npm run build` is
  green in an archive copy of `cbea478da`; later commits change only docs and fixtures. `git diff --check` is clean at every commit.
  `git status --short` listed only the new idle94 files.
- `sh tools/integration/idle94Run.sh <fresh>` (no census) in a fresh dir: **ALL SAME** (scenarios, scenario index, lead-scan scenarios,
  table lead column, 40 / 40 + 98 / 98 probe jobs r1 == r2, 138 / 138 outputs == the committed sha256, compare, lead-scan check, 8 / 8
  routes, render check). The census (`--census`) was run by hand on both trees with the runner's exact commands (section 1 numbers).
- **Run `npm test` in an archive copy ONLY after giving the copy its own git repo** (`git init` at the copy's top, plus two commits so
  `HEAD^` exists). Scratch copies live inside the main repo's tree, so without that, git discovery climbs to the LIVE repo.
  `tests/codexLauncherProfiles.test.ts` (it drives the launchers with `cwd: process.cwd()`) then created a nested
  `workspace/.git` in the live checkout at 00:31:48. That turned every git command in workspace/ into a one-commit `main` repo. idle94
  removed it right away (it held only idle94's own pins commit, which was redone on master as `68d402eac`). The isolated rerun left the
  checkout untouched.

## 5. Reproduction (from workspace/)

```
sh tools/integration/idle94Run.sh <fresh-out-dir-inside-the-repo>            # ~6 min: archive copies, staging, table lead column,
                                                                             # 276 probe jobs (r1 == r2), compare, lead scan, routes
sh tools/integration/idle94Run.sh <fresh-out-dir-inside-the-repo> --census   # + both censuses (~6 min more), full table, census delta
# pieces:
python3 tools/integration/idle94Table.py <out> [<census-merged.jsonl>]
python3 tools/integration/idle94Stage.py <dir>; python3 tools/integration/idle94LeadScan.py stage|check ...
python3 tools/run-mgba-probe.py <o.json> -- <mgba-venv python> tools/integration/idle94Probe.py <scenario> on|off <o.json>
python3 tools/integration/idle94Compare.py <probe-dir> <out.json>
node --experimental-strip-types --no-warnings tools/integration/idle94Route.ts --seed=154 --streak=28 --scene=on|off --out=<f>
node --experimental-strip-types --no-warnings tools/integration/idle94RouteRender.ts --seed=N --streak=N --move=M --side=S --out=<f>
python3 tools/integration/idle94RenderCheck.py <render-dir> tools/integration/fixtures/idle94/render-routes.txt <out.json>
python3 tools/integration/idle94CensusDelta.py <base-shards> <patched-shards> tools/integration/fixtures/idle94/idle94-lead-rows.diff <out.json>
```

Files: `tools/integration/idle94{Table,Stage,Probe,Compare,LeadScan,RenderCheck,CensusDelta}.py`, `idle94{Route,RouteRender}.ts`,
`idle94Run.sh`. Fixtures `tools/integration/fixtures/idle94/`: `table/`, `scenarios/` (20) + `scenario-index.json`, `predictions.json`,
`lead-scan/` (98 scenarios + check), `receipts/` (compare, render check, probe sha256), `idle94-lead-rows.diff`, `census-*.json`,
`render-routes.txt`, `.gitattributes`.
