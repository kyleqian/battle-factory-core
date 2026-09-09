# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---


## R78 — [supervised session wind-down, 2026-09-09 15:03–~17:30 UTC, unattended] **M75 `Cmd_damagecalc` leaf + session close (four green folds)**

- **State:** `rust-main` = master (merge at orient was a no-op) plus four
  verified Sonnet worker fast-forwards this session — `aa57ef2ba` M72 shared
  base-damage helper, `99c5ec021` M73 stockpile family, `39f0cbca4` M74
  jumpif compare family, `2a4170f88` M75 damagecalc — each followed by its
  ledger commit and a successful `backup-refs.sh` push. Tree clean,
  committed, green; no worker worktree or branch left behind. No ABI,
  adapter, recovery module, canonical TS, or npm file was touched all
  session, so the main supervisor's fold is `core-rs/**` +
  `RUST_PROGRESS*.md` only.
- **Did (this step):** worker (claude-sonnet-5, 45-min cap, one commit,
  ~25 min) ported `B_SCR_OP_DAMAGECALC` (0x05,
  `battle_script_commands.c:1290-1303`): find-first registration with no
  shape validation (`install()` semantics), the exact error precedence
  (missing attacker role → pre-helper "currentMove N has no source-derived
  gBattleMoves type" → helper errors), helper damage × critMultiplier ×
  dmgMultiplier, the Charge doubling gated on the RESOLVED dynamic-aware
  type (TS spec; C reads the static row type — discrepancy documented in
  the module doc comment), and Helping Hand trunc(×15/10) last. Third
  consumer of the M72 helper. **24 behavior + 3 registration** cases; corpus
  sha256 `897f1de90a536e52f5eaf203bbeb892db7817dc006ca7632959d4a39653b9690`
  (110,501 bytes); generator **27,361 bytes**, sha256
  `afbbcccca522128a52c3d5f27c1b34bfdac63c644d7bcd9556af140393a16d8b`.
- **Next:** merge master, re-run the four Rust gates, then continue. Scouted
  candidates (2026-09-09): `Cmd_critcalc` (`:1253-1286`, first RNG-drawing
  battle-script leaf — needs a drawBattleScriptRng projection decision) and
  `Cmd_typecalc` (`:1355-1420`, type-effectiveness table + STAB — larger,
  rng-free; `apply_type_effectiveness` already lives in damage_calc.rs).
  The hit-chain trio damagecalc✓/critcalc/typecalc is now the shortest path
  to a full damage-pipeline slice. No deferral is open.
- **Notes:** supervisor audit covered the apply order, both Charge gate
  directions (dynamic-Electric doubles a non-Electric move; dynamic-Normal
  suppresses a static-Electric move), error-text Display impls, and
  generator provenance; independent regeneration was byte-identical. Worker
  deduplicated the committed program to one instruction per opcode name for
  the registration corpus (registration-equivalent for find-first; kept the
  generated file at 310,094 bytes, sha256
  `80c1e402ff5335ab86e2d47ec22cd828e73e37f34632bbef1863bda152408288`
  truncated in the worker report — full value pinned in the vectors test).
  Final gates on `rust-main`: **1,401/1,401** native (up from 1,329 at
  orient, +72 across four leaves), fmt, strict workspace Clippy, wasm32
  release; artifact **512,504 bytes**, sha256
  `d71bb10ea1b1014fcab35bb0ad81d2cfa2b2323bbf0085bc46716381fc73a055`.
  Session-wide: four Sonnet workers, four commits, zero rejections, zero cap
  expiries (22-33 min each, ~$21 total); the tracked-background-launcher +
  chained-blocking-waits pattern worked every time. M72 established the
  reusable non-opcode helper module shape; M74 landed the R76
  barrier-projection decision. No npm gate required; no deferral or barrier
  added. R75 archived. PAPERCUT: none new (README Apple-path note from R57
  still stands).


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
