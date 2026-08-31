# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## R63 — [supervised session, 2026-08-31, unattended] **M60 `Cmd_tryinfatuating` leaf + green checkpoint**

- **State:** `rust-main` = R62 checkpoint `a87441049` plus the verified Sonnet
  worker `2c3db4311` (fast-forward). The pure `B_SCR_OP_TRYINFATUATING`
  registration/handler projection is native and wasm32-compilable, reusing
  the existing `battle_script_gender` and `battle_script_ai_reveal` ports; no
  ABI, adapter, recovery module, canonical TS, or npm file was touched.
- **Did:** worker (claude-sonnet-5, 55-min cap, one commit) ported the
  first-match registration (TS validates only presence), required
  attacker/target roles, the Oblivious branch (`lastUsedAbility = 12`,
  ability-reveal record, hardcoded `BattleScript_ObliviousPreventsAttraction`
  pc 2996), the four-way non-short-circuit fail set (same gender, target
  already infatuated by any battler, either genderless) to the operand label,
  and the success write `status2 |= 1 << (16 + attacker)`. Canonical TS
  supplies **953 behavior** and **3 registration** cases; corpus sha256
  `74da7fe4ce04d2721a87ca45021bcc5f9639a4506840a939e8f59a4970b05a81`.
- **Next:** at the next session merge master, re-run the four Rust gates,
  and continue down the unported pure leaves: `Cmd_tryswapabilities`
  (Skill Swap, two ability bytes), `Cmd_trywish`, then
  `Cmd_rolloutdamagecalculation`; re-check ISSUES/PROGRESS for TS-lane
  activity on each before briefing. No deferral is open.
- **Notes:** supervisor audit covered branch order against
  `battle_script_commands.c:7654-7696`, the infatuation bit/mask constants
  (`battle.h:142-143`), reveal no-op semantics, and generator provenance;
  independent regeneration was byte-identical. The worker reported the brief's
  suggested gender-ratio class 225 does not exist in `species-stats.json`
  (actual: 0/31/63/127/191/254/255) and covered 63 instead. Generated Rust is
  **3,600,294 bytes**, sha256
  `8a0c2e9f8deaeec3f2e22057c8d3ab19ca93401c4c0aae554f24659348ae7ee1`;
  generator is **33,294 bytes**, sha256
  `9296e023886c2b4d666c00e93d869a5ccfb3f83d3cd34f1a4132322bf57c9cfa`.
  Gates in the worker tree and again on `rust-main`: **1,128/1,128**, fmt,
  strict workspace Clippy, wasm32 release. Artifact is **507,097 bytes**,
  sha256 `d8151da186000a2fa909f4ddc486cc2c2726048a71b8f8bb2ce46750fa8999f0`.
  No npm gate required; no deferral or barrier added. R60 archived.

## R62 — [supervised session, 2026-08-31, unattended] **M59 `Cmd_trysetperishsong` leaf + green checkpoint**

- **State:** `rust-main` = R61 checkpoint `350b978a0` plus the verified Sonnet
  worker `91b6bbab6` (fast-forward). The pure `B_SCR_OP_TRYSETPERISHSONG`
  registration/handler projection is native and wasm32-compilable; no ABI,
  adapter, recovery module, canonical TS, or npm file was touched. Session
  still active; `Cmd_tryinfatuating` dispatching as the final leaf.
- **Did:** worker (claude-sonnet-5, 60-min cap, one commit) ported the
  single-start registration (opcode `0xB2`, dispatcher, one 4-byte failure
  operand), pass 1 over `battlersCount` (already-sung or Soundproof →
  not-affected; else `status3 |= PERISH_SONG`, timer 3, start value 3), pass
  2 `PressurePPLoseOnUsingPerishSong` (first Perish Song slot, one decrement
  per other Pressure holder, floor at zero, write-only-if-changed), and the
  all-not-affected late-label jump vs advance — both carrying the mutated
  rules. Canonical TS supplies **789 behavior** and **10 registration**
  cases; corpus sha256
  `4854061de9011da05d6d8fc26e0d5baec66e7483607ddf464fe36ba91102f5a2`.
- **Next:** verify/fold the `Cmd_tryinfatuating` worker if it lands green
  before the 12:24 UTC deadline (brief: reuse `gender.rs`,
  `species_gender_ratios_gen.rs`, `battle_script_ai_reveal.rs`; Oblivious
  hardcoded label pc 2996; four-way fail to operand label; success writes
  `1 << (16 + attacker)`); otherwise reject it unfolded and leave it for the
  next session. After that the next unported pure leaves are
  `Cmd_tryswapabilities`, `Cmd_trywish`, `Cmd_rolloutdamagecalculation`.
- **Notes:** supervisor audit covered both passes against
  `battle_script_commands.c:8508-8534` / `battle_util.c:799-830`, the
  snapshot-vs-progressive read equivalence (pass 2 reads only fields pass 1
  never writes), label handling, and generator provenance; independent
  regeneration was byte-identical. Generated Rust is **4,636,075 bytes**,
  sha256 `063e6a1787ea8f26a711687509274d6127ea6486f3f767fbdb2a41904de6470a`;
  generator is **40,832 bytes**, sha256
  `a3d348fe6da851ed08c555d0677fccb5d2135af7879c462cffc2208e0b61c297`.
  Gates in the worker tree and again on `rust-main`: **1,111/1,111**, fmt,
  strict workspace Clippy, wasm32 release. Artifact is **507,097 bytes**,
  sha256 `ee336b0928555b33ce10eacf33ba8918ded1596a5adc7198e22215eb95b3a75b`.
  No npm gate required; no deferral or barrier added. R59 archived.

## R61 — [supervised session, 2026-08-31, unattended] **M58 `Cmd_getsecretpowereffect` leaf + green checkpoint**

- **State:** `rust-main` = R60 checkpoint `135f4997e` plus the verified Sonnet
  worker `bd5177a27` (fast-forward). The pure `B_SCR_OP_GETSECRETPOWEREFFECT`
  registration/handler projection is native and wasm32-compilable; no ABI,
  adapter, recovery module, canonical TS, or npm file was touched. Session
  still active; `Cmd_trysetperishsong` dispatching next.
- **Did:** worker (claude-sonnet-5, 60-min cap, one commit) ported exact
  single-start eager registration (count → opcode id `0xE4` / dispatcher /
  zero operands, TS error order) and the operandless
  `gBattleEnvironment`→`moveEffectByte` map (GRASS→POISON, LONG_GRASS→SLEEP,
  SAND→ACC−1, UNDERWATER→DEF−1, WATER→ATK−1, POND→SPD−1, MOUNTAIN→CONFUSION,
  CAVE→FLINCH, every other u8→PARALYSIS) with advance-only control and
  single-field write. Canonical TS supplies **298 behavior** (full 0..=255
  environment domain + overwrite matrix) and **6 registration** cases; corpus
  sha256 `4a368aa0860dce4751ea8059af38ca35f6251dd392096558e25c3debd805eb80`.
- **Next:** dispatch `Cmd_trysetperishsong` (single start at pc 1057;
  status3/perish timers + Pressure PP scan; brief prepared). If the deadline
  reserve still holds after that, scout `Cmd_tryinfatuating` (pure, uses the
  already-ported gender module) before any further dispatch; otherwise wind
  down at the last green checkpoint.
- **Notes:** supervisor audit covered all nine environment arms and the
  MOVE_EFFECT constants against `include/constants/battle.h:247-274`,
  registration order, single-field mutation, and generator provenance;
  independent regeneration was byte-identical. Generated Rust is
  **1,250,835 bytes**, sha256
  `17513961b106b1f5d959a1140c7c50496abfc3defb33ba29c38d90eb390f9365`;
  generator is **17,622 bytes**, sha256
  `ef5e88b5242dd38761d5d35b20a2ba27a793838cf04e287223c8810375dcce44`.
  Gates in the worker tree and again on `rust-main`: **1,096/1,096**, fmt,
  strict workspace Clippy, wasm32 release. Artifact is **507,098 bytes**,
  sha256 `8cefaa0f3708c3a8e61e037509169d0df4556b73822d36691846a3027e3215a0`.
  No npm gate required; no deferral or barrier added. R58 archived.
