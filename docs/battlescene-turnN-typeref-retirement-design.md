# battleScene.ts TurnN-handoff type-ref retirement design

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

**CONCURRENCY WARNING (from the brief).** The main lane is actively landing
species-dossier slices against `battleScene.ts` (families A/B/C/D/E/F/G/H,
`docs/species-render-entry-point-retirement-design.md`). At this base sha,
species-dossier slices 1, 2, and 5 are already landed (family C healthbox
factories; family D turn-15 Onix gate cluster + family H party literal —
PROGRESS entries 874/875). Slices 3 (family A HP-drain), 4 (capstone
`renderSceneOffTurnView`), and 7 (family B Sitrus wrappers) remain open and
gated. §5 below identifies exactly where this doc's own slices sit in the
same file regions as those three and calls out the ones that need
supervisor serialization. Every citation below is by symbol name; re-grep
line numbers at execution time, they will have drifted.

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

| Slice | Exact symbols touched | Bounded result | Differential windows | Out of scope |
| --- | --- | --- | --- | --- |
| 1. Family S dead-parameter cut | `drawTurn6FightSubmenuWindow` .. `drawTurn15FightSubmenuWindow` (10 functions), `drawFightSubmenuChrome` (delete only its 9 `void`-marked turn5-13 params, keep turn1-4/moveset/resolution params), plus the ~14 call sites inside `drawFightSubmenuWindow`'s own dispatch ladder that currently pass the literal nulls being deleted. Delete the now-dead `import type { TurnNCompletedResolutionNextCommandHandoff }` lines for N=5..13 (9 import refs) once no reference remains — re-grep before deleting each one, don't assume family boundaries are exhaustive. | 54 (S) + 9 (Q's dead Chrome slots) + 9 (imports) = 72 of 144 refs retired in one mechanical slice; zero behavior change (proven dead by §2.2/§2.4, no new test needed beyond keeping the existing shadow-equivalence describe block green). | Full §2.5 table for turns 5-15 (the ranges those functions render) plus `turn5-menu`/`turn5-rockslide` (Family S's own predecessor content flows from turn 5). | Family Q's turn1-4 slots, Family P, Family R. Do not touch `drawFightSubmenuChromeFromCurrentOwner` — different function, Family Q. |
| 2. Family P+Q turn1-4 fold | `currentEpochCompatibilityHandoff`, `turn2CompatibilityHandoff`, `turn3CompatibilityHandoff`, `turn4CompatibilityHandoff`, `isCurrentEpochLifecycleActive`, `currentPresentationEpochAge` (Family P, delete once callers below stop needing them); `drawMenuIdleBaseWithOpponentHp`, `drawActionMenuIdleContent`, `drawActionMenuIdleWindow`, `drawFightSubmenuChromeTurn1Through4PP`, `drawFightSubmenuChrome` (now 4-param after slice 1), `drawFightSubmenuChromeFromCurrentOwner` (Family Q's remaining 6 functions). Add a new `tests/battleSceneFightCommandPresentationTurn1Through4.test.ts` pinning `resolveTurn1FightCommandPresentation()`..`resolveTurn4FightCommandPresentation()` (already exported, currently unused by any test per §2.4) against hand-computed expected field/HP/epoch values before cutting — the Family-S precedent (§2.4) exists for turns 6-15 but nothing pins turns 1-4 yet. | Family P fully retired (10 refs); Family Q's remaining 24 refs retired. Requires slice 1 landed first (touches `drawFightSubmenuChrome`'s signature a second time). | turn1-4 primary windows: turn1-kickoff-off, turn1-cloneanim-off, turn1-rockslide-off, turn1-drain-off, turn2-dragonbreath-off, turn2-endeavor-off, turn3-endeavor-off, turn3-rockslide-off, turn4-doubleteam-off, turn4-rockslide-off; plus turn5-menu/turn6-menu as upstream readers (idle window is shared code). | Family R. |
| 3. Family R bounce-tick helpers | `turn3KickoffBounceTick`, `turn3RockSlideResettledBounceTick`, `turn4SubmenuBounceTick`, `turn4KickoffBounceTick`, `turn4RockSlideResettledBounceTick`, `turn5LegacyResettledBounceTick`, `turn5SubmenuBounceTick`, `turn5KickoffBounceTick` (8 functions, 8 refs). Per §3's Family R risk: before deleting each legacy parameter, name the *exact* semantic tick each formula reads off it (a press tick, a redraw-delay constant, a reset edge) and confirm the generic accessor exposes that same fact, not a same-shaped but differently-anchored one — do this per function, not as one batch assumption. **GATED**: same file region (9976-10026) as species-dossier slice 7 (family B Sitrus wrappers, ~10132-10959) — see §5. | 8 of 144 refs; smallest slice, highest semantic risk in this doc. | turn3-endeavor-off, turn3-rockslide-off, turn4-doubleteam-off, turn4-rockslide-off, turn5-sitrus-a/b/c/d, turn5-switchin, turn5-rockslide (bounce-tick regressions are exactly the "single-tick, small-pixel-count" class the dispatcher doc's risk #1 describes — do not shrink this window list for a passing 0-diff on fewer traces). | Family R's draw-content functions (slice 4). |
| 4a. Family R content, turns 1-3 | `drawDragonBreathScene`, `drawDragonBreathTurnEndSettledMenu`, `drawTurn2KickoffText`, `drawTurn3EndeavorText`, `drawTurn3RockSlideAttack`, `drawTurn3RockSlideTurnEndSettledMenu`, `drawTurn3RockSlideWindow` (7 functions, 11 refs). Depends on slice 2 (reads the same `latest`/`content` locals slice 2 introduces) and slice 3 (calls the retired bounce-tick helpers). | 11 of 144 refs. | turn1-kickoff-off, turn1-cloneanim-off, turn2-dragonbreath-off, turn2-endeavor-off, turn3-endeavor-off, turn3-rockslide-off. | Turns 4-5 (slice 4b). |
| 4b. Family R content, turns 4-6 | `drawTurn4KickoffText`, `drawTurn4RockSlideAttack`, `drawTurn4RockSlideTurnEndSettledMenu`, `drawTurn4RockSlideWindow`, `drawTurn5EndeavorText`, `drawTurn5RockSlideAttack`, `drawTurn5RockSlideWindow`, `drawTurn6FieldBase` (8 functions, 15 refs — includes `drawTurn6FieldBase`'s own `number \| Turn4CompletedResolutionNextCommandHandoff \| null` union parameter, which needs its call-site type-narrowing removed, not just the type deleted, since exactly one caller (`drawTurn5RockSlideWindow`) passes the handoff variant and every other caller passes a plain number). **GATED**: same file region (10081-10698 partial overlap around drawTurn5EndeavorText/drawTurn5RockSlideAttack) as species-dossier slice 7 — see §5. | 15 of 144 refs. | turn3-rockslide-off (upstream reader), turn4-doubleteam-off, turn4-rockslide-off, turn5-sitrus-a/b/c/d, turn5-switchin, turn5-rockslide, turn5-faint. | Turns 1-3 (slice 4a already landed). |
| 5. Final import/fixture cut | Re-run the §1.1 census script; delete the remaining `import type { TurnNCompletedResolutionNextCommandHandoff }` lines for N=1..4,13 once slices 1-4b have removed every reader; delete `tests/`-side fixtures that only existed to feed the deleted signatures (audit with `rg -n 'TurnNCompletedResolutionNextCommandHandoff' tests` first — per §5 below, several of these test names are also used by unrelated `resolveTurnN...`/`TURN*_` imports that must NOT be deleted). | 144 → 0 in `battleScene.ts`, matching `battleMenu.ts`'s existing 0. | Union of slices 1-4b's windows, unmodified capture lists (regression guard, not new coverage). | Any change to `turnNResolutionAdapter.ts`'s own exported `TurnNCompletedResolutionNextCommandHandoff` types — those are legitimately owned by the adapters (their own internal `resolveTurnN...` construction, kept per the dispatcher doc's own scope note: "the turnNResolutionAdapter.ts files keep their own"). This slice only removes `battleScene.ts`'s *imports* of them, never the adapter's own declarations. |

Slices 1 and 2 are ladder-independent and species-independent — no symbol or
tight file-region overlap with any open species-dossier slice, landable
immediately and in either order (1 before 2, since 2 touches
`drawFightSubmenuChrome` a second time). Slices 3, 4a, and 4b are gated per
§5.

## 5. Risks and traps

1. **Slices 3 and 4b collide with species-dossier slice 7 (family B, Sitrus
   wrappers) in the same file region.** `turn5KickoffBounceTick` (9976-10026),
   `drawTurn5EndeavorText` (10081+), and `drawTurn5RockSlideAttack`
   (10612+) sit directly among `onixSitrusRotateMatrix` (~10132),
   `turn5GrantingStarPlacement` (~10177), `turn5SitrusHealTextVisibleChars`/
   `turn5SitrusOnixHp`/`turn5SitrusResettledBounceTick`/
   `onixSitrusTintCoeff`/`turn5SitrusRingMatrix` (10259-10384), and
   `turn5PidgeottoHealthboxSlideDx` (~10959) — species-dossier slice 7's own
   exact file list. Neither program's functions literally share a name, but
   both slices necessarily insert/delete lines throughout this ~1000-line
   span, which is exactly the shape that produces silent context-line merge
   conflicts even when `git merge` reports none the naive way. **Recommend
   the supervisor serialize**: land species-dossier slice 7 and this doc's
   slices 3/4b in sequence on the same branch state, never as concurrent
   worker lanes against the same base sha.
2. **Slice 1 sits near species-dossier slice 3 (family A, HP-drain).**
   `turn9OnixHp` (~12911) and `turn10AerialAceOnixHp` (~13328) fall between
   `drawTurn8FightSubmenuWindow` (12330) and `drawTurn10FightSubmenuWindow`
   (13905) — inside slice 1's own edited range. Lower risk than item 1 (no
   shared local variables, and slice 1's edits are pure deletions that
   shrink line counts predictably), but still worth a rebase check before
   landing, not an assumed-clean merge.
3. **Family R's bounce-tick chain is the exact shape that has already
   produced three real bugs** (turn2/3/4 each hardcoding the wrong
   predecessor's delay constant — dispatcher design doc §"Risks and traps"
   item 1, ISSUES.md:296-303/348-353/394-401). Slice 3 must not treat "same
   field name available on the generic type" as sufficient; it must confirm
   the *tick semantics* match (verified per-function, not per-batch) before
   deleting a legacy parameter, exactly the caution documented at §3.
4. **`drawTurn6FieldBase`'s union parameter is a type-narrowing site, not
   just a declaration.** `bounceTickOrTurn4Handoff: number |
   Turn4CompletedResolutionNextCommandHandoff | null` is narrowed at
   runtime via `typeof bounceTickOrTurn4Handoff === "number"`
   (battleScene.ts:15495-15498) inside the function body. Deleting the
   handoff variant from the type without also fixing this narrowing (and
   its sole non-number caller, `drawTurn5RockSlideWindow`) leaves dead
   runtime branching, not just a dead type — flagged explicitly in slice 4b.
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

## 6. Acceptance for this doc

- Committed as a new file; no `src/`, `tests/`, `PROGRESS.md`, or
  `ISSUES.md` file touched.
- Every count in §1 reproduced by the §1.1 commands at base sha `68718a2a`.
- `npm run test:smoke` and `npm test` green (guard only — this doc makes no
  production change, so this is confirming the baseline, not new coverage).
