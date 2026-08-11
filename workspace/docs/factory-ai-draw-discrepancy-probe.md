# `AI_CV_DefenseUp` / `AI_CV_SpDefUp` "5-6 draws, not 4" — instrument-attributed, root cause found and fixed

Status: MAIN lane, Battle Scene OFF oracle (`http://127.0.0.1:8014`). §§1-6
are the original probe-only session (no `src/` edits, a finding not a fix).
**§7 (new) is a follow-up MAIN-lane step that landed the fix §5 sized** --
`runCvDefenseUp`/`runCvSpDefUp` now model the real DRAW SITE 4/5 chain (see
§7.1) -- and audited every OTHER ported `AI_CV_*` handler for the same
defect class, finding and fixing one more instance in `AI_CV_EvasionUp`
(§7.2/§7.3). Does not edit `docs/factory-ai-checkviability-ground-truth.md`
(side-owned this round); this file stands alone and a future session should
fold a pointer into that doc's §18.4/§22.3-22.4/§24.1.

## TL;DR

`docs/factory-ai-checkviability-ground-truth.md` §18.4 flagged that
`AI_CV_DefenseUp`'s physical-list branch draws `Random()` 5-6 times per
fixture where the "4 identical `MOVE_HARDEN` slots × 1 draw" derivation
predicts exactly 4; §22.3-22.4 found the identical shape recurring on
`AI_CV_SpDefUp`. Both left it an open, unexplained anomaly.

**Verdict: it is a real engine port gap, not noise and not a draw outside
the AI-decision subsystem.** The real ROM's DRAW SITE 4 instruction
(`if_random_less_than 60, ...End`, `data/battle_ai_scripts.s:936`/`:1011`)
does **not** cleanly terminate on failure — its fall-through target is the
very next instruction, which is DRAW SITE 5's *own* `if_random_less_than 60,
...End` (`:938`/`:1013`), confirmed both by a raw ROM byte disassembly
(§4) and by live single-step instrumentation (§3) that watches
`gAIScriptPtr` itself, not just the C-level caller. `AI_CV_DefenseUp`'s
five sites were never five independent alternatives; DRAW SITE 4 and DRAW
SITE 5 are a **chained pair** — reaching site 4 means 1 draw (23.4% chance)
or 2 draws (76.6% chance, chaining into site 5). The ported
`runCvDefenseUp`/`runCvSpDefUp` (`src/engine/factoryAiCheckViability.ts:1528-1534`,
`:1664-1670`) each draw once at DRAW SITE 4 and return unconditionally —
missing the chain. This both under-counts `Random()` draws (explaining the
5-6-vs-4 anomaly exactly: 4 slots × 1-or-2 draws each) **and** over-applies
the -2 score penalty (the real penalty needs *both* rolls to fail, ~58.6%,
not just the first, ~76.6%) whenever this branch is reached. See §5 for the
exact fix shape (not applied this step, per brief scope).

## 1. Background: why the existing probe couldn't resolve this

`tools/probe/attribute-factory-ai-random-callers.py` (PROGRESS entry 455,
reused by §18.4/§22.4) resolves each `Random()` call's *C-level caller* via
its return address (LR). For the handler's own draws that caller is always
`Cmd_if_random_less_than+0x7` — but `Cmd_if_random_less_than`
(`battle_ai_script_commands.c:664-670`) is **one shared C function** that
executes all 144 `if_random_less_than` sites in the entire AI script table
(`data/battle_ai_scripts.s`), not just this handler's five. Every one of
those 144 sites returns to the exact same LR. So the existing probe's own
table (§18.4/§22.4) could show "6 draws from `Cmd_if_random_less_than`" but
had no way to tell whether all 6 were `AI_CV_DefenseUp`'s own sites, some
other handler's sites reached via the same mask-7 decision window (Factory
AI runs `AI_CheckBadMove` + `AI_TryToFaint` + `AI_CheckViability` per move
slot — `data/battle_ai_scripts.s:17-19`, `src/engine/factoryAiDecisionPolicy.ts:467`
"mask 7"), or literally the same DRAW SITE firing more than 4 times. This
is the resolution gap the new probe (§2) closes.

## 2. The instrument: resolving `gAIScriptPtr`, not just the C caller

`gAIScriptPtr` (`src/battle_ai_script_commands.c:154`, `EWRAM_DATA const u8
*gAIScriptPtr`, confirmed at `0x0203ab38` via both `bin/oracle symbols
gAIScriptPtr` and `arm-none-eabi-nm`) is the AI script interpreter's own
instruction cursor. `Cmd_if_random_less_than`'s body
(`battle_ai_script_commands.c:664-670`):

```c
static void Cmd_if_random_less_than(void)
{
    u16 random = Random();
    if (random % 256 < gAIScriptPtr[1])
        gAIScriptPtr = T1_READ_PTR(gAIScriptPtr + 2);
    else
        gAIScriptPtr += 6;
}
```

only *advances* `gAIScriptPtr` **after** `Random()` returns — so at the
exact single-step tick where `cpu.pc` lands on `Random()`'s entry address
(the same detection the precedent probe already uses), `gAIScriptPtr` still
points at the **start of the firing `if_random_less_than` instruction
itself**. Reading it at that tick, one more EWRAM word read alongside the
existing `cpu.lr` read, positively identifies *which* of the 144 AI-script
sites fired — no LCG inversion, no new breakpoint mechanism, same
single-step-only-the-flagged-frames design as the precedent (hardware exec
breakpoints still segfault on this libmgba-py build, exit 139).

The new probe,
**`tools/probe/attribute-factory-ai-cv-drawsite-callers.py`**, extends the
precedent's two-pass recipe (pass 1: fast `sRandCount`-delta frame scan;
pass 2: targeted single-step only through flagged frames) with:

- A `gAIScriptPtr` read at every `Random()`-entry hit, resolved against a
  full bisection table of all 697 `arm-none-eabi-nm`-defined `AI_`-prefixed
  data symbols (every CBM/CV/other handler label `data/battle_ai_scripts.s`
  assembles, not just the two this probe targets) — so a hit resolves to
  `<nearest label>+0x<offset>` regardless of which script it came from.
- A hand-verified `DRAW_SITE_TABLE` naming the five `(label, offset)` pairs
  that are `AI_CV_DefenseUp`'s/`AI_CV_SpDefUp`'s own DRAW SITEs 1-5 (offsets
  independently confirmed by the raw byte walk in §4, cross-checked against
  the doc's own §18.1/§22.1 assembly citations).
- A `classify()` step producing one of four categories per draw:
  `ai-decision-policy-own` (one of the ten known handler sites),
  `ai-decision-other-script` (an `if_random_less_than`-family draw whose
  `gAIScriptPtr` does **not** match any of the ten — i.e. a positively
  identified *different* AI script region, not a guess), `known-outside`
  (the same non-handler C callers §18.4/§22.4 already named:
  `BattleAI_SetupAIData`, `BattleTurnPassed`, `ChooseMoveOrAction_Singles`,
  `Cmd_accuracycheck`, `Cmd_adjustnormaldamage`, `Cmd_critcalc`,
  `Cmd_damagecalc`), or `hit-chain-proc` (`Cmd_seteffectwithchance`).
- A PASS/FAIL check: pass-1's window total must equal pass-2's hit count
  (every delta independently reproduced), **and** every single hit must
  carry a non-empty classification (an `OTHER`/`ai-decision-other-script`
  bucket is a legitimate answer; a hit with no category at all means the
  script's own logic broke, not that the anomaly is unexplained). All five
  live runs below report `PASS`.

Usage (same teardown-segfault-tolerant wrapper as every other mGBA probe in
this repo):

```sh
python3 tools/run-mgba-probe.py /tmp/out.json -- \
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
    tools/probe/attribute-factory-ai-cv-drawsite-callers.py \
    tools/battle-lab/mechanic-factory-ai-cv-defenseup-physicallastmove-off.json \
    /tmp/out.json \
    0 732
```

(Window `0 732` matches §18.4/§22.4's own citation — the whole trace, not
just the `>100` default the precedent script uses standalone.)

## 3. Live attribution: five fixtures, all `PASS`, all fully reconciled

All runs: seed 1, `tools/run-mgba-probe.py` accepted the known teardown
SIGSEGV (fresh JSON parsed clean each time), window `(0, 732]`.

### 3.1 `AI_CV_DefenseUp` — `defenseup-physicallastmove` (Seismic Toss, the doc's primary physical-list fixture)

Window total **14**, matching §18.4's own live ledger exactly.

| Frame | sRandCount (before) | Caller function | AI-script address | Category |
| -: | -: | --- | --- | --- |
| 285 | 8867 | `Cmd_accuracycheck+0x305` | `AI_CV_DefenseUp_End` | known-outside (real move's own accuracy roll) |
| 447 | 8868 | `Cmd_seteffectwithchance+0x81` | `AI_CV_DefenseUp_End` | hit-chain-proc |
| 457 | 8869 | `BattleTurnPassed+0x157` | `AI_CV_DefenseUp_End` | known-outside |
| 465 | 8870 | `BattleAI_SetupAIData+0x83` | `AI_CV_DefenseUp_End` | known-outside |
| 465 | 8871 | `BattleAI_SetupAIData+0x83` | `AI_CV_DefenseUp_End` | known-outside |
| 465 | 8872 | `BattleAI_SetupAIData+0x83` | `AI_CV_DefenseUp_End` | known-outside |
| 465 | 8873 | `BattleAI_SetupAIData+0x83` | `AI_CV_DefenseUp_End` | known-outside |
| 465 | **8874** | `Cmd_if_random_less_than+0x7` | **`AI_CV_DefenseUp4+0x1c`** | **ai-decision-policy-own — DRAW SITE 4, slot 1** |
| 465 | **8875** | `Cmd_if_random_less_than+0x7` | **`AI_CV_DefenseUp4+0x1c`** | **ai-decision-policy-own — DRAW SITE 4, slot 2** |
| 465 | **8876** | `Cmd_if_random_less_than+0x7` | **`AI_CV_DefenseUp4+0x1c`** | **ai-decision-policy-own — DRAW SITE 4, slot 3 (fails)** |
| 465 | **8877** | `Cmd_if_random_less_than+0x7` | **`AI_CV_DefenseUp5`** | **ai-decision-policy-own — DRAW SITE 5, chained from slot 3** |
| 465 | **8878** | `Cmd_if_random_less_than+0x7` | **`AI_CV_DefenseUp4+0x1c`** | **ai-decision-policy-own — DRAW SITE 4, slot 4 (fails)** |
| 465 | **8879** | `Cmd_if_random_less_than+0x7` | **`AI_CV_DefenseUp5`** | **ai-decision-policy-own — DRAW SITE 5, chained from slot 4** |
| 465 | 8880 | `ChooseMoveOrAction_Singles+0xf7` | `AI_CV_DefenseUp_End` | known-outside (tie-break) |

Categories: `known-outside`×7, `hit-chain-proc`×1, `ai-decision-policy-own`×6.
`check.PASS = true` (reconciled 14/14, every hit classified).

**Reading the chain**: four `AI_CV_DefenseUp` invocations (Anorith's four
identical `MOVE_HARDEN` slots) all land at DRAW SITE 4 (Gate F true — the
target's last move, Seismic Toss, is in the physical-types list). Slots 1
and 2's own DRAW SITE 4 roll succeeds (`random%256 < 60`) and stops there —
1 draw each. Slots 3 and 4's DRAW SITE 4 roll **fails**
(`random%256 >= 60`) and, per the real ROM's own fall-through (§4), lands
directly on DRAW SITE 5's instruction for a second roll — 2 draws each.
Total: 1+1+2+2 = **6**, not the naively-derived 4.

### 3.2 `AI_CV_DefenseUp` — `defenseup-lowhp-control` (Vital Throw, second independent fixture)

Window total **14**. Identical shape, different move/RNG-stream position up
to this point, same 4-slot/6-draw split at frame 479:
`AI_CV_DefenseUp4+0x1c` ×4 interleaved with `AI_CV_DefenseUp5` ×2 in the
exact same slot-3/slot-4-fail pattern as §3.1. Categories: `known-outside`×7,
`hit-chain-proc`×1, `ai-decision-policy-own`×6. `check.PASS = true`.

### 3.3 `AI_CV_DefenseUp` — `defenseup-nonphysicallastmove` (Dragon Rage, negative control)

Window total **8**, matching §18.4's own ledger. **Zero**
`ai-decision-policy-own` draws — Gate F routes straight to `ScoreDown2`
since Dragon Rage is not in the physical-types list, so DRAW SITE 4/5 are
never reached at all. Categories: `known-outside`×7, `hit-chain-proc`×1.
`check.PASS = true`. This is the probe's own sanity check: it does not
manufacture a handler draw where the branch topology says there shouldn't
be one.

### 3.4 `AI_CV_SpDefUp` — `spdefup-cosmicpower-reach` (Dragon Rage — the "reach" fixture for this handler, since Gate F's polarity is inverted vs `DefenseUp`, doc §22.1-22.2)

Window total **14**, matching §22.3's own ledger. Frame 559:
`AI_CV_SpDefUp4+0x1c` ×4 / `AI_CV_SpDefUp5` ×2, **the same exact
slot-3/slot-4-fail interleaving pattern as `AI_CV_DefenseUp`'s own two
fixtures above** (byte-identical chain shape, confirmed live on the second
handler, not just derived by analogy). Categories: `known-outside`×7,
`hit-chain-proc`×1, `ai-decision-policy-own`×6. `check.PASS = true`.

### 3.5 `AI_CV_SpDefUp` — `spdefup-cosmicpower-control` (Seismic Toss, negative control)

Window total **8**, matching §22.3's own ledger. **Zero**
`ai-decision-policy-own` draws (Gate F's inverted polarity routes the
physical-list case straight to `ScoreDown2` here, the mirror image of
§3.3). Categories: `known-outside`×7, `hit-chain-proc`×1. `check.PASS = true`.

**All five runs' `known-outside`/`hit-chain-proc` tables are caller-for-caller
identical in composition to §18.4's/§22.4's own prior (coarser) attribution**
— this new probe does not contradict the old one anywhere, it just resolves
what "`Cmd_if_random_less_than+0x7` × 6" actually was.

## 4. Root cause: DRAW SITE 4 falls through into DRAW SITE 5, not to a stop

Raw ROM byte walk (`pokeemerald.gba`, addresses confirmed against
`arm-none-eabi-nm`'s local data symbols — the same technique the doc's own
§18.1/§22.1 assembly listings were transcribed from, just carried one level
further into the actual encoded bytes rather than trusting the source
labels' visual layout):

```
AI_CV_DefenseUp4:            0x082dcc28  (7 bytes: if_hp_less_than AI_USER,40,ScoreDown2)
  (get_last_used_bank_move / get_move_power_from_result / if_equal 0 / …
   get_move_type_from_result / if_not_in_bytes …)          -- Gates D/E/F, 0x082dcc2f-0x082dcc43
DRAW SITE 4:                 0x082dcc44  (6 bytes: 00 3c [ptr->0x082dcc52=End])
                                          opcode=0x00 (if_random_less_than), threshold=0x3c(60)
                                          -- on success: jumps to 0x082dcc52 (End)
                                          -- on failure: gAIScriptPtr += 6  ==>  0x082dcc44+6 = 0x082dcc4a
AI_CV_DefenseUp5:             0x082dcc4a  (6 bytes: 00 3c [ptr->0x082dcc52=End])  <-- DRAW SITE 4's own failure lands EXACTLY here
DRAW SITE 5 == AI_CV_DefenseUp5's own instruction, offset +0
AI_CV_DefenseUp_ScoreDown2:   0x082dcc50  (score -2)
AI_CV_DefenseUp_End:          0x082dcc52  (end)
```

`0x082dcc44 (DRAW SITE 4's own address) + 6 bytes (its own instruction
length) == 0x082dcc4a == AI_CV_DefenseUp5's own label address, exactly.`
There is no separate "else" branch, no score adjustment, and no additional
gate between them — DRAW SITE 4's failure path *is* DRAW SITE 5's own
`if_random_less_than` instruction. `AI_CV_SpDefUp` is byte-identical in
this region (`AI_CV_SpDefUp4` DRAW SITE 4 at `0x082dccfb`, 6 bytes, failure
target `0x082dccfb + 6 = 0x082dcd01 == AI_CV_SpDefUp5`'s own label,
confirmed the same way).

This was **already visible in the doc's own §18.1/§22.1 assembly
citations** — the `AI_CV_DefenseUp5:`/`AI_CV_SpDefUp5:` labels sit directly
below DRAW SITE 4's own line with no `goto`/`end` between them — but the
doc's prose framed Gate E (`if_equal 0, ...DefenseUp5`) and Gate F
(`if_not_in_bytes ..., ...ScoreDown2` / DRAW SITE 4) as the two ways to
*reach* `AI_CV_DefenseUp5`, without separately calling out that DRAW SITE
4's own *failure* is a **third**, un-gated way to reach the identical
address. Net behavior once Gate F is true (this branch reached at all):

| DRAW SITE 4 roll | DRAW SITE 5 roll | Draws consumed | Score delta |
| --- | --- | -: | -: |
| succeeds (`<60`, 23.4%) | (not reached) | 1 | 0 |
| fails (`>=60`, 76.6%) | succeeds (`<60`, 23.4%) | 2 | 0 |
| fails (`>=60`, 76.6%) | fails (`>=60`, 76.6%) | 2 | **-2** |

Real probability of the -2 penalty, given Gate F true: `(196/256)^2 ≈
58.65%`. Expected draws per invocation: `1×0.234 + 2×0.766 ≈ 1.766`; over
4 identical move-slot invocations, expected total draws at this branch
`≈ 7.06`, with the realized per-seed value bounded between 4 (all four
slots succeed on their first roll) and 8 (all four slots fail their first
roll) — the doc's own observed 5-6 (and cross-seed 13/14 window totals) are
simply draws from that same distribution, not a second anomaly.

## 5. The engine gap (finding only — this section is the ORIGINAL probe-only session's own framing; fixed in §7.1 below)

`src/engine/factoryAiCheckViability.ts`:

```ts
// runCvDefenseUp, :1528-1534
const draw4 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw4`);
rng = draw4.after;
const succeeded4 = draw4.randomValue % 256 >= 60;
draws.push(Object.freeze({ ...draw4, kind: "defense-up-roll-4" as const, succeeded: succeeded4 }));
if (succeeded4) score -= 2;
return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score });
```

and the byte-for-byte-identical shape in `runCvSpDefUp` (`:1664-1670`):
both draw exactly once at DRAW SITE 4, and on `succeeded4` (the real ROM's
own **failure** condition, `random%256 >= 60` — the port's naming inverts
the real assembly's success/fail framing, which is fine as an
implementation choice but is worth flagging for whoever touches this next)
apply `score -= 2` immediately and return, with no second roll. This is a
real behavioral gap, not just an RNG-bookkeeping cosmetic:

1. **Under-draws `Random()`** by exactly 1 whenever DRAW SITE 4's own roll
   fails (~76.6% of the time this branch is reached) — every downstream
   draw ordinal in the same decision after this point would desync from the
   real ROM's own RNG stream if this handler is ever chained with something
   that consumes further draws later in the same window (nothing currently
   does, per the existing Tier-1 tests' own pinned counts, which is exactly
   why this has stayed latent).
2. **Over-applies the -2 score penalty**: the port's ~76.6% chance of -2
   should be ~58.65% (both rolls must fail, not just the first). A close
   score comparison between two candidate moves could flip which move the
   Factory AI picks whenever this branch's outcome is the deciding factor
   — this is a real, if narrow, behavioral incorrectness beyond the raw
   draw-count mismatch.

**Recommended fix shape** (sizing for a future step, not applied here):
replace the single `draw4`/`succeeded4`/return block in both
`runCvDefenseUp` and `runCvSpDefUp` with the real chain — draw at DRAW SITE
4; if the real ROM's success condition holds (`randomValue % 256 < 60`),
return with no score change; else draw again at DRAW SITE 5 with the same
`< 60` success semantics; if *that* succeeds, still return with no score
change; only if *both* fail, apply `score -= 2` and return. Given
`runCvDefenseUp`/`runCvSpDefUp` are already near-byte-identical (this doc's
own §22.1, and PROGRESS entry 489's own precedent of factoring shared CV
tails into one body, e.g. `runCvStatDown`), the fix likely belongs as one
shared helper both handlers call, not two independent edits — but that's a
next-step design decision, not this step's to make. Existing Tier-1 tests
that pin the derived "4 draws" count for these two handlers' physical-list
branch (per the brief: "every port since documents the discrepancy and
moves on") will need updating alongside the fix — they currently encode the
*wrong* (pre-this-probe) behavior as correct.

## 6. Rerunning this probe

```sh
python3 tools/run-mgba-probe.py /tmp/out.json -- \
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
    tools/probe/attribute-factory-ai-cv-drawsite-callers.py \
    <fixture.json> /tmp/out.json 0 732
```

Fixtures used this session (all `tools/battle-lab/`, read-only, unmodified):
`mechanic-factory-ai-cv-defenseup-physicallastmove-off.json`,
`mechanic-factory-ai-cv-defenseup-lowhp-control-off.json`,
`mechanic-factory-ai-cv-defenseup-nonphysicallastmove-off.json`,
`mechanic-factory-ai-cv-spdefup-cosmicpower-reach-off.json`,
`mechanic-factory-ai-cv-spdefup-cosmicpower-control-off.json`. The script
exits non-zero (after still writing its JSON) if the PASS check fails, so a
future rerun after a `src/` fix, or against `spdefup-calmmind-*` (byte-
identical dispatch to `cosmicpower-*` per doc §22.3, not independently rerun
this session for time), self-validates the same way.

## 7. Rung 2: the fix, and a whole-surface audit for the same defect class

Follow-up MAIN-lane step (Battle Scene OFF oracle). Landed the fix §5
sized, then mechanically audited every OTHER ported `AI_CV_*` handler in
`src/engine/factoryAiCheckViability.ts` against `reference/pokeemerald/data/
battle_ai_scripts.s` for the identical defect class: for each
`if_random_less_than` site in a dispatched handler's own range, is its
literal fall-through (the very next instruction in the assembly, taken on a
failed roll) another `if_random_less_than` (a **chain** — a second draw is
mandatory, and any score/goto attached to the FIRST site alone is wrong) or
a deterministic action (`score ±N` / `goto` / label fall-into-a-gate — a
single, self-contained draw, safe to model independently)? The CBM side
(`AI_CheckBadMove`, `data/battle_ai_scripts.s:51-651`) has **zero**
`if_random_less_than` occurrences anywhere in its body (confirmed by direct
grep over that exact line range) — the brief's own expectation that it is
"if_random-free" and therefore trivially clean of this defect class is
CONFIRMED, not just assumed.

### 7.1 The fix (rung 1)

`runCvDefenseUp`/`runCvSpDefUp` (`factoryAiCheckViability.ts`) now draw at
DRAW SITE 4; a roll `< 60` stops immediately with no penalty (unchanged);
a roll `>= 60` no longer applies `-2` on the spot — it draws again at DRAW
SITE 5 (same `< 60` stop / `>= 60` semantics), and `-2` fires only when
*that* second roll also fails. Net penalty probability given the branch is
reached: `(196/256)^2 ≈ 58.65%`, matching §4's derivation exactly, not the
old single-roll ~76.6%. Tier-1: three-outcome tests added for both handlers
(pass@4, fail@4+pass@5, fail@4+fail@5) — `tests/factoryAiCheckViability.test.ts`.

**Mask-7 fixture reconciliation (the brief's own requested before/after
numbers):** the two mask-7 physical-list reproduction tests in
`tests/factoryAiScoredDecision.test.ts` (`AI_CV_DefenseUp` §18.3/§18.4
block) and the `AI_CV_SpDefUp` reach fixture (§22.2/§22.3 block) previously
asserted a hard-coded **4** check-viability draws per fixture (the "always
4, one per identical Harden/CosmicPower slot" derivation this doc's own §1
already showed was wrong). Re-run against the FIXED handler at the exact
same seed (1) and RNG-stream offset: all three now reproduce **7** draws
(slot-by-slot: fail@4+fail@5 / fail@4+fail@5 / pass@4 / fail@4+pass@5 = 2+2+1+2
= 7), landing inside the fixed model's own valid `[4,8]`-draw range (4 slots
× 1-or-2 draws each) instead of the old buggy model's impossible-to-miss
fixed 4. This test's own RNG seed/ordinal position is a construction-site
convenience, not a replay of the live ROM's own RNG stream at the fixture's
real frame — so its 7 does not need to equal §3.1's live-probed 6
number-for-number (different position in the same LCG stream almost never
lands on the same values), and the two numbers do NOT need to reconcile
against each other. **What reconciles to exactly zero unexplained is the
MECHANISM**: before this step, "5-6 draws when 4 were derived" was an open,
unattributed anomaly (§18.4/§22.3-22.4's own original wording); after this
step, every draw count observed anywhere (the live probe's 6, this test's
7, and the theoretical `[4,8]` range) is fully explained by the same single
rule — each of the 4 identical slots independently draws once (passes) or
twice (fails and chains) — with no residual unattributed component. The
handler's own contribution is no longer claimed to be "EXACTLY 4"; the old
per-fixture doc comments asserting that (both in
`tests/factoryAiScoredDecision.test.ts` and in `runCvDefenseUp`'s own
source-level doc comment, which separately claimed DRAW SITE 4/5 were
"mutually exclusive") have been corrected in place, not left standing next
to the fix.

### 7.2 The audit table

One row per `if_random_less_than` site inside each of the 18 dispatched
`AI_CV_*` handler bodies (`factoryAiCheckViability.ts`'s own `runCheckViability`
dispatch shell, `:2172` on — the complete list of move-effect names that
reach a real handler, confirmed by grep, not estimated). "Fall-through kind"
is the literal next instruction after a *failed* roll, read straight off
`reference/pokeemerald/data/battle_ai_scripts.s`. "Port models it?" is
OK (the port's own control flow matches) or BUG (it doesn't — chain
collapsed into a single draw + immediate action).

| Handler | Site (asm line) | Fall-through kind | Port models it? |
| --- | --- | --- | --- |
| `AI_CV_SpeedDown` | `:1148` | `score +2` (deterministic) | OK |
| `AI_CV_Pursuit` | `:2032` | `score +1` (deterministic) | OK |
| `AI_CV_HighCrit` | `:1454` (site 1) | **chain** → `AI_CV_HighCrit2`'s own roll (`:1457`) | OK (already modeled: `jumpedToEnd`/fallthrough-roll pair) |
| `AI_CV_HighCrit` | `:1457` (site 2) | `score +1` (deterministic) | OK |
| `AI_CV_AlwaysHit` | `:1085` | `score +1` (deterministic; `ScoreUp1`'s own `score +1` falls into this SAME site, not a second draw) | OK |
| `AI_CV_VitalThrow` | `:1540` (midband) | **chain** → `AI_CV_VitalThrow2`'s own roll (`:1542`) | OK (already modeled: `jumpedToEnd`/fallthrough-roll pair) |
| `AI_CV_VitalThrow` | `:1542` (site 2) | `score -1` (deterministic) | OK |
| `AI_CV_AttackDown` | `:1097` (site 1) | `score -2` (deterministic) | OK |
| `AI_CV_AttackDown` | `:1107` (site 2) | `score -2` (deterministic) | OK |
| `AI_CV_DefenseDown` | `:1128` | `score -2` (deterministic) | OK |
| `AI_CV_SpDefDown` | `:1190` | `score -2` (deterministic) | OK |
| `AI_CV_AttackUp` | `:898` (site 1) | `score -1` + `goto AttackUp3` (deterministic) | OK |
| `AI_CV_AttackUp` | `:904` (site 2) | `score +2` (deterministic) | OK |
| `AI_CV_AttackUp` | `:909` (site 3) | `score -2` (deterministic) | OK |
| `AI_CV_DefenseUp` | `:917` (site 1) | `score -1` + `goto DefenseUp3` (deterministic) | OK |
| `AI_CV_DefenseUp` | `:923` (site 2) | `score +2` (deterministic) | OK |
| `AI_CV_DefenseUp` | `:927` (site 3) | falls into `DefenseUp4`'s own HP gate (deterministic, no roll immediately) | OK |
| `AI_CV_DefenseUp` | `:936` (site 4) | **chain** → `AI_CV_DefenseUp5`'s own roll (`:938`) | **was BUG — FIXED this step (§7.1)** |
| `AI_CV_DefenseUp` | `:938` (site 5) | `score -2` (deterministic, terminal) | OK |
| `AI_CV_AccuracyDown` | `:1202`/`:1206`/`:1210`/`:1214`/`:1218`/`:1222` (sites 1-6) | `score ±N` each (deterministic) | OK (all 6 — includes the brief's own highest-risk "never staged live" sites) |
| `AI_CV_AccuracyDown` | `:1229` (site 7) | `score -2` (deterministic, terminal, OPPOSITE polarity) | OK |
| `AI_CV_SpeedUp` | `:962` | `score +3` (deterministic) | OK |
| `AI_CV_SpAtkUp` | `:969` (site 1) | `score -1` + `goto SpAtkUp3` (deterministic) | OK |
| `AI_CV_SpAtkUp` | `:975` (site 2) | `score +2` (deterministic) | OK |
| `AI_CV_SpAtkUp` | `:980` (site 3) | `score -2` (deterministic) | OK |
| `AI_CV_SpDefUp` | `:988` (site 1) | `score -1` + `goto SpDefUp3` (deterministic) | OK |
| `AI_CV_SpDefUp` | `:994` (site 2) | `score +2` (deterministic) | OK |
| `AI_CV_SpDefUp` | `:998` (site 3) | falls into `SpDefUp4`'s own HP gate (deterministic) | OK |
| `AI_CV_SpDefUp` | `:1007` (site 4) | **chain** → `AI_CV_SpDefUp5`'s own roll (`:1009`) | **was BUG — FIXED this step (§7.1), byte-identical to DefenseUp** |
| `AI_CV_SpDefUp` | `:1009` (site 5) | `score -2` (deterministic, terminal) | OK |
| `AI_CV_LightScreen` | `:1379` | `score -2` (deterministic, terminal) | OK |
| `AI_CV_Reflect` | `:1498` | `score -2` (deterministic, terminal) | OK |
| `AI_CV_EvasionUp` | `:1039` (site 1) | `score +3` (deterministic) | OK |
| `AI_CV_EvasionUp` | `:1043` (site 2) | `score -1` (deterministic) | OK |
| `AI_CV_EvasionUp` | `:1048` (site 3) | **chain** → `AI_CV_EvasionUp4`'s own roll (`:1050`) | **was BUG — found by THIS audit, FIXED this step (§7.3)** |
| `AI_CV_EvasionUp` | `:1050` (site 4) | `score +3` (deterministic, terminal from the chain; also a separate direct-entry site when own HP > 50%) | OK |
| `AI_CV_EvasionUp` | `:1054` (site 5) | `score +3` (deterministic) | OK |
| `AI_CV_EvasionUp` | `:1058` (site 6) | `score +2` (deterministic) | OK |
| `AI_CV_EvasionUp` | `:1062` (site 7) | `score +3` (deterministic) | OK |
| `AI_CV_EvasionUp` | `:1069` (site 8) | `score -2` (deterministic, terminal, OPPOSITE polarity) | OK |
| `AI_CV_EvasionDown` | `:1239` | `score -2` (deterministic) | OK |

46 sites audited across all 18 dispatched handlers (the remaining ~98 of
the file's 144 total `if_random_less_than` sites belong to handlers this
port never dispatches — e.g. `AI_CV_Rest`, `AI_CV_Trap`, `AI_CV_Confuse`,
`AI_CV_RainDance` — out of this audit's scope, not silently skipped). Two
BUGs found, both fixed this step; every other site's fall-through is either
a self-contained deterministic action or an already-correctly-modeled
chain (`HighCrit`, `VitalThrow`).

### 7.3 `AI_CV_EvasionUp`'s own instance (found by this audit, not by a fixture)

`AI_CV_EvasionUp`'s Gates C/D (`:1046-1050`, only reached when the target is
toxic-poisoned) were ported (`runCvEvasionUp`, entry 489) as two **mutually
exclusive** single-draw sites, keyed on the opponent's own HP: > 50% reaches
DRAW SITE 4 alone; <= 50% reaches DRAW SITE 3 alone. The port's own doc
comment stated this explicitly ("never both in the same pass"). The raw
assembly disproves it exactly the same way §4 disproved `DefenseUp`'s
"DRAW SITE 4/5 are two alternatives": `AI_CV_EvasionUp4`'s own label sits
immediately below DRAW SITE 3's own `if_random_less_than 80, ...5`
instruction with nothing between them, so a failed DRAW SITE 3 roll
(`>= 80`) falls straight into DRAW SITE 4's OWN roll — the identical
chain shape, one handler and one branch-condition later in the same file.
This site was flagged by the brief as high-risk *precisely because* the
one banked live fixture for `AI_CV_EvasionUp` (§24.3's mask-7
reproduction) never sets the target's toxic-poison status, so it could
never have exercised Gates C/D at all, let alone the `<= 50%` HP band that
hides the chain — a fixture gap, not a probe gap; this bug could only be
found by reading the assembly, which is exactly what this audit did.
Fixed the same way as §7.1 (chain the failure into a second draw; three-
outcome Tier-1 tests: pass@3, fail@3+pass@4, fail@3+fail@4). The direct
`own HP > 50%` entry into DRAW SITE 4 alone is untouched — it was never
part of the chain and stays a single, independent draw.

### 7.4 What this audit did NOT re-verify

This audit is a **static, mechanical cross-check** (source-vs-port control
flow only) — it does not re-run live oracle fixtures against every
handler's own probability distribution (that would be a much larger
per-handler live-probe campaign, out of this step's time budget). Where a
handler's own body was already covered by a live-staged fixture (most of
them — every handler except the ones the brief names below), that fixture's
own draw-COUNT assertions remain the load-bearing check that the STATIC
analysis here is consistent with a REAL run; where a handler was flagged in
the brief as never staged live at all (`AI_CV_AccuracyDown` sites 2-6,
`AI_CV_EvasionUp` sites 2-7 before this step), this audit's own static
result is the only evidence for those specific sites' fall-through shape —
still a real, source-level finding (the assembly does not lie about its own
byte layout), just not independently corroborated by a fresh oracle
capture the way §3's live single-step instrumentation corroborated §4's own
byte walk for `DefenseUp`/`SpDefUp`. A future session with oracle time to
spare could extend §2's own `attribute-factory-ai-cv-drawsite-callers.py`
probe (parameterized by `DRAW_SITE_TABLE`) to `AI_CV_EvasionUp`'s own toxic-
poisoned/low-HP fixture (none currently staged in `tools/battle-lab/` —
would need a new fixture, not just a new probe run) for the same live
corroboration this doc's §3 already has for `DefenseUp`/`SpDefUp`.
