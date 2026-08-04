# battleScene.ts TurnN-handoff type-ref retirement design

> **PROGRAM COMPLETE (2026-08-04, supervisor-verified).** All §4.1 slices are
> landed and merged; `rg -c 'CompletedResolutionNextCommandHandoff'
> src/engine/battleScene.ts src/engine/battleMenu.ts` returns zero matches in
> both. Slice-by-slice commits and the slice-8 audit record live in ISSUES
> #39's typeref block (and git history). This doc is retained as the design
> record; its counts describe the 2026-08-02 base, not the current tree.

Status: census taken at base sha `68718a2a` (2026-08-02), against
`src/engine/battleScene.ts` at 34,558 LOC. Design-only: no production file is
touched by this doc, and every count below is reproduced by a named command
run at that sha. This is the follow-up the dispatcher-ladder slice 10 session
(PROGRESS-archive entry 871) reported as an honest scope gap: slice 10 cut
the outer `drawFightSubmenuWindow`/`currentPPForActiveMon` 13-parameter ABI
to zero, but **144** `TurnNCompletedResolutionNextCommandHandoff` type refs
remain live inside `battleScene.ts`'s own per-turn draw functions — the
"named content-routing blocker" the dispatcher design doc's own "Named
content-routing blocker" section already flagged as a separate, unfinished
problem from the ABI slice 10 closed.

**CONCURRENCY WARNING (from the brief) — RESOLVED, 2026-08-03.** The main
lane was actively landing species-dossier slices against `battleScene.ts`
when this doc was first written (families A/B/C/D/E/F/G/H,
`docs/species-render-entry-point-retirement-design.md`). At this base sha,
species-dossier slices 1, 2, and 5 were already landed (family C healthbox
factories; family D turn-15 Onix gate cluster + family H party literal —
PROGRESS entries 874/875). Slices 3 (family A HP-drain), 4 (capstone
`renderSceneOffTurnView`), and 7 (family B Sitrus wrappers) were still open
and gated at that time. **That program has since closed entirely**
(PROGRESS-archive entry 888, all 7 slices landed) — the gating in §5 items
1-2 below is now moot, marked resolved in place. Every citation below is by
symbol name; re-grep line numbers at execution time, they will have
drifted (confirmed drifted already — see §1.3's fresh line numbers).

**2026-08-03 RE-SCOPE STATUS.** Slice 1 landed exactly as designed
(PROGRESS-archive entry 889: `battleScene.ts` 152→80 refs,
`compare:differential` 49 traces / 7,466 captures byte-identical). The
same session found slice 2 (§4 row 2, "Family P+Q turn1-4 fold")
under-scoped — changing Family Q's signature forces simultaneous edits
across 9+ differently-shaped Family R call sites — and did not land it.
**This session re-scopes the remaining work.** §1.3 re-confirms the
census at current HEAD (unchanged at 80, zero drift). §4 keeps the
original plan intact for the historical record, with rows 2-5 marked
superseded. **§4.1 is the current plan (slices 2-8, a staged-adapter/shim
sequenced by call-site cluster); §4.2 is the Q↔R call-site map that
grounds it.**

## 1. Census

### 1.1 Method (exact, reproducible)

```sh
# Total refs, both files (battleMenu.ts is the slice-10 acceptance surface
# that's already at 0; battleScene.ts is what's still open):
rg -c 'CompletedResolutionNextCommandHandoff' src/engine/battleScene.ts src/engine/battleMenu.ts

# Per-turn breakdown of the *type* refs only (excludes the 8 lowercase
# `turnNCompletedResolutionNextCommandHandoffFromLatest` function refs, which
# are compatibility-fn calls, not type usage):
rg -n -o 'Turn([0-9]+)CompletedResolutionNextCommandHandoff' src/engine/battleScene.ts \
  | sed -E 's/^[0-9]+://' | sort | uniq -c | sort -k2 -V

# Per-owning-function breakdown (import-block refs excluded, classified
# separately) — the script below is the exact method used for every count
# in §1.2; it walks the file once, tracks the nearest preceding top-level
# `function`/`export function` declaration as "owner", and separately
# tracks import-statement line ranges so multi-line `import { ... } from`
# blocks (this file has several, not just one at the top) are never
# misattributed to the function textually above them:
python3 - <<'PYEOF'
import re
from collections import defaultdict
with open('src/engine/battleScene.ts') as f:
    lines = f.readlines()
fn_decls = [(i, re.match(r'^(export )?function ([A-Za-z0-9_]+)', l).group(2))
            for i, l in enumerate(lines, 1)
            if re.match(r'^(export )?function [A-Za-z0-9_]+', l)]
refs = [(i, int(t)) for i, l in enumerate(lines, 1)
        for t in re.findall(r'Turn([0-9]+)CompletedResolutionNextCommandHandoff', l)]
import_ranges, in_import, start = [], False, None
for i, l in enumerate(lines, 1):
    s = l.strip()
    if not in_import and s.startswith('import '):
        (import_ranges.append((i, i)) if s.endswith(';') else (globals().__setitem__('x',0), import_ranges, None))
        if not s.endswith(';'):
            in_import, start = True, i
    elif in_import and s.endswith(';'):
        import_ranges.append((start, i)); in_import = False
in_imp = lambda ln: any(a <= ln <= b for a, b in import_ranges)
nonimport = [r for r in refs if not in_imp(r[0])]
fn_lines = [x[0] for x in fn_decls]
import bisect
buckets = defaultdict(lambda: defaultdict(int)); decl_of = {}
for ln, turn in nonimport:
    idx = bisect.bisect_right(fn_lines, ln) - 1
    owner = fn_decls[idx][1]; decl_of[owner] = fn_decls[idx][0]
    buckets[owner][turn] += 1
total = 0
for owner in sorted(buckets, key=lambda o: decl_of[o]):
    turns = buckets[owner]; n = sum(turns.values()); total += n
    tl = ",".join(f"T{k}x{v}" if v > 1 else f"T{k}" for k, v in sorted(turns.items()))
    print(f"{owner} (L{decl_of[owner]}): {n} [{tl}]")
print("non-import total:", total, "| import-block refs:", len(refs) - len(nonimport))
PYEOF
```

Run at base sha, this produces (verified, both totals cross-check against
PROGRESS-archive entry 871's own independently-derived total exactly):

- `battleScene.ts`: **144** refs. `battleMenu.ts`: **0** refs (unchanged
  since slice 10 — confirms the acceptance bullet's `battleMenu.ts` half is
  still satisfied and nothing since 871 has regressed it).
- Per-turn: T1 17, T2 17, T3 18, T4 20, T5 12, T6 11, T7 10, T8 9, T9 8, T10
  7, T11 6, T12 5, T13 4 — **sum 144**, matching entry 871 verbatim. This
  means none of the species-dossier slices landed since 871 (874, 875)
  touched this surface at all — the two programs are disjoint at the file-
  content level even though they share the file.
- Of the 144: **13** are import-block `type`/`import type` declarations
  (7 lines `import type { TurnNCompletedResolutionNextCommandHandoff } from
  "./turnNResolutionAdapter.ts"` for N=6..12, plus 6 more `type TurnN...,`
  entries folded into larger multi-symbol import blocks for N=1..5,13). These
  import lines are legitimate today — every one has at least one real
  consumer below — and retire automatically as their last consuming family
  retires (tracked per-slice in §4, not deleted early).
- The remaining **131** are declaration/parameter/return-type refs across
  exactly **45 functions** — the literal, self-checkable list is §1.2.

### 1.2 The 45 functions, literal (no "and N more")

Every row: function, declaration line at base sha, ref count, exact turn
numbers referenced (repeats marked `xN`). Grouped into four families by
call-graph position, established in §2; ordering within each family is by
declaration line.

**Family P — turn1-4 compat/derivation core** (6 functions, 10 refs). Pure
helpers with no draw calls of their own; every per-turn draw function that
touches turns 1-4 content routes through these first.

| Function | Line | Refs | Turns |
| --- | ---: | ---: | --- |
| `currentEpochCompatibilityHandoff` | 7376 | 2 | T1×2 |
| `turn2CompatibilityHandoff` | 7388 | 2 | T2×2 |
| `turn3CompatibilityHandoff` | 7400 | 2 | T3×2 |
| `turn4CompatibilityHandoff` | 7412 | 2 | T4×2 |
| `isCurrentEpochLifecycleActive` | 7420 | 1 | T1 |
| `currentPresentationEpochAge` | 7435 | 1 | T1 |

**Family Q — idle/chrome dispatch** (6 functions, 33 refs). The FIGHT-
submenu chrome and settled/idle action-menu renderers; called for every
turn's idle or closed-menu frame, not just turns 1-4's own windows.

| Function | Line | Refs | Turns |
| --- | ---: | ---: | --- |
| `drawMenuIdleBaseWithOpponentHp` | 7316 | 4 | T1,T2,T3,T4 |
| `drawActionMenuIdleContent` | 7336 | 4 | T1,T2,T3,T4 |
| `drawActionMenuIdleWindow` | 7451 | 4 | T1,T2,T3,T4 |
| `drawFightSubmenuChromeTurn1Through4PP` | 8153 | 4 | T1,T2,T3,T4 |
| `drawFightSubmenuChrome` | 8192 | 13 | T1..T13 (T1-4 live, T5-13 dead — see §2.2) |
| `drawFightSubmenuChromeFromCurrentOwner` | 8260 | 4 | T1,T2,T3,T4 |

**Family R — turn1-5 content draw + bounce-tick helpers** (23 functions, 34
refs). Kickoff text, ROCK_SLIDE/ENDEAVOR attack/window/settled-menu content,
and the bounce-tick closed forms that chain each turn's redraw anchor off
its predecessor's.

| Function | Line | Refs | Turns |
| --- | ---: | ---: | --- |
| `drawDragonBreathScene` | 9027 | 1 | T1 |
| `turn3KickoffBounceTick` | 9144 | 1 | T2 |
| `drawDragonBreathTurnEndSettledMenu` | 9170 | 2 | T1,T2 |
| `drawTurn2KickoffText` | 9266 | 2 | T1,T2 |
| `drawTurn3EndeavorText` | 9407 | 3 | T1,T2,T3 |
| `drawTurn3RockSlideAttack` | 9571 | 1 | T2 |
| `turn3RockSlideResettledBounceTick` | 9607 | 1 | T3 |
| `drawTurn3RockSlideTurnEndSettledMenu` | 9625 | 1 | T3 |
| `drawTurn3RockSlideWindow` | 9654 | 2 | T2,T3 |
| `turn4SubmenuBounceTick` | 9696 | 1 | T3 |
| `turn4KickoffBounceTick` | 9720 | 1 | T3 |
| `drawTurn4KickoffText` | 9753 | 4 | T1,T2,T3,T4 |
| `drawTurn4RockSlideAttack` | 9843 | 1 | T3 |
| `turn4RockSlideResettledBounceTick` | 9872 | 1 | T4 |
| `drawTurn4RockSlideTurnEndSettledMenu` | 9881 | 1 | T4 |
| `drawTurn4RockSlideWindow` | 9907 | 2 | T3,T4 |
| `turn5LegacyResettledBounceTick` | 9976 | 1 | T4 |
| `turn5SubmenuBounceTick` | 9984 | 1 | T4 |
| `turn5KickoffBounceTick` | 10008 | 1 | T4 |
| `drawTurn5EndeavorText` | 10081 | 3 | T1,T2,T4 |
| `drawTurn5RockSlideAttack` | 10612 | 1 | T4 |
| `drawTurn5RockSlideWindow` | 15532 | 1 | T4 |
| `drawTurn6FieldBase` | 15494 | 1 | T4 |

**Family S — the `drawTurnNFightSubmenuWindow` cascade, turns 6-15** (10
functions, 54 refs). Each function's own parameter list accretes one more
predecessor-turn handoff than the last, mirroring the retired outer ABI's
shape one layer in.

| Function | Line | Refs | Turns |
| --- | ---: | ---: | --- |
| `drawTurn6FightSubmenuWindow` | 12013 | 1 | T5 |
| `drawTurn7FightSubmenuWindow` | 12107 | 2 | T5,T6 |
| `drawTurn8FightSubmenuWindow` | 12330 | 3 | T5,T6,T7 |
| `drawTurn9FightSubmenuWindow` | 13310 | 4 | T5,T6,T7,T8 |
| `drawTurn10FightSubmenuWindow` | 13905 | 5 | T5,T6,T7,T8,T9 |
| `drawTurn11FightSubmenuWindow` | 14249 | 6 | T5,T6,T7,T8,T9,T10 |
| `drawTurn12FightSubmenuWindow` | 14499 | 7 | T5,T6,T7,T8,T9,T10,T11 |
| `drawTurn13FightSubmenuWindow` | 14602 | 8 | T5,T6,T7,T8,T9,T10,T11,T12 |
| `drawTurn14FightSubmenuWindow` | 16301 | 9 | T5..T13 |
| `drawTurn15FightSubmenuWindow` | 16785 | 9 | T5..T13 |

Sum check: P10 + Q33 + R34 + S54 = 131; +13 import refs = **144**. ✓

### 1.3 Re-run at current HEAD (2026-08-03, this re-scope session)

Ground-truth re-run of the exact §1.1 commands above, at `34c7c61b`
(current tip; slice 1 landed at PROGRESS-archive entry 889, and #71's
latent-bug fix has also landed in `battleScene.ts` since — checked whether
either changed this surface: **it did not**):

```
$ rg -c 'CompletedResolutionNextCommandHandoff' src/engine/battleScene.ts src/engine/battleMenu.ts
src/engine/battleScene.ts:80
(battleMenu.ts: no match, exit 1 — still 0, unchanged)
```

- **Total: 80** (matches entry 889's post-slice-1 number exactly — no
  drift from #71 or anything else landed since). Per-turn (type refs only,
  Family S's turns 5-13 are gone): T1 17, T2 17, T3 18, T4 20 — **sum 72**.
- Per-owning-function re-run (same python walk, current line numbers) gives
  **exactly** Family P 10 refs/6 functions, Family Q 24 refs/6 functions,
  Family R 34 refs/23 functions (72 non-import total), **+4** import-block
  refs (N=1-4 type imports; N=5-13 already deleted by slice 1) **+8**
  lowercase `turnNCompletedResolutionNextCommandHandoffFromLatest` refs (4
  import + 4 usage, all inside Family P's own 4 `xCompatibilityHandoff`
  bodies) = **80**. Every family's own function list and per-function ref
  count is byte-identical to entry 889's landed state — **zero drift**,
  confirming the two programs (#71, species-dossier) that have touched
  `battleScene.ts` since are disjoint from this surface at the content
  level, exactly like 874/875 were disjoint from it before slice 1 (§1.2
  original note).
- Current declaration lines (re-grepped fresh, cited throughout §4.1/§4.2
  below; re-grep again at execution time per this doc's own standing
  caution — they will drift as intervening slices land): Family P
  7513-7572, Family Q 7453-7588 (idle trio) + 8224-8313 (chrome trio),
  Family R 9080-10697 + 15559/15597 (`drawTurn6FieldBase`/
  `drawTurn5RockSlideWindow`). The single production entry point,
  `drawFightSubmenuWindow`, is now at L7863.

## 2. Consumer map

### 2.1 One production entry point, not forty-five

Every one of the 45 functions above is reached, directly or transitively,
through exactly one production call chain:
`core.ts` → `renderBattleScene` → `drawFightSubmenuWindow` (battleScene.ts
:7792, the function slice 10 already cut to `(fb, t, sm,
latestCompletedCommandHandoff, opponentFaintPresentationOwner,
resolutionOwner, trainerPresentation)`). None of the 45 census functions is
`export`ed and called from a test directly:

```sh
for fn in drawTurn6FightSubmenuWindow drawFightSubmenuChrome drawActionMenuIdleWindow \
          currentEpochCompatibilityHandoff drawTurn5RockSlideWindow; do
  rg -c "\b${fn}\(" tests --glob '*.ts'
done   # every one: 0 matches
```

confirmed for all 45 (spot-checked above, full sweep gives 0 for every
name). **No test-ABI exposure on these 45 signatures** — the risk in §5 is
elsewhere (constants and `resolveTurnN...` functions re-exported through
`battleScene.ts`, not these functions).

### 2.2 Family S is provably dead ABI already — same shape slice 10 already retired once

`drawFightSubmenuWindow`'s single internal dispatch block (battleScene.ts,
the ~120-line `if (opponentMove.move === ...)` ladder that picks which
`drawTurnNFightSubmenuWindow` to call) passes a **literal `null` for every
turnN handoff parameter at every one of its 10 call sites**, e.g.:

```ts
drawTurn9FightSubmenuWindow(fb, t, sm, null, null, null, null, latest);
drawTurn6FightSubmenuWindow(fb, t, sm, null, latest);
```

— confirmed for all 10 call sites (turns 6-15), no exception. The real
content flows exclusively through `latest`. Which `drawTurnN...` to call is
already chosen by **semantic content matching** on
`latest.content.upcoming.moves` (`opponentMove.move`/`playerMove.move`/
`statChange`), not a turn number or PP-tuple lookup — the dispatcher design
doc's own "Named content-routing blocker" (a PP-tuple-matching branch) is
**already resolved**; what's left is purely that the chosen function still
*declares* dead parameters it never receives a non-null value for.

`drawFightSubmenuChrome`'s own body makes this explicit for its turn5-13
slots — nine `void turnNNextCommandHandoff;` statements sit right at the top
of the function (battleScene.ts:8212-8220), i.e. a prior author already
marked these nine parameters unused and left them in the signature rather
than deleting them. Its turn1-4 slots are different: they feed
`drawFightSubmenuChromeTurn1Through4PP`'s live PP arithmetic and are not
dead (Family Q, not Family S).

### 2.3 Families P/Q/R already run through the generic bridge — the legacy shape is a reconstruction, not a source

`drawFightSubmenuWindow` computes its turn1-4 locals like this (both call
sites into Family Q, verified identical):

```ts
const currentEpochHandoff = currentEpochCompatibilityHandoff(null, latestCompletedCommandHandoff);
const currentTurn2Handoff = turn2CompatibilityHandoff(null, latestCompletedCommandHandoff);
const genericTurn2Content = turn2FightCommandPresentationFromLatest(latestCompletedCommandHandoff);
// ...same pattern for turn3Handoff/genericTurn3Content, turn4Handoff/genericTurn4Content
```

The **first positional argument is a literal `null` at every call site in
production** (`drawFightSubmenuWindow`, the sole entry). Each
`xxxCompatibilityHandoff` helper is exactly
`turnNCompletedResolutionNextCommandHandoffFromLatest(latest) ?? positional`
(battleScene.ts:7377-7380 for turn 1, identical shape for 2-4) — i.e. it
reconstructs the legacy-typed object **from `latest`**, with the
never-non-null `positional` arg as unreachable production fallback. The
reconstructed `currentEpochHandoff`/`currentTurnNHandoff` values are then
threaded, still legacy-typed, into Family Q (`drawActionMenuIdleWindow` etc.)
and from there into Family R (`drawTurn3EndeavorText`, etc.) — so by the time
a Family R function reads `.hp.player` or `.persistedMoveSlot` off a
`TurnNCompletedResolutionNextCommandHandoff`, that value's only source was
`latest` several call frames up.

This is confirmed for every one of turns 1-4: `turnNResolutionAdapter.ts`
(N=1..13, all thirteen) already exports `resolveTurnNFightCommandPresentation`,
and each adapter's own publish path sets `content:
resolveTurnNFightCommandPresentation(handoff)` directly on the record that
becomes `latest.content` (e.g. `turn1ResolutionAdapter.ts:150`,
`turn2ResolutionAdapter.ts:178`, same shape N=3..13). **All thirteen turns'
content is already generic at the adapter/publish boundary** — the
migration gap is entirely inside `battleScene.ts`'s own draw layer, which
still reconstructs+re-threads the pre-migration shape instead of reading
`latest`/`latest.content` directly.

### 2.4 Existing proof-of-safety infrastructure for Family S

`tests/battleScene.test.ts`'s own `describe("dispatcher slices 3-4:
FightCommandPresentation shadow equivalence")` (line 218) already pins, with
`toEqual`, that `resolveTurn5FightCommandPresentation()` through
`resolveTurn13FightCommandPresentation()` exactly match nine
`LEGACY_TURNn_FIGHT_COMMAND_PRESENTATION` constants — hand-authored,
`export`ed, module-level fixtures sitting in `battleScene.ts` itself
(:12609-15347+) that reproduce exactly what the legacy Family-S draw path
computes. Confirmed these `LEGACY_TURNn_...` constants have **no production
reader** — `rg -c '\bLEGACY_TURN6_FIGHT_COMMAND_PRESENTATION\b' src/engine
tests` returns 1 in `battleScene.ts` (its own declaration) and 2 in
`battleScene.test.ts` (import + the equivalence assertion above), same
pattern for all nine. **The generic content Family S needs already has a
green, exact-equality test proving it reproduces the legacy computation** —
the retirement work for Family S is provably safe by an existing test, not
just by argument.

No equivalent equivalence test exists yet for turns 1-4/5 (`rg -n
'resolveTurn[1-4]FightCommandPresentation\(' tests` returns nothing) — that
asymmetry is real, not an oversight to paper over, and drives the slice
ordering in §4 (turns 6-15 first, turns 1-5 gated on new pins).

### 2.5 Differential-replay windows (directly re-verified against `tools/compare/traces/*.json`, not copied from a prior doc)

```sh
python3 -c "import json; print(len(json.load(open('tools/compare/traces/turn6-menu.json'))['captureFrames']))"
```
run for every `turnN-*.json` file, N=1..15 (78 files) plus
`battle-command-generated-off.json`, reproduces every count below exactly;
they also match the dispatcher and species-dossier docs' own tables, which
is expected since all three programs share the same production entry point
and the same trace corpus — this is not independent evidence of anything
beyond file integrity, cited here only so slice acceptance doesn't require
re-deriving them.

| Turn | Traces (name: captures) |
| --- | --- |
| 1 | turn1-kickoff-off 81, turn1-cloneanim-off 230, turn1-rockslide-off 256, turn1-drain-off 102 |
| 2 | turn2-dragonbreath-off 237, turn2-endeavor-off 256 |
| 3 | turn3-endeavor-off 255, turn3-rockslide-off 161 |
| 4 | turn4-doubleteam-off 256, turn4-rockslide-off 256 |
| 5 | turn5-sitrus-a/b/c/d 110/82/181/133, turn5-faint 110, turn5-switchin 241, turn5-rockslide 256, turn5-menu 42 |
| 6 | turn6-menu 44, turn6-rockslide-a/b 255/105 |
| 7 | turn7-menu 93, turn7-rockslide-a/b/c/d 256/256/256/19 |
| 8 | turn8-menu 88, turn8-bind-a/b 256/66 |
| 9 | turn9-menu 111, turn9-quickattack-off 233, turn9-quickattack-b-off 231, turn9-rockslide-off 256 |
| 10 | turn10-menu-off 83, turn10-aerialace-off 206, turn10-rockslide-off 255, turn10-rockslide-off-b 131 |
| 11 | turn11-featherdance-off 191, turn11-rockslide-off 256 |
| 12 | turn12-menu 46, turn12-aerialace-off 247, turn12-rockslide-miss-off 256 |
| 13 | turn13-menu 57, turn13-dragonbreath-faint 141, turn13-switchin 242, turn13-sandattack 190 |
| 14 | turn14-fly-miss 213 |
| 15 | turn15-fly-strike 256, turn15-sendout-rung2/3/4a/5/6 (+ delayed twins) 43/46/16/144/195 (×2) |
| insurance | battle-command-generated-off 128 |

## 3. Target mechanism

**Every one of the 45 functions converges on the same existing shape:**
`latest: LatestCompletedCommandHandoff | null` (already implemented,
`src/engine/nextCommandHandoff.ts:19`, with an optional `content?:
FightCommandPresentation` field, `src/engine/fightCommandPresentation.ts`) —
this is not a new type to design, it is the dispatcher design doc's own
proposed final shape, already built and already the sole real data source
for every one of these 45 functions per §2.3/§2.2. There is nothing here
resembling the species dossier's per-family bespoke mechanisms (a
compositor, a materialize primitive, a palette helper) — this whole surface
is one mechanism, applied at 45 call sites.

Classification by family, mechanical vs. real state-flow:

| Family | Classification | Why |
| --- | --- | --- |
| S (turns 6-15 cascade, 54 refs) | **Pure type-plumbing.** | Every production value is a literal `null` (§2.2); an exact-equality test already proves the generic replacement (§2.4). Delete the parameters, read `latest.content` (already computed as `genericTurnNContent`-shaped locals one call frame up in some paths, or via the adapter's own `resolveTurnNFightCommandPresentation` chain) inside the function body instead. |
| Q (idle/chrome, turn5-13 slots of `drawFightSubmenuChrome` only — 9 of its 13 refs) | **Pure type-plumbing**, same as S (the `void` markers prove it). | Same call-site-null proof as S. |
| Q (idle/chrome, turn1-4 slots — 24 refs across 6 functions) | **Mechanical, but not dead** — real derived values flow through, just in the wrong (reconstructed) shape. | §2.3: the values are 100% `latest`-derived already; retiring means changing *what shape* is threaded (from `TurnNCompletedResolutionNextCommandHandoff` to `latest`/`content` fields directly), not adding new logic. No test proves the equivalence yet (§2.4) — author one per slice before cutting. |
| P (compat/derivation core, 10 refs) | **Mechanical**, and retires automatically once Q's turn1-4 slots stop calling it. | These functions exist only to produce the reconstructed shape Q consumes; once Q reads `latest` directly, P has no callers left to delete. |
| R (turn1-5 content + bounce helpers, 34 refs) | **Mixed — the bounce-tick helpers are real state-flow, not type-plumbing.** | Verified by reading, not inferring: `turn5KickoffBounceTick`'s body branches on whether its `turn4NextCommandHandoff` argument is `null` and, when non-null (the real production case, fed from `drawTurn5RockSlideAttack`'s own `turn4NextCommandHandoff` param, itself fed a real value from `drawTurn5RockSlideWindow`), computes a materially different plateau-tick formula (battleScene.ts:10008-10026). This is exactly the shape the dispatcher design doc's own risk #1 names — "the cross-turn bounce bug has already recurred three times" — turn2 hardcoded turn1's delay, turn3 hardcoded turn2's, turn4 hardcoded turn3's. A slice that swaps this family's input from the legacy object to a generic field without preserving the *exact* semantic edge it reads (not a renamed field with the same name, the actual epoch/press-tick fact) reproduces that bug a fourth time. The draw-content functions in R that only *display* HP/text (not bounce-tick math) are ordinary type-plumbing once the value's true source (§2.3) is threaded through. |

No family needs a new type. No family is "invent a generic formula" the way
species-dossier families A/B were — every target here already exists in
`nextCommandHandoff.ts`/`fightCommandPresentation.ts`/the 13
`resolveTurnNFightCommandPresentation` exports. The work is exclusively:
(1) stop reconstructing the legacy shape from `latest` and read `latest`
directly, (2) for R's bounce-tick sub-family only, verify field-for-field
that the generic accessor carries the *same semantic tick*, not just a
same-named one.

## 4. Slice plan

Acceptance per slice: `npm run compare:differential -- <trace...> --base
<clean parent sha> --summary`, exit 0, every named capture list byte-
identical, **plus `battle-command-generated-off.json` (128 captures)** as
standing insurance (per the species-dossier doc's own convention, reused
here since it exercises the same `renderBattleScene` entry point). No slice
in this plan touches `nextCommandHandoff.ts` or `fightCommandPresentation.ts`
— both are read-only inputs here, owned by the (mostly landed) dispatcher
ladder.

**2026-08-03 re-scope (PROGRESS-archive entry 889).** Slice 1 landed exactly
as scoped (`battleScene.ts` 152→80 refs, `compare:differential` 49 traces /
7,466 captures byte-identical). The same session investigated slice 2
below and did **not** land it, invoking the brief's own documented
fallback rather than force a "not one pixel moves" change through an
under-scoped slice: Family Q's remaining 6 functions have far more real
callers than the "24 refs / 6 functions" framing implies —
`drawActionMenuIdleContent` alone has 9+ call sites inside Family R, each
passing a differently-shaped positional argument list. **Rows 2, 3, 4a,
4b, and 5 of the table immediately below are the ORIGINAL plan slice 1
executed against and are now SUPERSEDED** (kept verbatim — struck only by
label — for the historical record; row 1 is unchanged and stayed
accurate). **§4.1 is the current, re-sliced plan; §4.2 is the Q↔R
call-site map that grounds it.**

| Slice | Exact symbols touched | Bounded result | Differential windows | Out of scope |
| --- | --- | --- | --- | --- |
| 1. Family S dead-parameter cut — **LANDED** (entry 889) | `drawTurn6FightSubmenuWindow` .. `drawTurn15FightSubmenuWindow` (10 functions), `drawFightSubmenuChrome` (delete only its 9 `void`-marked turn5-13 params, keep turn1-4/moveset/resolution params), plus the ~14 call sites inside `drawFightSubmenuWindow`'s own dispatch ladder that currently pass the literal nulls being deleted. Delete the now-dead `import type { TurnNCompletedResolutionNextCommandHandoff }` lines for N=5..13 (9 import refs) once no reference remains — re-grep before deleting each one, don't assume family boundaries are exhaustive. | 54 (S) + 9 (Q's dead Chrome slots) + 9 (imports) = 72 of 144 refs retired in one mechanical slice; zero behavior change (proven dead by §2.2/§2.4, no new test needed beyond keeping the existing shadow-equivalence describe block green). | Full §2.5 table for turns 5-15 (the ranges those functions render) plus `turn5-menu`/`turn5-rockslide` (Family S's own predecessor content flows from turn 5). | Family Q's turn1-4 slots, Family P, Family R. Do not touch `drawFightSubmenuChromeFromCurrentOwner` — different function, Family Q. |
| 2. Family P+Q turn1-4 fold — **SUPERSEDED, see §4.1 slices 2/3/7** | `currentEpochCompatibilityHandoff`, `turn2CompatibilityHandoff`, `turn3CompatibilityHandoff`, `turn4CompatibilityHandoff`, `isCurrentEpochLifecycleActive`, `currentPresentationEpochAge` (Family P, delete once callers below stop needing them); `drawMenuIdleBaseWithOpponentHp`, `drawActionMenuIdleContent`, `drawActionMenuIdleWindow`, `drawFightSubmenuChromeTurn1Through4PP`, `drawFightSubmenuChrome` (now 4-param after slice 1), `drawFightSubmenuChromeFromCurrentOwner` (Family Q's remaining 6 functions). Add a new `tests/battleSceneFightCommandPresentationTurn1Through4.test.ts` pinning `resolveTurn1FightCommandPresentation()`..`resolveTurn4FightCommandPresentation()` (already exported, currently unused by any test per §2.4) against hand-computed expected field/HP/epoch values before cutting — the Family-S precedent (§2.4) exists for turns 6-15 but nothing pins turns 1-4 yet. | Family P fully retired (10 refs); Family Q's remaining 24 refs retired. Requires slice 1 landed first (touches `drawFightSubmenuChrome`'s signature a second time). | turn1-4 primary windows: turn1-kickoff-off, turn1-cloneanim-off, turn1-rockslide-off, turn1-drain-off, turn2-dragonbreath-off, turn2-endeavor-off, turn3-endeavor-off, turn3-rockslide-off, turn4-doubleteam-off, turn4-rockslide-off; plus turn5-menu/turn6-menu as upstream readers (idle window is shared code). | Family R. |
| 3. Family R bounce-tick helpers — **SUPERSEDED, see §4.1 slice 4** | `turn3KickoffBounceTick`, `turn3RockSlideResettledBounceTick`, `turn4SubmenuBounceTick`, `turn4KickoffBounceTick`, `turn4RockSlideResettledBounceTick`, `turn5LegacyResettledBounceTick`, `turn5SubmenuBounceTick`, `turn5KickoffBounceTick` (8 functions, 8 refs). Per §3's Family R risk: before deleting each legacy parameter, name the *exact* semantic tick each formula reads off it (a press tick, a redraw-delay constant, a reset edge) and confirm the generic accessor exposes that same fact, not a same-shaped but differently-anchored one — do this per function, not as one batch assumption. ~~**GATED**: same file region (9976-10026) as species-dossier slice 7~~ — moot, species-dossier program CLOSED (entry 888, all 7 slices landed). | 8 of 144 refs; smallest slice, highest semantic risk in this doc. | turn3-endeavor-off, turn3-rockslide-off, turn4-doubleteam-off, turn4-rockslide-off, turn5-sitrus-a/b/c/d, turn5-switchin, turn5-rockslide (bounce-tick regressions are exactly the "single-tick, small-pixel-count" class the dispatcher doc's risk #1 describes — do not shrink this window list for a passing 0-diff on fewer traces). | Family R's draw-content functions (slice 4). |
| 4a. Family R content, turns 1-3 — **SUPERSEDED, see §4.1 slice 5** | `drawDragonBreathScene`, `drawDragonBreathTurnEndSettledMenu`, `drawTurn2KickoffText`, `drawTurn3EndeavorText`, `drawTurn3RockSlideAttack`, `drawTurn3RockSlideTurnEndSettledMenu`, `drawTurn3RockSlideWindow` (7 functions, 11 refs). Depends on slice 2 (reads the same `latest`/`content` locals slice 2 introduces) and slice 3 (calls the retired bounce-tick helpers). | 11 of 144 refs. | turn1-kickoff-off, turn1-cloneanim-off, turn2-dragonbreath-off, turn2-endeavor-off, turn3-endeavor-off, turn3-rockslide-off. | Turns 4-5 (slice 4b). |
| 4b. Family R content, turns 4-6 — **SUPERSEDED, see §4.1 slice 6** | `drawTurn4KickoffText`, `drawTurn4RockSlideAttack`, `drawTurn4RockSlideTurnEndSettledMenu`, `drawTurn4RockSlideWindow`, `drawTurn5EndeavorText`, `drawTurn5RockSlideAttack`, `drawTurn5RockSlideWindow`, `drawTurn6FieldBase` (8 functions, 15 refs — includes `drawTurn6FieldBase`'s own `number \| Turn4CompletedResolutionNextCommandHandoff \| null` union parameter, which needs its call-site type-narrowing removed, not just the type deleted, since exactly one caller (`drawTurn5RockSlideWindow`) passes the handoff variant and every other caller passes a plain number). ~~**GATED**: same file region as species-dossier slice 7~~ — moot, see above. | 15 of 144 refs. | turn3-rockslide-off (upstream reader), turn4-doubleteam-off, turn4-rockslide-off, turn5-sitrus-a/b/c/d, turn5-switchin, turn5-rockslide, turn5-faint. | Turns 1-3 (slice 4a already landed). |
| 5. Final import/fixture cut — **SUPERSEDED, see §4.1 slice 8** | Re-run the §1.1 census script; delete the remaining `import type { TurnNCompletedResolutionNextCommandHandoff }` lines for N=1..4,13 once slices 1-4b have removed every reader; delete `tests/`-side fixtures that only existed to feed the deleted signatures (audit with `rg -n 'TurnNCompletedResolutionNextCommandHandoff' tests` first — per §5 below, several of these test names are also used by unrelated `resolveTurnN...`/`TURN*_` imports that must NOT be deleted). | 144 → 0 in `battleScene.ts`, matching `battleMenu.ts`'s existing 0. | Union of slices 1-4b's windows, unmodified capture lists (regression guard, not new coverage). | Any change to `turnNResolutionAdapter.ts`'s own exported `TurnNCompletedResolutionNextCommandHandoff` types — those are legitimately owned by the adapters (their own internal `resolveTurnN...` construction, kept per the dispatcher doc's own scope note: "the turnNResolutionAdapter.ts files keep their own"). This slice only removes `battleScene.ts`'s *imports* of them, never the adapter's own declarations. |

Slices 1 and 2 are ladder-independent and species-independent — no symbol or
tight file-region overlap with any open species-dossier slice, landable
immediately and in either order (1 before 2, since 2 touches
`drawFightSubmenuChrome` a second time). Slices 3, 4a, and 4b are gated per
§5. **(Historical: this paragraph described the original plan. Slice 2's
own attempt is exactly what proved it wrong — see §4.1.)**

## 4.1 Revised slice plan (2026-08-03 re-scope)

### Chosen shape: (c) staged-adapter/shim, sequenced by (b) call-site cluster — a hybrid

**Why not (a) R-first reorder.** Family R's functions are Family Q's
*consumers*, not its producers — `drawTurn3EndeavorText` etc. call
*into* `drawActionMenuIdleContent`, they don't feed it. Retiring R's own
typerefs first would force R to either (i) keep reconstructing the legacy
`TurnNCompletedResolutionNextCommandHandoff` shape from `latest`/`content`
just to hand it to Q's still-unchanged legacy signature (new
reconstruction code, thrown away the moment Q's own turn comes — wasted
work, not less work), or (ii) skip past Q entirely and duplicate Q's own
logic inline in each R function (a real new mechanism, explicitly ruled
out by §3: "no family needs a new type / new formula"). Reordering doesn't
decouple the two families; it just moves the reconstruction seam. Ruled
out.

**Why (c)+(b), not (b) alone.** A pure call-site-cluster split (b) still
needs *some* way to keep not-yet-migrated callers compiling while a
migrated cluster reads a different shape — in TypeScript that's either a
union/overload signature (churns every call site's own type-narrowing,
exactly the `drawTurn6FieldBase` trap §5 risk 4 already names) or a
sibling function under a new name. The sibling-function shape is shim (c).

**This is not a novel pattern for this file — it is already live one
function over.** `drawFightSubmenuChrome` (Family Q's Chrome sub-function)
already has exactly this shim built and in production use:
`drawFightSubmenuChromeFromLatest(fb, displayCursor, moveset, latest)`
(battleScene.ts, generic, reads `latest` via the already-exported
`currentPPForActiveMon`) sits beside the legacy
`drawFightSubmenuChrome(fb, displayCursor, turn1.., turn2.., moveset,
turn3.., turn4.., ...)`, and `drawFightSubmenuChromeFromCurrentOwner`
is the dispatcher: `isLatestCompletedCommandHandoffReady(latest) ?
drawFightSubmenuChromeFromLatest(...) : drawFightSubmenuChrome(...)`. Every
one of `drawTurn6FightSubmenuWindow`..`drawTurn15FightSubmenuWindow`'s own
bodies already contains the identical `if (latest !== null) { ...FromLatest
... } else { drawFightSubmenuChrome(fb, sm.displayCursor, null, null,
sm.activeMonMoveset, null, null); }` ladder (verified at all 9 remaining
call sites, turns 7-15, byte-identical shape; turn 6 same, 3-arg variant at
turn 15 carries an extra `resolution` positional). This is the
dispatcher-ladder "shadow-then-cut" pattern, already proven in this exact
file, for this exact family, by a prior slice — not a new risk being
introduced.

**Working out from that precedent onto the idle-content trio** (
`drawMenuIdleBaseWithOpponentHp`, `drawActionMenuIdleContent`,
`drawActionMenuIdleWindow` — the genuinely entangled 12 of Family Q's 24
remaining refs; no `...FromLatest` twin exists for these yet, confirmed:
`rg -n 'drawActionMenuIdleContentFromLatest\|drawActionMenuIdleWindowFromLatest'
src/engine/battleScene.ts` returns nothing) is the actual new work in this
re-scope. §4.2 is the full call-site map this ordering is built from.

**A surprise beyond entry 889's own description**: Family P is not only
coupled to Family Q — `currentPresentationEpochAge` (one of Family P's 6
functions) is called **directly** from two Family R functions
(`drawDragonBreathScene:9106`, `drawTurn2KickoffText:9382`) for their own
bounce-tick math, bypassing Family Q entirely. Family P does not retire as
a pure side effect of Q's migration alone — its last two direct-R call
sites must also move (folded into slice 5 below, the same cluster that
already owns `drawDragonBreathScene`/`drawTurn2KickoffText`).

| Slice | Exact symbols / call sites touched | Predicted ref delta (census-verified) | Differential windows (`--base` = the immediately-prior *landed* slice's own commit; re-run §1.1 census first to confirm the count this slice's own delta claim assumes) | Honest size / dependency |
| --- | --- | --- | --- | --- |
| **2. Chrome sub-family retirement** | `drawFightSubmenuChromeTurn1Through4PP` (L8224), `drawFightSubmenuChrome` (L8263), `drawFightSubmenuChromeFromCurrentOwner` (L8313) — delete all 3, redirect every call site to the already-existing `drawFightSubmenuChromeFromLatest` (L8287). Of ~18 current call sites: 9 (turns 7-15's own `if(latest!==null)/else` ladders) have a provably-dead `else` by the *same* §2.2 proof extended one layer (Family S already proven to always have ready `latest` by these turns); turn 6's own ladder is the same shape (10th); 5 more (`renderSceneOnMovePresentation`×3 L18519, `renderSceneOffTurnView` L34610, `drawBattle2RockSlideTurn1Window` L7352) call unconditionally with literal nulls and have **no `latest` parameter in their own signature at all** — a different rendering regime (Scene-ON / synthetic capstone view), permanently null, not part of this migration; `drawTurn16FightSubmenuWindow`×2 (L17924) same shape. **First step, before cutting anything**: confirm whether the ONE remaining real call site — inside `drawFightSubmenuChromeFromCurrentOwner`'s own `!isLatestCompletedCommandHandoffReady` fallback, fed by `drawFightSubmenuWindow`'s Family-P-derived locals at its 2 call sites (L8072/8117) — is ever reached with a non-null handoff (§2.3 already proved the *positional-arg* fallback is dead; whether *this specific* branch is dead too needs its own confirmation, not an assumed inherit). If dead: pure mechanical deletion, no new test. If live: needs the same pin-test-first treatment as slice 3. | 12 of 68 (80 after slice 1, minus these 12 = 68). Zero if the one real call site turns out live and needs a shim instead of a delete — re-plan that one function only, doesn't grow this slice. | Full turn 1-16 window list (§2.5, all rows) + insurance — Chrome renders every turn's FIGHT submenu, broadest-possible acceptance since ~15 of 18 call sites are outside this doc's own turn1-5 scope. | Small if the fallback is dead (~20 min: delete 3 functions, fix ~18 call sites, re-run census). Budget 45 min to allow for the one live-path investigation; do not let it balloon into rebuilding the idle-content shim early — that's slice 3. |
| **3. Idle-content shim + trivial-null callers** | Add `drawActionMenuIdleContentFromLatest(fb, bounceTick, latest, playerHpOverride?)` reading `latest.content.field.player.hp.current`/`.field.opponent.hp.current` (mirrors the legacy `.hp.player`/`.hp.opponent`) — **the HP-overlay guard inside `drawActionMenuIdleContent` (current body: `if (isTurn3NextCommandHandoffReady(turn3NextCommandHandoff) \|\| isTurn2NextCommandHandoffReady(turn2NextCommandHandoff)) drawPlayerHealthboxHpOverlay(...)`, fires for turn-2/3 lifecycle, deliberately excludes turn 1 **and** turn 4 — entry 889's finding) must be ported *exactly*, not re-derived: **preserve exactly, add a pin test first** — extend the already-banked `tests/battleSceneFightCommandPresentationTurn1Through4.test.ts` (entry 889, `a76bb338`) with cases asserting the overlay fires/doesn't-fire identically for the generic accessor's turn-2/3/4 equivalents before this function's body exists. Migrate the 2 callers that carry zero own typeref today and pass only literal `null` — `drawTurnKickoffText` (L8370) and `drawTurnEndSettledMenu` (L15791) — to call the new shim instead of legacy `drawActionMenuIdleContent`. Do **not** touch `drawMenuIdleBaseWithOpponentHp`/`drawActionMenuIdleWindow` or any Family-P function yet — those keep calling the untouched legacy `drawActionMenuIdleContent` until slice 7. | **0** of 68 (enabling slice — neither migrated caller owns a census typeref; this slice's job is proving the shim + guard equivalence, not retiring refs). Report the new pin-test case count instead. | turn1-kickoff-off, turn1-cloneanim-off, turn1-rockslide-off, turn1-drain-off (both migrated callers are turn-1-exclusive, per their own `TURN1_*` constants) + insurance. | Small (~30-40 min): one new function + one extension to an existing green test file + 2 mechanical caller swaps. Lowest-risk slice in this table — do this before any real-content cluster to bank the guard-equivalence proof once. |
| **4. Family R bounce-tick helpers** | `turn3KickoffBounceTick` (L9197), `turn3RockSlideResettledBounceTick` (L9660), `turn4SubmenuBounceTick` (L9749), `turn4KickoffBounceTick` (L9773), `turn4RockSlideResettledBounceTick` (L9925), `turn5LegacyResettledBounceTick` (L10029), `turn5SubmenuBounceTick` (L10037), `turn5KickoffBounceTick` (L10061) — unchanged 8-function/8-ref list from the original doc's own slice 3 (never the blocked part; re-verify each one's own small, bounded caller set via re-grep, don't assume it's still exactly 2 callers each). Per §3/§5 risk 3: name the *exact* semantic tick each formula reads (press tick, redraw-delay constant, reset edge) and confirm the generic accessor exposes that same fact before deleting the legacy parameter — per function, not batch. | 8 of 68 → 60. | turn3-endeavor-off, turn3-rockslide-off, turn4-doubleteam-off, turn4-rockslide-off, turn5-sitrus-a/b/c/d, turn5-switchin, turn5-rockslide + insurance (unchanged from the original slice 3's own list — do not shrink for a passing 0-diff on fewer traces). | Smallest-by-ref-count, highest-semantic-risk slice in the whole program (unchanged assessment from the original doc) — budget the full 60 min for verification reading alone; land nothing without naming the tick semantics per function first. No longer gated on species-dossier (that program closed, entry 888). |
| **5. Family R content, turns 1-2 (+ Family P's last 2 direct-R callers)** | `drawDragonBreathScene` (L9080, 1 ref, **plus** its own direct call to Family P's `currentPresentationEpochAge` at L9106 — migrate this call to a generic epoch-age accessor over `latest.content.presentationEpoch`/`.bounce` in the *same* edit, this is the "surprise" coupling above), `drawDragonBreathTurnEndSettledMenu` (L9223, 2 refs), `drawTurn2KickoffText` (L9319, 2 refs, **plus** its own direct call to `currentPresentationEpochAge` at L9382 — same treatment). Each function's own call into `drawActionMenuIdleContent`/`drawTurnKickoffText`-style shim (built in slice 3) is what actually retires these refs — migrate the call *and* the function's own signature together, not one then the other. | 5 of 60 → 55. Family P's `currentPresentationEpochAge` itself does **not** retire yet — `drawActionMenuIdleWindow`/`drawFightSubmenuWindow` still call it directly (slice 7). | turn1-kickoff-off, turn1-cloneanim-off, turn2-dragonbreath-off, turn2-endeavor-off + insurance. | Medium (~45-60 min): 3 functions, but 2 carry the extra Family-P bounce-tick migration. If it overruns, land `drawDragonBreathTurnEndSettledMenu`/`drawTurn2KickoffText`'s *idle-content* call only this session and leave the `currentPresentationEpochAge` call for a documented follow-up — say so explicitly, don't silently partial-land. |
| **6. Family R content, turns 3-4** | `drawTurn3EndeavorText` (L9460, 3 refs), `drawTurn3RockSlideAttack` (L9624, 1 ref), `drawTurn3RockSlideTurnEndSettledMenu` (L9678, 1 ref), `drawTurn3RockSlideWindow` (L9707, 2 refs), `drawTurn4KickoffText` (L9806, 4 refs), `drawTurn4RockSlideAttack` (L9896, 1 ref), `drawTurn4RockSlideTurnEndSettledMenu` (L9934, 1 ref), `drawTurn4RockSlideWindow` (L9960, 2 refs) — all 8 remaining turn-3/turn-4 Family R functions (matches the original doc's own old-slice-4a/4b sizing precedent: 8 functions was old slice 4b's own size, presented there as one bounded slice). **HP-overlay guard, preserve exactly**: `drawTurn3RockSlideTurnEndSettledMenu` passes `(turn3NextCommandHandoff.hp.player, turn3NextCommandHandoff)` into `drawActionMenuIdleContent`, which fires the turn-2/3 overlay guard *and then the caller itself redraws the identical overlay again* (`drawPlayerHealthboxHpOverlay(fb, turn3NextCommandHandoff.hp.player, ...)`, same tick, same value — a harmless double-draw today, but a slice that "simplifies" one call site assuming the other is dead must verify pixel-identical output, not just fewer draw calls). `drawTurn4RockSlideTurnEndSettledMenu` is the turn-4 twin (guard does *not* fire for it — turn2/turn3 args are both null — the caller's own explicit overlay call is the *only* draw; do not let the shim's port of the guard accidentally start firing for turn 4 too). | 15 of 55 → 40. | turn3-endeavor-off, turn3-rockslide-off, turn4-doubleteam-off, turn4-rockslide-off + insurance. | **Large (~60 min, budget the full session)**: 8 functions, 2 of them guard-relevant — budget extra verification time on the guard's exact on/off boundary across turn 2/3/4, that's the one place a subtle regression could hide behind an otherwise-green differential (bounce-tick and content pixels dominate the trace; a wrongly-firing/missing overlay on a frame the trace happens to sample identically to the correct one would still show 0-diff — cross-check against the pin test from slice 3, not the trace alone). If short on time, split at the turn-3 (4 functions, 7 refs: `drawTurn3EndeavorText`/`drawTurn3RockSlideAttack`/`drawTurn3RockSlideTurnEndSettledMenu`/`drawTurn3RockSlideWindow`) vs. turn-4 (4 functions, 8 refs) boundary and say so explicitly — do not force both halves into one sitting at the expense of the guard verification. |
| **7. Family R content, turns 4-6 (remaining) + final Family P/Q idle-trio fold** | `drawTurn5EndeavorText` (L10134, 3 refs), `drawTurn5RockSlideAttack` (L10697, 1 ref), `drawTurn6FieldBase` (L15559, 1 ref — its own `number \| Turn4CompletedResolutionNextCommandHandoff \| null` union param is a type-*narrowing* site, not just a declaration: `typeof bounceTickOrTurn4Handoff === "number"` at its own body, sole non-number caller is `drawTurn5RockSlideWindow` — fix the narrowing, not just the type, per §5 risk 4), `drawTurn5RockSlideWindow` (L15597, 1 ref) — completes Family R (34/34 refs retired across slices 4-7). **Then**, now that no Family R caller passes a real value to the legacy idle-content trio, fold `drawMenuIdleBaseWithOpponentHp` (L7453, 4 refs), `drawActionMenuIdleContent` (L7473, 4 refs — delete the legacy body entirely, everything now goes through slice 3's shim; this is the point where the HP-overlay guard's *legacy* implementation is deleted — confirm slice 3's pin test still passes against the shim alone before deleting it, not just that the trace diff is 0), `drawActionMenuIdleWindow` (L7588, 4 refs), and Family P's 6 functions (`currentEpochCompatibilityHandoff` L7513, `turn2/3/4CompatibilityHandoff` L7525/7537/7549, `isCurrentEpochLifecycleActive` L7557, `currentPresentationEpochAge` L7572 — the 4 lowercase `turnNCompletedResolutionNextCommandHandoffFromLatest` usage lines inside these bodies retire in the same edit, their own import lines immediately after since nothing else calls them, re-grep to confirm before deleting). `drawFightSubmenuWindow` itself (L7863) simplifies: stops reconstructing `currentEpochHandoff`/`currentTurnNHandoff` via Family P, reads `latestCompletedCommandHandoff`/`.content` directly. | 6 (R remainder: `drawTurn5EndeavorText` 3 + `drawTurn5RockSlideAttack` 1 + `drawTurn6FieldBase` 1 + `drawTurn5RockSlideWindow` 1) + 22 (P10+Q-idle-trio12) + 8 (lowercase) + 4 (N1-4 imports, now dead — nothing left to reference the 4 types) = 40 of 40 (after slice 6) → **0**, matching `battleMenu.ts`. | Full turn 1-13 window list (§2.5, all rows for turns 1-13 — this touches the shared entry point and idle-window, exercised by every one of those turns at some point per §2.1) + insurance. | **Largest slice in this table — this is the original "slice 2" work, now safe because it's last, not first.** If a single 60-min worker can't land all of Family-P + the idle-trio + the entry-point simplification in one sitting, split at the Family-R-remainder (7a) vs. Family-P+Q-idle-trio+entry-point (7b) boundary and say so explicitly rather than force it — do not leave the idle-trio half-migrated (some callers on the shim, some still on the legacy body) as a stopping point without a green differential run first. |
| **8. Final import/fixture audit** | Re-run the §1.1 census script (expect 0 in `battleScene.ts`); audit `rg -n 'TurnNCompletedResolutionNextCommandHandoff\|LEGACY_TURN' tests --glob '*.ts'` per §5 risk 5 (several test-side names are unrelated `resolveTurnN...`/`TURN*_` imports that must **not** be deleted); delete `tests/`-side fixtures that only fed the now-deleted signatures, if any remain. | 0 → 0 (pure regression/audit slice, no further count change expected — if the census doesn't already read 0 here, slice 7 didn't fully land and this slice should stop and say so, not "finish the job" outside its own scope). | Union of slices 2-7's windows, unmodified capture lists (regression guard only). | Small (~20-30 min): mostly re-running commands and reading `rg` output. |

**Dependency chain**: 2 and 3 are independent of each other and of
everything else (land in either order). 4 depends on nothing new (same as
the original doc — it was never blocked). 5 depends on 3 (shim must exist)
and 4 (calls the bounce-tick helpers slice 4 retires). 6 depends on 3 and
4. 7 depends on 3, 4, 5, and 6 all landed (needs every real Family R caller
off the legacy idle-content trio before deleting it). 8 depends on 7.
**Slices 2, 3, and 4 are landable immediately, in any order, by three
different bounded workers in parallel** if the supervisor wants to
parallelize — they touch disjoint symbol sets (Chrome vs. the not-yet-built
idle-content shim vs. the 8 already-scoped bounce-tick helpers) with no
shared file-region risk once species-dossier is confirmed closed (it is,
entry 888).

**Slice-4 re-scope (supervisor decision, 2026-08-03, from the slice-4
worker's execution finding — side-lane log 20260803-182951, landed commit
`d481cda2`/merge `9a87786c`):** the row's "depends on nothing new" claim was
wrong for 7 of its 8 functions. Only `turn3KickoffBounceTick` had all its
callers already carrying generic content (landed, census 68→67). The other 7
form an internal delegation chain in which every function bottoms out in at
least one external caller among `drawTurn3RockSlideTurnEndSettledMenu`,
`drawTurn4KickoffText`, `drawTurn4RockSlideAttack`,
`drawTurn4RockSlideTurnEndSettledMenu`, `drawTurn5EndeavorText`,
`drawTurn5RockSlideAttack` — all slice-6/7 content functions that today pass
only the legacy typed handoff. **Slice 4 is therefore CLOSED at 1/8; the
remaining 7 bounce-tick refs retire *inside* slices 6 and 7**, in the same
edit that migrates each function's external callers (per-function tick-
semantics naming still required, per §3/§5 risk 3 — the fold changes *when*,
not *how*). Slice 5's three functions are not among those external callers;
its row is unchanged.

## 4.2 Family Q ↔ Family R call-site map

Every call site of Family Q's 6 remaining functions, the exact positional
argument shape it passes, and which family/slice owns the caller (`—`
means the caller is outside both families — Scene-ON or a synthetic view,
not part of this migration at all). Gathered by direct `rg`/read, not
inferred; re-grep at execution time.

| Caller (line) | Callee | Argument shape passed | Owning slice |
| --- | --- | --- | --- |
| `drawFightSubmenuWindow` (7978, 7962/7972 via `drawActionMenuIdleWindow`) | idle trio | `currentEpochHandoff, currentTurn2Handoff, [undefined], currentTurn3Handoff, currentTurn4Handoff` (Family-P-derived locals, always non-`null`-coalesced from `latest` per §2.3) | 7 (entry point itself) |
| `drawActionMenuIdleWindow` (own body, 7638/7752) | `drawActionMenuIdleContent` | same Family-P locals as above | 7 (Family Q's own body) |
| `drawTurnKickoffText` (8371) | `drawActionMenuIdleContent` | `(fb, tick, null)` — 3 args, zero real values | 3 (trivial) |
| `drawTurnEndSettledMenu` (15792) | `drawActionMenuIdleContent` | `(fb, tick, null)` — 3 args, zero real values | 3 (trivial) |
| `drawDragonBreathTurnEndSettledMenu` (9234) | `drawActionMenuIdleContent` | `(fb, bounceTick, turn1, turn2)` — 4 args, both own params | 5 |
| `drawTurn2KickoffText` (9389) | `drawActionMenuIdleContent` | `(fb, bounceTick, turn1)` — 3 args, own param | 5 |
| `drawTurn3EndeavorText` (9491) | `drawActionMenuIdleContent` | `(fb, bounceTick, turn1, turn2, onixHp)` — 5 args, `onixHp` local overrides `playerHp` slot | 6 |
| `drawTurn3RockSlideTurnEndSettledMenu` (9684) | `drawActionMenuIdleContent` | `(fb, bounceTick, null, null, turn3.hp.player, turn3)` — 6 args, **HP-overlay-guard-relevant** | 6 |
| `drawTurn4KickoffText` (9826) | `drawActionMenuIdleContent` | `(fb, bounceTick, turn1, turn2, turn3.hp.player, turn3)` — 6 args, no turn4 slot | 6 |
| `drawTurn4RockSlideTurnEndSettledMenu` (9940) | `drawActionMenuIdleContent` | `(fb, bounceTick, null, null, turn4.hp.player, null, turn4)` — 7 args, **HP-overlay-guard-relevant** (guard does NOT fire — turn2/turn3 both null) | 6 |
| `drawTurn5EndeavorText` (10152) | `drawActionMenuIdleContent` | `(fb, bounceTick, turn1, turn2, onixHp, null, turn4)` — 7 args, no turn3 handoff (this function's own signature has no turn3 param at all) | 7 |
| `drawFightSubmenuWindow` (8071/8116, 8072/8117) | `drawMenuIdleBaseWithOpponentHp`, `drawFightSubmenuChromeFromCurrentOwner` | Family-P locals, all 4 slots | 7 |
| `drawDragonBreathScene` (9106) | Family P's `currentPresentationEpochAge` (not Q, but couples P directly to R — the "surprise" above) | `(turn1NextCommandHandoff, latestCompletedCommandHandoff, t - TICK0)` | 5 |
| `drawTurn2KickoffText` (9382) | `currentPresentationEpochAge` | same shape | 5 |
| `drawFightSubmenuWindow` (8099/8150) | `currentPresentationEpochAge` | Family-P locals | 7 |
| `drawTurn6..15FightSubmenuWindow` (10 call sites) → `drawFightSubmenuChrome` | Chrome | `(fb, cursor, null, null, moveset, null, null[, resolution])` behind `if(latest!==null)/else`, else-branch provably dead (§2.2 extended) | 2 |
| `drawTurn16FightSubmenuWindow` (2 call sites), `renderSceneOnMovePresentation` (3), `renderSceneOffTurnView` (1), `drawBattle2RockSlideTurn1Window` (1) → `drawFightSubmenuChrome` | Chrome | unconditional literal `null`s, **no `latest` in scope at all** — different rendering regime (Scene-ON / synthetic view), not part of this migration | 2 (delete these call sites' legacy-shape args; not otherwise in scope) |
| `drawFightSubmenuChromeFromCurrentOwner` (8327, its own fallback) | Chrome | real Family-P locals, IF the fallback is ever reached with `latest` not-ready but a handoff non-null (open question, slice 2's own first step) | 2 |

## 5. Risks and traps

**2026-08-03 update**: items 1 and 2 below are now moot — the
species-dossier program they gated against **closed entirely**
(PROGRESS-archive entry 888, all 7 slices landed) before this re-scope
session started. Kept for the historical record, struck where resolved.
Items 3/4/6/7 still apply, now to the renumbered slices in §4.1 (item 3 →
new slice 4; item 4 → new slice 7; item 6 → new slice 2; item 7 → new
slice 2). Items 8-9 are new, found during this re-scope.

1. ~~**Slices 3 and 4b collide with species-dossier slice 7** (family B,
   Sitrus wrappers) in the same file region.~~ **RESOLVED — moot.**
   Species-dossier closed (entry 888); no open slice remains to collide
   with. `turn5KickoffBounceTick` (now ~L9976-10026 shifted),
   `drawTurn5EndeavorText`, and `drawTurn5RockSlideAttack` still sit among
   the (now permanently landed, not "open") Sitrus-family functions —
   ordinary rebase hygiene applies, not the supervisor-serialization this
   item originally demanded.
2. ~~**Slice 1 sits near species-dossier slice 3** (family A, HP-drain).~~
   **RESOLVED — moot**, same reason as item 1. Slice 1 already landed
   cleanly regardless (entry 889).
3. **Family R's bounce-tick chain is the exact shape that has already
   produced three real bugs** (turn2/3/4 each hardcoding the wrong
   predecessor's delay constant — dispatcher design doc §"Risks and traps"
   item 1, ISSUES.md:296-303/348-353/394-401). New slice 4 (§4.1) must not
   treat "same field name available on the generic type" as sufficient; it
   must confirm the *tick semantics* match (verified per-function, not
   per-batch) before deleting a legacy parameter, exactly the caution
   documented at §3.
4. **`drawTurn6FieldBase`'s union parameter is a type-narrowing site, not
   just a declaration.** `bounceTickOrTurn4Handoff: number |
   Turn4CompletedResolutionNextCommandHandoff | null` is narrowed at
   runtime via `typeof bounceTickOrTurn4Handoff === "number"` (current
   L15559+ body — re-grep, this doc's own §1.3 census re-run already found
   this line shifted from the original 15494/15495 citation). Deleting the
   handoff variant from the type without also fixing this narrowing (and
   its sole non-number caller, `drawTurn5RockSlideWindow`) leaves dead
   runtime branching, not just a dead type — flagged explicitly in new
   slice 7 (§4.1).
5. **Public test-ABI overlap exists, but not on the 45 census functions
   themselves (§2.1 confirms 0 direct test refs).** It exists one layer
   away: `tests/battleScene.test.ts`, `tests/battleMenu.test.ts`,
   `tests/fightSubmenu.test.ts`, `tests/turn5ResolutionAdapterEquivalence.test.ts`,
   and `tests/turn13ResolutionAdapterEquivalence.test.ts` all import
   `resolveTurnNCompletedResolutionNextCommandHandoff` functions, `TURN*_`
   tick/line constants, and (battleScene.test.ts only) the nine
   `LEGACY_TURNn_FIGHT_COMMAND_PRESENTATION` fixtures **from
   `turnNResolutionAdapter.ts` or `battleScene.ts` directly** — none of
   these are the 144 census refs, and none may be deleted incidentally
   while cutting the 45 functions' dead parameters. Re-run `rg -n
   'CompletedResolutionNextCommandHandoff\|LEGACY_TURN' tests --glob
   '*.ts'` before each slice's final commit to confirm the import list a
   slice's own file edits still satisfy is unchanged from what that slice's
   own diff shows it touching.
6. **Same-shape-sibling trap.** `drawTurn9FightSubmenuWindow` through
   `drawTurn15FightSubmenuWindow` look identical in shape (each just adds
   one more predecessor-turn parameter) but are NOT literally the same
   function repeated — verify each one's own dispatch body (idle-window
   fallback, kickoff-text threshold, field-base bounce-tick regime shift)
   individually before assuming slice 1's edit pattern generalizes
   mechanically across all ten; the `void`-marked dead parameters and
   literal-null call sites are confirmed for the *parameter lists*, not a
   claim that the *function bodies* are interchangeable.
7. **Shared-helper default-param trap.** `drawFightSubmenuChrome`'s
   `turn3NextCommandHandoff`/`turn4NextCommandHandoff`/`turn5..13` params
   all default to `null` (`= null` in the signature) — several call sites
   rely on the default rather than passing an explicit `null`. A slice that
   greps only for explicit `null` arguments to confirm "every call site
   passes null" will undercount; confirm via arity (how many positional
   args a call site actually supplies) as well as value.
8. **[NEW, 2026-08-03] Family Q's Chrome sub-function has exactly one
   real (possibly-non-null) call site left, and this doc does not yet know
   if it's live.** `drawFightSubmenuChromeFromCurrentOwner`'s own
   `!isLatestCompletedCommandHandoffReady(latest)` fallback
   (battleScene.ts:8327) is the only place `drawFightSubmenuChrome` is
   called with a value that *could* be non-null. §2.3 already proved the
   separate *positional-argument* fallback inside the `xxxCompatibilityHandoff`
   helpers is dead (production never passes a non-null positional); whether
   *this* fallback branch (a different condition — `latest` not ready at
   all, vs. positional-vs-latest inside an already-ready `latest`) is ever
   taken with `currentEpochHandoff`/`currentTurnNHandoff` non-null is a
   **separate, unresolved question** this re-scope did not chase down (it
   would need either a targeted RAM/trace probe of turn 1's very first
   FIGHT-menu frame, or careful reading of `isLatestCompletedCommandHandoffReady`'s
   own definition against every `turnNCompletedResolutionNextCommandHandoffFromLatest`
   guard). New slice 2 (§4.1) names this as its own required first step —
   do not assume either answer.
9. **[NEW, 2026-08-03] Family P is coupled to Family R directly, not only
   through Family Q.** `currentPresentationEpochAge` (Family P) is called
   directly from `drawDragonBreathScene` (L9106) and `drawTurn2KickoffText`
   (L9382) for their own bounce-tick math — entry 889's own description
   only surfaced Family Q's coupling to Family R
   (`drawActionMenuIdleContent`'s 9+ call sites); this direct P→R edge is
   an additional coupling this re-scope found while building the §4.2 map.
   It means Family P does **not** fully retire as a side effect of Family
   Q's migration alone — new slice 5 (§4.1) folds this specific migration
   in alongside its other work on the same two functions.

## 6. Acceptance for this doc

- Committed as a new file; no `src/`, `tests/`, `PROGRESS.md`, or
  `ISSUES.md` file touched.
- Every count in §1 reproduced by the §1.1 commands at base sha `68718a2a`.
- `npm run test:smoke` and `npm test` green (guard only — this doc makes no
  production change, so this is confirming the baseline, not new coverage).

### 6.1 Acceptance for the 2026-08-03 re-scope (this amendment)

- Docs-only amendment (§1.3, §4 relabeling, §4.1, §4.2, §5 items 1/2/8/9);
  no `src/`, `tests/`, `PROGRESS.md`, or `ISSUES.md` file touched, per the
  side-lane contract.
- §1.3's census re-run reproduced by the same §1.1 commands at current HEAD
  `34c7c61b`, confirming 80 (zero drift from entry 889's landed state).
- §4.2's call-site map gathered by direct `rg`/`Read`, not inferred; every
  row cites a real line number checked this session.
- `npm test` and `npm run build` green (guard only, same reasoning as §6's
  original bullet — this amendment makes no production change).
