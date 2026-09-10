# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---


## R80 — [supervised session, 2026-09-10 03:01 UTC–, unattended] **M77 `Cmd_critcalc` leaf folded — hit-chain trio complete, drawBattleScriptRng projection landed**

- **State:** `rust-main` = master (no-op merge at orient; baseline 1,425 green
  reconfirmed) plus verified Sonnet worker `b3d9cb554` (fast-forward). The
  hit-chain damage trio is now fully native (damagecalc M75, typecalc M76,
  critcalc M77), and M77 is the FIRST RNG-drawing battle-script leaf — its
  projection decision is the precedent for accuracycheck/adjustnormaldamage/
  tryko-class leaves. No ABI, adapter, recovery module, canonical TS, or npm
  file touched. Session continuing toward more leaves.
- **Did (this step):** recorded the projection decision (R80/M77): the TS
  machine rng `{value, calls, ledger[]}` crosses as `{value: u32, calls:
  u32}` ONLY; the leaf draws natively (`advance_rng_value` + upper-16
  extraction, both already pinned in rng.rs); the outcome carries a
  first-class `BattleScriptCritcalcRngDraw` mirroring the TS ledger tail
  entry verbatim (call=calls+1, literal reason "critcalc", before, after,
  random_value, six-field instruction provenance); the ledger array itself
  stays TS-side; the immune branch draws nothing and passes rng through
  untouched. Worker (claude-sonnet-5, 45-min cap, one commit, ~29 min)
  ported `B_SCR_OP_CRITCALC` (0x04, `battle_script_commands.c:1253-1288`):
  attacker→target→moveRow→hold-effect error precedence, stage/roll COMPOSED
  from already-pinned `damage_calc` crit helpers + `base_damage`'s
  `resolve_battler_hold_effect` (item+enigma-only shim), effect-id map
  43/75/200/209, species gates 113/83, the 4-part immunity gate evaluated
  BEFORE the draw (zero RNG consumed; five dedicated vectors incl. a
  nonzero-calls pass-through pin). **30 behavior + 3 registration** cases;
  corpus sha256
  `6f79151fb416e38a6857f812310dd7819f81f59031acd0b31209325a4ba52b6e`
  (166,814 bytes).
- **Next:** continue with the next bounded leaf. Scouted: `Cmd_adjustnormaldamage`
  (`install` at `battleScriptHitChainOpcode.ts:4722`; reuses the already-ported
  `apply_random_damage_multiplier` + the M77 rng projection — natural second
  RNG-drawing leaf); `bicword` lives in `battleScriptDamagingWeatherOpcode.ts:444`
  (a different handler family — scout before briefing). Inventory diff:
  /tmp/rust-briefs/{ts,rs}-opcodes.txt. No deferral is open.
- **Notes:** supervisor audit covered the full apply body against the TS
  handler (error precedence, immunity algebra, roll gate, crit write-back,
  find-first registration with no shape validation, the hold-effect shim
  reading only item + enigma array) and the LCG arithmetic by hand
  (0xE → 0x98D8AA69, upper-16 0x98d8); independent regeneration was
  byte-identical. Generated Rust **361,568 bytes**, sha256
  `f7147515702fa416b0834b125af03071a817acf9663947b26c770fb7fd645f56`;
  generator **32,621 bytes**, sha256
  `542899d9cebeeb123a9059321dab62d90df824b204dccffb8ca00a8f5871b0ab`.
  Gates rerun on `rust-main` post-fold: **1,448/1,448** native (+23), fmt,
  strict workspace Clippy, wasm32 release; artifact **512,490 bytes**, sha256
  `2417e88deab8e2ea7f741e5d93927845097d062aa0882a4bd2c20fcc78c7acf3`.
  Worker: 28.6 min, $5.22, zero rejections. No npm gate required; no
  deferral or barrier added. R77 archived. PAPERCUT: none new.


## R79 — [supervised session wind-down (final), 2026-09-09 15:03–~18:00 UTC, unattended] **M76 `Cmd_typecalc` leaf + session close (five green folds)**

- **State:** `rust-main` = master (no-op merge at orient) plus five verified
  Sonnet worker fast-forwards this session — `aa57ef2ba` M72 shared
  base-damage helper, `99c5ec021` M73 stockpile family, `39f0cbca4` M74
  jumpif compare family, `2a4170f88` M75 damagecalc, `e9e3649cd` M76
  typecalc — each followed by its ledger commit and a successful
  `backup-refs.sh` push. Tree clean, committed, green; no worker worktree or
  branch left behind. No ABI, adapter, recovery module, canonical TS, or npm
  file was touched all session, so the main supervisor's fold is
  `core-rs/**` + `RUST_PROGRESS*.md` only.
- **Did (this step):** worker (claude-sonnet-5, 45-min cap, one commit,
  ~24 min) ported `B_SCR_OP_TYPECALC` (0x06,
  `battle_script_commands.c:1355-1420`): Struggle-first precedence (before
  role checks), requireMoveRow-BEFORE-type-resolution (opposite of M75 —
  both precedences now pinned), STAB via reused `apply_stab`, the
  Levitate/Ground short-circuit (reveal + MISSED|DOESNT_AFFECT_FOE +
  landed-cell clears + missType 4), the find-first type loop over reused
  `gen_tables::TYPE_EFFECTIVENESS_TABLE` with per-entry flag algebra
  (immune clears SE/NVE; 0.5x/2x toggle gated on power!=0 &&
  !NO_EFFECT), min-1 floor, dual-type dedup, the Foresight-vs-Ghost skip
  (Normal/Fighting only), Wonder Guard's miss branch (incl. the
  preset-both-bits reachability pin — the loop's own toggles cancel a
  0.5x+2x pair, so both-set only arrives preset), targetNotAffected on
  final DOESNT_AFFECT_FOE, and identity-write ability reveals via
  `battle_script_ai_reveal`. **41 behavior + 3 registration** cases; corpus
  sha256 `881d1ffa7371bcd411ffb8cfb10eb0c49bd5151567538d7086eff9bc952d20d4`
  (97,873 bytes).
- **Next:** merge master, re-run the four Rust gates, then continue. The
  hit-chain damage pipeline now has damagecalc + typecalc native; the
  remaining trio member `Cmd_critcalc` (`:1253-1286`) is the first
  RNG-drawing battle-script leaf and needs a drawBattleScriptRng projection
  decision before dispatch — make it next orient or record it in
  `RUST_DEFERRED.md`. rng-free leaves are otherwise thin; re-scout with
  /tmp/rust-briefs/ts-opcodes.txt vs rs-opcodes.txt (session-generated
  inventory diff). No deferral is open.
- **Notes:** supervisor audit covered the full apply body against the TS
  handler (branch order, flag algebra, Foresight predicate, Wonder Guard
  truth table incl. power==0 and SE-only no-miss, reveal identity, STAB on
  the Levitate path) and generator provenance; independent regeneration was
  byte-identical. Generated Rust **261,390 bytes**, sha256
  `5ec06981598c13b65285bbe3d6ddf0c0f36e788f9d368729951fbd8d120ac2db`;
  generator **31,076 bytes**, sha256
  `c6bb13072593096640811eb41f79ffdc2cdbb437ded26ba8d0393d8e58a5b3e7`.
  Final gates on `rust-main`: **1,425/1,425** native (up from 1,329 at
  orient, +96 across five leaves), fmt, strict workspace Clippy, wasm32
  release; artifact **512,575 bytes**, sha256
  `2275b630095b98c10d08d3ddbab83763c5253575879d8ac0158bd3e212d7956c`.
  Session-wide: five Sonnet workers, five commits, zero rejections, zero
  cap expiries (22-33 min each, ~$27 total); tracked-background-launcher +
  chained blocking waits held every time. No npm gate required; no deferral
  or barrier added. R76 archived. PAPERCUT: none new (README Apple-path
  note from R57 still stands).


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
