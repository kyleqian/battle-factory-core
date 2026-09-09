# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---


## R77 — [supervised session, 2026-09-09, unattended] **M74 jumpif compare family leaf + green checkpoint (barrier projection landed)**

- **State:** `rust-main` = R76 checkpoint `b0c81a13f` plus the verified Sonnet
  worker `39f0cbca4` (fast-forward). The 0x29/0x2A/0x2B
  `Cmd_jumpifbyte`/`Cmd_jumpifhalfword`/`Cmd_jumpifword` family is native and
  wasm32-compilable, implementing R76's barrier-projection decision: the TS
  `unsupported-branch` halt crosses as a first-class
  `BattleScriptJumpifControl::Halt` variant mirroring the TS reason object
  verbatim (never an error). No ABI, adapter, recovery module, canonical TS,
  or npm file was touched. Session in wind-down after this fold.
- **Did (this step):** worker (claude-sonnet-5, 50-min cap, one commit,
  ~33 min) ported the shared 6-comparator core (`battle_script_commands.c:
  3657-3762`, CMP_* per `battle_script_commands.h:326-331`), find-first
  registration with NO shape/cardinality validation (pinned: an ill-shaped
  later duplicate does not fail registration), per-execution shape checks
  (value widths 1/2/4), the three modeled pointer universes (9 byte / 3
  halfword / 3 word pointers, i64-widened), lazy taken-branch-only jump
  resolution, and catalog-based value resolution: the generator executes the
  canonical `resolveBattleScriptSetByteValue` (byte), the moves.json id join
  + B_WEATHER_SUN (halfword), and the JUMPIFWORD_VALUES map (word) over every
  distinct value expression the committed program's call sites use — 65/15/37
  concrete call sites (35/13/20 distinct triples) — emitting Some(value) or
  None (→ Halt), so the port matches TS exactly over the committed program's
  operand universe and diverges only on expressions no call site emits
  (documented in the module doc comment). Canonical TS supplies **106
  behavior** and **6 registration** cases; corpus sha256
  `2bae823ca1fcfa4e1b3c028e0cacf75f9462447d136bcd458d3212a0cbf126db`.
- **Next:** wind down: memory notes + final ledger + backup. Next-session
  candidates (scouted 2026-09-09): with the shared base-damage helper (M72)
  and this compare family landed, the damagecalc-chain opcodes
  (`Cmd_damagecalc` `battle_script_commands.c:1288-1301`, `Cmd_critcalc`
  :1253-1286 — RNG-consuming, needs the drawBattleScriptRng projection —
  and `Cmd_typecalc` :1355-1420) are the highest-leverage reachable family;
  remaining pure leaves otherwise thin. No deferral is open.
- **Notes:** supervisor audit covered the halt construct-string priority
  (pointer over value, exact TS formatting), unsigned→i64 widening, the word
  catalog's bit values against `constants/battle.h` (FRONTIER 0x3E0100,
  four deliberately-unmodeled comparands BATTLE_TOWER/EREADER_TRAINER/
  RECORDED/TRAINER_HILL → Halt, matching TS), find-first registration, and
  generator provenance; independent regeneration was byte-identical.
  Generated vectors **158,159 bytes**, sha256
  `e3d13320426e02b5f27b35f68b30e7d925d741474250cdfbc01e138c7326e686`;
  catalog **3,005 bytes**, sha256
  `f7e4b427e01957e7b94edcd992cff378f91cbc630cf5bfb6e55db3d94fac8442`;
  generator **26,541 bytes**, sha256
  `41c53e3006e521e85076bd043449e53a17017318a43dd4b5804a7aabd4b97394`.
  Gates rerun on `rust-main` post-fold: **1,387/1,387** native (+14), fmt,
  strict workspace Clippy, wasm32 release; artifact **512,482 bytes**, sha256
  `e16eb7911fbba394ee68179957286caec090c47f5d65b22368322c9245b96a7f`.
  No npm gate required; no deferral added; the module's Halt is its own
  outcome, not a shared-frontier barrier-count change. R74 archived.
  PAPERCUT: none new.


## R76 — [supervised session, 2026-09-09, unattended] **M73 stockpile family leaf + green checkpoint (first shared-helper consumer)**

- **State:** `rust-main` = R75 checkpoint `fb944f2eb` plus the verified Sonnet
  worker `99c5ec021` (fast-forward). The `B_SCR_OP_STOCKPILE`/
  `B_SCR_OP_STOCKPILETOBASEDAMAGE`/`B_SCR_OP_STOCKPILETOHPHEAL`
  (0x85/0x86/0x87) family projection is native and wasm32-compilable — the
  first leaf that composes the M72 shared `battle_script_base_damage` helper
  instead of hand-rolling a DamageCalcInput mapping. No ABI, adapter,
  recovery module, canonical TS, or npm file was touched. Session still
  active; M74 (jumpif compare family) may follow before wind-down.
- **Did (this step):** worker (claude-sonnet-5, 45-min cap, one commit,
  ~25 min) ported registration cardinality 1/2/1 (0x86 has TWO concrete
  starts — EffectSpitUp `battle_scripts_1.s:2100` + SpitUpFailProtect
  `:2114`), per-execution shape checks, and the three handlers per
  `battle_script_commands.c:6850-6922`: 0x85 counter cap 3 → MOVE_RESULT_MISSED
  OR + chooser 1 vs increment + buff-byte + chooser 0; 0x86 counter==0 lazy
  fail jump (rules unchanged) vs always-zero counter + (missType != 1 only)
  helper damage × counter then Helping Hand trunc(×15/10) + animTurn — the TS
  contract of zeroing the counter on the protected path too (C zeroes only in
  its else-branch) is deliberately mirrored; 0x87 counter==0 jump (chooser 0,
  counter retained) / full-HP jump (counter zeroed, target := attacker,
  chooser 1) / success heal max(1, maxHP >> (3-counter)) as negative damage +
  animTurn + target := attacker. Canonical TS supplies **40 behavior** and
  **18 registration** cases incl. helper-error propagation and a
  missType==1-skips-helper pin; corpus sha256
  `e418402f91cc21b58f7cf602f1eb73a6f38e9307eeafe914e078ab36d3fed0d8`.
- **Next:** dispatch + verify M74 — the `jumpifbyte`/`jumpifhalfword`/
  `jumpifword` compare family. Barrier-projection decision (made this
  session, recorded here): project the TS `unsupported-branch` halt as a
  first-class `Halt { unsupported-branch fields }` outcome variant mirroring
  the TS reason object verbatim (programCounter/opcodeId/opcodeName/
  sourceConstruct/sourceFile/sourceLine) — core-rs-internal, TS-corpus-
  pinnable, no public surface locked in, reversible. After M74: re-scout;
  remaining unported opcodes are mostly RNG-consuming, scheduler-heavy, or
  hit-chain-orchestration (damagecalc/critcalc/typecalc next in reach now
  that the shared helper exists). No deferral is open.
- **Notes:** supervisor audit covered all three handler bodies against the C
  source and TS write-sets (counter-zeroing asymmetry, multiply-before-
  truncation order, target-role overwrite on exactly two 0x87 branches,
  lazy per-branch label resolution) plus generator provenance; independent
  regeneration was byte-identical. Generated Rust is **247,550 bytes**,
  sha256 `005a60e15c3af9a8fb09844e740c1cf7a6f5ad00a3183d8432c0f2cf17e90e43`;
  generator **39,731 bytes**, sha256
  `d0e8fcbf2ff82525be3d066dfaa3fa7a1ddef6661781482cd2625abd75204990`.
  Gates rerun on `rust-main` post-fold: **1,373/1,373** native (+18), fmt,
  strict workspace Clippy, wasm32 release; artifact **512,508 bytes**, sha256
  `e510963fe9a4379645d4e9d93053a5ee8b4de06404dd4ac5b20e05a7e4aba989`.
  Worker noted the M72 generator's `canonicalBattler` omits `side` (worked
  around loudly in its own generator; not lane friction). No npm gate
  required; no deferral or barrier added. R73 archived. PAPERCUT: none new.


## R75 — [supervised session, 2026-09-09, unattended] **M72 shared hit-chain base-damage helper + green checkpoint (first reusable non-opcode battle-script module)**

- **State:** `rust-main` = R74 checkpoint `3975b5f48` (master merge at orient
  was a no-op) plus the verified Sonnet worker `aa57ef2ba` (fast-forward).
  `battle_script_base_damage.rs` is the native twin of
  `calculateBattleScriptBaseDamageForCurrentMove`
  (`battleScriptHitChainOpcode.ts:1507-1580`) — a pure rules-slice→damage
  function, pub API designed for the stockpile family and later
  damagecalc-chain leaves. No ABI, adapter, recovery module, canonical TS, or
  npm file was touched. Session still active; M73 (stockpile 0x85/0x86/0x87,
  brief `/tmp/rust-briefs/stockpile-m73.txt`) dispatching next.
- **Did (this step):** worker (claude-sonnet-5, 50-min cap, one commit,
  ~22 min) ported move-type resolution (0x3f dynamic mask, GET_MOVE_TYPE
  `battle.h:458-464`), the Mud/Water Sport power halvers over
  battlers[0..battlersCount) with no hp gate, WEATHER_HAS_EFFECT2 (fainted
  Cloud Nine still suppresses), gItems hold-effect/param resolution (377-item
  bound, Enigma Berry per-battler override, generated 70-row sparse catalog),
  and the exact TS kernel-boundary forwarding contract: raw stats + real
  species cross, ability ids filtered through the 4-key
  `ABILITY_NAME_BY_ID` domain {8,14,55,62} (Huge/Pure Power, Plus/Minus,
  Marvel Scale pinned inert), hold-effect ids filtered through the 26-key
  `HOLD_EFFECT_NAME_BY_ID` domain (Scope Lens pinned inert), attacker crosses
  with hp/maxHP and unconditional hold-effect param, defender without.
  Opposite contract to M70's pre-applied-modifiers mapping — here the kernel
  applies everything. **57 behavior** cases (26 categories), corpus sha256
  `5460d65414e0140d30cd1fa6f6ffb74c552227cb6532741c9385cac0136fb249`
  (72,997 corpus bytes; generated file 200,703 bytes).
- **Next:** dispatch + verify M73 `Cmd_stockpile`/`Cmd_stockpiletobasedamage`/
  `Cmd_stockpiletohpheal` (brief prepared; the 0x86 leaf composes this
  helper), then re-scout remaining rng-free leaves. The
  `jumpifbyte`/`jumpifhalfword`/`jumpifword` barrier-projection decision is
  still the known blocker for that family — record in `RUST_DEFERRED.md` if
  it cannot be made in session. No deferral is open.
- **Notes:** supervisor audit covered the filter domains, error texts and
  ordering, sport/weather scan bounds, enigma override, and the full
  DamageCalcInput mapping against the TS spec; independent regeneration was
  byte-identical; catalog's 70 rows equal the JSON's 70 nonzero-hold-effect
  items (misses→0 mirrors the TS Map default). Generator is **30,488 bytes**,
  sha256 `c9b536b21ffbe4e73006629a60a6d266d48650a61d1621a5decbee583bfcb0b2`;
  catalog **3,727 bytes**, sha256
  `e46a3f019c1173319425447de66df7f01d04d04efee2a9be0f8caf5b5510c37c`.
  Gates rerun on `rust-main` post-fold: **1,355/1,355** native (+26), fmt,
  strict workspace Clippy, wasm32 release; artifact **510,209 bytes**, sha256
  `e0402a445d6efb41fab22c98686b3fadb16b0cc2715551f90c9ce84827b391c3`
  (shrank 2.3 KB from R74 — no new export crosses the ABI). Worker flagged
  `createBattleScriptRulesContext`'s eager currentMoveEffect resolution
  (generator splices an invalid move post-construction to reach the helper's
  own guard). No npm gate required; no deferral or barrier added. R72
  archived. PAPERCUT: none new.
