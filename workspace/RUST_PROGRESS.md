# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---


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


## R74 — [supervised session wind-down, 2026-09-08 15:01–~17:55 UTC, unattended] **M71 `Cmd_tryswapitems` leaf + session close (five leaves folded)**

- **State:** `rust-main` = master (merge at orient was a no-op) plus five
  verified Sonnet worker fast-forwards this session — `94869f4fa`
  tryrecycleitem, `2ac3156d0` removeitem, `1d34a6ee1` tryimprison,
  `1e4cbf444` trysetfutureattack, `e39d11dc2` tryswapitems — each followed
  by its ledger commit and a successful `backup-refs.sh` push. Tree clean,
  committed, green; no worker worktree or branch left behind. No ABI,
  adapter, recovery module, canonical TS, or npm file was touched all
  session, so the main supervisor's fold is `core-rs/**` +
  `RUST_PROGRESS*.md` only.
- **Did (this step):** worker (claude-sonnet-5, 45-min cap, one commit,
  ~22 min) ported Trick's guard ladder in source order (Trainer Hill;
  opponent-side in regular battles with the ALLOWED_SPECIAL bypass set;
  knockedOffMons bits regular-only; both-items-none / Enigma Berry /
  mail 121..=132), per-branch LAZY label resolution (failure label and
  BattleScript_StickyHoldActivates resolve independently, each only on its
  branch), the Sticky Hold jump (lastUsedAbility := 60 +
  aiObservedAbilityIds identity write, scheduler unchanged, no events), and
  the success swap with its deliberate asymmetry (attacker ACTIVE item := 0
  while attacker PARTY slot := target's item; target active+party := old
  attacker item; changedItems[attacker] holds the restore value for the
  later MOVEEND_CHANGED_ITEMS case), choicedMove double clear, chooser
  2/0/1, both text buffs, ordered attacker-then-target pending appends, and
  two ordered set-battler-item events. Canonical TS supplies **44 behavior**
  and **8 registration** cases; corpus sha256
  `0fd8d0364b543840ff250f6d438bebfd2f5d2bb7456e78ae8033cb67373a0cf8`.
- **Next:** merge master, re-run the four Rust gates, then continue the leaf
  ladder. Best-scouted candidates: the stockpile family (0x85/0x86/0x87 —
  needs the shared `calculateBattleScriptBaseDamageForCurrentMove` hit-chain
  helper: sports halvers + dynamicBasePower + type resolution, not yet a
  shared Rust fn; budget as a larger leaf or a two-step split), then re-scout
  remaining pure leaves (rng-free candidates thin out from here). The
  `jumpifbyte`/`jumpifhalfword`/`jumpifword` candidates still need a
  barrier-projection decision first — record it in `RUST_DEFERRED.md` if it
  cannot be made in session. No deferral is open.
- **Notes:** supervisor audit covered the handler against
  `battle_script_commands.c:9189-9269` (guard order, the 9244-9245
  asymmetry, sticky-hold reveal) and generator provenance; independent
  regeneration was byte-identical. Worker's report swapped the corpus and
  generated-file sha labels; correct values: generated Rust **324,169
  bytes**, sha256
  `b86c21fd2532295073c1113f19ed3f3b5759883f975c0e1c28d5061321fd33d2`;
  generator **37,447 bytes**, sha256
  `3c78b47a378619eadbf9a56384ba98cbf51313bed63bc697809b8e96848f8134`.
  Final gates on `rust-main`: **1,329/1,329** native (up from 1,239 at
  orient), fmt, strict workspace Clippy, wasm32 release; artifact **512,496
  bytes**, sha256
  `8e11dc222677ac6f07e1f5ffc8909b812a9b2778d3e8fc12ded73ebfed78bd1a`.
  Session-wide: five Sonnet workers, five commits, zero rejections, zero cap
  expiries (16-33 min each, ~$21 total); the R65-R69 hold-the-turn-open
  pattern (tracked background launcher + chained blocking waits) worked
  every time. M70 was the first leaf to reuse `damage_calc` +
  `gen_tables::MOVES` across module boundaries. No npm gate required; no
  deferral or barrier added. R71 archived. PAPERCUT: none new (README
  Apple-path note from R57 still stands).
