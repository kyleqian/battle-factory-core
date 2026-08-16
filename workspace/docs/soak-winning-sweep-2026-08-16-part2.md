# Winning-policy soak sweep — part 2 (2026-08-16)

Continues the sweep started in part 1 (`docs/soak-winning-sweep-2026-08-16.md`,
committed on the unmerged branch `worker/side-20260816-113210` — not present
in this worktree; read it with `git show
worker/side-20260816-113210:workspace/docs/soak-winning-sweep-2026-08-16.md`).
Part 1 covered `--policy winning --seeds 0:60`: 59/60 OK, 0 CRASH, 1 HANG
(seed 49). It root-caused the HANG as a driver budget artifact, not an engine
stall — `DEFAULT_RUN_OPTIONS.maxFrames` (600,000) was sized against
`full`/`vanilla`'s single-round depth (ISSUES #90), but `winning` chains
multiple complete rounds, so honest seeds can exceed it. Seed 49 resolves
cleanly at frame 693,051 (`roundLost`) with `--max-frames 800000`. Part 1 left
the budget fix and the `60:120` extension for a follow-up session with a wider
data set to size the new default from — this doc is that follow-up.

Run in 10-seed chunks (`npm run soak -- --policy winning --seeds A:B
--max-frames 1200000`) to stay under this session's per-command time cap;
results are byte-identical to what a single wider-range invocation would
produce (the driver is seeded per-seed and stateless across seeds).
`--max-frames 1200000` was chosen up front as a generous ceiling so this
sweep's own numbers wouldn't be truncated by the same undersized-budget
problem it's sizing a fix for.

## Range 60:100 — 40/40 OK, 0 CRASH, 0 HANG

```
seed   60  OK     b1 t21   20098f  2.7s  roundLost
seed   61  OK     b1 t10  212883f  30.2s  roundLost
seed   62  OK     b1 t44   33036f  4.6s  roundLost
seed   63  OK     b5 t25   78384f  10.7s  roundLost
seed   64  OK     b6 t12  226390f  32.6s  roundLost
seed   65  OK     b7 t15  146781f  20.1s  roundComplete
seed   66  OK     b2 t10  102123f  14.3s  roundLost
seed   67  OK     b1 t22  112107f  15.5s  roundLost
seed   68  OK     b1 t17   53681f  7.1s  roundLost
seed   69  OK     b2 t22  580384f  84.4s  roundLost
=== chunk 60:70: OK 10  CRASH 0  HANG 0 ===

seed   70  OK     b1 t15  162397f  23.7s  roundLost
seed   71  OK     b2 t19  197464f  28.2s  roundLost
seed   72  OK     b3 t18  118142f  16.5s  roundLost
seed   73  OK     b3 t27   48914f  6.8s  roundLost
seed   74  OK     b1 t22  109302f  15.9s  roundLost
seed   75  OK     b7 t19   72113f  10.6s  roundLost
seed   76  OK     b1 t17   34801f  4.9s  roundLost
seed   77  OK     b3 t33   96107f  13.4s  roundLost
seed   78  OK     b2 t17  191958f  27.5s  roundLost
seed   79  OK     b1 t19  146325f  19.7s  roundLost
=== chunk 70:80: OK 10  CRASH 0  HANG 0 ===

seed   80  OK     b2 t23   32286f  4.6s  roundLost
seed   81  OK     b1 t39   33049f  4.4s  roundLost
seed   82  OK     b3 t24  213448f  29.6s  roundLost
seed   83  OK     b3 t26  166228f  23.2s  roundLost
seed   84  OK     b3 t13  360709f  51.3s  roundLost
seed   85  OK     b1 t18   81775f  11.4s  roundLost
seed   86  OK     b7 t17  230631f  33.1s  roundComplete
seed   87  OK     b1 t14  141312f  20.2s  roundLost
seed   88  OK     b7 t22  175948f  25.6s  roundComplete
seed   89  OK     b5 t17  160862f  23.1s  roundLost
=== chunk 80:90: OK 10  CRASH 0  HANG 0 ===

seed   90  OK     b5 t20  126532f  19.0s  roundLost
seed   91  OK     b4 t25   61517f  8.7s  roundLost
seed   92  OK     b3 t7  114913f  16.4s  roundLost
seed   93  OK     b6 t27  118166f  16.9s  roundLost
seed   94  OK     b7 t25  211110f  29.8s  roundComplete
seed   95  OK     b6 t20   99468f  14.3s  roundLost
seed   96  OK     b6 t19   78642f  10.7s  roundLost
seed   97  OK     b4 t14  162935f  22.3s  roundLost
seed   98  OK     b1 t21   19611f  2.4s  roundLost
seed   99  OK     b1 t37  398765f  56.7s  roundLost
=== chunk 90:100: OK 10  CRASH 0  HANG 0 ===
```

| outcome | count |
| --- | --- |
| OK — `roundLost` | 36 |
| OK — `roundComplete` (full 7-win streak) | 4 (seeds 65, 86, 88, 94) |
| HANG | 0 |
| CRASH | 0 |

Max frame count observed in this range: **580,384** (seed 69) — still under
the old flat 600,000 default, so nothing here would have HANGed even at the
pre-fix budget. Wall clock: ~815s (~13.6 min) across the four chunks.

## Range 100:120 — 19/20 OK, 1 CRASH, 0 HANG

Part 1's stated extension condition ("if goal 1 finishes with ≥20 min of cap
left, extend 100:120") was met (60:100 finished clean with the large majority
of this session's cap remaining), so the sweep continued.

```
seed  100  OK     b1 t15  173527f  25.9s  roundLost
seed  101  OK     b2 t15   67350f  9.5s  roundLost
seed  102  OK     b7 t21   82968f  11.2s  roundComplete
seed  103  OK     b4 t16  102044f  13.7s  roundLost
seed  104  OK     b1 t21   20184f  2.4s  roundLost
seed  105  OK     b5 t7  158226f  21.1s  roundLost
seed  106  OK     b3 t12  124716f  16.1s  roundLost
seed  107  OK     b7 t10   68621f  8.9s  roundComplete
seed  108  OK     b4 t23  155953f  20.7s  roundLost
seed  109  CRASH  b2 t5   81000f  11.3s  [engine/render] Error: battle resolution HP command starts at 22, displayed 11
=== chunk 100:110: OK 9  CRASH 1  HANG 0 ===

seed  110  OK     b1 t16  182316f  25.1s  roundLost
seed  111  OK     b1 t54   34800f  4.7s  roundLost
seed  112  OK     b2 t14  107389f  14.9s  roundLost
seed  113  OK     b4 t12   43006f  5.8s  roundLost
seed  114  OK     b1 t20  246976f  33.8s  roundLost
seed  115  OK     b4 t25  141014f  19.3s  roundLost
seed  116  OK     b1 t18  169514f  22.9s  roundLost
seed  117  OK     b2 t13  126830f  16.8s  roundLost
seed  118  OK     b5 t14  315066f  44.0s  roundLost
seed  119  OK     b3 t26  161035f  22.4s  roundLost
=== chunk 110:120: OK 10  CRASH 0  HANG 0 ===
```

| outcome | count |
| --- | --- |
| OK — `roundLost` | 17 |
| OK — `roundComplete` (full 7-win streak) | 2 (seeds 102, 107) |
| HANG | 0 |
| CRASH | 1 (seed 109) |

Max frame count observed among the 19 OK seeds in this range: **315,066**
(seed 118) — the crash cut seed 109 off early (81,000f) so it isn't a
frame-budget data point. Wall clock: ~350s (~5.8 min) across the two chunks.

### Triage — signature: `battle resolution HP command starts at #, displayed #` (seed 109)

**Genuine engine bug, not a driver/budget artifact.** Reported per this
step's policy (engine `src/**` bugs: report, do not fix).

```
seed  109  CRASH  b2 t5   81000f  11.8s  [engine/render] Error: battle resolution HP command starts at 22, displayed 11
    createBattleResolutionPresentationRenderView (src/engine/battleResolutionPresentationRender.ts:1098)
    renderBattleResolutionPresentation (src/engine/battleResolutionPresentationRender.ts:1358)
    renderWithoutFactoryTerminal (src/engine/core.ts:3112)
```

The throw site (`src/engine/battleResolutionPresentationRender.ts:1095-1101`)
is an invariant check inside the resolution-message renderer: an `"hp"`
presentation command carries the HP value (`command.from`) the renderer
expects the target battler to currently be displaying, and asserts it against
the live `battler.hp` before animating the drain. At seed 109 battle 2 turn
5, the command expects HP 22 but the battler is already at 11 — i.e. some
earlier step in the resolution queue silently applied (or skipped) an HP
change the queued `"hp"` command didn't account for, so the two go out of
sync. The last ~50 actions before the crash (`--verbose`) are an unremarkable
forced-party sequence (multiple faints → forced replacements → confirm
send-out) followed by a long run of ordinary `resolution advance` steps —
nothing looks like invalid/illegal input from the driver side.

**Policy-specific:** seed 109 does *not* crash under `full` or `vanilla`
(both resolve cleanly — see below), only under `winning`. Since all three
policies share the same tick/render engine, this only means `winning`'s
distinct fight-move/switch choices route seed 109's RNG stream through a
resolution sequence (likely the specific run of forced-replacement faints
into a multi-hit or multi-target move) that `full`/`vanilla`'s different
choices don't happen to reach — it is not evidence the bug is `winning`-only
in the engine.

```sh
npm run soak -- --policy full --seed 109 --max-frames 1200000
# seed  109  OK     b1 t35   27174f  3.7s  roundLost
npm run soak -- --policy vanilla --seed 109 --max-frames 1200000
# seed  109  OK     b6 t15  167039f  23.4s  roundLost
```

**Suspected owner:** `src/engine/battleResolutionPresentationRender.ts`
(resolution-message HP-command construction vs. consumption — the mismatch
means whatever built the `"hp"` command queue and whatever mutated
`battler.hp` in between disagree about the battler's HP at that point in the
sequence; likely `src/engine/factoryRoundBattleOrchestrator.ts`'s resolution
receipt/command-building path, not the renderer itself, which is just the
consumer that caught the inconsistency).

**Minimal repro:**
```sh
npm run soak -- --policy winning --seed 109 --verbose
```
Deterministic (reproduces identically across reruns; confirmed twice above).
Not fixed in this session — out of scope (`src/**`, "engine bugs: report, do
not fix").

## Combined 60:120 summary

| range | OK | CRASH | HANG |
| --- | --- | --- | --- |
| 60:100 | 40/40 | 0 | 0 |
| 100:120 | 19/20 | 1 | 0 |
| **60:120 total** | **59/60** | **1** | **0** |

No HANG anywhere in 60:120 at the `--max-frames 1200000` ceiling used for
this sweep — every completed seed settled well under it. Combined with part
1's 0:60 range (59/60 OK, 0 CRASH, 1 HANG — seed 49, root-caused to the
budget, not a stall), the full `0:120` picture is:

| range | OK | CRASH | HANG | max observed frames (non-crash) |
| --- | --- | --- | --- | --- |
| 0:60 (part 1) | 59/60 | 0 | 1 (seed 49, budget artifact) | 693,051 (seed 49, re-verified at `--max-frames 800000`) |
| 60:120 (part 2) | 59/60 | 1 (seed 109, engine bug) | 0 | 580,384 (seed 69) |
| **0:120 total** | **118/120** | **1** | **1 (resolved by this session's fix)** | **693,051** |

## The fix: per-policy default `maxFrames`

`tools/soak/randomRoundSoakDriver.ts` gains an exported
`DEFAULT_MAX_FRAMES_BY_POLICY` map and a `resolveMaxFrames(policy, explicit?)`
helper:

```ts
export const DEFAULT_MAX_FRAMES_BY_POLICY: Record<SoakPolicy, number> = {
  full: 600_000,
  vanilla: 600_000,
  winning: 1_000_000,
};

export function resolveMaxFrames(policy: SoakPolicy, explicit?: number): number {
  return explicit ?? DEFAULT_MAX_FRAMES_BY_POLICY[policy] ?? DEFAULT_RUN_OPTIONS.maxFrames;
}
```

`runSeed()` now resolves `maxFrames` through `resolveMaxFrames(policy,
optionsIn.maxFrames)` instead of always falling back to the flat
`DEFAULT_RUN_OPTIONS.maxFrames`; the CLI (`tools/soak/randomRoundSoak.ts`)
does the same, so an explicit `--max-frames` flag still overrides, but
omitting it now picks the policy's own default instead of a single global
one.

**Why 1,000,000 for `winning`:** the highest per-seed frame count observed
across the full `0:120` sweep (part 1 + part 2, 120 seeds, 1 driver-config
HANG and 1 unrelated engine CRASH aside) is **693,051** (seed 49). Both parts
of the sweep used a `--max-frames` ceiling of 800,000 / 1,200,000
respectively specifically so no seed's natural completion frame would be
truncated by the number this fix is trying to size — no seed came close to
either ceiling except the already-identified seed 49. `1,000,000` keeps
~44% headroom over that observed max (`1,000,000 / 693,051 ≈ 1.443`), in
the same proportional range as the existing `full`/`vanilla` precedent
(`600,000` was set at ~51% headroom over `full`'s then-deepest observed seed,
398,088 — ISSUES #90). `full`/`vanilla` keep their existing `600,000`
default unchanged (per this step's instruction, and because neither policy
chains rounds the way `winning` does, so their genuine-hang detection stays
exactly as sharp as before).

**Why per-policy instead of one bigger global default:** `full`/`vanilla`
soak a single round each; a seed that doesn't finish in 600,000 frames under
those policies is still a meaningful HANG signal (ISSUES #90's basis).
Raising the global default to cover `winning`'s multi-round chaining would
silently blunt that signal for the two single-round policies instead of
fixing the actual mismatch.

## Proof reruns (no `--max-frames` flag, new default in effect)

Seed 49 (the part-1 HANG) and every seed in this part's `60:120` sweep that
exceeded 600,000 frames — only seed 49 itself did (the deepest `60:120`
completion, seed 69, settled at 580,384, still under the old default) — both
resolve OK with no explicit budget flag, using the new `winning` default of
1,000,000:

```
$ npm run soak -- --policy winning --seed 49
seed   49  OK     b3 t16  693051f  100.2s  roundLost
=== soak summary: 1 seeds (policy winning) in 100.2s ===
OK 1  CRASH 0  HANG 0
```

Sanity check that `full`/`vanilla` are unaffected (still default to
600,000, still OK for ordinary seeds):

```
$ npm run soak -- --policy full --seeds 0:3
seed    0  OK     b6 t26  132940f  21.1s  roundLost
seed    1  OK     b1 t77  199114f  37.3s  roundLost
seed    2  OK     b1 t21   20451f  2.7s  roundLost
OK 3  CRASH 0  HANG 0

$ npm run soak -- --policy vanilla --seeds 0:3
seed    0  OK     b5 t13  226630f  33.3s  roundLost
seed    1  OK     b1 t16   16968f  2.2s  roundLost
seed    2  OK     b1 t28   26732f  3.6s  roundLost
OK 3  CRASH 0  HANG 0
```

## Tier-1 pin

`tests/randomRoundSoak.test.ts` gains `"ISSUES #92: winning gets a larger
default frame budget than full/vanilla"`, pinning `resolveMaxFrames`'s
resolved default for each policy (`full`/`vanilla` → 600,000, `winning` →
1,000,000, greater than the observed 693,051 max) and that an explicit
`maxFrames` always overrides the policy default.

## Proposed ISSUES entry (text only — supervisor files it; suggested next
number `#93` since `#92` was proposed by part 1 for the now-fixed HANG)

> ## #93 — winning-policy soak: seed 109 battle-resolution HP-command
> desync (`battle resolution HP command starts at #, displayed #`)
>
> `--policy winning --seed 109` (2026-08-16 sweep part 2,
> `docs/soak-winning-sweep-2026-08-16-part2.md`) throws inside
> `createBattleResolutionPresentationRenderView`
> (`src/engine/battleResolutionPresentationRender.ts:1098`) at battle 2 turn
> 5, frame 81,000: a queued resolution `"hp"` presentation command expects
> the target battler to be displaying HP 22, but it's already at 11 — some
> earlier step in the resolution sequence changed the battler's HP without
> the queued command accounting for it. Deterministic
> (`npm run soak -- --policy winning --seed 109 --verbose`). Does not
> reproduce under `full` or `vanilla` at the same seed — likely because
> `winning`'s distinct fight-move/switch choices route seed 109's RNG stream
> through a resolution sequence (forced-replacement faints into some
> multi-step move) the other two policies' choices don't happen to reach,
> not evidence the underlying bug is `winning`-specific. Suspected owner:
> the resolution receipt/command-building path in
> `src/engine/factoryRoundBattleOrchestrator.ts` (the renderer is just the
> consumer that caught the inconsistency). Not fixed — `src/**` engine bug,
> out of scope for a `tools/soak/**` session.

## Verification

`npm run typecheck`, `npm run test:smoke`, and the full `tests/
randomRoundSoak.test.ts` file are green after the fix (see final commit
message for the full-suite + build confirmation). `npm run soak -- --policy
winning --seed 49` (no `--max-frames` flag) now resolves `OK` under the new
default, proving the fix closes the part-1 HANG finding.
