# Visual-randomness inputs for accepted-but-not-live moves (S10A prep)

Evidence/design only. Source = `reference/pokeemerald` (paths below are relative to it).
Receipt: `tools/integration/rng2-doublekick-receipt.json` (+ `rng2FrameAdvance.py`), from two
fresh `tools/compare/doubleKickProbe.py` runs on
`tools/battle-lab/mechanic-double-kick-player-nidorina-opponent-onix.json`
(oracle outputs byte-identical across the two runs).

## 1. The generators

- `Random()` = `gRngValue` (`src/random.c:11-16`); `Random2()` = `gRng2Value`
  (`src/random.c:29-33`). Same LCG (`ISO_RANDOMIZE1`), separate state words.
- Every animation draw listed below is `Random2()`. None of these moves reads `Random()`.
- Personality (Dizzy Punch, Teeter Dance) is not random: it is the Spinda-spot input
  (`src/battle_anim_mons.c:2089` `CreateAdditionalMonSpriteForMoveAnim(... personality ...)`, personality read via
  `GetMonData(..., MON_DATA_PERSONALITY)` at `src/battle_anim_effects_3.c:5119/5132`; contest copy 5108).
  The duck/note sprites and `AnimTask_TeeterDanceMovement` (`battle_anim_effects_3.c:5328-5360`) draw nothing.
  `AnimDizzyPunchDuck` (`battle_anim_fight.c:665-682`) has no RNG either (script args are constants,
  `data/battle_anim_scripts.s:1358+`). So `attackerPersonality` only matters when the attacker is Spinda.

## 2. Per-move table

| Move | Config field | Generator / call sites | Draws | Notes |
|---|---|---|---|---|
| ASTONISH (`battle_anim_scripts.s:9411`) | `dropletRandom` | `Random2()` in `AnimSprayWaterDroplet`, `battle_anim_flying.c:1106-1107` (`0x1ff&`, `0x7f&`); 2 sprites via script lines 9415/9417 | 4 (2 per droplet) | arg values 0/1 are dead for RNG |
| DIZZY_PUNCH (`:1358`) | `attackerPersonality` | none (personality, Spinda spots only) | 0 | exact party field |
| DOUBLE_KICK (`:6530`) | `fistRandom` | `AnimFistOrFootRandomPos`, `battle_anim_fight.c:487-492`: x `%xMod`, y `%yMod`, two `&1` sign flips. Anim arg2=1 so the `:478` `%5` draw is skipped | 4 | xMod/yMod from target sprite width/4 (`:483-484`) |
| FLAIL (`:3096`) | `visualRandom`, `movePower` | `AnimHitSplatRandom`, `battle_anim_normal.c:1062-1063` (`%48-24`, `%24-12`); script passes `animation=3` so `:1054` draw skipped. `AnimTask_FlailMovement` is RNG-free (`effects_3.c:2845+`). movePower: `gAnimMovePower` = `gBattleMovePower` emitted at `battle_script_commands.c:1787`, consumed `battle_anim_mon_movement.c:975` (`/12`, clamp 1..16) | 2 | power is a gameplay value (Flail table, `battle_script_commands.c:8314`) the engine already computes |
| LUSTER_PURGE (`:3912`) | `visualRandom` (6 hitsplats) | same `AnimHitSplatRandom`, 6 sprites with `animation=2` (script ~3929-3932+) | 12 | `lusterPurgeSourceAudit.ts:174,223` confirms 6x2 |
| TEETER_DANCE (`:3997`) | `attackerPersonality` | none | 0 | exact party field |
| THRASH (`:2532`) | `fistRandom` | three `gFistFootRandomPosSpriteTemplate` with explicit arg2 0/1/3 -> each 4 draws at `battle_anim_fight.c:487-492` | 12 | |
| MUD_SLAP (`:5220`) / SAND_ATTACK (`:5192`) | 30 seeds (`mudSlap.ts:12-18`, `sandAttack.ts:9-14`) | `AnimDirtScatter`, `battle_anim_ground.c:213-214` (`&0x1F`, clamp to +-16), per dirt sprite | 60 (2 x 30) | already RAM-pinned in `docs/turn13-notes.md:528,772` |

## 3. Scene ON vs OFF gameplay-RNG impact

- In the ROM: **none** for these moves. They only advance `gRng2Value`; `gRngValue` is untouched. The
  only non-animation `Random2()` consumers are `daycare.c:466,476` (reseeded first at `:460`),
  `record_mixing.c:780-913,1108` (reseeds at `:781`), `link_rfu_2.c:2023`, and
  `battle_pyramid.c:991` (floor layout, out-of-battle). So ON/OFF can diverge `gRng2Value` but no battle outcome
  can depend on it. (Caveat to note, not a blocker: `battle_pyramid.c:991` is the one gameplay-visible reader;
  it is not on any current battle path.)
- In our engine: the reducers are pure and take caller-supplied words (`doubleKick.ts:62`: "never advances or owns
  animation/gameplay RNG"; Rain Dance's profile carries `animationRngAtAge0`). `grep Random2|rng2|presentationRng
  src/engine` hits only a comment at `src/engine/battleScene.ts:12063`: the engine has no animation-RNG state at
  all, so there is no path by which presentation can touch gameplay RNG. Any production provider must keep it that way
  (separate generator, never the engine's battle RNG).

## 4. Can production supply gRng2 exactly?

Facts:
- `gRng2Value` is zero-initialised (`COMMON_DATA`, `random.c:9`) and only seeded by `SeedRng2` at
  `record_mixing.c:781` and `daycare.c:460` (no battle path). So at battle time its value is a function of every
  `Random2()` draw since power-on / last such seed.
- It is **not** only advanced by explicit script draws. Receipt: during Double Kick's window (frames 227..262) it
  steps exactly **1** `ISO_RANDOMIZE1` per rendered frame, plus **4** extra at frame 237 (the sprite's four draws:
  one frame + 4 = 5 steps, matches); frames 259-261 show 0 steps (animation over / script idle), 262 back to 1.
  Rain Dance's reducer (`rainDance.ts:199`) already models "per-frame Random2 advance". I did not locate
  the per-frame caller in the decomp C (no `Random2` in a per-frame path under `src/battle_anim*.c` or elsewhere
  by grep), so the exact predicate for "which frames advance" is empirically derived, not source-derived. Treat as open.
- Consequence: the state at an arbitrary body's activation depends on total frames elapsed with the advance active
  and every earlier animation's draws, including animations not yet ported. Production does not track this
  and cannot reconstruct it from battle state alone. Exactness is therefore only available where the value is
  pinned from the oracle for a staged scenario (as the existing adapters do), not for general play.
- Personality is a known party field (`Pokemon.personality`); exact in production.

Practical design: give production a dedicated presentation RNG (LCG `ISO_RANDOMIZE1`, own state, seeded
per battle/anim from a non-gameplay source, or from the staged `animationRngAtAge0` when a scenario pins one). ROM
draw order from section 2 is then replayed to build the word arrays. Output is ROM-faithful in distribution and in
draw order; bit-exact vs ROM only when the pinned seed equals the oracle's gRng2 at activation.

## 5. Recommended order

1. **DIZZY_PUNCH, TEETER_DANCE** - no RNG; supply `attackerPersonality` from the party mon. Exact today. (Only
   visible for Spinda; non-Spinda can pass any legal value.)
2. **FLAIL** - 2 words + `movePower` which is already exact gameplay data (Flail power table); the only provider
   work is the 2-word presentation RNG.
3. **DOUBLE_KICK, THRASH** (4 / 12 words; word consumption needs the same 4-draw split x/y/sign/sign;
   mod limits from target sprite width/height) and **ASTONISH** (4 words, masked).
4. **LUSTER_PURGE** (12 words, 6 hitsplats) - same provider, larger fixture; its slot/placement inputs already exist.
5. **MUD_SLAP, SAND_ATTACK** last (60 words each, plus the sprite-order/overlap residual noted in `turn13-notes.md`).

Provider for 2-5 is the single presentation-RNG helper described in section 4 (one new pure module; no engine
RNG access). For a first adapter, `ordinary-route ON/OFF parity` can assert that the helper never changes the
engine's `rngValue`.

Not done: no source-level identification of the per-frame `gRng2Value` advance; only one move probed.
