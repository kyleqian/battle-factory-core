# Rust lane progress archive

Older entries moved out of `RUST_PROGRESS.md` (newest first). Git keeps the
full history regardless.

---
## R97 — [supervised session, 2026-09-12 03:06 UTC–, unattended] **M94 PPREDUCE folded (second green fold this session)**

- **State:** `rust-main` = R96 + `768f47323` M94 fast-forward + this
  ledger commit. Post-fold gates green. Tree clean, committed. Core-only;
  no ABI/adapter/TS/npm files touched. **109 of 215 TS opcode names
  ported.**
- **Did (this step):** worker (claude-sonnet-5, 55-min cap, one commit,
  29.6 min, $6.69, foreground gates) ported 0x03 PPREDUCE
  (`Cmd_ppreduce` battle_script_commands.c:1205-1250,
  `ppreduceOpcodeHandler` battleScriptHitChainOpcode.ts:1352-1437) as
  `battle_script_ppreduce.rs`: the three-arm Pressure ladder
  (FOES_AND_ALLY counts every other battler either side;
  BOTH/OPPONENTS_FIELD counts opposing side only, ally excluded;
  default counts target-only with self-target excluded) gated on the
  `!== 1` ppNotAffectedByPressure pin; the deduct gate
  (NO_PPDEDUCT|NO_ATTACKSTRING, pp!=0) with saturating clamp,
  notFirstStrike:=1, and the party-PP mirror; the TRANSFORMED split
  (pp falls + party mirrors but NO set-battler-pp-data event and NO
  controller-pending); the unconditional NO_PPDEDUCT clear (survives a
  blocked deduct); the lane's first native `gen_tables::MOVES[id].target`
  consumer with per-corpus-move TS agreement pins; verbatim throws incl.
  the ungrammatical "requires a attacker role". **29 TS-executed (26
  behavior + 3 throws) + 2 registration + 4 MOVES-agreement** cases +
  14 inline unit tests over the 133-site census; corpus sha256
  `c5b4bb76bff88d5eaeeb661765aeccc4ac9fb89f510bbd45b9afa8e22fc839f1`.
- **Next:** at most one more leaf if it lands AND verifies by ~06:15
  UTC — ATTACKSTRING 0x02 scouted (`Cmd_attackstring`
  battle_script_commands.c:1191-1203, `createAttackstringOpcodeHandler`
  battleScriptHitChainOpcode.ts:1308-1349; 135 committed sites; first
  controller-busy Block + prepareMessage port modeling; canonical ports
  at factoryBattleScriptFullTurnDecision.ts:840+). Then wind down clean
  before 06:59 UTC: final gates, ledger, backup, clean tree.
- **Notes:** supervisor audit walked the Pressure ladder both
  directions, the resolve-inside-guard placement, the
  mirror-before-permanence-split ordering, the no-duplicate pending,
  and the census; independent regeneration byte-identical (generated
  Rust **157,286 bytes**, sha
  `0fc9ccb60a11b8d43a15cc7331f46764839f1a6cfcecffeae57fe6cd0e29a782`;
  generator **26,185 bytes**, sha256
  `b02695b81fc6db7063b442567ad20b7420e95291a53d328307c9042913a21ee0`).
  Accepted worker deviations (documented in-code): (1) constructor
  validates ppNotAffectedByPressure to 0|1 and eagerly resolves move
  effect, so the domain-widening `!==1` pin is native-unit-only and the
  unknown-move throw case uses a documented post-construction shallow
  copy that still executes the real handler; (2) clippy-mandated
  `saturating_sub` replaces the literal ternary (semantically equal,
  pinned both sides). Gates on `rust-main` post-fold: **1,776/1,776**
  native (+20), fmt, strict workspace Clippy, wasm32 release; artifact
  **512,234 bytes**, sha256
  `1f8ba8759c011ad49f312e648adf34e9932b750fcda87753405c1a2b8cf20bea`.
  R94 archived. No npm gate required; no deferral or barrier added. No
  PAPERCUT.


## R96 — [supervised session, 2026-09-12 03:06 UTC–, unattended] **M93 machine-control family folded**

- **State:** `rust-main` = R95 + `49f385d2c` M93 fast-forward + this
  ledger commit. Master merge no-op at orient; baseline re-verified
  **1,730/1,730** + artifact byte-identical to R95 (512,236 B,
  `a8d2e60b…`). Post-fold gates green. Tree clean, committed. Core-only;
  no ABI/adapter/TS/npm files touched. **108 of 215 TS opcode names
  ported.** Next worker: M94 PPREDUCE (scouted this session).
- **Did (this step):** worker (claude-sonnet-5, 55-min cap, one commit,
  25.0 min, $3.54, foreground gates) ported the six-opcode
  `battle_script_control_family.rs` — GOTO 0x28 / RETURN 0x3C / END 0x3D /
  END2 0x3E / END3 0x3F / CALL 0x41 (`createBattleScriptControlHandlers`
  + `stepBattleScriptMachine`'s jump/call/return/halt application switch,
  `battleScriptMachine.ts`): first family with NO rules context — pure
  machine cursor (program_counter + call_stack). GOTO/CALL's shared lazy
  resolution ladder with the evaluation-order pin (2-operand resolvable
  first operand still halts reporting the real expression, not
  `<missing>`); CALL pushes pc+1 (index twin of C's instr+5); RETURN
  LIFO + underflow-leaves-pc halt; END/END2 shared "terminal" halt with
  C side effects intentionally absent; END3's own "end3" halt kind vs
  RETURN-equivalent pop on non-empty stack. Compact resolution tables
  pin ALL 474 committed sites (285 goto + 29 call rows — every one
  resolves cleanly — plus sorted site censuses 73/13/64/10) alongside
  **27 behavior + 8 registration** cases; corpus sha256
  `ef2b3837a73f25428730f5c592ae22b016b7d4e34c54642b181949b05e3d6ec0`.
- **Next:** dispatch + verify M94 PPREDUCE 0x03 (`Cmd_ppreduce`
  battle_script_commands.c:1205-1247, `ppreduceOpcodeHandler`
  battleScriptHitChainOpcode.ts:1352-1437; 133 committed no-operand
  sites; needs party-PP mirror + scheduler-pending + set-battler-pp-data
  event modeling — tryswapitems is the native precedent for both), then
  one more leaf if time allows; wind down clean before 06:59 UTC.
- **Notes:** supervisor audit walked the resolution ladder, the halt
  reasons, the step-application switch, and registration against TS both
  directions; independent regeneration byte-identical (generated Rust
  **81,542 bytes**, sha
  `86a141249df4d98119474dcd5b872308e7298228f971f6406eb7eb690bd78ce1`;
  generator **34,958 bytes**, sha256
  `67ad01ae295b65454e1b9d724bc7b56987433965f6fd7a45c95c4a24dc32101c`).
  Accepted deviation: goto/call table rows are TS-side census pins, not
  per-row port replays (label resolution is an input to the Rust
  handler, so a replay would be vacuous; the 27 behavior cases exercise
  the port). Gates on `rust-main` post-fold: **1,756/1,756** native
  (+26), fmt, strict workspace Clippy, wasm32 release; artifact
  **512,235 bytes**, sha256
  `f77a2f60471c4598665732782de3586cb840f0a18a6bc670d6205284468b7e49`
  (usual deterministic codegen size drift). R93 archived. No npm gate
  required; no deferral or barrier added. No PAPERCUT.


## R95 — [supervised session wind-down (final), 2026-09-11 15:04-~17:20 UTC, unattended] **M92 multihit family folded; session close (three green folds)**

- **State:** `rust-main` = master (no-op merge at orient) + three verified
  Sonnet worker folds this session — `4086c1ade` M90 copyarray,
  `ab53025ec` M91 array-family trio, `11b885738` M92 multihit
  rule-command family — each followed by its ledger commit and a
  successful `backup-refs.sh` push. Tree clean, committed, green; no
  worker worktree or branch left behind. Core-only all session: no ABI,
  adapter, canonical TS, or npm file touched, so the main supervisor's
  fold is `core-rs/**` + `RUST_PROGRESS*.md` only. **102 of 215 TS
  opcode names ported.**
- **Did (this step):** worker (claude-sonnet-5, 55-min cap, one commit,
  19.0 min, $3.77, foreground gates) ported the five-opcode
  `battle_script_multihit_family.rs` — SETMULTIHIT 0x26 / DECREMENTMULTIHIT
  0x27 / SETMULTIHITCOUNTER 0x8D / INITMULTIHITSTRING 0x8E /
  JUMPIFHASNOHP 0xE3 (`battleScriptRuleCommands.ts` whole-file spec):
  the two closed-catalog ports (canonical `resolveByteOperand` digit
  regex, `resolveRulesBattlerForBattleScript` six named selectors) with
  typed BLOCK outcomes — the lane's first Block-outcome family since
  accuracycheck — the shape-halt -> Block -> value-halt ladder,
  DECREMENTMULTIHIT's always-applied 0 -> 0xff wrap that survives its
  invalid-control-target halt, SETMULTIHITCOUNTER's 0/1/2-draw rng
  shapes with full provenance (the family's only rng user;
  `setmultihitcounter:initial`/`:reroll`), INITMULTIHITSTRING's
  unconditional counter reset, and JUMPIFHASNOHP's sole verbatim throw.
  **34 behavior + 7 registration** cases over all 18 committed sites;
  corpus sha256
  `7fb2125843122112ef694d1bff99fa9572f804477ea6564a34913e12d82b3df1`.
- **Next:** merge master, re-run the four Rust gates, then continue.
  Scouted next candidates: the machine control family
  (GOTO/CALL/RETURN/END/END2/END3, `battleScriptMachine.ts:645-670` +
  `battleScriptCallbackStack.ts` — call-stack modeling, deliberately NOT
  taken as a rushed fourth leaf this session); PPREDUCE
  (`battle_script_commands.c:1205-1247`, hitChainOpcode.ts:1352+, needs
  events/party-PP modeling); ATTACKSTRING (needs
  prepareMessage/isControllerIdle port modeling). The multi-opcode
  family-module pattern (array-family, multihit-family) is now the
  proven shape for thin siblings.
- **Notes:** supervisor audit walked all five handler ladders against the
  TS closures, both port catalogs both directions, the wrap-survives-halt
  pin, the rng draw shapes, and the census pins; independent
  regeneration byte-identical (generated Rust **35,444 bytes**, sha
  `261d7cfb18fabf14671b1156d38c3995d9c13840e3ace5860136faed4aafc548`;
  generator **39,046 bytes**, sha256
  `43717d42bb1443f5ddc07ecbb81048d9ece57e41b43805d1108094baab02621a`).
  Final gates on `rust-main`: **1,730/1,730** native (up from 1,658 at
  orient, +72 across three leaves), fmt, strict workspace Clippy, wasm32
  release; artifact **512,236 bytes**, sha256
  `a8d2e60b7061c80e090a108cabbd08a8f3f1c2bec12111e43ff648ddc70c269b`
  (507,121 -> 507,387 -> 507,121 -> 512,236 across folds — the familiar
  deterministic codegen drift). Session-wide: three Sonnet workers
  (17.1-21.9 min, $2.57-$3.77, ~$9.85 total), three clean landings, ZERO
  cap expiries. R92 archived. No npm gate required; no deferral or
  barrier added. No PAPERCUT.



## R94 — [supervised session, 2026-09-11 15:04 UTC–, unattended] **M91 array-family trio folded (second green fold this session)**

- **State:** `rust-main` = R93 + `ab53025ec` M91 fast-forward + this
  ledger commit. Gates green post-fold. Tree clean, committed. Core-only;
  no ABI/adapter/TS/npm files touched. **97 of 215 TS opcode names
  ported.** M92 worker (multihit rule-command family, final leaf this
  session) dispatched off this HEAD (brief
  `/tmp/rust-briefs/multihit-m92.txt`, 55-min cap).
- **Did (this step):** worker (claude-sonnet-5, 55-min cap, one commit,
  21.9 min, $3.51, foreground gates) ported the trio in one module
  `battle_script_array_family.rs` — JUMPIFARRAYNOTEQUAL 0x2D
  (`battle_script_commands.c:3793-3814`): closed 6-entry operand table
  (gBattlersCount/roles/sBATTLER/gBattleCommunication[+1]), verbatim
  not-modeled Halt (the committed :2916 gBattlerFainted link-battle site
  replays as that barrier), lazy-target jump, unresolved-target throw;
  JUMPIFARRAYEQUAL 0x2C (`:3771-3791`; ids per dispatch
  rows :375/:376): ranked-batch1 eager install (exactly-1 +
  dispatcher + operand-count-4), per-execution tuple validation, the
  verbatim ungrammatical "requires a attacker role" hit-chain role
  throws; COPYARRAYWITHINDEX 0x32 (`:3850-3861`): registerSingle
  convention, gBattlerAttacker := gBattlerByTurnOrder[gBattleCommunication]
  with the verbatim out-of-range throw. Throw-vs-Halt asymmetry over the
  identical attacker/target pair (Ghost Curse halts vs Teeter Dance
  throws) pinned. **29 behavior + 8 registration** cases over all 9
  committed sites (7 NE + 1 EQ + 1 CAWI); corpus sha256
  `53bd05991e7336507cd0e3e11306127d5a0397a17c7fb6351361dc60a73dc154`.
- **Next:** verify + fold M92 (SETMULTIHIT/DECREMENTMULTIHIT/
  SETMULTIHITCOUNTER/INITMULTIHITSTRING/JUMPIFHASNOHP — first
  Block-outcome + rng-draw family since the accuracycheck run), then
  wind down: final gates, ledger, backup, clean tree before 19:03 UTC.
- **Notes:** supervisor audit walked the operand table both directions,
  all three registration conventions against their TS sources, the five
  error texts, and the census; independent regeneration byte-identical
  (generated Rust **28,156 bytes**, sha
  `7f10ec4e052727792a6583419a6f9c4af4a5b917c4bcce5fa8e05d3aa9f54374`;
  generator **30,817 bytes**, sha256
  `73dfbf4c381b69fc2b92c23fd50bd29e915fc30d565dccd0a3cf3da8afe2c7de`).
  Gates on `rust-main` post-fold: **1,701/1,701** native (+23), fmt,
  strict workspace Clippy, wasm32 release; artifact **507,121 bytes**,
  sha256
  `84ff35b88196e81ee627c3c522592552cdd79cab4e917eea5f0a1254b1e50662`
  (back to R92's byte size at a different sha — codegen drift as usual).
  Worker fixture surprise (harmless): scriptingBattler's 0..3 constructor
  clamp forced battlersCount=2 fixtures for the equal-value NE cases.
  R91 archived. No npm gate required; no deferral added. No PAPERCUT.



## R93 — [supervised session, 2026-09-11 15:04 UTC–, unattended] **M90 COPYARRAY folded**

- **State:** `rust-main` = R92 + `4086c1ade` M90 fast-forward + this
  ledger commit. Master merge no-op at orient; baseline re-verified
  **1,658/1,658** + artifact byte-identical to R92 (507,121 B,
  `222565a5…`). Post-fold gates green. Tree clean, committed. Core-only;
  no ABI/adapter/TS/npm files touched. **94 of 215 TS opcode names
  ported.** M91 worker (array-family trio) dispatched off this HEAD
  (brief `/tmp/rust-briefs/arrayfamily-m91.txt`, 55-min cap).
- **Did (this step):** worker (claude-sonnet-5, 50-min cap, one commit,
  17.1 min, $2.57, foreground gates) ported 0x31 copyarray
  (`battle_script_commands.c:3837-3848`): the closed 12-tuple
  (size, dst, src) catalog in exact TS source order
  (`ingrainLeechSeedWrapOpcode.ts:166-345`) — battleMoveDamage<->hpDealt
  both directions, painSplitHp/scriptingBideDmg reads,
  dynamicBasePower<-tripleKickPower full-u16, the two byte-universe arms
  (cEFFECT_CHOOSER<-sMULTIHIT_EFFECT, cMULTISTRING_CHOOSER<-
  sTWOTURN_STRINGID) with their defensive "became undecodable" guards
  ported as native-unit-test-only dead code, the two REACHABLE
  role-guard errors verbatim, gBattlerTarget<-sBATTLER +
  sBATTLER<-sBATTLER_WITH_ABILITY total copies, and
  gBattleTextBuff1<-sMULTIHIT_STRING as pure advance with the
  decimal-"6"-not-"0x6" size pin; verbatim fallthrough Halt incl.
  `<missing>` operand formatting; find-first REQUIRED registration.
  **22 behavior + 2 registration** cases over all 16 committed sites
  (12 tuples); corpus sha256
  `b975bb46eda9b09329d87ad4f366f43a276a5ebf498b631cd60bbb97306d9465`.
- **Next:** verify + fold M91 (JUMPIFARRAYEQUAL 0x2C + JUMPIFARRAYNOTEQUAL
  0x2D + COPYARRAYWITHINDEX 0x32, one module, three registration
  conventions — brief already written), then at most one more thin leaf
  (PPREDUCE scouted: battle_script_commands.c:1205-1247, hitChainOpcode.ts
  :1352+, needs events/party-PP modeling; ATTACKSTRING needs
  prepareMessage/isControllerIdle ports) only if it lands AND verifies by
  ~18:20 UTC; wind down clean before 19:03 UTC.
- **Notes:** supervisor audit walked all 12 arms against TS source order,
  both guard texts, the barrier verbatim, the census both directions, and
  the metadata C-line pins; independent regeneration byte-identical
  (generated Rust **32,156 bytes**, sha
  `0adcac79a8f7889577ea2312d72606e4b4322d79c78eb7a9f1a237bd51ab991f`;
  generator **23,546 bytes**, sha256
  `6e856c2a8cb7eeec7f164d1454bb476ca21bcaf48e1e338dbf296ae6d049d244`).
  Gates on `rust-main` post-fold: **1,678/1,678** native (+20), fmt,
  strict workspace Clippy, wasm32 release; artifact **507,387 bytes**,
  sha256
  `c7c4c367ace13768cf3a2aa731f3fe506362fa3c6041d6d632cdd770d20bfba2`
  (familiar deterministic codegen size drift). Worker 17.1 min, zero cap
  expiry. R90 archived. No npm gate required; no deferral added. No
  PAPERCUT.


## R92 — [supervised session wind-down (final), 2026-09-11 03:05-~05:15 UTC, unattended] **M89 ADDBYTE folded; session close (four green folds)**

- **State:** `rust-main` = master + four verified Sonnet worker folds this
  session — `7a855879b` M86 accuracycheck bypass, `fea92b4e2` M87
  full-formula, `e7855454c` M88 absorb tail (ACCURACYCHECK complete),
  `e86e8fb73` M89 addbyte — each followed by its ledger commit and a
  successful `backup-refs.sh` push. Tree clean, committed, green; no
  worker worktree or branch left behind. Core-only all session: no ABI,
  adapter, canonical TS, or npm file touched, so the main supervisor's
  fold is `core-rs/**` + `RUST_PROGRESS*.md` only. **93 of 215 TS opcode
  names ported.**
- **Did (this step):** worker (claude-sonnet-5, 45-min cap, one commit,
  17.8 min, $3.15, foreground gates) ported 0x2F addbyte
  (`battle_script_commands.c:3823-3828`): the SETBYTE 24-pointer
  byte-lvalue universe (lane encodings: gBattleMoveDamage SIGNED-i32 4
  lanes, sTRIPLE_KICK_POWER u16 2 lanes, gBattlerTarget read
  `?? 0xff`/write `< 4`, sBATTLER `< 4`), the `sMULTIHIT_STRING + 4`
  counter checked BEFORE the universe, a 14-entry value-catalog
  projection of `SETBYTE_VALUES` (jumpif plain-catalog convention;
  narrowing documented with the bicbyte beyond-universe precedent —
  worker caught that `MOVE_EFFECT_SLEEP` resolves in full canonical TS
  and kept the vector corpus honest), the REACHABLE
  "Cmd_addbyte: <ptr> accepted a read but rejected the incremented
  value" throw at gBattlerTarget/sBATTLER == 3, Halt "is not modeled"
  verbatim, find-first REQUIRED registration
  (`findInstructionOpcodeId`). **23 behavior + 2 registration** cases
  over all 9 committed sites; corpus sha256
  `651dc2cb7484773002be8024fd3c1c78dc475fd1495278b20348b6e0a5b3bc21`.
- **Next:** merge master, re-run the four Rust gates, then continue.
  ACCURACYCHECK's 3-leaf split (bypass -> formula+miss-tail ->
  absorb-tail) landed all green in 27.0/33.5/22.3 min — reuse that
  staging pattern for the next big opcode. Remaining scouted candidates:
  the name-diff (`/tmp/rust-briefs/rs-ported-new.txt` vs
  `ts-all-new.txt`) lists ~120 unported names but includes family-module
  false positives — re-scout at orient; ATTACKSTRING/PPREDUCE (hit-chain
  neighbors, ports.prepareMessage/isControllerIdle need port modeling)
  and the jump/array/byte leftovers (COPYARRAY, JUMPIFARRAYEQUAL/
  NOTEQUAL, SUBBYTE-analogues if TS registers them) are natural thin
  follow-ups. No deferral is open.
- **Notes:** supervisor audit covered the catalog both directions, lane
  encodings (`| 0` signedness via `as u32`/`as i32` round-trip),
  wrapping-add ≡ `& 0xff`, the multihit-first ordering, both guard
  rejections, and every cited line; independent regeneration
  byte-identical. Generated Rust **37,984 bytes** (gen sha
  `0a7149194d304bd52c82851e4fa6ae6d5a6aeff43dcb106e8f988729cf3f4d8d`);
  generator **23,285 bytes**, sha256
  `6df20150cf829392f7fea78fbb9fa40fe003cffb1f192c6e534cb9ec8c22e810`.
  Final gates on `rust-main`: **1,658/1,658** native (up from 1,596 at
  orient, +62 across four leaves), fmt, strict workspace Clippy, wasm32
  release; artifact **507,121 bytes**, sha256
  `222565a50c6d8c25a0f9dd26bae5b78a67039f1ff7c4dc7453086c4ecf9a0e8a`
  (artifact size wobbled 512,239 -> 496,730 -> 512,235 -> 507,121 across
  folds; every build reproduced identically across trees — deterministic
  codegen drift, not environment). Session-wide: four Sonnet workers
  (~$23.47), four clean landings 17.8-33.5 min, ZERO cap expiries (the
  foreground-gates brief rule holds). ACCURACYCHECK (0x1, 66 sites, the
  largest scouted leaf) went native via the 3-part split; plus ADDBYTE.
  R89 archived. No npm gate required; no deferral or barrier added. No
  PAPERCUT.

## R91 — [supervised session, 2026-09-11 03:05 UTC–, unattended] **M88 ACCURACYCHECK part 3/3 (absorb/Flash-Fire tail) folded — opcode complete**

- **State:** `rust-main` = R90 + `e7855454c` M88 fold (merge `384d4fa57`)
  + this ledger commit. Gates green post-fold. Tree clean, committed.
  Core-only; no ABI/adapter/TS/npm files touched. ACCURACYCHECK (0x1) is
  now COMPLETE — **92 of 215 TS opcode names ported.** M89 ADDBYTE worker
  (final leaf this session) ALREADY DISPATCHED off this HEAD (brief
  `/tmp/rust-briefs/addbyte-m89.txt`, 45-min cap).
- **Did (this step):** worker (claude-sonnet-5, 45-min cap, one commit,
  22.3 min, $6.30, foreground gates) replaced M87's
  `AbsorbingTailPending` with the real
  `AbilityBattleEffects(ABILITYEFFECT_ABSORBING)` arms
  (`battle_util.c:2676-2732`): Volt/Water Absorb — negative heal staging
  `-max(1, maxHP/4)` SKIPPED at full HP, reveal, HP-drain vs
  made-move-useless label choice; Flash Fire — chooser from prior boost
  state, UNCONDITIONAL `flashFireBoosted := 1` (idempotent), reveal,
  boost label; the shared PPLoss suffix INVERSION (`_PPLoss` when the
  attacker's notFirstStrike is NOT set) across all six committed labels
  (`battle_scripts_1.s:4078/4080/4091/4093/4101/4103`), lazily-resolved
  REQUIRED labels with the verbatim "SetMoveEffect: committed Battle
  Script program does not define label <label>" shared-helper error, and
  zero rng draws in the tail. No pending variant remains in the module.
  **90 behavior + 3 registration** cases; corpus sha256
  `a614543a0a533fd7f346417dc0e0917a2133ff091fd5c14c97e867b932b3ab01`.
- **Next:** verify + fold M89 ADDBYTE (0x2F, 9 committed sites — reuses
  the SETBYTE pointer universe + value catalog projections and the
  jumpif plain-catalog convention; reachable
  "accepted a read but rejected the incremented value" error at
  gBattlerTarget/sBATTLER == 3 is the interesting pin), then wind down:
  final gates, ledger, backup, clean tree before 07:05 UTC.
- **Notes:** supervisor audit walked both tail bodies (original-context
  full-HP read mirrored, single-ability equivalence of the if-chain vs
  TS's condition shapes, chooser-before-flag-write ordering), the label
  table, and the census pins; independent regeneration byte-identical.
  Generated Rust **576,357 bytes**, sha256
  `a4b531c1c61f5030feef8d69b7dacf6cb739d6ec50d3c55ddbdb40c6a624a620`;
  generator **51,876 bytes**, sha256
  `5cd3ecc352a86d5099d55e09348c4a10459c5b38081dce82860b02b6a9639fb9`.
  Gates on `rust-main` post-fold: **1,638/1,638** native (+5), fmt,
  strict workspace Clippy, wasm32 release; artifact **512,235 bytes**,
  sha256
  `b5fbb0c3fbbac9b8c276cc0ae45ac0cd09cd8de7287589041f5babc364db27ff`.
  Worker caught its own off-by-3 battle_util.c pin pre-commit. R88
  archived. No npm gate required; no deferral added. No PAPERCUT.

## R90 — [supervised session, 2026-09-11 03:05 UTC–, unattended] **M87 ACCURACYCHECK part 2/3 (full-formula path) folded**

- **State:** `rust-main` = R89 + `fea92b4e2` M87 full-formula fold (merge
  commit `25a72888a`; not a fast-forward only because the R89 ledger
  commit intervened) + this ledger commit. Gates green post-fold. Tree
  clean, committed. Core-only; no ABI/adapter/TS/npm files touched. M88
  worker (part 3/3, absorb/Flash-Fire tail) ALREADY DISPATCHED off this
  HEAD (brief `/tmp/rust-briefs/accuracycheck-m88.txt`, 45-min cap).
- **Did (this step):** worker (claude-sonnet-5, 55-min cap, one commit,
  33.5 min, $8.22, foreground gates) replaced M86's staging with the
  full-formula path (`accuracycheckOpcodeHandler` :1160-1288): FS/DD
  explicit literals vs ACC_CURR_MOVE, protect gate on the RESOLVED move,
  lock-on plain advance, the hitmarker/semi-invulnerable ladder with the
  exact per-leg carry asymmetry (a leg's own miss-jump carries only PRIOR
  legs' clears; ladder misses write no missType and skip CWGL),
  rain-Thunder/ALWAYS_HIT/VITAL_THROW zero-draw bypasses (Cloud-Nine
  weather negation), sun-Thunder acc-50, native
  calculate_accuracy/roll_accuracy_hits reuse + exactly ONE
  "accuracycheck" rng draw, the miss tail (native
  check_wonder_guard_and_levitate: Struggle/zero-power skip, Levitate
  B_MSG_GROUND_MISS, foresight ghost-skip only vs NORMAL/FIGHTING,
  immunity -> DOESNT_AFFECT_FOE + attacker targetNotAffected, Wonder
  Guard arm, reveal, double-battle B_MSG_AVOIDED_ATK chooser), and the
  destiny-bond half of the hit tail (native
  apply_try_set_destiny_bond_to_happen reuse); absorb/Flash-Fire staged
  as typed `AbsorbingTailPending` (native unit tests only). THREE
  documented TS-vs-C divergence pins: lock-on advances with NO tail (C
  runs destiny-bond+absorb there), absorb trigger reads currentMove's
  row power (C reads the same quantity; TS makes it observable for
  FS/DD), CWGL reads the resolved move ROW's power (asymmetric with the
  absorb trigger). **74 behavior + 3 registration** TS-differential
  cases + 32 native unit tests; corpus sha256
  `8ceb8ee92038968276397dd76c28dc37a9954f74767549f74d25133e4ef43fd7`.
- **Next:** verify + fold M88 (completes the opcode -> 92 of 215 TS
  opcode names); then wind-down (ledger, backup, clean tree) before the
  07:05 UTC deadline. If M88 lands early enough, scout one more thin
  leaf only if it can land AND be verified by ~06:20 UTC.
- **Notes:** supervisor audit walked the full-formula body, ladder
  asymmetry, CWGL walk (incl. find-miss -> continue), miss-tail write
  set, hit-tail ordering (destiny bond before triggers, absorb before
  flash fire), and the three divergence pins against TS; unknown
  currentMove -> row-power 0 is an acceptable projection (TS errors at
  context creation, unreachable in-opcode). Independent regeneration
  byte-identical. Generated Rust **435,388 bytes**, sha256
  `fa55d11de77a65da3b43b3c658ed4b7eee13a859330ed317261e640a2795ba0f`;
  generator **43,047 bytes**, sha256
  `ecfa305a8fef052221dd92d1873dc64651e498a897ada57fb911fa89e42e7663`.
  Gates on `rust-main` post-fold: **1,633/1,633** native (+21), fmt,
  strict workspace Clippy, wasm32 release; artifact **512,220 bytes**,
  sha256
  `05844657cd152cee38bf277bbeba88fc1d98168ada23b50c2282b583da591b51`
  (R89's 15,509 B shrink reversed itself with this fold — deterministic
  codegen drift both times, builds reproduce across trees). R87
  archived. No npm gate required; no deferral added. No PAPERCUT.

## R89 — [supervised session, 2026-09-11 03:05 UTC–, unattended] **M86 ACCURACYCHECK part 1/3 (bypass paths) folded**

- **State:** `rust-main` = master (no-op merge at orient; origin fetch
  fails as usual, local master ref is current) + `7a855879b` M86
  accuracycheck-bypass fast-forward + this ledger commit. Baseline at
  orient re-verified 1,596/1,596 + artifact byte-identical to R88. Tree
  clean, committed, green. Core-only session: no ABI, adapter, canonical
  TS, or npm file touched.
- **Did (this step):** worker (claude-sonnet-5, 45-min cap, one commit,
  27.0 min, $5.80, foreground gates) ported the no-roll bypass ladder of
  0x1 accuracycheck (`battle_script_commands.c:1099-1189`, bypass branch
  :1103-1113): NO_ACC_CALC_CHECK_LOCK_ON / NO_ACC_CALC operand dispatch
  (operand checked BEFORE roles; unknown/missing operand -> Halt verbatim
  incl. "<missing>"), lock-on sure-hit > bare semi-invulnerable jump
  (ZERO flag/missType/history writes — pinned asymmetry) > protect gate
  (MISSED + B_MSG_PROTECTED + per-target lastLandedMoves/lastHitByType
  clear), protect reads gCurrentMove regardless of the literal 0,
  unknown-move -> not-protected (never an error), find-first registration
  with NO shape validation (a NEW convention pin vs recent siblings;
  error "committed Battle Script program does not emit ..." verbatim),
  lazy taken-only labels, and a typed `FullFormulaPathPending` staging
  for ACC_CURR_MOVE/MOVE_FUTURE_SIGHT/MOVE_DOOM_DESIRE (native unit
  tests only, no TS-parity claim). **30 behavior + 3 registration**
  cases over the 9 committed bypass sites + custom edges; corpus sha256
  `ec8e2d37ad28ecad421b63421142b7c016c69891912588fab62831cf2db303b3`.
- **Next:** M87 worker ALREADY DISPATCHED (55-min cap, brief
  `/tmp/rust-briefs/accuracycheck-m87.txt`): the full-formula path —
  protect/lock-on (TS diverges from C's lock-on absorb tail; pin TS +
  document), hitmarker ladder with per-leg carry asymmetry, weather
  bypasses, native calculate_accuracy/roll_accuracy_hits reuse, ONE
  "accuracycheck" rng draw, miss tail (CheckWonderGuardAndLevitate +
  missType chooser), destiny-bond hit tail; absorb/Flash-Fire label
  block staged behind `AbsorbingTailPending` for M88 (part 3/3).
- **Notes:** supervisor audit covered the apply body, both jump
  sub-branches, all error texts (incl. the shared ungrammatical "a
  attacker"), and every cited line (battle.h:160/163/164/175/220,
  pokemon.h:209, moves.h:252/357, battle_script_commands.c:57/80/332,
  battle_script.inc:6-10, 66-site census 55/8/1/1/1); independent
  regeneration byte-identical. Generated Rust **194,403 bytes**, sha256
  `8c6f5d44e28871d8e0e283608874c63792000e34bdee56ac85f28b3765a0107a`;
  generator **30,095 bytes**, sha256
  `530591975eb7092f527bff4d947b7fab985f5bdf26fd0ee0578db00c0219ab53`.
  Gates on `rust-main` post-fold: **1,612/1,612** native (+16), fmt,
  strict workspace Clippy, wasm32 release; artifact **496,730 bytes**,
  sha256
  `e352de252853008ab764faf15e55550615033370be755096f9ed60705ba7a884` —
  NOTE the artifact SHRANK 15,509 B vs R88; worker and supervisor builds
  from identical source agree byte-for-byte, so this is deterministic
  codegen/layout drift from the new module, not an environment fault.
  91 of 215 TS opcode names fully ported (accuracycheck counts only when
  M88 completes). R86 archived. No npm gate required; no deferral added.
  No PAPERCUT.

## R88 — [supervised session wind-down (final), 2026-09-10 15:01–~17:45 UTC, unattended] **M85 semi-invulnerable trio + session close (four green folds)**

- **State:** `rust-main` = master (no-op merge at orient) plus four verified
  Sonnet worker fast-forwards this session — `d88578fd3` M82 byte-algebra
  trio, `65d0c40a6` M83 tryKO, `49ccfa4cc` M84 type-curse trio, `bc4936483`
  M85 semi-invulnerable trio — each followed by its ledger commit and a
  successful `backup-refs.sh` push. Tree clean, committed, green; no worker
  worktree or branch left behind. No ABI, adapter, canonical TS, or npm
  file was touched all session, so the main supervisor's fold is
  `core-rs/**` + `RUST_PROGRESS*.md` only.
- **Did (this step):** worker (claude-sonnet-5, 40-min brief cap, one
  commit, ~29 min, foreground gates) ported 0x18 clearstatusfromeffect /
  0xC5 setsemiinvulnerablebit / 0xC6 clearsemiinvulnerablebit
  (`battle_script_commands.c:2951-2963/:9009-9026/:9028-9045`): the
  narrowed `sStatusFlagsForMoveEffects` projection (CHARGING→
  STATUS2_MULTIPLETURNS only; RAGE and all others → 0, matching the C
  designated-initializer default), the ≤6 status1/status2 branch split +
  moveEffectByte reset, selector-unavailable as a first-class Halt (a
  pinned DEVIATION from the jump family's Block convention, incl. the
  "<missing>" rendering), registration that pins the literal BS_ATTACKER
  operand expression (stricter than any sibling), the zero-operand
  exactly-1/exactly-2 convention WITH dispatcher check (vs
  registerSingleInstruction's without — pinned), the currentMove switch
  (Fly/Bounce/Dig/Dive; default → bit-0 no-op pinned), and the SHARED
  hit-chain role error "Battle Script hit-chain command requires a
  attacker role" verbatim. **33 behavior + 16 registration** cases; corpus
  sha256
  `b8ba30d39c8ce71b25d3af147f8f55adcee07aa90362877dcf66ffefd9a7dc03`.
- **Next:** merge master, re-run the four Rust gates, then continue.
  Recommended opener: ACCURACYCHECK (0x1, 66 sites) per R87's scout notes —
  `calculate_accuracy`/`roll_accuracy_hits` already native
  (`damage_calc.rs:777-845`); the opcode layer adds the NO_ACC_CALC
  bypasses, protect/semi-invulnerable/hitmarker ladder (consumer side of
  THIS step's bits), always-hit/weather bypasses, and the heavy tails
  (`advancePastAccuracyCheck` absorb/Flash-Fire label jumps,
  wonder-guard/levitate, `jumpToMissTarget` moveHistory clear) — consider
  splitting bypass-path-first. 91 of 215 TS opcode names ported. No
  deferral is open.
- **Notes:** supervisor audit covered the apply bodies (mask lookup, branch
  split, byte reset, "<missing>" Halt), all three registration ladders and
  error texts (incl. TS's ungrammatical "requires all 1 concrete starts"),
  and battle.h:139/:163/:164/:175/:253 citations; independent regeneration
  was byte-identical. Generated Rust **43,675 bytes**, sha256
  `8c80f061e675b78546e8acb7274442eb06dad6211c41a24ae2146fce81fcca96`;
  generator **31,146 bytes**, sha256
  `9118a88003cb9b6974639f0f1053657ea53b480deec0badc4d1241eab08c514c`.
  Final gates on `rust-main`: **1,596/1,596** native (up from 1,511 at
  orient, +85 across four leaves), fmt, strict workspace Clippy, wasm32
  release; artifact **512,239 bytes**, sha256
  `8e49c369c4ed8fd8048014f3ecd1cab72a836f3541c270cb8ae7ed73058b12ad`.
  Session-wide: four Sonnet workers (~$18.90), four clean landings 26-30
  min, ZERO cap expiries (the foreground-gates brief rule holds). 10
  opcodes went native this session (3 byte-algebra + tryKO + 3 type-curse
  + 3 semi-invulnerable; 91 of 215 TS opcode names). Also fixed two glued
  archive headers (R85 commit). No npm gate required; no deferral or
  barrier added. R85 archived. No PAPERCUT.

## R87 — [supervised session, 2026-09-10 15:01 UTC–, unattended] **M84 type-jump + curse trio folded (third green fold this session)**

- **State:** `rust-main` = master (no-op merge at orient) + `d88578fd3` M82
  byte-algebra trio + `65d0c40a6` M83 tryKO + `49ccfa4cc` M84 type-curse
  trio, each a verified Sonnet worker fast-forward followed by its ledger
  commit and `backup-refs.sh` push. Tree clean, committed, green. No ABI,
  adapter, canonical TS, or npm file touched; the main supervisor's fold
  remains `core-rs/**` + `RUST_PROGRESS*.md` only.
- **Did (this step):** worker (claude-sonnet-5, 45-min brief cap, one
  commit, ~26 min, foreground gates) ported 0x22 jumpiftype / 0x42
  jumpiftype2 / 0xAF cursetarget as one module
  (`battle_script_commands.c:3243-3253/:3981-3990/:8468-8483`): the two
  type-jumps share one both-slots compare core (IS_BATTLER_OF_TYPE,
  battle.h:471) but pin OPPOSITE validation philosophies — jumpiftype's
  runtime-only type-universe Halt (which PRECEDES selector-Block) vs the
  curse factory's eager exactly-1 registration with label
  PREVALIDATION (a FIFTH registration convention: labels resolve at
  registration, unlike every lazy-jump sibling) and jumpiftype2's
  no-runtime-Halt compare-false asymmetry; cursetarget's cursed-guard fail
  jump vs fresh-curse bit-set + `max(1, floor(attacker.maxHP/2))` damage
  staging, roles-required errors verbatim (the ungrammatical "a attacker"
  again). **27 jump + 8 curse behavior + 17 registration** cases; corpus
  sha256
  `9425dbc41803aa61cde8b7f38a1c46a48fe0e31d47dbf57dc14b8fb05b9af499`.
- **Next:** the big remaining scouted leaf is ACCURACYCHECK (0x1, 66 call
  sites) — scouted this session: `calculate_accuracy`/`roll_accuracy_hits`
  are ALREADY NATIVE in `damage_calc.rs` (:777-845), and the opcode layer
  adds the NO_ACC_CALC/CHECK_LOCK_ON bypass (hitChainOpcode.ts:1082-1118),
  protect/semi-invulnerable/hitmarker-clear ladder, rain/sun Thunder +
  always-hit bypasses, and the heavy miss/hit tails — `jumpToMissTarget`
  (moveHistory clear, :849), wonder-guard/levitate (:1000-1058, typecalc
  cousin native), and `advancePastAccuracyCheck`'s destiny-bond +
  Volt/Water-Absorb + Flash-Fire absorbing tails with PP-loss label
  variants (:921-999). Judged too heavy for this session's remaining
  window; recommend it as the NEXT-SESSION opener, possibly split
  bypass-path-first then full-formula path. 88 of 215 TS opcode names
  ported. No deferral is open.
- **Notes:** supervisor audit covered both apply bodies and all three
  registration ladders against TS (Halt-precedes-Block order, the
  runtime-vs-registration asymmetry both directions, lazy taken-only
  labels, cursed-guard precedence, truncating-vs-floor equivalence),
  battle.h:152/:471 and pokemon.h:6-23 citations; independent regeneration
  was byte-identical. Generated Rust **67,614 bytes**, sha256
  `655571de82857a9f33dbecc0c5fc98ae6680105f1e99572a5ecb6d84c5c8d341`;
  generator **38,706 bytes**, sha256
  `df8255f498bd6b03e92e12ec55a48caf57142b87519c95374d3a2ad4c791fa55`.
  Gates on `rust-main` post-fold: **1,582/1,582** native (+22), fmt,
  strict workspace Clippy, wasm32 release; artifact **512,235 bytes**,
  sha256
  `0975fe75ac7aeb8b1e4477ef257728f0e2f6549ab7b33052c73e4d595688f67b`.
  Worker: 26.2 min, $4.04. No npm gate required; no deferral or barrier
  added. R84 archived.

## R86 — [supervised session, 2026-09-10 15:01 UTC–, unattended] **M83 tryKO folded (second green fold this session)**

- **State:** `rust-main` = master (no-op merge at orient) + `d88578fd3` M82
  byte-algebra trio + `65d0c40a6` M83 tryKO, each a verified Sonnet worker
  fast-forward followed by its ledger commit and `backup-refs.sh` push.
  Tree clean, committed, green. No ABI, adapter, canonical TS, or npm file
  touched; the main supervisor's fold remains `core-rs/**` +
  `RUST_PROGRESS*.md` only.
- **Did (this step):** worker (claude-sonnet-5, 60-min cap, one commit,
  ~27 min, foreground gates) ported 0x93 tryKO
  (`battle_script_commands.c:7490-7576`), OHKO's own hit/miss
  determination — up to TWO ordered rng draws under the M77/M78 projection
  (Focus Band holder-only roll "tryko-focus-band", consumed even when
  Sturdy then short-circuits; formula roll "tryko" skipped only on the
  exact ownedSureHit conjunction), Sturdy's hardcoded-label jump
  (tryinfatuating precedent) + native ability reveal, the strict-<
  formula with the level-clause hard override (winning roll still misses
  as UNAFFECTED when out-leveled; C u16-wrap unobservability documented),
  the hit trichotomy (endured > focusBanded > plain OHKO, incl. persisted
  focusBanded and lastUsedItem), both miss-message choosers, lazy fail
  label, find-first REQUIRED registration, and every error text pinned
  verbatim (incl. the ungrammatical "a attacker"). Reused native
  ai_reveal/adjustdamage hold-effect/MOVES projections — no new table
  formats. **27 behavior + 3 registration** cases; corpus sha256
  `c949f5acd9149736b56ac90e07e71fb2f18b399abe7cb30cce09b7a97cf429d7`.
  Worker surfaced that the missing-Sturdy-label case IS TS-differentially
  realizable via `program.labelEntries` excision (unlike tryinfatuating's
  Oblivious analogue) and pinned it through the real canonical handler.
- **Next:** re-scout the remaining unported opcodes (85 of 215 TS names
  ported; ledger count is authoritative — a quick OPCODE_NAME-const grep
  undercounts family modules). Largest scouted candidate: accuracycheck
  (66 call sites; its accuracy calc is already native in damageCalc — the
  opcode adds protect/semi-invulnerable/always-hit gates + the roll).
- **Notes:** supervisor audit walked the apply body against TS line by
  line (draw ordering, pre/post-band state captures, sure-hit conjunction
  legs, strict-< boundary, trichotomy precedence, injected-label
  projection, hold-effect error passthrough) and verified
  battle.h:220/224/226/227, battle_string_ids.h:492-493,
  battle_message.c:1108-1111, abilities.h:9, hold_effects.h:43;
  independent regeneration was byte-identical. Generated Rust **150,325
  bytes**, sha256
  `763d99eb7861392102d11da5bd685c548755e5c70c9e866e99c99a1366df3278`;
  generator **37,557 bytes**, sha256
  `6cd890b0590f2ab44c2bc5a23164127a2c71dbebd35460d75eca9452db273e1c`.
  Gates on `rust-main` post-fold: **1,560/1,560** native (+26), fmt,
  strict workspace Clippy, wasm32 release; artifact **512,236 bytes**,
  sha256
  `f4ab8601795e93ad172412b96905cce60d4b6b0a53bfd2754592ab9d172b51ac`.
  Worker: 27.4 min, $5.27. Cosmetic: module doc's TS filename has a
  doubled suffix ("battleScriptTryKOOpcodeOpcode.ts") — harmless. Case
  count landed under the brief's ~40-55 band (27) but covers every named
  branch/boundary; accepted. No npm gate required; no deferral or barrier
  added. R83 archived.

## R85 — [supervised session, 2026-09-10 15:01 UTC–, unattended] **M82 byte-algebra trio folded (first green fold this session)**

- **State:** `rust-main` = master (no-op merge at orient) + `d88578fd3` M82
  byte-algebra trio (verified Sonnet worker fast-forward), ledger commit and
  `backup-refs.sh` push to follow this entry. Tree clean, committed, green.
  No ABI, adapter, canonical TS, or npm file touched; the main supervisor's
  fold remains `core-rs/**` + `RUST_PROGRESS*.md` only.
- **Did (this step):** worker (claude-sonnet-5, 60-min cap, one commit,
  ~28 min, foreground gates) ported the byte-algebra trio as one module —
  0x36 bicbyte / 0x33 orbyte / 0x38 bicword (`battle_script_commands.c`
  :3889-3894/:3864-3869/:3905-3912): advance-only bit algebra with THREE
  distinct registration conventions pinned side-by-side — bicbyte eager over
  all 11 starts (dispatcher check + 24-name pointer-list membership +
  3-mask table), orbyte eager over all 11 starts but NO dispatcher check and
  exact-string pointer match (asymmetry pinned by a dedicated test; orbyte
  slice only, statbuffchange's 31-start requirement is another opcode's
  registration per the M81 slice precedent), bicword find-first REQUIRED
  with zero registration validation and every guard a runtime first-class
  Halt mirroring `unsupportedBranch` verbatim (M74 shape). Documented
  divergence: bicbyte's runtime byte universe is narrowed to
  `gMoveResultFlags` (all 11 committed sites); other listed pointers pass
  registration but Halt at execution (no TS oracle value — pinned by a
  native unit test only, called out in module + generator doc comments).
  **41 behavior + 13 registration** cases; corpus sha256
  `ef7c703a76f8b101625e02c72c324f3f533343fecfeb17fa6d8f509dbe0bb509`
  (27,877 bytes).
- **Next:** with the byte-algebra trio native, the remaining scouted leaves
  are the rng-drawing hit-chain opcodes (accuracycheck, tryKO — unblocked by
  the M77 drawBattleScriptRng projection precedent). Re-scout with
  /tmp/rust-briefs/{ts,rs}-opcodes.txt (84 of 215 TS opcode names now
  ported). No deferral is open.
- **Notes:** supervisor audit covered all three resolvers and registration
  ladders against TS (error texts, evaluation order, the dispatcher-check
  asymmetry, Halt-mirror fields), HITMARKER/MOVE_RESULT bit values against
  battle.h, and the 11/11/3 call-site censuses (independently re-grepped:
  masks 3/7/1, values 3/5/3 — byte-identical to the module doc); independent
  regeneration was byte-identical. Generated Rust **41,635 bytes**, sha256
  `3c74a0ebbd23e9b569ef1608fcbee6e99f706bb1ee67f5468c83f24304bb3b83`;
  generator **30,026 bytes**, sha256
  `b5f2c5d1c14d0bb387b063115b26be3d6629daed03c01bbe0ff45c5672f272ae`.
  Gates on `rust-main` post-fold: **1,534/1,534** native (+23), fmt, strict
  workspace Clippy, wasm32 release; artifact **512,528 bytes**, sha256
  `0dd93b02d94ec3f854546eb03a08ee1af3bab9a38426e1bc4237fef2c4f3e18c`.
  Worker: 28.4 min, $4.56. Also fixed two glued-entry defects in
  RUST_PROGRESS-archive.md (R78/R81 headers). No npm gate required; no
  deferral or barrier added. R82 archived.


## R84 — [supervised session wind-down (final), 2026-09-10 03:01–~06:00 UTC, unattended] **M81 jumpifstatus pair + session close (five green folds)**

- **State:** `rust-main` = master (no-op merge at orient) plus five verified
  Sonnet worker fast-forwards this session — `89ae3d1e8` M77 critcalc,
  `13b496eac` M78 adjust-damage family, `c19b4effe` M79 fixed-damage
  cluster (supervisor-repair commit), `0c6a54795` M80 side-status family,
  `f17f8bc82` M81 jumpifstatus/jumpifstatus2 — each followed by its ledger
  commit and a successful `backup-refs.sh` push. Tree clean, committed,
  green; no worker worktree or branch left behind. No ABI, adapter,
  recovery module, canonical TS, or npm file was touched all session, so
  the main supervisor's fold is `core-rs/**` + `RUST_PROGRESS*.md` only.
- **Did (this step):** worker (claude-sonnet-5, 45-min cap, one commit,
  ~29 min, foreground gates) ported 0x1C/0x1D
  (`battle_script_commands.c:3081-3091`/`:3093-3103`): the shared
  jump-if-`(status & mask) && hp != 0` core, the status1 resolver
  (arbitrary `|`-combos over 6 single bits + STATUS1_ANY 0xff) and the
  fixed 6-entry status2 map ported DIRECTLY (documented deviation from the
  M74 catalog suggestion — both resolvers are fully enumerable, so the
  direct port matches TS over ALL expressions, strictly higher fidelity),
  selector-Block and unsupported-mask Halt mirrors (jumpifstat/jumpif
  precedents; Halt-precedes-Block precedence pinned), lazy taken-branch-only
  label resolution with exact per-opcode unresolved texts, and a FOURTH
  registration convention pinned: statusPrimary find-first REQUIRED vs
  statbuffchange OPTIONAL presence (absent → no handler, no error).
  **29 behavior + 5 registration** cases; corpus sha256
  `06caac3440ce535656c665b60f0a3f4bb13bf7a73e85e4295721f776a1df4c73`.
  Worker-noted TS quirk pinned verbatim: jumpifstatus2's unsupportedBranch
  cites `:3096` (its flags line) vs jumpifstatus's `:3081` (handler line).
- **Next:** merge master, re-run the four Rust gates, then continue.
  Scouted candidates (2026-09-10): bicbyte/orbyte/bicword byte-algebra
  opcodes (orbyte requires ALL 11 concrete starts,
  `battleScriptStatbuffchangeOpcode.ts`/`battleScriptSetByte.ts`/
  `battleScriptDamagingWeatherOpcode.ts:444`); with the M77 rng-projection
  and M81 selector-port precedents, accuracycheck/tryKO-class hit-chain
  leaves are unblocked too. Re-scout with /tmp/rust-briefs/{ts,rs}-opcodes.txt.
  No deferral is open.
- **Notes:** supervisor audit covered both resolvers against the TS
  originals (incl. empty-string and combo edge equivalence), precedence,
  the hp conjunct, lazy labels, both registration conventions, and every
  vector label; independent regeneration was byte-identical. Generated Rust
  **24,634 bytes**, sha256
  `304ecbf651a24bae662341e6d527e21fb4ad64c49690ff8726b8ffd89827434c`;
  generator sha256
  `8219b7598a710f8588273c81ee3e0ba9dd733799356cf3a68306ed3cc1579bc1`.
  Final gates on `rust-main`: **1,511/1,511** native (up from 1,425 at
  orient, +86 across five leaves), fmt, strict workspace Clippy, wasm32
  release; artifact **512,496 bytes**, sha256
  `7a87893d92a3e2e697e356335f7900d4288a66a550c4fbb1c2d08a5fc6ad9d8a`.
  Session-wide: five Sonnet workers (~$23), four clean landings 19-29 min,
  one cap-expiry (M79, end_turn-vs-background-gates; briefs now mandate
  FOREGROUND gates — zero recurrences after the fix; supervisor verified +
  committed that work as a direct repair). 14 opcodes went native this
  session (81 of 215 TS opcode names ported). No npm gate required; no
  deferral or barrier added. R81 archived. PAPERCUT: M79 end_turn expiry,
  ~15 supervisor minutes.


## R83 — [supervised session, 2026-09-10, unattended] **M80 side-status family folded (fourth green fold)**

- **State:** `rust-main` = master (no-op merge at orient) plus four verified
  Sonnet worker fast-forwards this session — `89ae3d1e8` M77 critcalc,
  `13b496eac` M78 adjust-damage family, `c19b4effe` M79 fixed-damage cluster
  (supervisor-repair commit), `0c6a54795` M80 side-status family — each
  followed by its ledger commit and a successful `backup-refs.sh` push.
  Tree clean, committed, green; no worker worktree or branch left behind.
  No ABI, adapter, recovery module, canonical TS, or npm file was touched
  all session, so the main supervisor's fold is `core-rs/**` +
  `RUST_PROGRESS*.md` only.
- **Did (this step):** worker (claude-sonnet-5, 45-min cap, one commit,
  ~19 min, foreground gates per the new brief rule) ported the five-opcode
  side-status family from `battleScriptSetSideStatusOpcode.ts` (0x7E
  setreflect / 0x92 setlightscreen / 0x99 setmist / 0xB8 setsafeguard /
  0xEE removelightscreenreflect): the shared bit-setter shape (fail-if-active
  → MISSED + chooser 0 only; success → bit + 5-turn timer + battlerId +
  single-message chooser), Mist's divergences (guard on the RAW mistTimers
  value not the bit — bit-set-timer-0 succeeds, pinned — FAILED not MISSED,
  its own choosers), removelightscreenreflect's opposing-side timer-guarded
  clear with animTurn/animTargetsHit on both branches, the
  registerSingleInstruction convention (exactly-1 + 0-operands, NO
  dispatcher check — third registration convention now pinned), and the
  documented C discrepancy (double-battle message variant unmodeled; TS is
  spec). **30 behavior + 6 registration** cases; corpus sha256
  `323e4c45348f7a5d3ea5122a227da640ae01171b8dd0d3ad92c35c790aac6208`
  (163,574 bytes). Worker self-corrected one brief citation (setsafeguard
  body ends `:8668`, not `:8669`) — verified correct.
- **Next:** merge master, re-run the four Rust gates, then continue.
  Scouted candidates (2026-09-10): bicbyte/orbyte/bicword byte-algebra
  opcodes (heavier catalog + multi-start registration — orbyte requires ALL
  11 concrete starts, `battleScriptStatbuffchangeOpcode.ts` /
  `battleScriptSetByte.ts` / `battleScriptDamagingWeatherOpcode.ts:444`);
  JUMPIFSTATUS/JUMPIFSTATUS2. With M77's rng projection precedent, the
  bigger rng-drawing hit-chain leaves (accuracycheck, tryKO) are also now
  unblocked. Re-scout with /tmp/rust-briefs/{ts,rs}-opcodes.txt. No
  deferral is open.
- **Notes:** supervisor audit covered the shared bit-setter (fail branch
  mutates flags+chooser only), Mist's timer-vs-bit guard, opposing-side
  algebra, and both registration error texts; independent regeneration was
  byte-identical. Generated Rust **411,700 bytes**, sha256
  `0cf9d94f7353bcfb15fa6f2e154c8b5d8517560769dcac131e4a4ad81e48c28d`;
  generator **26,080 bytes**, sha256
  `210ed992fe04ae2e86eaba7e2db89aec5450837db38327d73550dca595e3f15d`.
  Final gates on `rust-main`: **1,492/1,492** native (up from 1,425 at
  orient, +67 across four leaves), fmt, strict workspace Clippy, wasm32
  release; artifact **512,497 bytes**, sha256
  `43d3e2d670482bcb73ee60db4f524b6b14e64dcd64ef0bbfe64baa8125ac3082`.
  Session-wide: four Sonnet workers (~$18), three clean landings 19-29 min,
  one cap-expiry (M79: worker ran gates as a background task and ended its
  turn — end_turn kills pending work; briefs now mandate FOREGROUND gates;
  supervisor verified + committed the finished work as a direct repair).
  12 opcodes went native this session (crit trio member + 3 adjust + 4
  fixed-damage + 5 side-status = 79 opcode names ported of 215 TS names).
  No npm gate required; no deferral or barrier added. R80 archived.
  PAPERCUT: M79 end_turn-vs-background-gates, ~15 supervisor minutes.


## R82 — [supervised session, 2026-09-10 03:01 UTC–, unattended] **M79 fixed-damage cluster folded (third green fold; supervisor-repair commit)**

- **State:** `rust-main` = master + M77 `89ae3d1e8` + M78 `13b496eac` + M79
  `c19b4effe`, each verified and checkpointed (ledger commit +
  `backup-refs.sh`). The fixed-damage cluster (0x9F dmgtolevel / 0xA0
  psywavedamageeffect / 0x94 damagetohalftargethp / 0xD8
  setdamagetohealthdifference) is native. No ABI, adapter, canonical TS, or
  npm file touched.
- **Did (this step):** worker (claude-sonnet-5, 50-min cap, ~21 min) wrote
  the complete module but expired waiting on its own background `cargo
  test` and committed NOTHING (correct per contract). Supervisor verified
  the uncommitted work in the worker worktree — full audit of all four
  apply bodies against TS (`hitChainOpcode.ts:1749-1762/1766-1793/2094-2125`,
  `rankedBatch1Opcode.ts:205-217`), both registration conventions
  (hit-chain find-first vs rankedBatch1 exactly-1 + dispatcher + 0-operand),
  psywave's unbounded rejection loop (%16, accept <=10) under the M77/M78
  rng projection with ordered Vec<Draw>, healthdiff's taken-branch-only
  jump resolution — plus double regeneration (byte-identical, sha
  `e6d98b465e5546c8c0860c8c1a9fd36100f37bb5980e09df1575a3caef22290d`,
  466,885 B) and all four gates in the worktree, then committed it AS the
  worker branch commit `c19b4effe` (supervisor-repair provenance recorded
  in the commit message). **23 behavior + 9 registration** cases; corpus
  sha256 `20f30d0f4b56a7f048a61544277c63388bf7f427818e127064dbdc7f528ffc2a`.
- **Next:** possibly one more small leaf this session if the clock allows;
  otherwise wind down. Unported candidates re-scouted 2026-09-10: the
  bicbyte/orbyte/bicword byte-algebra opcodes have heavier catalog-style
  registration (`battleScriptSetByte.ts` / `battleScriptStatbuffchangeOpcode.ts`
  / `battleScriptDamagingWeatherOpcode.ts:444` — orbyte requires ALL 11
  concrete starts); JUMPIFSTATUS/JUMPIFSTATUS2 similar. No deferral is open.
- **Notes:** worker cap-expiry root cause: it launched `cargo test` as its
  own background task and ended its turn awaiting it — same end_turn
  pitfall as the Aug-31 supervisor sessions, now seen worker-side.
  Follow-up for future briefs: tell workers to run gates in the foreground.
  Gates rerun on `rust-main` post-fold: **1,479/1,479** native (+11), fmt,
  strict workspace Clippy, wasm32 release; artifact **512,508 bytes**,
  sha256 `ccf224e71f7adbde645dbbd30de26fc51500ba36d2b9955ee10f6d894a75cd45`.
  Generator **34,428 bytes**, sha256
  `4c3d7282d4b959f4f08fdf3660c6bd240494c0326121fbe50ea86ba683527ec3`.
  Worker: 21.3 min, $5.20. No npm gate required; no deferral or barrier
  added. R79 archived. PAPERCUT: worker end_turn-vs-background-gates cost
  ~15 supervisor minutes.


## R78 — [supervised session wind-down, 2026-09-09 15:03–~17:30 UTC, unattended] **M75 `Cmd_damagecalc` leaf + session close (four green folds)**

- **State:** `rust-main` = master (merge at orient was a no-op) plus four
  verified Sonnet worker fast-forwards this session — `04af3c26b` M72 shared
  base-damage helper, `ed854dc2f` M73 stockpile family, `be0b4b1f7` M74
  jumpif compare family, `09f222f49` M75 damagecalc — each followed by its
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


## R81 — [supervised session, 2026-09-10 03:01 UTC–, unattended] **M78 adjust-damage family folded (second green fold this session)**

- **State:** `rust-main` = master + M77 `89ae3d1e8` + M78 `13b496eac`
  (both verified Sonnet fast-forwards, each with ledger commit +
  `backup-refs.sh` push). The adjust-damage family (0x07 adjustnormaldamage /
  0x08 adjustnormaldamage2 / 0x69 adjustsetdamage) is native: shared core
  with per-opcode wiring (variance-draw presence, requireMoveRow gating).
  First multi-draw consumer of the M77 rng projection — 0/1/2 ordered draws
  cross as `Vec<Draw>`. No ABI, adapter, canonical TS, or npm file touched.
- **Did (this step):** worker (claude-sonnet-5, 50-min cap, one commit,
  ~22 min) ported the family per `battle_script_commands.c:1658-1698`,
  `:1701-1741`, `:5861-5899` + `ApplyRandomDmgMultiplier` `:1639-1651`:
  target-role-only precedence, variance draw first (reasons
  "adjustnormaldamage"/"adjustnormaldamage2"), Focus Band holder ALWAYS
  draws ("<base>-focus-band"; roll%100 < param sets the bit + native
  `record_battle_script_item_effect_reveal`), pre-existing focus_banded bit
  honored, Substitute-gated survival clamp (hp<=damage → hp-1) with
  endured-over-banded flag priority (FOE_ENDURED 1<<6 / FOE_HUNG_ON 1<<7 +
  lastUsedItem), and the false-swipe divergence pinned three ways: 0x07
  clamps on EFFECT_FALSE_SWIPE (101) and errors on unknown move, 0x08 never
  calls requireMoveRow, 0x69 (no variance draw) calls it unconditionally.
  Composed `apply_random_damage_multiplier`, `resolve_battler_hold_effect`/
  `_param` (enigma param array forwarded through the critcalc-style shim),
  and the reveal helper — nothing duplicated. **34 behavior + 4
  registration** cases; corpus sha256
  `02413888d15f9578a2cc3cba2a8add8df97e1c1f9ecf149a5062cf3e32e545ec`.
- **Next:** M79 scouted — the fixed-damage cluster as one family leaf:
  `dmgtolevel` (0x9F, `:7926-7930`), `psywavedamageeffect` (0xA0,
  `:7932-7941`, unbounded rejection-sampling draw loop — Vec<Draw> precedent
  covers it), `damagetohalftargethp` (0x94, `:7577-7584`, lives in
  `battleScriptRankedBatch1Opcode.ts:205`), `setdamagetohealthdifference`
  (0xD8, `:9366-9377`, ptr operand + fail-jump, TS
  `hitChainOpcode.ts:2098-2125`). Ground truth doc:
  `docs/fixed-damage-cluster-ground-truth.md`. No deferral is open.
- **Notes:** supervisor audit covered the shared core against both TS bodies
  (draw order/chaining, holder-always-draws incl. pre-existing-bit, clamp
  predicate + flag priority, lastUsedItem pre-mutation read, substitute bit
  0x0100_0000, per-opcode requireMoveRow wiring) and a two-draw vector's
  chaining (before₂==after₁, calls 0→2); independent regeneration was
  byte-identical. Generated Rust **478,116 bytes**, sha256
  `078338789b21aaf507537ffe76d6fd12f529328ae12ee00ac67f93b9528816d9`;
  generator **37,037 bytes**, sha256
  `6bac564d27a4f08fc1ddebac5b31da4f926be80109e6361f9c104da1f3c4fc31`.
  Gates rerun on `rust-main` post-fold: **1,468/1,468** native (+20), fmt,
  strict workspace Clippy, wasm32 release; artifact **512,496 bytes**, sha256
  `55eed0198510d362576397cd838b90e27917c8c740b6f1b711effcb3ebac2718`.
  Worker: 22.3 min, $4.48, zero rejections. No npm gate required; no
  deferral or barrier added. R78 archived. PAPERCUT: none new.


## R80 — [supervised session, 2026-09-10 03:01 UTC–, unattended] **M77 `Cmd_critcalc` leaf folded — hit-chain trio complete, drawBattleScriptRng projection landed**

- **State:** `rust-main` = master (no-op merge at orient; baseline 1,425 green
  reconfirmed) plus verified Sonnet worker `89ae3d1e8` (fast-forward). The
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
  Sonnet worker fast-forwards this session — `04af3c26b` M72 shared
  base-damage helper, `ed854dc2f` M73 stockpile family, `be0b4b1f7` M74
  jumpif compare family, `09f222f49` M75 damagecalc, `bc220fef2` M76
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


## R77 — [supervised session, 2026-09-09, unattended] **M74 jumpif compare family leaf + green checkpoint (barrier projection landed)**

- **State:** `rust-main` = R76 checkpoint `b53f6c4d5` plus the verified Sonnet
  worker `be0b4b1f7` (fast-forward). The 0x29/0x2A/0x2B
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

- **State:** `rust-main` = R75 checkpoint `9fae46362` plus the verified Sonnet
  worker `ed854dc2f` (fast-forward). The `B_SCR_OP_STOCKPILE`/
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

- **State:** `rust-main` = R74 checkpoint `2960a24c9` (master merge at orient
  was a no-op) plus the verified Sonnet worker `04af3c26b` (fast-forward).
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
  verified Sonnet worker fast-forwards this session — `a3be5e0c3`
  tryrecycleitem, `7b16ad646` removeitem, `59e4086ce` tryimprison,
  `4aab1b732` trysetfutureattack, `346cd02d3` tryswapitems — each followed
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

## R73 — [supervised session, 2026-09-08, unattended] **M70 `Cmd_trysetfutureattack` leaf + green checkpoint (first damage-kernel-reusing leaf)**

- **State:** `rust-main` = R72 checkpoint `2d87c7933` plus the verified Sonnet
  worker `4aab1b732` (fast-forward). The `B_SCR_OP_TRYSETFUTUREATTACK`
  registration/handler projection — the lane's first battle-script leaf that
  calls the ported `damage_calc::calculate_base_damage` kernel and the
  gen_tables MOVES row — is native and wasm32-compilable; no ABI, adapter,
  recovery module, canonical TS, or npm file was touched. Session still
  active; one final leaf (`Cmd_tryswapitems`, 45-min cap, reject-unfolded
  cutoff ~18:15 UTC) may follow before wind-down.
- **Did (this step):** worker (claude-sonnet-5, 50-min cap, one commit,
  ~33 min) ported the exactly-1 `0xc3` registration (distinct error texts
  pinned verbatim), the per-execution operand-only check, attacker+target
  roles, the occupied-`futureSightCounter[target]` LAZY fail jump, and the
  success path: counter=3 / move / attacker / dmg cell writes,
  `calculate_future_attack_base_damage` (Huge/Pure Power, type-boost items
  for Psychic+Steel, Choice Band, Soul Dew ×2, Light Ball, Metal Powder,
  Thick Club, Hustle, Plus/Minus over alive+present battlers, Guts, Marvel
  Scale — modifiers pre-applied and NOT forwarded to the kernel, mirroring
  the TS which passes no holdEffect/species and only ABILITY_GUTS),
  helpingHand ×15/10 trunc, target-side `SIDE_STATUS_FUTUREATTACK` OR,
  multistringChooser 353→1/248→0. No scheduler write, no events, no RNG.
  Canonical TS supplies **48 behavior** and **8 registration** cases; corpus
  sha256 `ef1b6a8cf22adebb7e4d8dad9faa3f17cd16443e37a2866ec62f58173fd07da8`.
- **Next:** dispatch + verify M71 `Cmd_tryswapitems` (brief prepared this
  session; citations verified) with the 18:15 cutoff, then wind down before
  19:01. After that, remaining rng-free candidates: stockpile family (needs
  the shared `calculateBattleScriptBaseDamageForCurrentMove` hit-chain
  helper — sports halvers + dynamicBasePower + type resolution — not yet
  ported as a shared Rust fn; budget it as a larger leaf), and the
  `jumpifbyte`/`jumpifhalfword`/`jumpifword` barrier-projection decision.
  No deferral is open.
- **Notes:** supervisor audit covered the handler against
  `battle_script_commands.c:8929-8956` and the kernel-input mapping
  (double-application avoidance is exactly the TS contract; the TS-generated
  corpus would fail on any mapping drift) plus generator provenance;
  independent regeneration was byte-identical. `is_double_battle_spread_move`
  is always false (TS `&& false`), so battleTypeFlags is deliberately not in
  this leaf's rules slice. Generated Rust is **228,591 bytes**, sha256
  `89b9d9b4c9c38a34b685715ea55e5dc4a771a1f37fec6ca3cc1620f6841b07c9`;
  generator is **34,927 bytes**, sha256
  `3b77a51f3519fb359573edd5d3a9adcac20c6c2376d1d6595c36a4b3fceb4282`.
  Gates rerun on `rust-main` post-fold: **1,308/1,308** native, fmt, strict
  workspace Clippy, wasm32 release; artifact **512,256 bytes**, sha256
  `8cf919245391dd50536cabd04794dc277f11da0866a7b4d63776ef2d72adf47f` (+5.0 KB
  from the kernel-reusing leaf). No npm gate required; no deferral or
  barrier added. R70 archived.

## R72 — [supervised session, 2026-09-08, unattended] **M69 `Cmd_tryimprison` leaf + green checkpoint**

- **State:** `rust-main` = R71 checkpoint `2a5df14fd` plus the verified Sonnet
  worker `59e4086ce` (fast-forward). The pure `B_SCR_OP_TRYIMPRISON`
  registration/handler projection — including the dedicated Pressure PP loop
  from `battle_util.c:767-797` — is native and wasm32-compilable; no ABI,
  adapter, recovery module, canonical TS, or npm file was touched. Session
  still active; the `Cmd_trysetfutureattack` leaf (M70, brief
  `/tmp/rust-briefs/trysetfutureattack-m70.txt`, citations verified this
  session — the lane's first leaf reusing the ported damage_calc kernel)
  dispatching as the final leaf before wind-down.
- **Did (this step):** worker (claude-sonnet-5, 50-min cap, one commit,
  ~25 min) ported the exactly-1 `0xdb` registration, per-execution shape
  check, EAGER failure-label resolution (before role/branches — unresolved
  errors even on success paths), the early IMPRISONED_OTHERS fail jump
  (skipping Pressure PP loss), the Pressure chain-decrement (one per
  opposing Pressure holder, first-Imprison position, floor 0; active pp
  always updated, party mirror + scheduler.activeBattler write + unique
  pending append + one `set-battler-pp-data` event strictly gated on
  MOVE_IS_PERMANENT: !TRANSFORMED && !mimicked-bit), and the post-PP
  overlap scan (MOVE_NONE excluded) choosing Advance + `status3 |=
  IMPRISONED_OTHERS` vs fail Jump. Canonical TS supplies **52 behavior**
  and **8 registration** cases; corpus sha256
  `fa2ed7db8c54beafe6733c53c648e3d9eb64dddedad355ec87aeac9f2c1b89ab`.
- **Next:** dispatch + verify M70 `Cmd_trysetfutureattack` with a hard
  reject-unfolded cutoff at ~18:25 UTC; then wind down (deadline 19:01).
  Remaining rng-free leaf candidates after that: stockpile (223 lines),
  tryswapitems (262). The `jumpifbyte`/`jumpifhalfword`/`jumpifword`
  candidates still need a barrier-projection decision first. No deferral
  is open.
- **Notes:** supervisor audit covered the handler against
  `battle_script_commands.c:9412-9451` + `battle_util.c:767-797` (eager
  resolution order, chain-decrement semantics, permanence gate, overlap on
  post-PP state) and generator provenance; independent regeneration was
  byte-identical. Worker self-corrected its guessed program counter (1794,
  verified against `loadBattleScriptProgram()`) before generating. Generated
  Rust is **402,810 bytes**, sha256
  `21ae30417d75436142571cc0370c17e9e9c894d3b3887fb7f9952283537b26f9`;
  generator is **38,421 bytes**, sha256
  `a39a63488adeafb21ba8b7d48e7491be39c86db6c30378071923071f6ef74e2d`.
  Gates rerun on `rust-main` post-fold: **1,292/1,292** native, fmt, strict
  workspace Clippy, wasm32 release; artifact **507,139 bytes**, sha256
  `22e277ec0eb26360bcce359bef90d3efb4f336c6846b0013239a35b1a7eeef00`.
  No npm gate required; no deferral or barrier added. R69 archived.

## R71 — [supervised session, 2026-09-08, unattended] **M68 `Cmd_removeitem` leaf + green checkpoint**

- **State:** `rust-main` = R70 checkpoint `338f45b8c` plus the verified Sonnet
  worker `7b16ad646` (fast-forward). The `B_SCR_OP_REMOVEITEM`
  registration/handler projection (13 concrete starts, BS_SCRIPTING /
  BS_ATTACKER selector resolution, unsupported-branch halt) is native and
  wasm32-compilable; no ABI, adapter, recovery module, canonical TS, or npm
  file was touched. Session still active; the `Cmd_tryimprison` leaf (brief
  `/tmp/rust-briefs/tryimprison-m69.txt`, citations verified this session)
  dispatching next.
- **Did (this step):** worker (claude-sonnet-5, 50-min cap, one commit,
  ~26 min) ported the exactly-13-starts `0x6a` registration (cardinality
  error first, then per-instruction first-offender shape errors incl. the
  BS_SCRIPTING/BS_ATTACKER selector whitelist), selector resolution
  (BS_ATTACKER → attacker role, BS_SCRIPTING → scriptingBattler; null →
  UnsupportedBranch halt carrying {pc, opcodeId, opcodeName,
  sourceConstruct, battle_script_commands.c, 5905} with rules/scheduler
  untouched), and the always-advance success path: usedHeldItems[battler] :=
  old active item (UNCONDITIONAL, even 0), active item := 0, party mirror :=
  0, lastUsedItem untouched, unique pending-controller append, one
  `set-battler-item {battler, 0}` event. No per-execution shape re-check
  (TS has none — mirrored). Canonical TS supplies **76 behavior** (74
  applied + 2 halt) and **10 registration** cases; corpus sha256
  `ecf8ec5ecd95f1ba20fec374b3525b4fd44ee827b8b818cae5cbba8f98cee419`.
- **Next:** dispatch + verify the `Cmd_tryimprison` leaf (M69). After that,
  remaining rng-free leaf candidates by TS size: trysetfutureattack (182),
  stockpile (223), tryswapitems (262). The
  `jumpifbyte`/`jumpifhalfword`/`jumpifword` candidates still need a
  barrier-projection decision first. No deferral is open.
- **Notes:** supervisor audit covered the handler against
  `battle_script_commands.c:5901-5915` and `battle_util.c:702-712` selector
  cases, registration ordering, and generator provenance; independent
  regeneration was byte-identical. Worker judgment call (accepted):
  production TS `scriptingBattler` is never-null by constructor, so the
  missing-scriptingBattler halt case is generated by overriding the frozen
  canonical rules object post-construction before calling the exported
  canonical handler — canonical code still computes the expectation. TS doc
  comment's `items.h:5` for ITEM_NONE is actually line 4; pinned at 4.
  Generated Rust is **570,771 bytes**, sha256
  `e5f4a0e413d19c488961e3e260c4997bbad22d5ec6368545fe32fb067909d4d2`;
  generator is **33,859 bytes**, sha256
  `bade63671fb22ff7f5dbba89b297302e22a74f5ffa7f736b48eea74292c8b988`.
  Gates rerun on `rust-main` post-fold: **1,272/1,272** native, fmt, strict
  workspace Clippy, wasm32 release; artifact **507,107 bytes**, sha256
  `32f4ca7baa8ad957134873e85f2c18c7ecf9d88e87e6c5cc8e7252f5fdfb9c5d`.
  No npm gate required; no deferral or barrier added. R68 archived.

## R70 — [supervised session, 2026-09-08, unattended] **M67 `Cmd_tryrecycleitem` leaf + green checkpoint**

- **State:** `rust-main` = R69 checkpoint `16e899e0c` (master merge at orient
  was a no-op — already up to date) plus the verified Sonnet worker
  `a3be5e0c3` (fast-forward). The pure `B_SCR_OP_TRYRECYCLEITEM`
  registration/handler projection is native and wasm32-compilable; no ABI,
  adapter, recovery module, canonical TS, or npm file was touched. Session
  still active; the `Cmd_removeitem` leaf (the usedHeldItems producer this
  opcode consumes) is being briefed next.
- **Did (this step):** worker (claude-sonnet-5, 50-min cap, one commit,
  ~16 min) ported the exactly-1 concrete-start `0xea` registration
  (cardinality error first, then first-offender shape errors), the
  per-execution shape check, the attacker-role requirement, the two-conjunct
  fail predicate (`usedHeldItems[attacker] == ITEM_NONE || battlers[attacker]
  .item != ITEM_NONE`, the De Morgan negation of the C success condition)
  with lazy failure-label resolution and rules/scheduler unchanged on the
  jump, and the success path: attacker active item := usedItem, (side,
  partyIndex) party-mirror write, usedHeldItems cell cleared (others
  retained), lastUsedItem := usedItem, unique pending-controller append, and
  exactly one `set-battler-item {attacker, usedItem}` event. Canonical TS
  supplies **85 behavior** and **8 registration** cases; corpus sha256
  `fa5eeb58a8553b283a40624fa18dd85d9157ebc0cfdad9dcb518449f2b254328`.
- **Next:** brief + dispatch the `Cmd_removeitem` leaf (M68; 13 concrete
  starts, BS_SCRIPTING/BS_ATTACKER selector resolution via
  `resolveRulesBattlerForBattleScript`, unsupported-selector outcome —
  citations verified this session). After that, remaining rng-free leaf
  candidates by TS size: tryimprison (171), trysetfutureattack (182),
  stockpile (223), tryswapitems (262). The
  `jumpifbyte`/`jumpifhalfword`/`jumpifword` candidates still need a
  barrier-projection decision first. No deferral is open.
- **Notes:** supervisor audit covered the handler against
  `battle_script_commands.c:9808-9829` (shape-check-first ordering, fail
  conjuncts, laziness, registration cardinality-then-shape order) and
  generator provenance; independent regeneration was byte-identical.
  Generated Rust is **390,032 bytes**, sha256
  `766ed55ce3cb42a90d0f7748833c91f0f7d213d940bfbd2a9cc8f29647e52a3a`;
  generator is **30,696 bytes**, sha256
  `2dbc138155a07f1927c4398c3e2922f56717e67ae384a8d51136e1e12a09a9b8`.
  Gates rerun on `rust-main` post-fold: **1,254/1,254** native (up from
  1,239 at orient), fmt, strict workspace Clippy, wasm32 release; artifact
  **507,121 bytes**, sha256
  `2d2f571d64eee47185ae8a64fe84729ffd8ba3731bc2f73993411cc1c3e34429`.
  Baseline at orient matched R69 exactly (1,239 native, artifact
  `7c67a269…`). No npm gate required; no deferral or barrier added. R67

## R69 — [supervised session wind-down, 2026-09-07 15:01–~18:10 UTC, unattended] **M66 `Cmd_trymemento` leaf + session close (five leaves folded)**

- **State:** `rust-main` = master `d5f22d28d` (already merged at orient) plus
  five verified Sonnet worker fast-forwards this session — `c7d5c9f30`
  trywish, `21f40a4fa` rolloutdamagecalculation, `1a9e14af0` trysetrest,
  `bfc7e79ee` chargesport, `b45263b12` trymemento — each followed by its
  ledger commit and a successful `backup-refs.sh` push. Tree clean,
  committed, green; no worker worktree or branch left behind. No ABI,
  adapter, recovery module, canonical TS, or npm file was touched all
  session, so the main supervisor's fold is `core-rs/**` +
  `RUST_PROGRESS*.md` only.
- **Did (this step):** worker (claude-sonnet-5, 50-min cap, one commit,
  ~21 min) ported the two-start `0xc9` registration (first-offender shape
  errors), per-execution shape check, attacker→target role order, the
  three-conjunct fail predicate (target ATK and SPATK stages both 0 and
  `missType != B_MSG_PROTECTED`) with lazy failure-label resolution and
  rules/scheduler unchanged on the jump, and the success path
  (`battleMoveDamage = attacker.hp`, unique pending-controller append, one
  `health-bar-update {attacker, 0x7fff}` event; target stages untouched).
  Canonical TS supplies **80 behavior** and **9 registration** cases;
  corpus sha256
  `b56a69bc7549bf021804bc25f684d6184109e6df62ca735ae92b29ddb95bf0ff`.
- **Next:** merge master, re-run the four Rust gates, then continue the
  leaf ladder — `/tmp/rust-briefs/tryrecycleitem.txt` is the remaining
  R57-era cached brief (re-verify citations first), then re-scout unported
  pure leaves. Remaining `jumpifbyte`/`jumpifhalfword`/`jumpifword`
  candidates still need a barrier-projection decision first — record it in
  `RUST_DEFERRED.md` if it cannot be made in session. No deferral is open.
- **Notes:** supervisor audit covered the handler against
  `battle_script_commands.c:9072-9091` and the TS module (shape-check-first
  ordering, conjunct set, laziness), plus generator provenance; independent
  regeneration was byte-identical. Generated Rust is **333,065 bytes**,
  sha256 `b922cab147397a3710b943980144c95177601e1a93f31298f4e2e993c93a5dc9`;
  generator is **31,654 bytes**, sha256
  `4d00a8d7a8699c75ce33e98d7155f52d0c514aa9bd7bb487d863163233716b8b`.
  Final gates on `rust-main`: **1,239/1,239** native (up from 1,145 at orient),
  fmt, strict workspace Clippy, wasm32 release; artifact **507,120 bytes**, sha256
  `7c67a269204304d73eb8e1727fd379d9471411aeddc88e5ab8dca3296829c2cf`. Session-wide: five Sonnet workers, five
  commits, zero rejections, zero cap expiries (~20-25 min each). The ten
  dead sessions of 09-01→09-06 were confirmed as the launch-then-end_turn
  kill pattern (headless supervisor ended its turn after launching; wrapper
  cleanup killed even setsid-detached workers); this session held its turn
  open with blocking waits on harness-tracked tasks for every worker — the
  durable fix. No npm gate required; no deferral or barrier added. R66
  archived. PAPERCUT: none new (README Apple-path note from R57 still
  stands).

## R68 — [supervised session, 2026-09-07, unattended] **M65 `Cmd_setcharge`+`Cmd_settypebasedhalvers` leaf + green checkpoint**

- **State:** `rust-main` = R67 checkpoint `490d78b38` plus the verified Sonnet
  worker `bfc7e79ee` (fast-forward). The paired `B_SCR_OP_SETCHARGE` +
  `B_SCR_OP_SETTYPEBASEDHALVERS` registration/handler projection is native
  and wasm32-compilable; no ABI, adapter, recovery module, canonical TS, or
  npm file was touched. Session still active; one more leaf may follow
  before wind-down.
- **Did (this step):** worker (claude-sonnet-5, 50-min cap, one commit,
  ~21 min) ported the paired Charge / Mud Sport / Water Sport factory:
  ordered two-opcode registration (setcharge `0xcb` operandless exact-1,
  then settypebasedhalvers `0xe8` with the pinned
  `BattleScript_ButItFailed` operand; charge failures reported first),
  setcharge (attacker `status3 |= 1<<9`, chargeTimer/StartValue = 2
  unconditional refresh), and settypebasedhalvers (effect 201→Mud /
  210→Water via the gen_tables MOVES row, non-sport effect error,
  already-set lazy fail-jump with rules unchanged, else `status3 |= bit` +
  multistringChooser 0/1). Canonical TS supplies **211 behavior** and
  **14 registration** cases; corpus sha256 `b077c122b735d4761232035216052054a88b7bd4b354ec7e01a7ed97b8e73deb`.
- **Next:** if time allows before the 19:01 UTC deadline, verify and
  dispatch one more cached-brief leaf (`trymemento.txt` or
  `tryrecycleitem.txt`, R57-era — re-verify citations first) with a hard
  reject-unfolded cutoff at ~18:25; otherwise wind down. Remaining
  `jumpifbyte`/`jumpifhalfword`/`jumpifword` candidates still need a
  barrier-projection decision first. No deferral is open.
- **Notes:** supervisor audit covered both handlers against
  `battle_script_commands.c:9100-9106`/`:9758-9786`, the ordered
  registration error texts, the STATUS3/effect constants, and generator
  provenance; independent regeneration was byte-identical. Generated Rust
  is **538,477 bytes**, sha256 `25a26a55199bcdccb99c6121a97b3bc5cfb341b581b305834bbaecb3c8d13daa`; generator is **MJS_BYTES
  bytes**, sha256 `d841de568134005bbc648c110df328b802e547df5000f357ab1f2edb80b64792`. Gates rerun on `rust-main` post-fold: **1,225/1,225** native, fmt, strict
  workspace Clippy, wasm32 release; artifact **507,192 bytes**, sha256
  `8ea40493cd3fb1a33be26a1a58e87d26e3c02ae55afbbf3881fe55f04e304af7`.
  Worker notes: TS eagerly resolves currentMove effect at context
  construction (generator snapshots initial state from the raw projection);
  moves 300/346/268/33/354 identities pinned from `src/data/gen/moves.json`.
  No npm gate required; no deferral or barrier added. R65 archived.

## R67 — [supervised session, 2026-09-07, unattended] **M64 `Cmd_trysetrest` leaf + green checkpoint**

- **State:** `rust-main` = R66 checkpoint `f23ad854d` plus the verified Sonnet
  worker `1a9e14af0` (fast-forward). The pure `B_SCR_OP_TRYSETREST`
  registration/handler projection is native and wasm32-compilable; no ABI,
  adapter, recovery module, canonical TS, or npm file was touched. Session
  still active; the `Cmd_chargesport` family dispatching as the final leaf.
- **Did (this step):** worker (claude-sonnet-5, 50-min cap, one commit,
  ~25 min) ported the find-first presence-only registration (`0x81` in the
  committed program), the attacker-role requirement ("an attacker"), the
  UNCONDITIONAL target-role collapse + `battleMoveDamage = -maxHP` writes on
  both branches, the full-HP lazy fail-jump, and the success path:
  `multistringChooser = (status1 & ~7) != 0 ? 1 : 0`, status1 REPLACED with
  `STATUS1_SLEEP_TURN(3)` = 3 (cures prior status in the same write), the
  (side, partyIndex) party-mirror write, and exactly one
  `set-battler-status-data` event. Canonical TS supplies **109 behavior**
  and **3 registration** cases; corpus sha256 `59bb3a8e3d36d1e7f0a0558522ab7c1eef5355e6cb833552459433f3d0b00c82`.
- **Next:** verify/fold the `Cmd_chargesport` worker (brief
  `/tmp/rust-briefs/chargesport.txt`, citations re-verified before dispatch)
  if it lands green with margin before the 19:01 UTC deadline; otherwise
  reject it unfolded. After that: re-scout remaining pure leaves
  (`jumpifbyte`/`jumpifhalfword`/`jumpifword` still need a barrier-projection
  decision first). No deferral is open.
- **Notes:** supervisor audit covered the handler against
  `battle_script_commands.c:6762-6784` (including the `(u8)(~STATUS1_SLEEP)`
  chooser subtlety — corpus stays in u8 range; TS is the corpus oracle) and
  generator provenance; independent regeneration was byte-identical.
  Generated Rust is **952,476 bytes**, sha256 `7dc50e6865c45244ac488636138a98e794b69fa1f3973c8a354b3ddbab64a364`; generator is
  **27,270 bytes**, sha256 `4beebc9980de9510af6f9f43769fea424dbcaa0c42565dd08b8aeb9a1df53199`. Gates rerun on `rust-main` post-fold: **1,197/1,197** native, fmt, strict
  workspace Clippy, wasm32 release; artifact **507,121 bytes**, sha256
  `017d9b6af8d27a1a89b795a70e4e56c1b6bcd53a9cb1cd6fd1678be9aa0deb5c`.
  Worker notes: the registration is genuinely presence-only find-first
  (mirrors tryinfatuating, unlike the cardinality-checked siblings), the
  error text is "an attacker" (not the siblings' "a attacker"), and the
  unchecked TS `operands[0]` read is a typed MissingOperand error covered by
  a unit test only. No npm gate required; no deferral or barrier added. R64
  archived.


## R66 — [supervised session, 2026-09-07, unattended] **M63 `Cmd_rolloutdamagecalculation` leaf + green checkpoint**

- **State:** `rust-main` = R65 checkpoint `e6352ebcf` plus the verified Sonnet
  worker `21f40a4fa` (fast-forward). The pure
  `B_SCR_OP_ROLLOUTDAMAGECALCULATION` registration/handler projection —
  including an in-module port of `CancelMultiTurnMoves`
  (`battle_util.c:877-888`) applied to the attacker cell on the no-effect
  branch — is native and wasm32-compilable; no ABI, adapter, recovery module,
  canonical TS, or npm file was touched. Session still active;
  `Cmd_trysetrest` dispatching as the final leaf.
- **Did:** worker (claude-sonnet-5, 50-min cap, one commit, ~20 min) ported
  the operandless single-start `0xb3` registration (count/opcode-id/
  dispatcher/zero-operand shape errors), attacker-role-first ordering, the
  no-effect branch (`moveResultFlags & ((1<<0)|(1<<3)|(1<<5))` → cancel
  multi-turn state, late-resolved `BattleScript_MoveMissedPause` jump), and
  the hit ladder: firstHit via `STATUS2_MULTIPLETURNS`, timer 5→0 with the
  lock held until the last hit, firstHit-only `lockedMoves`/
  `rolloutTimerStartValues` writes, the zero-timer premise error, and
  `dynamicBasePower = power * 2^(hits-1)` doubled on post-update
  `STATUS2_DEFENSE_CURL`. Canonical TS supplies **87 behavior** and **6
  registration** cases; corpus sha256
  `8bb284f294f3877e6f5ab27f700592cc344e7f746226b48683b4b866223b8017`.
- **Next:** verify/fold the `Cmd_trysetrest` worker (brief
  `/tmp/rust-briefs/trysetrest.txt`, citations re-verified this session) if
  it lands green before the 19:01 UTC deadline; otherwise reject it unfolded.
  After that: the `Cmd_chargesport` family, then re-scout remaining pure
  leaves. No deferral is open.
- **Notes:** supervisor audit covered the handler against
  `battle_script_commands.c:8536-8569` and the TS module (post-update
  Defense Curl read, lazy label resolution, firstHit gating), the
  `CancelMultiTurnMoves` clear set, and generator provenance; independent
  regeneration was byte-identical. Generated Rust is **422,366 bytes**,
  sha256 `996d8e061ece91cb7627be76f4a7d54334f509776f174ea8be999428d78e9ccf`;
  generator is **31,200 bytes**, sha256
  `faec7431931cc0801b8e2b979cb297bc6d051c4669f309ab2e0925c29e026ae0`.
  Worker notes: source `rolloutTimer` is a 4-bit bitfield (`battle.h:87`) so
  generator noise masks to `0x0f`; `dynamic_base_power` kept `u32` per brief
  (source stores u16 but the projection is unclamped, max 960). Gates rerun
  on `rust-main` post-fold: **1,179/1,179** native, fmt, strict workspace
  Clippy, wasm32 release; artifact **507,121 bytes**, sha256
  `904e7165150ca188047f91c1a1d7e01abe62f02af92f0d8be267a2765aa37b17`. R63 archived.

## R65 — [supervised session, 2026-09-07, unattended] **M62 `Cmd_trywish` leaf + green checkpoint (kill-pattern fixed in practice)**

- **State:** `rust-main` = R64 checkpoint `cc07eedf8` plus the verified Sonnet
  worker `c7d5c9f30` (fast-forward). The pure `B_SCR_OP_TRYWISH`
  registration/handler projection is native and wasm32-compilable; no ABI,
  adapter, recovery module, canonical TS, or npm file was touched. Session
  still active; `Cmd_rolloutdamagecalculation` dispatching next.
- **Did:** after ten scheduled sessions (2026-09-01 → 09-06) each died to the
  launch-then-`end_turn` kill pattern on this exact step, this session held
  its turn open across the whole worker run (blocking TaskOutput waits on a
  tracked monitor) and the worker (claude-sonnet-5, 50-min cap, one commit,
  ~20 min) landed it: two-instruction `0xd4` registration; mode 0 (attacker
  role; pending-wish `wishCounter != 0` jump with rules unchanged, else
  `wishCounter[attacker]=2`, `wishMonId[attacker]=partyIndex`, advance);
  mode 1 (target role; both branches carry `battleMoveDamage =
  -max(1, floor(maxHP/2))` and `battleTextBuff1MonNick = {target,
  wishMonId[target]}`; full-HP lazy jump else advance). Canonical TS supplies
  **658 behavior** and **6 registration** cases; corpus sha256
  `e814a4fe03acf5b32c600b4b954599e1143ce1fb5f945751512ada6f550d1696`.
- **Next:** dispatch `Cmd_rolloutdamagecalculation` (brief cached at
  `/tmp/rust-briefs/rollout.txt`, citations re-verified this session), then
  `Cmd_trysetrest` (`trysetrest.txt`), then the `Cmd_chargesport` family;
  re-check ISSUES/PROGRESS for TS-lane activity before each. No deferral is
  open.
- **Notes:** supervisor audit covered control flow and verbatim error texts
  against `battle_script_commands.c:9292-9323` and the TS module (including
  the "a attacker" wording and jump-branch-only lazy label resolution), plus
  generator provenance; independent regeneration was byte-identical.
  Generated Rust is **2,843,760 bytes**, sha256
  `b2a0780c8da93b6f22fef13fa886482be4f37d706619af1e0dcbf3818484c4b0`;
  generator is **33,632 bytes**, sha256
  `955f02de334a4603ee756cc14d3f551d6083a40fd9675990e961de832bc10ff9`.
  Gates rerun on `rust-main` post-fold: **1,162/1,162** native (up from
  1,145), fmt, strict workspace Clippy, wasm32 release; artifact **507,106
  bytes**, sha256
  `99c075becca05d185c36a8a6bc73021db8cc036a2ef1329dad1f14861d6f7bfc`.
  `backup-refs.sh` pushed `rust-main` and the worker ref; its only rejection
  was the animation lane's moving worker branch (theirs, non-blocking).
  Worker fixed one clippy lifetime issue over the salvaged drafts and
  corrected the drafted handler line range (9292-9323). R62 archived.

## R64 — [supervised session wind-down, 2026-08-31 08:24–~11:20 UTC, unattended] **M61 `Cmd_tryswapabilities` leaf + session close (six leaves folded)**

- **State:** `rust-main` = master `d5f22d28d` plus six verified Sonnet worker
  fast-forwards this session — `feba84911` jumpifstatus3condition,
  `e7f7d7436` jumpifstat, `c51ca7a09` getsecretpowereffect, `e584b1b31`
  trysetperishsong, `8a821fd97` tryinfatuating, `1e6a1b2d0`
  tryswapabilities — each followed by its ledger commit and a successful
  `backup-refs.sh` push. Tree clean, committed, green; no worker worktree or
  branch left behind. No ABI, adapter, recovery module, canonical TS, or npm
  file was touched all session, so the main supervisor's fold is
  `core-rs/**` + `RUST_PROGRESS*.md` only.
- **Did (this step):** worker (claude-sonnet-5, 40-min cap, one commit,
  14 min) ported Skill Swap's single-start registration (opcode `0xDA`, one
  4-byte failure operand), the required attacker/target roles, the four-way
  fail set (both `ABILITY_NONE`, either Wonder Guard 25,
  `moveResultFlags & MOVE_RESULT_NO_EFFECT`) to the late-resolved operand
  label, and the two-byte ability swap on advance. Canonical TS supplies
  **262 behavior** and **10 registration** cases; corpus sha256
  `b9550f749d80ecf2f3be66bc51227b6e34512db7253f7ec191dbbf06b47ed801`.
- **Next:** merge master, re-run the four Rust gates, then continue the pure
  Battle Script leaf ladder: `Cmd_trywish` (two-mode, 6-byte instruction),
  `Cmd_rolloutdamagecalculation`, `Cmd_trysetrest`, `Cmd_chargesport`
  family; re-check ISSUES/PROGRESS for TS-lane activity on each before
  briefing. Remaining candidates with `unsupported-branch` barriers
  (`jumpifbyte`/`jumpifhalfword`/`jumpifword`) need a barrier-projection
  decision first — record it in `RUST_DEFERRED.md` if it cannot be made in
  session. No deferral is open.
- **Notes:** supervisor audit covered the fail predicate against
  `battle_script_commands.c:9392-9410`, `MOVE_RESULT_NO_EFFECT` composition
  (`battle.h:220/223/225/228` = `0x29`), swap-only mutation, and generator
  provenance; independent regeneration was byte-identical. Generated Rust is
  **584,015 bytes**, sha256
  `93f83c80d8719d7d61e454002098ce2ef1c86827966f41733d0837dd289dd883`;
  generator is **29,907 bytes**, sha256
  `3de44a7da23f932577d063e3e509aafd0afaba79ee82d9867c928734dd0b342a`.
  Final gates on `rust-main`: **1,145/1,145** native (up from 1,068 at
  orient), `cargo fmt --check`, strict workspace Clippy (per worker tree;
  content identical after fast-forward), wasm32 release. Artifact is
  **507,106 bytes**, sha256
  `72f27adf8d511712d939627b6ab6a19b597a1a475efe7cf6764cecb766080b9c`.
  Session-wide: six Sonnet workers, six commits, zero rejections, zero
  cap expiries (14–35 min each). No npm gate required; no deferral or
  barrier added. R61 archived. PAPERCUT: none new (README Apple-path note
  from R57 still stands).

## R63 — [supervised session, 2026-08-31, unattended] **M60 `Cmd_tryinfatuating` leaf + green checkpoint**

- **State:** `rust-main` = R62 checkpoint `d921ff0bb` plus the verified Sonnet
  worker `8a821fd97` (fast-forward). The pure `B_SCR_OP_TRYINFATUATING`
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

- **State:** `rust-main` = R61 checkpoint `0a36f5569` plus the verified Sonnet
  worker `e584b1b31` (fast-forward). The pure `B_SCR_OP_TRYSETPERISHSONG`
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

- **State:** `rust-main` = R60 checkpoint `92c74abef` plus the verified Sonnet
  worker `c51ca7a09` (fast-forward). The pure `B_SCR_OP_GETSECRETPOWEREFFECT`
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

## R60 — [supervised session, 2026-08-31, unattended] **M57 `Cmd_jumpifstat` leaf + green checkpoint**

- **State:** `rust-main` = R59 checkpoint `0661beb92` plus the verified Sonnet
  worker `e7f7d7436` (fast-forward). The pure `B_SCR_OP_JUMPIFSTAT`
  registration/handler projection is native and wasm32-compilable; no ABI,
  adapter, recovery module, canonical TS, or npm file was touched. Session
  still active; `Cmd_getsecretpowereffect` dispatching next.
- **Did:** worker (claude-sonnet-5, 75-min cap, one commit) ported exact
  18-start eager registration (count → 1/1/1/1/4 shape → six `CMP_*` →
  seven `STAT_*` → `MIN|MAX_STAT_STAGE` → eager label resolution, TS error
  order), all six comparators source-completely, the injected-selector
  `Block { source-context-unavailable }` control variant for a null battler,
  advance without label lookup, and jump on the pre-resolved label. Canonical
  TS supplies **1,602 behavior** and **16 registration** cases; corpus sha256
  `1713232e00bdb6af8d6ce6bce929fa52badfd10dab85511b7daf4b43575a4da9`.
- **Next:** dispatch `Cmd_getsecretpowereffect` (single start at pc 1835,
  pure `gBattleEnvironment`→`moveEffectByte` map), then
  `Cmd_trysetperishsong` (single start at pc 1057; status3/perish timers +
  Pressure PP scan) if the deadline reserve holds. Briefs are prepared.
- **Notes:** supervisor audit covered comparator table, decode-before-block
  ordering, registration order, stat-index addressing, and generator
  provenance; independent regeneration was byte-identical. Generated Rust is
  **2,512,225 bytes**, sha256
  `9f2947617530f559af72c4611957fbe01d904234ad49250d91bcca18500fafd0`;
  generator is **37,103 bytes**, sha256
  `d092db5e978488c6011c9cb98473dacd0ddf7b9ff55e9cb69265ad156f4d052a`.
  Gates in the worker tree and again on `rust-main`: **1,087/1,087**, fmt,
  strict workspace Clippy, wasm32 release. Artifact is **507,097 bytes**,
  sha256 `5692c5dc012ccc892fa8d106945e8455976c7965d2e99ec713798062e9ad3fab`.
  No npm gate required; no deferral or barrier added. R57 archived.

## R59 — [supervised session, 2026-08-31 08:24– UTC, unattended] **M56 `Cmd_jumpifstatus3condition` leaf + green checkpoint**

- **State:** `rust-main` = master `d5f22d28d` (already merged at orient) plus
  the verified Sonnet worker `feba84911` (fast-forward). The pure
  `B_SCR_OP_JUMPIFSTATUS3CONDITION` registration/handler projection is native
  and wasm32-compilable; no ABI, adapter, recovery module, canonical TS, or
  npm file was touched. Session still active; next leaf dispatching.
- **Did:** orient baseline was fully green (**1,068/1,068**, fmt, strict
  Clippy — the R57/R58 "Clippy unverified" item is closed — and wasm32 at the
  R58 hash). Worker (claude-sonnet-5, 75-min cap, one commit) ported exact
  7-start eager registration (count → 1/4/1/4 operand shape → `BS_TARGET`
  → `TRUE|FALSE` → five named `STATUS3_*` masks, TS error order), the
  jumpifnostatus3/jumpifstatus3 clear/set semantics, advance without label
  lookup, late label resolution on jump, and typed
  undecodable/unresolved-target errors. Canonical TS supplies **577 behavior**
  and **15 registration** cases; corpus sha256
  `c88eb6c8bd520541a677bac3cffca42e05780ece2024a8267554e143a0eb58f0`.
- **Next:** dispatch the pure `Cmd_jumpifstat` leaf (18 starts,
  `BS_ATTACKER`/`BS_TARGET`, six `CMP_*` comparators, eager label
  validation, `block`/source-context-unavailable variant) with the same
  pattern; then `Cmd_getsecretpowereffect` (single start, pure
  environment→`moveEffectByte` map). Briefs are prepared; both are
  conflict-free against ISSUES/PROGRESS as of this orient.
- **Notes:** supervisor audit covered mask values, registration order,
  handler branch logic, and generator provenance (expected values come from
  the canonical handler with TS-side immutability asserts); independent
  regeneration was byte-identical. Generated Rust is **600,257 bytes**,
  sha256 `4d1c90c33b27e638cdd2fa867136b3ccde489438e7795f59283185d6690c1e8d`;
  generator is **30,001 bytes**, sha256
  `a5591512378aff656f380342516bd7548d116979c2620af1e386819884996934`.
  Gates in the worker tree and again on `rust-main`: **1,077/1,077**, fmt,
  strict workspace Clippy, wasm32 release. Artifact is **507,176 bytes**,
  sha256 `d4e52b8cdff75b9a5d2e0bf3e84f2502f4cc55fb9b5ec9d829300702cff024de`
  (+71 bytes vs R58 with no ABI change; identical hash in both trees, so
  deterministic). No npm gate required (nothing outside `core-rs/**` and
  this ledger changed). No deferral or barrier added. R54–R56 archived.

## R58 — [supervised session, 2026-08-31 07:28–07:37 UTC] **Master sync + green baseline only (9-minute window)**

- **State:** `rust-main` = merge of master `7ffc735d4` (merge commit
  `03a83737a`, clean, no conflicts). No worker was dispatched: the session
  started 9 minutes before its hard deadline, below any worker cap.
- **Did:** post-merge baseline — **1,068/1,068** native tests passed;
  `factory-wasm` release built for `wasm32-unknown-unknown`, artifact
  **507,105 bytes**, sha256
  `b3bbf9fbdfaafad9cb3d406be3407ee0345273c0a2c56847d471e2c24ae54274`
  (byte-identical to R57).
- **Next:** unchanged from R57 — merge master at orient, run
  strict Clippy first (`cargo fmt --check` is green as of this checkpoint,
  ~45 s; Clippy did not fit inside the window and remains unverified,
  not failed), then rebrief the bounded pure
  `Cmd_jumpifstatus3condition` leaf with a normal cap from the clean base.
- **Notes:** on this Linux image cargo lives at `$HOME/.cargo/bin` (the
  README's Apple toolchain path is absent — R57 PAPERCUT still open). No
  Rust deferral, ABI/adapter widening, canonical-TS edit, or barrier was
  added; no npm gate required (nothing outside RUST_PROGRESS.md changed).

## R57 — [supervised session, 2026-08-31] **Master sync + green Rust baseline; status3 worker cap-safe rejection**

- **State:** `rust-main` merged from `91167852e` through current master
  `f8ce7a480`; the persistent tree is clean and no worker commit was folded.
  Native Rust and wasm32 release are green after the merge.
- **Did:** ran the required post-merge baseline: **1,068/1,068** native tests
  passed and `factory-wasm` release built for `wasm32-unknown-unknown`.
  Dispatched one Terra/max Rust worker for the bounded pure
  `Cmd_jumpifstatus3condition` leaf. The five-minute emergency cap expired
  during its first focused compile; it produced no commit, so the supervisor
  correctly rejected the unverified draft rather than folding partial work.
- **Next:** merge current master at the next orient, then rebrief the same
  stable `B_SCR_OP_JUMPIFSTATUS3CONDITION` leaf with a normal cap. Recreate
  the module, deterministic canonical-TS generator/corpus, and focused tests
  from the clean verified base; do not trust or fold the abandoned draft.
- **Notes:** wasm artifact is **507,105 bytes**, sha256
  `b3bbf9fbdfaafad9cb3d406be3407ee0345273c0a2c56847d471e2c24ae54274`.
  Current master added unattended-runner installation for the previously
  missing `rustfmt`/Clippy components; both installed successfully. Formatting
  found and mechanically corrected one pre-existing master-fold line wrap in
  `factory_ai_check_viability.rs`; `cargo fmt --check` is green. Strict Clippy
  was started after formatting but stopped at the session wind-down deadline,
  so it is the first verification at the next orient. No Rust deferral,
  ABI/adapter widening, canonical-TS edit, or barrier was added.
  No npm gate was required because no post-baseline worker fold touched the
  adapter or canonical TypeScript. PAPERCUT: README names an absent Apple
  toolchain path on the unattended Linux image, ~2 min.

## R56 — [supervised session, 2026-08-25] **M55 Helping Hand leaf + final wind-down**

- **State:** `rust-main` = session-start master `c78b8d15` plus five verified
  increments through `Cmd_trysethelpinghand` worker `ae9cf52f`. ORWORD,
  CheckViability tie-receipt retention, Encore, field-ability scan, and Helping
  Hand are committed and green; no ABI, adapter, recovery module, or canonical
  TypeScript file was widened.
- **Did:** ported Helping Hand's singleton `0xd1` registration, instruction-
  before-attacker ordering, source positional-partner lookup, unconditional
  target retarget before all guards, exact doubles/absence/corrupt-byte gates,
  failure-only late label resolution, target-only success write, repetition,
  and full no-RNG/no-event/no-scheduler preservation. Canonical TypeScript
  supplies **2,632 behavior** and **10 registration** cases; corpus sha256
  `28a79ba053c6e925a8357766f7d73f8adb715d82d1979625d7cd02b4e87fa5e0`.
- **Next:** at the next Rust session, merge current master, recheck active lane
  work, and select another stable pure leaf. Main owns deletion of ISSUE #124
  after folding this lane; Rust has no open deferral.
- **Notes:** Terra/max worker, one commit. Supervisor caught and corrected the
  worker unit fixture's naive battler-id partner expectation; production code
  and the canonical corpus already used `position ^ BIT_FLANK`. Two independent
  regenerations were byte-identical. Generated Rust is **9,314,463 bytes**,
  sha256 `5aac9cb75d4e039e7b81bd41dc5c5e88cc19a59e4e47d37935a04ddedb119972`;
  generator is **41,575 bytes**, sha256
  `c60ebdc8166bad3f26854a170d580334614cccef41ae7129363e1859d46b4156`.
  Final Rust is green at **1,068/1,068** tests, fmt, strict workspace Clippy,
  and wasm32 release. Artifact is **506,009 bytes**, sha256
  `de2fdfdf67692881cb45d64907ad130ab607fc450d7b89bca510716ee6a554d4`.
  Final npm is green at **1,121 files / 10,457 passed / 223 skipped** and build
  is green at **712 modules**. Wind-down soaks: vanilla **20/20**, full
  **60/60**, winning **60/60**, and winning-swap **60/60**, all with zero
  crashes and zero hangs. Scope stayed inside `core-rs/**` plus the existing M2
  parity file used by the receipt repair; no barrier or deferral was added.

## R55 — [supervised session, 2026-08-25] **M54 Battle Script field-ability scan + green checkpoint**

- **State:** `rust-main` = merged master `c78b8d15` plus the four verified
  session increments through `Cmd_jumpifabilitypresent` worker `239afa22`.
  The complete pure two-site registration/topology-scan/control projection is
  native and wasm32-compilable; no ABI, adapter, or recovery module was
  changed. The session remains active, committed, and green.
- **Did:** ported exact two-start eager registration, first opcode binding,
  Cloud Nine/Air Lock expression mapping, 2/4-slot topology scan, living-only
  ability match, absent-path advance without label lookup, present-path late
  label resolution, direct-handler unvalidated-ability error, repeated control,
  and full narrow-state immutability. Canonical TypeScript supplies **153
  behavior** and **15 registration** cases; corpus sha256
  `fc70a470d096700098fbf5fe8454bfdecd38da0b599d30f52339820841aa46bc`.
- **Next:** port one final stable pure Battle Script leaf if the deadline
  reserve remains sound; prefer singleton `B_SCR_OP_TRYSETHELPINGHAND`, which
  has bounded doubles topology, target rebinding, no RNG, and no active issue.
- **Notes:** Sol/high worker, one commit. Supervisor audited source dispatch,
  field scan, six-byte macro, both Solar Beam sites, constants, registration
  predicates, late label boundary, ignored absent slots, and no-write output;
  regenerated twice byte-identically and passed focused **8/8**, full Rust
  **1,059/1,059**, fmt, strict workspace Clippy, and wasm32 release. Generated
  Rust is **808,906 bytes**, sha256
  `5ca4649b30f3692bce6fee05f884c4f1f75e9d65c6bfa4eebc6bdfe6201ab496`;
  generator is **26,662 bytes**, sha256
  `4923f0d7bcb94f7bd3c90533e2176422fe2893998732d1fba5a26a62ca24a2ee`.
  Artifact is **505,897 bytes**, sha256
  `6607385fe956f48e1a5f926da9625a40e61ea380bd15212dd8b348eebc6fb060`.
  Worker npm is green at **1,121 files / 10,457 passed / 223 skipped** and
  build is green. Scope stayed inside `core-rs/**`; no barrier or deferral was
  added. PAPERCUT: silent TypeScript typecheck obscured liveness, ~4 min.

## R54 — [supervised session, 2026-08-25] **M53 Battle Script Encore leaf + green checkpoint**

- **State:** `rust-main` = merged master `c78b8d15` plus verified ORWORD,
  CheckViability receipt, and `Cmd_trysetencore` workers through `aeeb0a39`.
  The complete pure Encore registration/state/RNG/control projection is native
  and wasm32-compilable; no ABI or adapter surface was widened. The session
  remains active, committed, and green.
- **Did:** ported exact two-stage singleton registration and handler validation,
  target-role ordering, first matching move slot, existing-Encore/PP/missing-
  slot/Struggle/Encore/Mirror Move gates, failure-only late label lookup,
  success-only single RNG draw, duration 3..6, exact four-field target write,
  and advance/jump control. Canonical TypeScript supplies **739 behavior** and
  **12 registration** cases, including the 500 concrete selector matrix and 32
  duplicate-slot PP-precedence cases. Corpus sha256
  `17c24b5dfdeaf7f4d86a690219c6f278fd60ef41c7be38557a7c6e5345b13564`.
- **Next:** port the stable, conflict-free pure
  `B_SCR_OP_JUMPIFABILITYPRESENT` leaf. Preserve its two concrete Solar Beam
  starts, living-battler topology scan, ability operands, eager registration,
  and late jump-label resolution. Keep scope inside `core-rs/**`.
- **Notes:** Terra/max worker, one commit. Supervisor rejected an initially
  incorrect duplicate-slot unit fixture; the implementation and generated
  differential were correct, and the corrected fixture now proves slot zero
  wins when the later duplicate has zero PP. Supervisor audited the decomp
  body, five-byte macro, sole call site, error/write/RNG boundaries, regenerated
  twice byte-identically, and passed focused **7/7**, full Rust, fmt, required
  strict library Clippy, and wasm32 release. Generated Rust is **8,066,126
  bytes**, sha256
  `53095904ebac7afe0a80a1673266afc82ffd79eff72b6655e323ba886e88e8d8`;
  generator is **55,572 bytes**, sha256
  `1de47b8144399f9b95f88cb37ffa395648ca5a880fa795c662f7d1df594a5b05`.
  Artifact is **505,906 bytes**, sha256
  `f4250d789d6cdabda3e407847bf1ae12e3552c4ab0a2c412fade7a83aa3a2fad`.
  Worker npm is green at **1,121 files / 10,457 passed / 223 skipped** and
  build is green. Scope stayed inside `core-rs/**`; no barrier, deferral, or
  papercut was added.

## R53 — [supervised session, 2026-08-25] **M52 CheckViability tie-receipt repair + green checkpoint**

- **State:** `rust-main` = merged master `c78b8d15`, verified ORWORD worker
  `1c28babb`, and verified CheckViability repair `71b22c94`. Rust now retains
  the SemiInvulnerable5 speed-tie draw before its TryEncourage draw, matching
  canonical TypeScript. The previously skipped forced-WASM parity case is
  active. The session remains active, committed, and green.
- **Did:** changed the M5d3 handler to append the encourage receipt to the
  existing draw ledger instead of replacing that ledger. Added direct native
  assertions for zero-, one-, and two-draw paths, ordered ordinals, and RNG
  before/after chaining; regenerated the 181-case M5d3 corpus; and removed the
  stale skip from the existing M2 parity test. Corpus sha256
  `bcd17a59b071e204bc80b9880e2ee2580fdb7c802af23800d8f7cc54995ac30b`.
- **Next:** select one more conflict-free pure Battle Script leaf while the
  deadline reserve permits. Main owns removal of ISSUE #124 from `ISSUES.md`;
  this lane must not edit that ledger.
- **Notes:** Terra/max worker, one commit. Supervisor audited the narrow write,
  reproduced the generated corpus twice byte-identically, and passed focused
  native and both-mode parity gates (**9/9** each). Full Rust passes at **1,042
  listed tests**; fmt, required strict library Clippy, and wasm32 release pass.
  Artifact is **506,010 bytes**, sha256
  `e7ec069fddf1d9c0c4a3dfcf0a470a6f1b6d5f3dec47612d6d9224dd6185e028`.
  Pre-fold npm is green at **1,121 files / 10,457 passed / 223 skipped** and
  build is green. Scope stayed inside `core-rs/**` plus the existing M2 parity
  file; no unsupported barrier or Rust deferral was added. PAPERCUT: the
  nested Rust workspace needs the manifest directory for `cargo fmt`, ~1 min;
  copying the rebuilt ignored WASM artifact is a separate required step, ~2
  min.

## R52 — [supervised session, 2026-08-25] **M51 Battle Script ORWORD leaf + green checkpoint**

- **State:** `rust-main` = merged master `c78b8d15` plus verified
  `Cmd_orword` worker `1c28babb`. The complete pure
  `battleScriptOrwordOpcode.ts` registration/state/control projection is
  native and wasm32-compilable; no ABI or adapter surface was widened. The
  session is active, committed, and green.
- **Did:** ported the exact 43-start eager registration, first-opcode binding,
  ordered shape/pointer/value validation, the sole `gHitMarker` pointer, all
  11 named HITMARKER terms and compound expressions, unsigned 32-bit OR, and
  advance-only control. Canonical TypeScript execution supplies **66 handler
  cases**, **18 registration cases**, and all **43 concrete program sites**;
  corpus sha256
  `b65a896f9ec084d073fe0fa0459fc07d50ca38968c9fa1edfa31b448e300ce08`.
- **Next:** close main-program ISSUES #124 in Rust: carry the speed-tie draw
  through `factory_ai_check_viability`, regenerate the M5d3 vectors, rebuild
  wasm, and restore the skipped forced-WASM parity case. Keep all edits inside
  `core-rs/**` and the existing M2 adapter-owned parity file only.
- **Notes:** Terra/max worker, one commit. Supervisor audited the decomp
  dispatch/body, nine-byte macro, constants, 43 sites, registration order,
  write boundary, errors, and repetitions; regenerated twice byte-identically
  and independently passed focused **5/5**. Worker and merged-tree full Rust
  gates pass at **1,041 listed tests**, fmt, strict Clippy, and wasm32 release.
  Generated Rust is **568,225 bytes**, sha256
  `4c9217fb59426ad2b2d7be892f64078bf667b4763f182d8eb888f70ab8d78210`;
  generator is **41,540 bytes**, sha256
  `dd6258cb620cc1edff4464945735099fa55b391369e2ec64c6e66b79e4a948ab`.
  Artifact is **506,186 bytes**, sha256
  `f902e75917b8301b8f653c456dd9092ee15f52bc9e21dc32e9a1dae9ebbe5a06`.
  Worker npm is green at **1,121 files / 10,456 passed / 224 skipped** and
  build is green. Scope stayed inside `core-rs/**`; no barrier or Rust
  deferral was added. PAPERCUT: stale ignored WASM artifact caused 399 initial
  parity failures before rebuild, ~5 min.

## R51 — [supervised session, 2026-08-20] **M50 Battle Script Focus Punch no-damage gate + final wind-down**

- **State:** `rust-main` = current master `4243b4b1` plus verified
  `Cmd_jumpifnodamage` worker `c63353a9`. The complete pure
  `battleScriptJumpifnodamageOpcode.ts` registration/state/control projection
  is native and wasm32-compilable; no ABI or adapter surface was widened. The
  session ends committed and green.
- **Did:** ported exact singleton registration and complete Focus Punch shape,
  attacker-first role resolution, ProtectStruct-only physical/special receipt
  reads, nonzero-receipt advance without label lookup, and zero-receipt late
  jump resolution. The command preserves every projected field and ignores the
  same-named SpecialStatus copies. Canonical TypeScript execution supplies
  **131 handler cases** and **16 registration cases**, including every four-
  attacker × 25 signed-i32 receipt-edge combination, shadow-receipt controls,
  ordered errors, malformed shapes, preservation, and repetitions. Corpus
  sha256 `d0972bdc7764a77f4ab75ac3c3e52c91ca845e14a52315a0f2ab5e1defa1e046`.
- **Next:** merge current master at the next Rust session, recheck active work,
  and select another conflict-free pure Battle Script leaf. M7c opponent
  generation still waits on canonical TypeScript live generation; main and
  animation moving targets remain excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited the decomp
  dispatch/body, source fields, macro, singleton Focus Punch site, registration
  and role/label ordering, no-write boundary, shadow fields, and repetitions;
  regenerated twice byte-identically (canonical corpus **343,093 bytes**;
  generated file **885,070 bytes**, sha256
  `cdf36b8c2fb11bdec08c9ba4d7dabd2a8e2af4bb061bc2e5657380ff999d5a78`;
  generator **48,437 bytes**, sha256
  `70848ab99e69b13bad3715fbe62d2581cf2fa01874848548a90ed878185dc9f1`).
  Focused **10/10**, cargo **1,001/1,001**, fmt, strict Clippy, and wasm32
  release pass. Artifact is **492,691 bytes**, sha256
  `61f39cfe556864e1b44483297ed20a5192b7aef4b21391dc9cf87ec99e981574`.
  Final npm is green at **1,068 files / 10,126 passed / 223 skipped**; build is
  green at **691 modules**. Final soaks are vanilla **20/20 OK** and full
  policy **60/60 OK**, both with zero crashes and zero hangs. Scope stayed
  inside `core-rs/**`; no unsupported barrier, Rust deferral, or papercut was
  added. `animation-main` has one unfolded commit (`287dde94`); its supervisor
  still owns that fold.

## R50 — [supervised session, 2026-08-15] **M49 Battle Script weather-scaled recovery leaf + final wind-down**

- **State:** `rust-main` = current master `98fd153e`, including verified
  `Cmd_recoverbasedonsunlight` worker `3e94a5a4`. The complete pure
  `battleScriptRecoverBasedOnSunlightOpcode.ts` registration/state/control
  projection is native and wasm32-compilable; no ABI or adapter surface was
  widened. The session ends committed and green.
- **Did:** ported exact first-match registration, attacker/target role
  resolution and target rebinding, full-HP failure with late label resolution,
  and success damage for neutral or suppressed weather, sun, and other
  weather. Recovery is respectively `-max(1, maxHP / 2)`,
  `-max(1, 20 * maxHP / 30)`, or `-max(1, maxHP / 4)`. Canonical TypeScript
  execution supplies **808 handler cases** and **5 registration cases** plus
  **786,424 applications** covering every maxHP u16 at full, lower, and
  corrupt-higher HP across all four weather regimes, normalized to **125,607
  intervals**. Corpus sha256
  `7c3adaca45202f2f310eabccb3023344ca4acbed2bbaeaeb268bff4f600fdfe4`.
- **Next:** merge current master at the next Rust session, recheck active work,
  and select another conflict-free pure Battle Script leaf. M7c opponent
  generation still waits on canonical TypeScript live generation; main and
  animation moving targets remain excluded.
- **Notes:** Sol/high worker, one commit. Supervisor audited decomp dispatch,
  singleton registration, instruction/role/label ordering, full-HP equality,
  weather suppression across living battlers, arithmetic, write set, and
  repetitions; regenerated twice byte-identically (canonical corpus
  **9,065,263 bytes**; exhaustive evidence **10,557,911 bytes**, sha256
  `1b0e5b8f555a7b0ec7c60c9b2e97fa8b82a376afffd67d58ecee9e7992333599`;
  generated file **8,516,856 bytes**, sha256
  `ee8b01c1381f84684fe5dbbbb2c49a0fde14c3491d38532c8eca33acd52e0746`;
  generator **19,904 bytes**, sha256
  `128e9a6823732b5669ad163ea7d25ec1035288e593dd25d40faef288e75fb0b7`). Focused **5/5 +
  3/3**, cargo **991/991**, fmt, strict Clippy, and wasm32 release pass. The
  artifact is **492,683 bytes**, sha256
  `782c1b2aa3addb23d4db916cf9c00d461fe6533875550e2513127c948c0d7728`.
  Final latest-master npm is green at **1,040 files / 9,915 passed / 223
  skipped**; build is green at **681 modules**. Final soaks are vanilla
  **20/20 OK** and full policy **60/60 OK**, both with zero crashes and zero
  hangs. Scope stayed inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added. PAPERCUT: `cargo clippy --all-targets` exposed an older
  test-only `op_ref` lint outside this step; the required strict library
  Clippy gate remained green, ~2 min.

## R49 — [supervised session, 2026-08-15] **M48 Battle Script Low Kick weight-damage leaf**

- **State:** `rust-main` = current master `2804ca72` plus verified
  `Cmd_weightdamagecalculation` worker `c99328a1`. The complete pure
  `battleScriptWeightDamageOpcode.ts` registration/catalog/scalar/state/control
  projection is native and wasm32-compilable; no ABI or adapter surface was
  widened. The session remains active and committed.
- **Did:** ported exact singleton/operand-free registration, target-first role
  resolution, source species-to-Pokédex-weight lookup, all **25** legacy null
  compatibility IDs, exact catalog errors, and strict Low Kick weight bands
  `<100/<250/<500/<1000/<2000/else` to power
  `20/40/60/80/100/120`. Success overwrites only dynamic base power and
  advances. Canonical TypeScript execution supplies **1,132 handler cases**,
  **66 scalar cases**, and **7 registration cases** across all **411** source
  catalog rows, the complete **500** target/selector matrix, threshold and
  safe-integer domains, malformed values, prior u16 power edges, ordered
  errors, repetitions, and immutability. Corpus sha256
  `5c970efa033a8fc982e81f962ed1372cf63166d1c842346445c51d2c7904fb6c`.
- **Next:** recheck active work and select one final conflict-free pure Battle
  Script leaf if the deadline reserve permits; otherwise perform the required
  final full npm/build, soak, Rust, ledger, and clean-tree wind-down.
- **Notes:** Terra/max worker, one commit. Supervisor audited decomp dispatch,
  table/body, operand-free macro, single Low Kick site, extracted Pokédex
  authority, all catalog IDs/nulls, registration and target ordering, scalar
  errors, write set and repetitions; regenerated twice byte-identically
  (catalog input **3,981 bytes**, sha256
  `8831e5a6e21a42ab71dce857243f008a4efdac72e97cdf83148763e25ad6d85f`;
  catalog Rust **11,788 bytes**, sha256
  `d0f6e93d8d4e178eb23f091b16bdc9ad43b952d263fab163a082af35ae85215b`;
  canonical corpus **490,486 bytes**; vectors **1,327,310 bytes**, sha256
  `6a4bac03fa2a104056d2a37448c686556ad6ed24922723a51c409feaccb82376`;
  generator **38,279 bytes**, sha256
  `76d97de4b94527e7a777c2339c6311c4a8242ee364becdbeec9c7adee6d4897e`).
  Focused **2/2 + 7/7**, cargo **983/983**, fmt, strict Clippy, and wasm32
  release pass. Artifact is **492,690 bytes**, sha256
  `223b5323d42125df2de7922e1b7ee4334db0cb620c8dbe6fa13b759974ac6f58`.
  Latest-master npm is green at **1,029 files / 9,871 passed / 223 skipped**;
  build is green at **677 modules**. Scope stayed inside `core-rs/**`; no
  unsupported barrier or Rust deferral was added. PAPERCUT: long-command
  completion detached from live subprocess reporting, ~4 min.

## R48 — [supervised session, 2026-08-15] **M47 Battle Script Pain Split leaf + green checkpoint**

- **State:** `rust-main` = current master `d6acd89e` plus verified Pain Split
  worker `25683da5` and metadata-ratchet repair `df435e89`. The complete pure
  `battleScriptPainSplitOpcode.ts` registration/state/control projection is
  native and wasm32-compilable; no ABI or adapter surface was widened. The
  session reached a committed green checkpoint and then continued.
- **Did:** ported exact singleton registration and instruction-shape checks,
  instruction-before-attacker-before-target error order, target-Substitute
  no-write failure with late label resolution, and the successful u16 HP
  average. Success writes only `painSplitHp = targetHP - average`,
  `battleMoveDamage = attackerHP - average`, and target
  `specialStatus.shellBellDmg = 0xffff`. Canonical TypeScript execution
  supplies **922 cases**: the complete **625** optional-selector matrix,
  **196** endpoint/parity/sign arithmetic pairs, packed Substitute edges,
  ordered errors, full signed scratch/status siblings, repetitions, and
  **13** exact registration cases. Corpus sha256
  `636cff5a1ac7934a7e9aea36eabe93d69092a54648665dfc5791d91f03dc8f3a`.
- **Next:** at the next session, merge current master, recheck active work, and
  select another conflict-free pure Battle Script leaf. M7c opponent
  generation still waits on canonical TS live generation; main walk-up and
  animation moving targets remain excluded.
- **Notes:** Terra/max implementation worker plus one Sol/high audit-repair
  commit. Supervisor found and closed the initially missing independent corpus
  metadata ratchet, audited decomp/dispatch/macro/single script site, widths,
  shape and role ordering, substitute write set, signed averaging, sibling
  preservation, and repetitions; regenerated twice byte-identically
  (canonical corpus **5,351,849 bytes**; generated file **12,583,953 bytes**,
  sha256
  `beaff9112bc43ec7f0821bc0c3eee40c4b72dea9391d1c9755ebbdc61771f1fb`;
  generator **50,220 bytes**, sha256
  `585a963bbb61adc0cce3c0879ecda9c64af15b176b7cfc1ae73cdb1480468aef`).
  Final cargo is **973/973**, fmt and strict Clippy pass, and wasm32 release is
  **497,717 bytes**, sha256
  `e9f227f2162fddfc8592cff07629856837ce5661f4f6efe5e3dc90c400a20c37`.
  Final npm is green at **1,029 files / 9,870 passed / 223 skipped**; build is
  green at **677 modules**. Wind-down soaks are vanilla **20/20 OK** and full
  policy **60/60 OK**, both with zero crashes and zero hangs. Scope stayed
  inside `core-rs/**`; no unsupported barrier or Rust deferral was added.

## R47 — [supervised session, 2026-08-15] **M46 Battle Script half-health heal setup leaf**

- **State:** verified `Cmd_tryhealhalfhealth` worker `0b56bfd0`; the complete
  pure registration/state/control projection is native and wasm32-compilable.
- **Did:** ported operand-before-role selection, attacker target rebinding,
  exact `-max(1, floor(maxHP / 2))` damage, full-HP failure, and failure-only
  late label resolution. Evidence includes **1,810 cases**, **196,606
  applications**, and **32,769 intervals**; corpus sha256
  `7df2575257c50006c5afc225062d834fe6f0ad6399e71bb92dd0c69564ce2fc5`.
- **Next:** select another conflict-free pure Battle Script leaf.
- **Notes:** Terra/max worker. Generated evidence was reproduced twice. Cargo
  **969/969**, fmt, strict Clippy, and wasm32 release passed. Artifact was
  **510,202 bytes**, sha256
  `b9c87f425837a9e0744f69acee78dabd0ff37029faf803d41582a7621d302718`.
  Scope stayed inside `core-rs/**`; no barrier or deferral was added.

## R46 — [supervised session, 2026-08-15] **M45 Battle Script Substitute state-construction leaf**

- **State:** `rust-main` = current master `54a60a52` plus R43-R45 and verified
  `Cmd_setsubstitute` worker `fbe51e93`. The complete pure
  `battleScriptSetsubstituteOpcode.ts` registration/state/control projection is
  native and wasm32-compilable; no ABI or adapter surface was widened. The
  session remains active and committed.
- **Did:** ported attacker-first resolution and exact quarter-HP floor/minimum;
  the failure-only damage-zero/chooser write set; and the success-only attacker
  `STATUS2_SUBSTITUTE` OR + wrapped-mask clear, substitute-HP write, damage and
  chooser overwrite, and ignore-substitute hit-marker OR. HP debit remains
  correctly outside this leaf. Canonical TypeScript execution supplies
  **1,397 complete cases** plus **131,072** boundary applications covering
  every maxHP u16 on both sides of its threshold, normalized to **16,383**
  intervals; the complete **500** selector matrix, **125** missing-attacker
  probes, full-width packed edges, preservation, repetitions, and permissive
  registration are pinned. Corpus sha256
  `8e1e63f440ff847cc2e888805041e378383b726a74ae0f054d1a8df6108b0fd8`.
- **Next:** recheck active work and select another conflict-free pure Battle
  Script leaf. M7c opponent generation still waits on canonical TS live
  generation; main walk-up and animation moving targets remain excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited the decomp,
  dispatch/opcode/macro/script, source masks/messages, later HP-debit ownership,
  validation order and write sets; regenerated twice byte-identically
  (canonical corpus **13,503,050 bytes**; raw threshold evidence **22,048,947
  bytes**, sha256
  `abcd70b385df94da84e99bb005d4a6b03819847adabd3d7bd205a4c263dd2ae8`;
  generated file **26,250,057 bytes**, sha256
  `ca7e45ff14b838f7655e23ddfa080cd041ad57a98c975d68e49ac1f8fd97448b`;
  generator **60,417 bytes**, sha256
  `1dd196eae78453e5d8f9f6a344cd7d6b8b7afd8a5b53a185ed35b237ac652882`),
  and reran focused **6/6**, cargo **958/958**, fmt, strict Clippy, and wasm32
  release. Artifact is **510,306 bytes**, sha256
  `d5d91c5aca162087d2fc1d30989a976411fa785813e503627770bf81d4dd48b1`.
  Latest-master smoke is **375/375** and build is green at **676 modules**.
  Scope stayed inside `core-rs/**`; no unsupported barrier or deferral was
  added. PAPERCUT: fresh worker lacked the ignored WASM artifact and rebuilt it
  before browser parity, ~2 min.

## R45 — [supervised session, 2026-08-14] **M44 Battle Script four-weather setter family**

- **State:** `rust-main` = current master `c75b6dd1` plus R43-R44 and verified
  weather worker `1c96d3df`. The complete pure
  `battleScriptSetWeatherOpcode.ts` four-opcode registration/state/control
  family is native and wasm32-compilable; no ABI or adapter surface was
  widened. The session remains active and committed.
- **Did:** ported Rain/Sun/Sandstorm/Hail's exact active masks, temporary bits,
  success choosers, same-weather failure OR/chooser/preservation path, and
  success-only full weather-word replacement plus five-turn duration. The
  native factory retains canonical Rain→Sun→Sandstorm→Hail validation order
  and JavaScript dynamic-id collision behavior without inventing dispatcher/id
  predicates. Canonical TypeScript execution supplies **1,788 cases** across
  all **1,024** low-weather-bit cells, **648** timer/chooser edges, **64**
  result-flag edges, high-u32 bits, cross-weather replacement, alternating and
  repeated paths, plus **17** registration cases; corpus sha256
  `7b590b8f3b669c00f943087d24f9618d118ef9d87f75bc202baa0f8f08ab5e03`.
- **Next:** recheck active work and select another conflict-free pure Battle
  Script leaf. M7c opponent generation still waits on canonical TS live
  generation; main and animation moving targets remain excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited all four decomp
  bodies, dispatch entries, macros, scripts, weather/message constants,
  registration order/collisions, state preservation and sequences;
  regenerated twice byte-identically (canonical corpus **2,086,704 bytes**;
  generated file **3,073,560 bytes**, sha256
  `d7a227d605e64845ff0d6a08b859186f2b6ba27461706d57fab0417cfabd09d1`;
  generator **45,125 bytes**, sha256
  `613cde8f52961fbceee7617c8c3cc40353e117a4c558f3d7b6db0b38ff21b772`),
  and reran focused **5/5**, cargo **948/948**, fmt, strict Clippy, and wasm32
  release. Artifact is **497,795 bytes**, sha256
  `21b35dbdac8b48bcd331a4d119ce77ba8cc7ef5ec927edb1a27315736517cd39`.
  The worker summary's stale **1,173** count was corrected to the generated
  test's actual **1,788** during review. Latest-master smoke is **375/375** and
  build is green at **676 modules**. Scope stayed inside `core-rs/**`; no
  unsupported barrier, deferral, or papercut was added.

## R44 — [supervised session, 2026-08-14] **M43 Battle Script Fury Cutter counter/power leaf**

- **State:** `rust-main` = current master `a4ad65ad` plus R43 and verified
  `Cmd_furycuttercalc` worker `257daae9`. The complete pure
  `battleScriptFuryCutterOpcode.ts` registration/state/control projection is
  native and wasm32-compilable; no ABI, adapter, or animation surface was
  widened. The session remains active and committed.
- **Did:** ported attacker-first resolution; the full-u32 no-effect-mask miss
  branch that resets only the attacker counter and jumps after late label
  resolution; and the success branch's exact counter-5 fixed point, wrapping
  u8 increment, source-u16 power assignment, wrapping doublings, overwrite,
  and Advance control. Canonical TypeScript execution supplies **2,278 cases**:
  every counter u8 for all attackers (**1,024**), the full **500** selector
  matrix, **357** power/doubling cases, **104** mask edges, **68** miss resets,
  **125** ordered missing-attacker probes, unresolved-label cases, registration
  shape/cardinality, immutable siblings, and repeated paths; corpus sha256
  `5f73545665073ab151ebd3c4d55d558e80916473d6eff98a190ea7e56a341c34`.
- **Next:** fold any newer master, recheck active work, and select another
  conflict-free pure Battle Script leaf. M7c opponent generation still waits
  on canonical TS live generation; main and animation moving targets remain
  excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited the decomp,
  dispatch table, opcode/macro and script loop, mask/counter/power widths,
  validation and label order, preservation and repetition; regenerated twice
  byte-identically (canonical corpus **6,068,742 bytes**; generated file
  **16,336,817 bytes**, sha256
  `834df15407dc13cf3a913f4ba650efe9c003910aea0da30541547c2ffe4c42ee`;
  generator **53,855 bytes**, sha256
  `36a22601be63b1bf07698c50cb88b40fa74787390048b1f418479a4fd6afa743`),
  and reran focused **6/6**, cargo **940/940**, fmt, strict Clippy, and wasm32
  release. Artifact is **497,814 bytes**, sha256
  `ddce90064ded1e9ef29ad27f1e44ba4f14331bb25ad7c54ff0579652013a0242`.
  Scope stayed inside `core-rs/**`; no unsupported barrier, deferral, or
  papercut was added.

## R43 — [supervised session, 2026-08-14] **M42 Battle Script Return/Frustration friendship-power leaf**

- **State:** `rust-main` = current master `a4ad65ad` plus verified
  `Cmd_friendshiptodamagecalculation` worker `1dc46208`. The complete pure
  `battleScriptFriendshipToDamageOpcode.ts` registration/scalar/state/control
  projection is native and wasm32-compilable; no ABI or adapter surface was
  widened. The session remains active and committed.
- **Did:** ported exact Return `(10 * friendship) / 25` and Frustration
  `(10 * (255 - friendship)) / 25` integer arithmetic, attacker-first
  resolution, friendship-before-effect validation, dynamic-power-only
  overwrite, immutable siblings, and unconditional Advance control. Canonical
  TypeScript execution supplies **1,437 cases** across both effects and every
  friendship u8 (**512**), the complete **500** selector-role matrix, prior
  u16 dynamic-power edges, malformed-number and unreachable-effect ordering,
  **125** missing-attacker probes, registration shape/cardinality, and
  repetitions; corpus sha256
  `458a2c01c29322f17bee7ad9bb3d6f478c77a722e87aed272737d328c357dbaa`.
- **Next:** recheck active work, then select another conflict-free pure Battle
  Script leaf. M7c opponent generation still waits on canonical TS live
  generation; main-owned `openpartyscreen` and presentation work stay excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited the decomp,
  dispatch table, opcode/macro, aliased Return/Frustration site, validation
  order, arithmetic, state preservation and repetition; regenerated twice
  byte-identically (canonical corpus **878,850 bytes**; generated file
  **2,153,463 bytes**, sha256
  `030abe9b342997e0540f56d04e232fc181e34da0ef5e1faad4d1f9723149394f`;
  generator **37,249 bytes**, sha256
  `3318803cd374a4b2a791f6fed40f2ecd7c0c1395723f3bec13f983da9541300e`),
  and reran focused **6/6**, cargo **929/929**, fmt, strict Clippy, and wasm32
  release. Artifact is **508,338 bytes**, sha256
  `65e90d675fb5f0b38778124b6be2439b3256b643018b172e7120014ee18d74b1`.
  Scope stayed inside `core-rs/**`; no unsupported barrier or Rust deferral was
  added. PAPERCUT: fresh worker lacked the gitignored WASM artifact and had to
  rebuild it before adapter parity, ~2 min.

## R42 — [supervised session, 2026-08-14] **M41 Battle Script Flail/Reversal HP-power leaf + final wind-down**

- **State:** `rust-main` = current master `0d804653` plus verified
  `Cmd_remaininghptopower` worker `f067faea`. The complete pure
  `battleScriptRemainingHpToPowerOpcode.ts` scalar/state/control projection is
  native and wasm32-compilable; no ABI or adapter surface was widened. The
  session ends committed and green.
- **Did:** ported the source `GetScaledHPFraction(hp, maxHP, 48)` floor and
  living-minimum correction, all six inclusive Flail/Reversal power bands,
  attacker-first resolution, dynamic-power-only overwrite, immutable siblings,
  and unconditional Advance control. Canonical TypeScript execution supplies
  **888 cases** across every exact scaled fraction 0–48, **100** varied-maxHP
  threshold pairs, the complete **500** selector-role matrix, prior u16 dynamic
  power edges, HP zero/living-min/full boundaries, all aliases, **125** ordered
  missing-attacker probes, and repetitions; corpus sha256
  `d6c872d3676d7029e4cb8a6448b77b6ce8d2a36b799af3fc3ed9f4956bb531fa`.
- **Next:** select the next conflict-free pure Battle Script leaf after a fresh
  master orient and active-work conflict check. M7c opponent generation still
  waits on canonical TS live generation; keep moving targets excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited the source helper,
  table, opcode/dispatch, macro and shared Flail/Reversal effect site, u16/u32
  arithmetic, thresholds, role ordering, state preservation and repetition;
  regenerated twice byte-identically (canonical corpus **404,901 bytes**;
  generated file **1,142,734 bytes**, sha256
  `e7d933f56944aa60db37f53153c846adf509464a53cdd4363137414fba1c050a`;
  generator **28,427 bytes**, sha256
  `a137c6485b305f3df8a79490912b6d0e58b3423701a6df8fceaa3c911689e0b4`),
  and reran focused **6/6**, cargo **920/920**, fmt, strict Clippy, and wasm32
  release. Final artifact is **509,811 bytes**, sha256
  `5ed2c97a0f28c304ea43dde9dc5b39be53210365eb86bbe33f9832b546f12c0c`.
  Full npm is green at **1,024 files / 9,833 passed / 224 skipped** and build
  is green at **675 modules**. Wind-down soaks: vanilla **20/20 OK**; full
  policy **50/60 OK, 9 CRASH, 1 HANG**, exactly the main ledger's open #89
  Baton Pass nine-seed set and #90 seed-51 presentation hang. Scope stayed
  inside `core-rs/**`; no unsupported barrier or Rust deferral was added.
  PAPERCUT: fresh worker reported Cargo's fmt subcommand unavailable despite a
  direct rustfmt installation, ~1 min.

## R41 — [supervised session, 2026-08-14] **M40 Battle Script Torment status leaf + wind-down**

- **State:** `rust-main` = current master `685aa4cd` plus verified
  `Cmd_settorment` worker `95d2290d`. The complete pure
  `battleScriptSettormentOpcode.ts` handler/state/control projection is native
  and wasm32-compilable; no ABI or adapter surface was widened. The session
  ends committed and green.
- **Did:** ported exact opcode/dispatcher/operand shape validation before target
  resolution, full-u32 `STATUS2_TORMENT` inspection, success-only target bit
  OR, already-set no-write failure jump, and deliberately late failure-label
  resolution. Canonical TypeScript execution supplies **560 cases** across all
  four targets, the full **500** selector-role matrix, packed-u32 bit-31 edges,
  complete target/sibling state, ordered malformed/missing/unresolved errors,
  resolution skipped on success, and repeated advance-to-failure/idempotent
  paths; corpus sha256
  `2bc252582eb5971f3965826a44f7fec60e045794749f6a3645acc02f5e31b916`.
- **Next:** select the next conflict-free pure Battle Script leaf after
  re-orienting against master and active TS work. M7c opponent generation still
  waits on canonical TS live generation; keep moving targets excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited the decomp,
  opcode/macro/call site, bit-31 constant, handler error order, expression-bound
  resolution, full-width state preservation, and repetition; regenerated twice
  byte-identically (canonical corpus **1,443,119 bytes**; generated file
  **3,977,003 bytes**, sha256
  `49e8fdd4ed4d02e89150defa8271363c696a662dd9b050c3c2418682517ffb66`;
  generator **40,663 bytes**, sha256
  `ec9d9d5213f2e1585e57b96bd46c97a631b535ffa77c7aceb01e5c05619daab4`),
  and reran focused **9/9**, cargo **914/914**, fmt, strict Clippy, and wasm32
  release. Final artifact is **496,864 bytes**, sha256
  `8b4898136c07cab628c486f485adcc52c66f120361622f99b1fd1688543da9ad`.
  After folding master's #88 fix, full npm is green at **1,024 files / 9,833
  passed / 224 skipped** and build is green at **675 modules**. Scope stayed
  inside `core-rs/**`; no unsupported barrier or Rust deferral was added.
  PAPERCUT: worker's long npm/build sessions yielded several ambiguous runner
  receipts before their terminal results, ~4 min.

## R40 — [supervised session, 2026-08-14] **M39 Battle Script Spikes setup leaf**

- **State:** `rust-main` = current master `9465868d` plus verified
  `Cmd_trysetspikes` worker `e1a78ce4`. The complete pure
  `battleScriptTrysetspikesOpcode.ts` decision/state/control projection is
  native and wasm32-compilable; no ABI or adapter surface was widened.
- **Did:** ported handler operand validation, ordered attacker resolution,
  attacker-side inversion, the exact `spikesAmount == 3` failure branch and
  late label resolution, attacker-only Pressure exemption on failure, and the
  success-only opposing-side Spikes-status OR plus wrapping source-u8 layer
  increment. Canonical TypeScript execution supplies **1,262 cases** across
  both sides, all aliases, the complete u8 layer domain, full-u32 status edges,
  every selector combination, side-timer siblings, all four prior Pressure
  bits, ordered errors, corrupt wrapping, and repeated paths; corpus sha256
  `212c83c5ac0d130511f93fba2772f855450056e761449bf3c51ff61c4631dba0`.
- **Next:** while main-owned #88 remains the only shared-suite baseline
  regression, select another conflict-free pure Battle Script leaf that does
  not overlap active TS work. M7c opponent generation still waits on
  canonical TS live generation.
- **Notes:** Terra/max worker, one commit. Supervisor audited the decomp,
  opcode/macro/call site, source constants, handler error order, exact-equality
  branch, full-width status preservation, immutable siblings, and repetitions;
  regenerated twice byte-identically (generated file **4,719,009 bytes**,
  sha256
  `5913da3b2e768e344e608d24f5288603d7f4bfa0e44951037414cb5eddb715ac`;
  generator **46,346 bytes**, sha256
  `a40c0955e1d6d8c3c3a0037f94b1f4d5b3f55d8afca912310c29b8e20b7d6b36`),
  and reran focused **9/9**, cargo **905/905**, fmt, strict Clippy, and wasm32
  release. Artifact is **509,806 bytes**, sha256
  `3f77c7a3993610e23303787e0da2a4d00ad2de3a0fc32946c6a144b8a4901ba2`;
  build is green. Full npm reproduced exactly current master's two main-owned
  #88 `randomRoundSoak.test.ts` failures with **1,021 files / 9,820 passed /
  223 skipped**. Scope stayed inside `core-rs/**`; no unsupported barrier or
  Rust deferral was added.
  PAPERCUT: long npm terminal output required log-based completion tracking,
  ~2 min.

## R39 — [supervised session, 2026-08-14] **M38 Battle Script attacker/target swap leaf**

- **State:** `rust-main` = current master `a4497fbd` plus verified
  `Cmd_swapattackerwithtarget` worker `bbe43113`. The complete three-command
  pure projection of `battleScriptSnatchOpcode.ts` is now native and
  wasm32-compilable; no ABI or adapter surface was widened.
- **Did:** ported ordered attacker-then-target resolution, exact role exchange,
  and full-u32 XOR of only `HITMARKER_SWAP_ATTACKER_TARGET` (bit 12), while
  preserving `effectBattler`, `fainted`, and `scriptingBattler`. Every valid
  path `Advance`s and a second application restores the complete input.
  Canonical TypeScript execution supplies **579 cases**, including the full
  **400-cell** role/effect/fainted matrix, **160** full-u32 hit-marker edges,
  all aliases, ordered errors, siblings, and involution checks; corpus sha256
  `eb72926f0c8b959deb7766603f8978b8ab219e0ae9abc191646a02ef181ff76e`.
- **Next:** after main-lane #88 restores the shared full-suite baseline, select
  the next conflict-free pure Battle Script leaf. M7c opponent generation
  still waits on canonical TS live generation; active TS modules remain
  excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited the decomp,
  opcode/macro, all three concrete source sites, full-width marker semantics,
  ordered errors, aliases, and involution; regenerated twice byte-identically
  (generated file **906,706 bytes**, sha256
  `4c6cff4ce3f39deadd7c395be17ae8fb13efba1b9f8e1f60d5bd95cd7d2ed12f`),
  and reran focused **8/8**, cargo **896/896**, fmt, strict Clippy, and wasm32
  release. Artifact is **496,765 bytes**, sha256
  `8a361d0e8b30227781045d6efab09c2ab9d9e3d597da46ab889c60d15fd11272`;
  build is green at **673 modules**. The full npm union reached **1,021 passed
  files / 9,820 passed / 223 skipped**, with only the two pre-existing
  `randomRoundSoak.test.ts` failures that current master already records as
  main-owned #88; this Rust-only fold did not touch their code or tests. Scope
  stayed inside `core-rs/**`; no unsupported barrier or Rust deferral was added.
  PAPERCUT: fresh worker artifact provisioning plus one mistyped artifact
  filename in supervisor verification, ~3 min.

## R38 — [supervised session, 2026-08-14] **M37 Battle Script Snatch role-rebinding leaf**

- **State:** `rust-main` = current master `0a66b217` plus verified
  `Cmd_snatchsetbattlers` worker `7cabfe00`. The complete pure selector-role
  and scripting-battler projection is native and wasm32-compilable. Only the
  final attacker/target swap sibling remains in this TS module; no ABI or
  adapter surface was widened.
- **Did:** ported exact attacker-then-target resolution, original-attacker
  capture into `effectBattler`, self-target conditional rebinding, target
  replacement with the original scripting battler, and scripting-battler
  handoff to the original attacker. `fainted` is preserved and every valid
  path `Advance`s. Canonical TypeScript execution supplies **1,622 cases**,
  including the full **1,600-cell** attacker/target/scripting/effect/fainted
  matrix, ordered errors, all aliases, and repeated paths whose second call
  changes from non-self to self-targeted; corpus sha256
  `53c9f9d8642180e20c6cd2f75e0eb11a1632d52894bb070f2c6342f81bbd517e`.
- **Next:** port only the final conflict-free pure
  `Cmd_swapattackerwithtarget` sibling, preserving full-u32 hit-marker XOR
  semantics and ordered role errors. M7c opponent generation still waits on
  canonical TS live generation; active TS modules remain excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited the decomp,
  opcode/macro and sole concrete call site, exact role write order, aliases,
  and branch-changing repetition; regenerated twice byte-identically
  (generated file **2,109,170 bytes**, sha256
  `5c39688746cb1b69507e192fff3b7f892c8b5799c67bcb1f5360094806579c9b`),
  and reran focused **7/7**, fmt, strict Clippy, and wasm32 release. Worker
  Rust gates passed cargo **888/888**. The worker's optional npm run lacked
  the ignored artifact; supervisor rebuilt it and proved the merged union:
  full npm **1,020 files / 9,813 passed / 223 skipped**, build **672 modules**.
  Artifact is **509,840 bytes**, sha256
  `34d424497e3966379b6b03f46d6082bb7a6d8d0e00275b1922899c13f7ffc07c`.
  Scope stayed inside `core-rs/**`; no unsupported barrier or Rust deferral
  was added.
  PAPERCUT: worker invoked Cargo formatting once outside `core-rs/`, ~1 min.

## R37 — [supervised session, 2026-08-14] **M36 Battle Script Snatch setup leaf**

- **State:** `rust-main` = current master `c42b6381` plus verified Snatch
  worker `30c9aa84`. The pure `Cmd_trysetsnatch` decision/state/control
  projection is native and wasm32-compilable. The module's two role commands
  remain intentionally unported; no ABI or adapter surface was widened.
- **Did:** ported exact attacker resolution, attacker-only PP
  Pressure-exemption, and the full-u8 action equality branch. Acting last
  preserves `stealMove` and returns typed `FailJump`; every other action value
  arms only the attacker `stealMove` and `Advance`s. All selector roles and
  sibling battlers remain exact. Canonical TypeScript execution supplies
  **1,302 cases** across singles/doubles topology, all attackers, the complete
  u8 action domain, all selector combinations, all eight prior battler bits,
  u32 topology flags, missing attacker, aliases, and repetition; corpus
  sha256 `c97e457c24d5747fd5e6c51479d8467d6c73a6d4e2a97be0b10b7a0bca8d1dd3`.
- **Next:** select the next conflict-free pure Battle Script leaf; the two
  remaining role commands in `battleScriptSnatchOpcode.ts` are now natural
  candidates but must remain bounded independently. M7c opponent generation
  still waits on canonical TS live generation; keep active TS modules out.
- **Notes:** Terra/max worker, one commit. Supervisor audited the exact source
  write/branch order, opcode macro and concrete `BattleScript_EffectSnatch`
  call site; regenerated twice byte-identically (generated file **1,863,320
  bytes**, sha256
  `95e03df2408aad5b2da7a6abd724a2a7c08e9e03b5baeb69dabb386cd22cb4e7`),
  and reran focused **7/7**, fmt, strict Clippy, and wasm32 release. Worker
  gates passed cargo **881/881**, full npm **1,020 files / 9,811 passed**, and
  build **670 modules**. Artifact is **509,767 bytes**, sha256
  `879e604eea0a7eef93e3141f1bf4e59a500d5cedddeb7d9409965e974aee683d`.
  Scope stayed inside `core-rs/**`; no unsupported barrier or Rust deferral
  was added.
  PAPERCUT: the fresh worker lacked the ignored WASM artifact, ~2 min.

## R36 — [supervised session, 2026-08-14] **M35 Battle Script Magic Coat setup leaf**

- **State:** `rust-main` = current master `a9014e6f` plus verified Magic Coat
  worker `8c141035`. The complete pure
  `battleScriptTrysetmagiccoatOpcode.ts` decision/state/control projection is
  native and wasm32-compilable. No ABI or adapter surface was widened.
- **Did:** ported the source-ordered target=attacker and PP Pressure-exemption
  writes, then the exact `gCurrentTurnActionNumber == gBattlersCount - 1`
  branch. Acting last preserves the prior bounce bit and returns typed
  `FailJump`; every other full-u8 action value arms `bounceMove` and
  `Advance`s. Canonical TypeScript execution supplies **1,302 cases** across
  singles/doubles topology, all four attackers, the complete u8 action
  domain, all selector-role combinations, all eight prior battler bits, u32
  topology-flag edges, missing attacker, aliases, and repetition; corpus
  sha256 `df02734139e4e83d3272769c3a85d99a576395342ee3c9617f626f6a4f439794`.
- **Next:** port the conflict-free pure `Cmd_trysetsnatch` setup leaf using
  the Magic Coat topology/action recipe, without widening to the module's two
  role-swap commands or an ABI surface. M7c opponent generation still waits
  on the canonical TS live-generation port; keep active TS modules excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited the decomp and
  concrete Snatch-adjacent Magic Coat script site, exact write/branch order,
  role preservation, and machine-owned failure pointer; regenerated twice
  byte-identically (generated file **1,900,104 bytes**, sha256
  `f3b023f6075b38722c49e77808a87af0628fc0f39b153932a30a07aadbb71584`),
  and reran focused **8/8**, fmt, strict Clippy, and wasm32 release. Worker
  gates passed cargo **874/874**, full npm **1,018 files / 9,802 passed / 223
  skipped**, and build **670 modules**. Fresh-worktree artifact is **496,779
  bytes**, sha256
  `a89a85d9715a50cf7cc8dee2fce74a0c374439ad8d1dd3d91ea9b1066885f34e`;
  the persistent-tree full gates remain for wind-down. Scope stayed entirely
  inside `core-rs/**`; no unsupported barrier or Rust deferral was added.
  PAPERCUT: the fresh worker lacked the ignored WASM artifact, ~4 min.

## R35 — [supervised session, 2026-08-14] **M34 Battle Script Destiny Bond hit-marker leaf + wind-down**

- **State:** `rust-main` = current master `54283db0` plus the verified Destiny
  Bond worker through `7912bb4a`. The complete pure
  `battleScriptTrysetdestinybondtohappenOpcode.ts` state/control projection and
  its shared helper are native and wasm32-compilable. No ABI or adapter surface
  was widened; the session ended committed and green.
- **Did:** ported attacker-then-target role resolution and the exact three-part
  marker predicate. Only `HITMARKER_DESTINYBOND` (bit 6) is ORed into the full
  u32 hit marker when the target has `STATUS2_DESTINY_BOND` (bit 25), attacker
  and target are on opposite sides, and `HITMARKER_GRUDGE` (bit 24) is clear.
  All other state is preserved and every valid path `Advance`s. Canonical
  TypeScript execution supplies **48 cases** across all role pairs, both sides,
  packed-u32 edges, predicate branches, ordered missing-role errors, siblings,
  aliases, and repetition. It pins both concrete source opcode sites (OHKO and
  Pursuit); corpus sha256
  `537b2986185b3c2cf07e96ec3087d249e9713338e8acb79d79278f13dc106bcb`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited source constants,
  both registered call sites, full-width preservation, predicate precedence,
  and exact canonical errors; regenerated twice byte-identically (generated
  file **82,469 bytes**, sha256
  `87ea3904816dece1df91ca15607b08232c421354dcde6a66e6a1608501824473`),
  and reran focused **7/7**, cargo **866/866**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,018 passed files / 44 grind files skipped; 9,802
  passed / 223 skipped tests**, and build **670 modules**. Final soak gates
  passed vanilla **20/20** and full-policy **60/60**, with **0 crashes** and
  **0 hangs**. Artifact is **509,620 bytes**, sha256
  `412773e10d2a88b646f80dfafa62c998f2462d21b28f430173789ec298c81ae1`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added.
  PAPERCUT: the fresh worker needed the ignored WASM artifact rebuilt, ~2 min.

## R34 — [supervised session, 2026-08-14] **M33 Battle Script Role Play ability-copy leaf**

- **State:** `rust-main` = current master `54283db0` plus the verified Role
  Play worker through `51de1de1`. The complete pure
  `battleScriptTrycopyabilityOpcode.ts` decision/state/control projection is
  native and wasm32-compilable. No ABI or adapter surface was widened.
- **Did:** ported attacker-then-target role resolution with the canonical
  shared helper's exact (grammatically awkward) errors. Target abilities
  `ABILITY_NONE` (**0**) and `ABILITY_WONDER_GUARD` (**25**) preserve complete
  narrow state and return typed `FailJump`; every other u8 ability overwrites
  the active attacker's ability and `lastUsedAbility`, then `Advance`s.
  Siblings and roles are preserved and attacker=target aliases are valid.
  Canonical TypeScript execution supplies **359 cases** across a full
  256-ability non-alias sweep, all 16 attacker/target pairs × two failures and
  four success boundaries, ordered errors, siblings, aliases, and repetition;
  corpus sha256
  `afbfd05ca218aa26d69aca4c8f6f771368c6a59b1b1be4bade6ccf65fc4cb536`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited source constants,
  full u8 domains, fail-jump preservation, and exact canonical error
  `Battle Script hit-chain command requires a attacker role`; regenerated
  twice byte-identically (generated file **338,858 bytes**, sha256
  `b071615aa660fc0e5c305c59d2f1a20664681776ff97319c43f8a5cd8fe026d4`),
  and reran focused **6/6**, cargo **859/859**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,018 passed files / 44 grind files skipped; 9,802
  passed / 223 skipped tests**, and build **670 modules**. Artifact is
  **509,840 bytes**, sha256
  `1a734cc209ef4d756a4839515f60dc6fc9296f91559e3be5c2e181a3fbb2d27a`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added.
  PAPERCUT: the fresh worker lacked the ignored WASM artifact and rebuilt it
  before the final application gates, ~3 min.

## R33 — [supervised session, 2026-08-14] **M32 Battle Script Pay Day payout leaf**

- **State:** `rust-main` = current master `54283db0` plus the verified Pay Day
  worker through `e670e131`. The complete pure
  `battleScriptGivepaydaymoneyOpcode.ts` state/control projection is native
  and wasm32-compilable. No ABI or adapter surface was widened.
- **Did:** ported the source-ordered suppression predicate for `BATTLE_TYPE_LINK`,
  `BATTLE_TYPE_RECORDED_LINK`, and zero Pay Day money. Suppression preserves
  the full narrow state and `Advance`s; payout computes exact u16×u8 unsigned
  bonus money, caps player money at **999,999**, overwrites the nullable full
  u32 prepared-money buffer, and returns typed `PayoutCall`. Absolute label
  and pushed return address remain machine-owned. Canonical TypeScript
  execution supplies **149 finite cases**, a separate exhaustive **65,536**
  value u16 Pay Day sweep, and an exhaustive **256** value u8 multiplier
  sweep; corpus sha256
  `546867571e961b089407fb8caf2970b3f4288cc89d53acb8710b1237e7bede88`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited source AddMoney,
  branch precedence, arithmetic bounds, compact packed sweep results, and
  complete buffer preservation/overwrite; regenerated twice byte-identically
  (generated file **1,707,596 bytes**, sha256
  `78f3ac15fe6a9e50e704ce4b3b1c0ef72a24d68b434190b8cb7f6c22d3011c8e`),
  and reran focused **6/6**, cargo **853/853**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,018 passed files / 44 grind files skipped; 9,802
  passed / 223 skipped tests**, and build **670 modules**. Artifact is
  **509,249 bytes**, sha256
  `60d3a569b3fbb76a4769aad1bd7c4dd1668d6dcbd0c332fe9afe2163b8b43645`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added.
  PAPERCUT: the fresh worker initially lacked the ignored WASM artifact and
  repeated its full baseline after building it, ~3 min.

## R32 — [supervised session, 2026-08-14] **M31 Battle Script Psych Up stat-stage copy leaf**

- **State:** `rust-main` = current master `54283db0` plus the verified Psych Up
  worker through merge `9b33ded1`. The complete pure
  `battleScriptCopyFoeStatsOpcode.ts` state/control projection is native and
  wasm32-compilable. No ABI or adapter surface was widened.
- **Did:** ported exact attacker-then-target role resolution and the source
  loop copying all eight signed-s8 `statStages` cells from target to attacker.
  Neutral rows and all four attacker=target aliases succeed; sibling rows and
  both roles are preserved; every valid path returns typed `Advance`. The
  dead encoded failure pointer remains in the omitted machine layer.
  Canonical TypeScript execution supplies **2,075 cases**: one non-alias pair
  exhaustively covers all 256 signed-s8 values at every stage position, while
  an orthogonal matrix covers all 16 role pairs plus ordered missing roles,
  mixed boundaries, siblings, aliases, neutral rows, and repetition; corpus
  sha256
  `e1f1cb9ea7e97c5536fd9b0ebecfa2512e5ec12da6356a24e550762feaf570f9`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one accepted commit. Supervisor rejected and
  discarded an earlier uncommitted 32,813-case Cartesian corpus because its
  42.8 MB generated file exceeded the entire existing Rust source tree, then
  required orthogonal coverage capped below 5 MB. The accepted generator was
  rerun twice byte-identically; generated file **2,688,749 bytes**, sha256
  `a688c00f155d0427eeb5f4fe06641d06a34936be32121b3e40220f4c3be1622d`.
  Supervisor reran focused **5/5**, cargo **847/847**, fmt, strict Clippy,
  wasm32 release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,018 passed files / 44 grind files skipped; 9,802
  passed / 223 skipped tests**, and build **670 modules**. Artifact is
  **509,700 bytes**, sha256
  `c285e0a94dab2602aefc91f789d2e077d9b32071500608efbfbe85fc1bd0814d`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added.
  PAPERCUT: the first worker's overlarge evidence design was caught before
  compilation and replaced; Cargo still needed the documented PATH, ~10 min
  total.

## R31 — [supervised session, 2026-08-14] **M30 Battle Script Thrash-family post-lock confusion-byte leaf**

- **State:** `rust-main` = current master `6e9396a4` plus the verified
  confuse-if-repeating-attack-ends worker through merge `4fbbb86c`. The
  complete pure `battleScriptConfuseifrepeatingattackendsOpcode.ts`
  state/control projection is native and wasm32-compilable. No ABI or adapter
  surface was widened.
- **Did:** ported exact missing-attacker resolution and the source
  `STATUS2_LOCK_CONFUSE` predicate. When either packed status2 lock bit is set,
  the complete narrow state is preserved; when both are clear, only
  `moveEffectByte` is overwritten with `MOVE_EFFECT_THRASH |
  MOVE_EFFECT_AFFECTS_USER` (**117**). Both successful branches `Advance`.
  Canonical TypeScript execution supplies **4,229 cases**, including the full
  256-byte effect domain for all four attackers and all four lock-bit
  combinations, packed-u32 edges, sibling preservation, missing role, and
  repetition; corpus sha256
  `a6481812ddbea8b97208ad1c0954c749fa1ce742bebe2e538d8f258198bb2966`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited source constants,
  exact error ordering, canonical handler execution, and the bounded 4.0 MB
  generated corpus; regenerated twice byte-identically (generated sha256
  `fd41471d601b4d31f51f9fd49a4670f3b5ebed299eb7872d3d31f4ab586a6653`),
  and reran focused **5/5**, cargo **842/842**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,018 passed files / 44 grind files skipped; 9,802
  passed / 223 skipped tests**, and build **670 modules**. Artifact is
  **509,475 bytes**, sha256
  `08436ef1c1760ad3cf409fd733aed6d1266b4f4db37c53acf5cb3103c9fb67c4`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added.
  PAPERCUT: the fresh worker lacked Cargo on login PATH and the ignored WASM
  artifact; the supervisor also corrected one stale local WASM script name,
  ~4 min total.

## R30 — [supervised session, 2026-08-14] **M29 Battle Script Bide setup state leaf**

- **State:** `rust-main` = current master `7c0b7e35` plus the verified Bide
  setup worker through `d183c5ed`. The complete pure
  `battleScriptSetbideOpcode.ts` state/control projection is native and
  wasm32-compilable. No ABI or adapter surface was widened.
- **Did:** ported exact missing-attacker resolution and the source-ordered
  setup writes: OR attacker `status2` with `STATUS2_MULTIPLETURNS` and
  `STATUS2_BIDE_TURN(2)`, overwrite its locked move with `currentMove`, zero
  its signed Bide-damage accumulator, and `Advance`. Siblings, all selector
  roles, current move, and all saved Bide targets are preserved. Canonical
  TypeScript execution supplies **273 cases** across packed-u32 status/Bide
  counters, current/locked u16 edges, signed-i32 damage edges, all battlers and
  saved targets, selector roles, overwrite boundaries, and repetition; corpus
  sha256
  `ce9554d3269b3760cffc0605b69472636027f500f843303d0f05740c03f83234`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited source writes,
  canonical domains, and non-write of `gBideTarget`; regenerated twice
  byte-identically (generated sha256
  `5954c9f2c8f6850c409f287ecc2bab3b0e49bad163a22c26dc7871198e83d511`),
  and reran focused **5/5**, cargo **837/837**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,014 passed files / 44 grind files skipped; 9,765
  passed / 223 skipped tests**, and build **669 modules**. Artifact is
  **509,839 bytes**, sha256
  `968ddd966352ff5095b52a22a3a6aa8032f89ba9e8352c8f72fbf0586f2a2b5b`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added.
  PAPERCUT: the worker rerouted absent login-PATH Cargo and repeated one full
  npm run after its terminal bridge lost the summary, ~3 min total.

## R29 — [supervised session, 2026-08-14] **M28 Battle Script Fake Out first-turn decision leaf**

- **State:** `rust-main` = current master `7c0b7e35` plus the verified Fake Out
  first-turn worker through merge `c229f469`. The complete pure
  `battleScriptJumpifnotfirstturnOpcode.ts` decision projection is native and
  wasm32-compilable. No ABI or adapter surface was widened.
- **Did:** ported exact missing-attacker resolution and the source truth test
  over canonical `isFirstTurn` values: `0` returns typed `FailJump`, while `1`
  and `2` return `Advance`. Both branches preserve the entire narrow state;
  absolute failure PCs remain in the omitted machine layer. Canonical
  TypeScript execution supplies **20 cases** across the full four-attacker by
  three-value matrix, sibling preservation, missing role, and repeated paths;
  corpus sha256
  `c48ced85f5c875b299bbdde39fbfe55471ffa51077eacc3a4f6bce9a971b3d02`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited source lifecycle
  `2 -> 1 -> 0`, canonical `0..2` validation, and handler execution;
  regenerated twice byte-identically (generated sha256
  `71efb5e8a1be9757a4387ce088ea34a425b4f6e713c0e3788c95088c8f5d9128`),
  and reran focused **6/6**, cargo **832/832**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,014 passed files / 44 grind files skipped; 9,765
  passed / 223 skipped tests**, and build **669 modules**. Artifact is
  **509,708 bytes**, sha256
  `9c5fcb5166201d63d422440d613e2d5de22364586f5b62dcf09142e95136be6d`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added.
  PAPERCUT: the fresh worker lacked the ignored WASM artifact, so its initial
  full npm baseline failed before the required build supplied it, ~2 min.

## R28 — [supervised session, 2026-08-14] **M27 Battle Script Grudge decision/state leaf**

- **State:** `rust-main` = current master `572fcef4` plus the verified Grudge
  worker through merge `7bc96401`. The complete pure
  `battleScriptTrysetgrudgeOpcode.ts` decision/state projection is native and
  wasm32-compilable. No ABI or adapter surface was widened.
- **Did:** ported exact missing-attacker resolution and the source Grudge-bit
  predicate. An already-Grudged attacker preserves the complete narrow state
  and returns typed `FailJump`; a clear attacker receives only
  `STATUS3_GRUDGE` and returns `Advance`. Absolute failure PCs remain owned by
  the omitted machine layer. Canonical TypeScript execution supplies **45
  cases** across every attacker, both branches, 32 packed-u32 edge cells,
  missing role, sibling preservation, and success/failure repetition; corpus
  sha256
  `b38e387bb68c4390978018c580352dc7d4a05fcac7929354d011e8a5e944d675`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited source, handler,
  and packed-u32 validation, regenerated twice byte-identically (generated
  sha256
  `24d687cb4ce11b9c4ae93dd791f7f8cb955d3840bd46c65b17c60d16391211ad`),
  and reran focused **6/6**, cargo **826/826**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,014 passed files / 44 grind files skipped; 9,765
  passed / 223 skipped tests**, and build **669 modules**. Artifact is
  **509,824 bytes**, sha256
  `d29782927e09b85befb6877709c07126003f9b126bdcf5f5dfe2119cf20576da`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier, Rust
  deferral, or worker papercut was added. Supervisor initially invoked Cargo
  one directory too high, corrected immediately with no repository impact.

## R27 — [supervised session, 2026-08-14] **M26 Battle Script Revenge damage-receipt multiplier leaf**

- **State:** `rust-main` = current master `992c986a` plus the verified Revenge
  worker through merge `ba117e99` and current union merge `773df3e8`. The
  complete pure `battleScriptDoubleDamageIfDamagedOpcode.ts` decision/state
  projection is native and wasm32-compilable. No ABI or adapter surface was
  widened.
- **Did:** ported exact attacker-then-target role resolution and the source
  predicate over the attacker's physical/special damage receipts: a nonzero
  receipt owned by the target overwrites `dmgMultiplier` with 2; otherwise the
  multiplier is preserved. All successful paths `Advance`; receipts and roles
  are immutable. Canonical TypeScript execution supplies **383 cases** across
  all owner pairs, receipt-state combinations, multiplier edges, both ordered
  missing-role errors, sibling preservation, repetition, and signed-i32 damage
  edges; corpus sha256
  `c50345ebb61ac605ed28f85ddebae7fa82aa2e42657f95c5a6a5f3e763896fdd`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited the source and
  canonical-handler projection, regenerated twice byte-identically (generated
  sha256
  `e2b2ae84ea9c6ca40e23c23cb45ed38a57ce5822a5123f9c447763327cbd2e46`),
  and reran focused **5/5**, cargo **820/820**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,014 passed files / 44 grind files skipped; 9,765
  passed / 223 skipped tests**, and build **669 modules**. Artifact is
  **509,713 bytes**, sha256
  `17fb3dc429e2b058dd9f513f89692cf33e3440471df41b5a0b44bf5e8dc37dc9`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier, Rust
  deferral, or session papercut was added.

## R26 — [supervised session, 2026-08-14] **M25 Battle Script Haze stat-stage normalization leaf**

- **State:** `rust-main` = current master `3cd2a89c` plus the verified Haze
  worker through merge `cfac113c`. The complete pure
  `battleScriptNormalisebuffsOpcode.ts` state projection is native and
  wasm32-compilable. No ABI or adapter surface was widened.
- **Did:** ported the unconditional four-battler by eight-stage signed-s8
  reset to source `DEFAULT_STAT_STAGE = 6` with `Advance`. Canonical
  TypeScript execution supplies **35 cases**: a 32-cell position matrix plus
  mixed signed edges, all-neutral idempotence, and repeated application;
  corpus sha256
  `294dac1f672c6888bbc0d7bfe2adebc4c8b0928e22abfaf9860efd08a85cd602`.
  Statuses, roles, disable fields, absolute PCs, opcode registration, generic
  BattleState reduction, RNG, scheduling, and presentation remain excluded.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited source and
  canonical-handler execution, regenerated twice byte-identically (generated
  sha256
  `4ee5ef51e3a4d9dce1b63f16f85cf2ee7ca9cad2569eb08cc650e80af8a5d570`),
  and reran focused **5/5**, cargo **815/815**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,014 passed files / 44 grind files skipped; 9,764
  passed / 223 skipped tests**, and build **669 modules**. Artifact is
  **509,722 bytes**, sha256
  `4309014e9499263753c284ad1f48444dc950f7dc8f4a103b87889f54b698fc47`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added.
  PAPERCUT: the fresh worker lacked the ignored WASM artifact, requiring one
  explicit artifact build before its initial npm gate, ~1 min.

## R25 — [supervised session, 2026-08-14] **M24 Battle Script Follow Me forced-target state leaf**

- **State:** `rust-main` = current master `46e75846` plus the verified Follow
  Me worker through merge `6455280b`. The complete pure
  `battleScriptSetforcedtargetOpcode.ts` state projection is native and
  wasm32-compilable. No ABI or adapter surface was widened.
- **Did:** ported exact missing-attacker ordering, attacker-record side
  routing, and the unconditional acting-side overwrite of
  `followmeTimer = 1` and `followmeTarget = attacker` with `Advance`. Every
  other acting-side timer/id/amount field and the opposite side are preserved.
  Canonical TypeScript execution supplies **57 cases** across all four
  attackers and canonical sides, prior timer u8 edges, every prior target,
  sibling u8 boundaries, same-side partner replacement, missing role, and
  repetition; corpus sha256
  `b64cdf4492cb810c7d89098e301efd9b21fad5f4798a36bc237c62a336cf3f91`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited source and
  canonical-handler execution, regenerated twice byte-identically (generated
  sha256
  `414089df9a79f97748642f3f5a550a1935b6f7807dce49dc0c60fb081b93943f`),
  and reran focused **5/5**, cargo **810/810**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,014 passed files / 44 grind files skipped; 9,764
  passed / 223 skipped tests**, and build **669 modules**. Artifact is
  **507,850 bytes**, sha256
  `fa3857122b32c2f43dfd411b875ab6bd6fc89ef02ab5862ac60da837612cbf90`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added.
  PAPERCUT: the fresh worker lacked the ignored WASM artifact and repeated its
  full npm gate while diagnosing the initial missing-artifact run, ~3 min.

## R24 — [supervised session, 2026-08-14] **M23 Battle Script Focus Energy decision/state leaf**

- **State:** `rust-main` = current master `a0d16569` plus the verified Focus
  Energy worker through merge `f704baf8`. The complete pure
  `battleScriptSetfocusenergyOpcode.ts` decision/state projection is native
  and wasm32-compilable. No ABI or adapter surface was widened.
- **Did:** ported exact missing-attacker ordering, the clear-state attacker-
  only `STATUS2_FOCUS_ENERGY` OR and success chooser, and the already-focused
  failure that preserves battlers, ORs `MOVE_RESULT_FAILED`, and selects the
  failure message. Both branches `Advance`; prior chooser values are always
  overwritten. Canonical TypeScript execution supplies **69 cases** spanning
  four attackers, packed status/result u32 edges, chooser u8 probes, sibling
  preservation, missing role, success-then-failure repetition, and repeated
  failure; corpus sha256
  `7b3faf718150f8fc6a791ce01c4df7f6c72ea80390417f75de316f381e9184c7`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited source and
  canonical-handler execution, regenerated twice byte-identically (generated
  sha256
  `247b9a01c9e95db78ff2df4677716259a588688362a37e44c6f44b3adfed5d76`),
  and reran focused **5/5**, cargo **805/805**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,014 passed files / 44 grind files skipped; 9,764
  passed / 223 skipped tests**, and build **669 modules**. Artifact is
  **509,811 bytes**, sha256
  `ca9675f1640799ac52fb563a160d919aedbe3aeecaffde96930dc657f6a0217d`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added.
  PAPERCUT: cargo was absent from the worker login PATH; the documented
  explicit toolchain setup cost ~1 min.

## R23 — [supervised session, 2026-08-14] **M22 Battle Script Defense Curl state leaf**

- **State:** `rust-main` = current master `53242305` plus the verified Defense
  Curl worker through merge `02af4895`. The complete pure
  `battleScriptSetDefenseCurlBitOpcode.ts` state projection is native and
  wasm32-compilable. No ABI or adapter surface was widened.
- **Did:** ported exact missing-attacker ordering and the unconditional,
  idempotent attacker-only `STATUS2_DEFENSE_CURL` OR with `Advance`. Stat
  changes, absolute program counters, opcode registration, generic
  BattleState reduction, RNG, scheduling, and presentation remain outside the
  narrow result. Canonical TypeScript execution supplies **27 cases** across
  all four attackers, clear/set inputs, u32 edges, sibling preservation,
  missing attacker, and repeated application; corpus sha256
  `39dd1fb0a8d96809508adfd1282eef87c6fc202f49920bb009d80ce61b839825`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited source and
  canonical-handler execution, regenerated twice byte-identically (generated
  sha256
  `904047b8ffa00588b42c813709536dd7e5b397e59291f7c994a6c3847e1fdb93`),
  and reran focused **5/5**, cargo **800/800**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,013 passed files / 44 grind files skipped; 9,757
  passed / 223 skipped tests**, and build **668 modules**. The main fold's
  CGB4 opt-in gate reduced the supervisor full suite to **84.53 s**. Artifact
  is **510,065 bytes**, sha256
  `62a2a1a4baa70500da6f5465fb75beb54acd8901a9a8ff3ce1cc45f1ec4ecd34`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added.
  PAPERCUT: before the CGB4 gate reached this worktree, the worker's repeated
  full npm verification took ~20m45s under shared-machine contention.

## R22 — [supervised session, 2026-08-14] **M21 Battle Script Foresight state leaf**

- **State:** `rust-main` = current master `2706c9ee` plus the verified
  Foresight worker through merge `26026770`. The complete pure
  `battleScriptSetforesightOpcode.ts` state projection is native and
  wasm32-compilable. No ABI or adapter surface was widened.
- **Did:** ported exact missing-target ordering and the unconditional,
  idempotent target-only `STATUS2_FORESIGHT` OR with `Advance`. Absolute
  program counters, opcode registration, generic BattleState reduction, RNG,
  scheduling, and presentation remain outside the narrow result. Canonical
  TypeScript execution supplies **27 cases** across all four targets,
  clear/set inputs, u32 edges, sibling preservation, missing target, and
  repeated application; corpus sha256
  `fbb38fbd92d927a35a2f5f57e35fb518d7eaae23cb3912ffe5580be972a355cc`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation now waits on the canonical TS live-generation port,
  not Issue #55; continue excluding the construction clock and every module
  the TS lane is actively changing.
- **Notes:** Terra/max worker, one commit. Supervisor audited the source and
  canonical-handler execution, regenerated twice byte-identically (generated
  sha256
  `10f107f4781a650027c74ff1c5203c37ef0464dc018504dd36a2552a2267bdda`),
  and reran focused **5/5**, cargo **795/795**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, and build **668 modules**. Worker same-commit full npm was
  **1,056 files / 9,934 passed / 1 skip**. Artifact is **509,825 bytes**,
  sha256
  `97ba284228ab5aaf76238bc0c0857e1b7e2b8ead0fde915bf17e2683e1142160`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added.
  PAPERCUT: the worker's full npm gate took ~671 s in the recursive CGB4
  tail; a missing ignored WASM artifact and yielded-runner duplication added
  one discarded full-suite attempt.

## R21 — [supervised session, 2026-08-14] **M20 Battle Script Taunt decision/state leaf + clean wind-down**

- **State:** `rust-main` started from master `7e3d4b0c` and now contains the
  verified R15-R21 sequence through `bf42a7f3`. The complete pure
  `battleScriptSettauntOpcode.ts` decision/state projection is native and
  wasm32-compilable. No ABI or adapter surface was widened. Master advanced
  independently to `44079106` during validation; its normal supervisor fold
  remains the union point.
- **Did:** ported exact missing-target ordering, the unchanged nonzero-timer
  `FailJump`, and the zero-timer target-only write of `2` with `Advance`.
  Absolute program counters and the source-dead adjacent `tauntTimer2` stay
  outside the narrow result. Canonical TypeScript execution supplies **70
  cases** across all four targets, every four-bit timer `0..15`, boundaries,
  target-only mutation, missing role, and repeated application; corpus sha256
  `8a33204cf0d64ca843cc542d079fea16ca33e2231e1a1f6da49f7aa4a6a0b426`.
- **Next:** after the main supervisor folds `bf42a7f3`, select the next
  conflict-free pure Battle Script leaf. M7c opponent generation remains
  deferred while Issue #55 is open. Keep opcode registration, generic
  BattleState reduction, presentation, and callback expansion out.
- **Notes:** Luna/max worker, one commit. Supervisor audited source and TS
  behavior, retained the worker test handle through completion, and
  regenerated twice byte-identically (generated sha256
  `0b4783094fa1f5fc0f55dfb1d398f269c9c12070e4cb95c3cafd86d89df1d079`).
  Final folded-head gates: focused **5/5**, cargo **790/790**, fmt, strict
  Clippy, wasm32 release, forced-WASM union **19 files / 807/807**, smoke **8
  files / 375/375**, full npm **1,047 files / 9,864 passed / 1 skip**, build
  **664 modules**, vanilla soak **20/20**, and full-policy soak **60/60** with
  zero crashes and hangs. Artifact is **509,791 bytes**, sha256
  `7e23d1bfe97fa2674fb932bffb99f585c9af434ffbaba34c8e99524828b7a7fc`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added. The Rust worker branch and worktree were removed, and
  the Battle Scene OFF oracle remained healthy.
  PAPERCUT: recursive CGB4 evidence dominated both required full npm runs;
  worker and supervisor runs cost ~22 min combined.

## R20 — [supervised session, 2026-08-14] **M19 Battle Script Yawn decision/state leaf**

- **State:** `rust-main` = current master `7e3d4b0c` plus verified R15-R20
  through `71daba18`. The complete pure `battleScriptSetyawnOpcode.ts`
  decision/state projection is native and wasm32-compilable; no ABI or
  adapter surface was widened.
- **Did:** ported exact missing-target ordering, the source-ordered
  `STATUS3_YAWN || STATUS1_ANY` failure decision with unchanged state, and the
  success advance that ORs a fresh two-turn counter into only the target.
  Absolute program counters stay outside the narrow `Advance | FailJump`
  result. Canonical TypeScript execution supplies **96 cases** across all
  targets, all four Yawn counters, every primary-status member, OR
  combinations, u32 edges, and repeated success/failure; corpus sha256
  `bfaba855da35331383adfd4281e1194e16eb8bb66e3a800e81b733bfd511de79`.
- **Next:** select at most one final conflict-free pure Battle Script leaf,
  then begin mandatory wind-down validation and soaks. M7c opponent generation
  remains deferred while Issue #55 is open.
- **Notes:** Terra/max worker, one commit. Supervisor audited exact status
  masks, target-only mutation, and the narrow control result; regenerated
  twice byte-identically (generated sha256
  `77bfb1165b49ff39f76a3497f6089924bc5eb30d266fea63b941959fd7ffdf10`),
  and reran focused **5/5**, cargo **785/785**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, and smoke **375/375**.
  Worker same-commit full npm was **1,047 files / 9,864 passed / 1 skip**;
  build was **664 modules**. Artifact is **509,478 bytes**, sha256
  `6196301dc2313b1ab768563da1c66e96a53250dabcbb595570940ab5358254ca`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier was added.
  PAPERCUT: cargo was absent from the worker login PATH; explicit toolchain
  setup cost ~1 min.

## R19 — [supervised session, 2026-08-14] **M18 Battle Script Minimize state leaf**

- **State:** `rust-main` = current master `7e3d4b0c` plus verified R15-R19
  through `ec318b74`. The complete pure
  `battleScriptSetminimizeOpcode.ts` state projection is native and
  wasm32-compilable; no ABI or adapter surface was widened.
- **Did:** ported the exact `HITMARKER_OBEYS` gate ordering: a clear gate is a
  complete no-op before attacker resolution, while a set gate requires the
  attacker and ORs `STATUS3_MINIMIZED` into only that battler. Exact role
  error, hit marker, unrelated bits, siblings, and idempotence are retained.
  Canonical TypeScript execution supplies **51 cases** across all attackers,
  both gates, clear/set state, two applications, and u32 status/hit-marker
  edges; corpus sha256
  `d3760ba077c31a99adb30d27642450f8de055ca72a00abed711bf91f0e334a49`.
- **Next:** select the next conflict-free pure Battle Script leaf only if a
  full worker verification still leaves the required wind-down margin. M7c
  opponent generation remains deferred while Issue #55 is open.
- **Notes:** Sol/high worker, one commit. Supervisor audited the no-op-before-
  role-resolution branch against the pinned source, regenerated twice
  byte-identically (generated sha256
  `ef4143b2254024205f3f33c775f7934847310420b86371c9aea9e06efe78a5ce`),
  and reran focused **5/5**, cargo **780/780**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, and smoke **375/375**.
  Worker same-commit full npm was **1,047 files / 9,864 passed / 1 skip**;
  build was **664 modules**. Artifact is **509,818 bytes**, sha256
  `d72d7fa77bea0d961ffc0279233c0d616ee30e4852cabd295544706555e8b3d5`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier was added.
  PAPERCUT: cargo was absent from the worker login PATH; explicit toolchain
  setup cost ~1 min.

## R18 — [supervised session, 2026-08-14] **M17 Battle Script Destiny Bond state leaf**

- **State:** `rust-main` = current master `7e3d4b0c` plus verified R15-R18
  through `c2cf8db8`. The complete pure
  `battleScriptSetdestinybondOpcode.ts` state projection is native and
  wasm32-compilable; no ABI or adapter surface was widened.
- **Did:** ported the exact four-battler attacker-only transformation: require
  the optional attacker role, OR `STATUS2_DESTINY_BOND` into only that
  battler's `status2`, preserve all unrelated bits, siblings, and role state,
  and retain the exact missing-attacker error. Canonical TypeScript execution
  supplies **25 cases** covering every attacker, clear/set and idempotent
  inputs, full-u32 edges, and the missing role; corpus sha256
  `b024fb02d948ecbf7e5417738eaf53704d811466b6f069ef915e6aa263e73315`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation remains deferred while Issue #55 is open; keep opcode
  registration, generic BattleState reduction, presentation, and callback
  expansion out.
- **Notes:** Luna/max worker, one commit. Supervisor audited target-only OR
  semantics and exact error text; regenerated twice byte-identically
  (generated sha256
  `28ec30a71e35ffce6d85e2ed5e90af4990c8bfdc80e2549f6c9360105164cdba`);
  and reran focused **4/4**, cargo **775/775**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, and smoke **375/375**.
  Worker same-commit full npm was **1,047 files / 9,864 passed / 1 skip**;
  build was **664 modules**. Artifact is **509,812 bytes**, sha256
  `444bb310b590eaccb09184f86b2f41cd3a26884a81a0485a1a43e8875872d7ad`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier was added.
  PAPERCUT: the worker ran a redundant baseline full suite before materializing
  the gitignored WASM artifact, costing ~18 min before the required final run.

## R17 — [supervised session, 2026-08-14] **M16 Battle Script always-hit state leaf**

- **State:** `rust-main` = current master `7e3d4b0c` plus verified R15-R17
  through `7e7e6df1`. The complete pure
  `battleScriptSetalwayshitflagOpcode.ts` state projection is native and
  wasm32-compilable; no ABI or adapter surface was widened.
- **Did:** ported the exact four-battler attacker/target transformation: clear
  both packed `STATUS3_ALWAYS_HITS` bits, set turn 2, overwrite the target's
  `battlerWithSureHit` owner with the attacker, preserve all unrelated bits
  and non-target state, and retain attacker-first missing-role error
  precedence. Canonical TypeScript execution supplies **71 cases** across all
  16 role pairs, all four incoming counters, u32 edges, prior owners, and the
  three missing-role combinations; corpus sha256
  `9a69a8a8336fd55fcbec4ad7866585239d47fe0af32f43638636fe321c9ee106`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation remains deferred while Issue #55 is open; keep opcode
  registration, generic BattleState reduction, presentation, and callback
  expansion out.
- **Notes:** Terra/max worker, one commit. Supervisor audited role ordering,
  target-only mutation, and packed-field replacement; regenerated twice
  byte-identically (generated sha256
  `0fbc089c4cf87c2c32bfa7931344edd57d06778d763c9d3ebb6bf2a6c1356159`);
  and reran focused **4/4**, cargo **771/771**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **375/375**, full
  npm **1,047 files / 9,864 passed / 1 skip**, and build **664 modules**.
  Artifact is **509,811 bytes**, sha256
  `c2ea109ccadc9f2849d508de3134fe996a905d7e38e080ef812755602bfe5a52`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier was added.
  PAPERCUT: the worker lost its full-npm command handle and falsely reported
  completion; supervisor reran the full suite correctly, costing ~15 min.

## R16 — [supervised session, 2026-08-14] **M15 Battle Script negative-damage arithmetic**

- **State:** `rust-main` = current master `7e3d4b0c` plus verified R15 and R16
  `34fcd7ab`. The complete pure `battleScriptNegativedamageOpcode.ts`
  arithmetic surface is native and wasm32-compilable; no ABI or adapter
  surface was widened.
- **Did:** ported signed-`i32` `-Math.floor(hpDealt / 2)` plus the exact
  zero-result-to-`-1` guard. The Rust implementation explicitly corrects
  truncation for negative odd inputs, preserving the complete typed-reachable
  TypeScript domain. Canonical TypeScript execution supplies **24 cases**;
  corpus sha256
  `fc4526fac0345c329ede2f2ce2072f207a7096c75e1461da89bc8451a318fe46`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation remains deferred while Issue #55 is open; keep opcode
  registration, the generic BattleState reducer, presentation, and callback
  stack expansion out.
- **Notes:** Luna/max worker, one commit. Supervisor audited the signed-domain
  floor correction, regenerated twice byte-identically (generated sha256
  `8538ed4437b6aa272771fd03b27d993722293df053dcde8e74c58b5f62d83a20`),
  and reran focused **3/3**, cargo **767/767**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, and smoke **375/375**.
  Worker same-commit full npm was **1,047 files / 9,864 passed / 1 skip**;
  build was **664 modules**. Artifact is **507,846 bytes**, sha256
  `66c35cdc1b2f2b1222322dcd08a2926bea800212ebd54721e19dd165e33e651d`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier was added.
  PAPERCUT: the first full npm attempt lacked the gitignored WASM artifact;
  after `build-wasm.sh`, the required rerun took ~20 min.

## R15 — [supervised session, 2026-08-13] **M14 Battle Script battler-position resolver**

- **State:** `rust-main` = current master `7e3d4b0c` plus verified R15
  `c55a8099`. The complete pure `battleScriptBattlerPositions.ts` resolver is
  native and wasm32-compilable; no ABI or adapter surface was widened.
- **Did:** ported the typed `2 | 4` battler-count domain, both canonical left
  positions, the raw `BS_ATTACKER -> opponent-left` byte collision, exact
  string matching, unknown-expression nulls, and the retained count gate.
  Canonical TypeScript execution supplies **20 cases** across all four result
  branches and six categories; corpus sha256
  `2539d9c708156a52587e8413abde4b379fa3839923b251212104307ab45d45eb`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation remains deferred while Issue #55 is open; keep the
  generic BattleState reducer, presentation, and callback-stack expansion out.
- **Notes:** Terra/max worker, one commit. Supervisor audited the complete
  string/count mapping, regenerated twice byte-identically (generated sha256
  `2108f517abbca8ec800ab4d0641ac202c9d8256eacb9e7c00210b3882c5c766c`),
  and reran focused **3/3**, cargo **764/764**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, and smoke. Worker
  same-commit full npm was **1,047 files / 9,864 passed / 1 skip**; build was
  **664 modules**. Artifact is **507,847 bytes**, sha256
  `4e540a351abe19b3d4205a128d174c9bf357e85959aa58411cff834c725216a8`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier was added.
  PAPERCUT: recursive CGB4 evidence made the worker full suite take ~29 min.

## R14 — [supervised session, 2026-08-13] **M13 Battle Script gender resolver**

- **State:** `rust-main` = current master `9b4f4286` plus this ledger-only
  wind-down, including verified M13 merge `36bb3828`, target-portability
  repair `3ffef1dc`, and the final v44 master union. The complete
  pure `battleScriptGender.ts` lookup surface is native and wasm32-compilable;
  no ABI or adapter surface was widened.
- **Did:** added an isolated generated **411-pair** species/gender-ratio table
  and binary-search resolver over the source-shaped `u16` species / `u32`
  personality domains, preserving the exact missing-species message. Canonical
  TypeScript execution supplies **2,306 cases** covering every extracted
  species, both u32 edges, low-byte threshold boundaries in low and high words,
  all fixed-gender branches, and three missing IDs; corpus sha256
  `bb2aaff65e2c88fa5074fbd544be1cba6be22bdbad75e91259f03af752576edc`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c opponent
  generation remains deferred while Issue #55 is open; keep native core logic
  target-portable even before an ABI boundary is added.
- **Notes:** Terra/max implementation plus Sol/high corrective isolation and a
  supervisor target-portability repair. Audit rejected coupling the ratio into
  `SwitchPolicySpeciesRow`; final `gen_tables.rs` is byte-identical to M12, and
  the standalone generated table sha256 is
  `c802372450ae0e5904c8393e27ce59d9055f29f37356f18951a01279f3b3e9ba`.
  Regenerated twice cleanly; generated vectors sha256
  `b002662ce399a3c90b3e163b63e77d4e8aed92234d6fe50a290f8ff172e7d418`.
  Supervisor reran focused **2/2**, cargo **761/761**, fmt, strict Clippy,
  wasm32 release, forced-WASM union **19 files / 807/807**, smoke **375/375**,
  full npm **1,047 files / 9,864 passed / 1 skip**, and build **664 modules**.
  Wind-down soaks are vanilla **20/20 OK** and full **60/60 OK** with zero
  crashes or hangs.
  Target-portable artifact is **509,805 bytes**, sha256
  `d415fea6f766bdeebfc7d678b72609adfebe5ea720de43e38f50746714b0552d`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier was added.

## R13 — [supervised session, 2026-08-13] **M12 Battle Script AI reveal leaf**

- **State:** `rust-main` = current master `df5135ed` plus verified M12 through
  merge head `7662a433`. The complete pure `battleScriptAiReveal.ts` surface is
  native; no ABI or adapter surface was widened.
- **Did:** ported immutable AI knowledge overlays for revealed abilities and
  held-item effects using two four-battler arrays and a bounded battler enum.
  Canonical TypeScript execution supplies **20 cases / 33 operations** across
  all four slots, changed and unchanged values, u8 edges, chains, non-mutation,
  and sibling preservation; corpus sha256
  `8d7732702b8d372a71d60683471429a6285966deb6ee95e87302c44abe7e3652`.
- **Next:** select one final conflict-free, native-only Battle Script leaf if
  the session clock retains a safe full-verification margin. M7c opponent
  generation remains deferred while Issue #55 is open.
- **Notes:** Terra/max worker, one commit. Supervisor audited bounded indexing
  and copy semantics, regenerated twice byte-identically, and reran focused
  vectors **3/3**, cargo **759/759**, fmt, strict Clippy, release WASM, smoke
  **375/375**, full npm **1,045 files / 9,852 passed / 1 skip**, and build
  **664 modules**. Artifact is **509,804 bytes**, sha256
  `d3fc75987621a85bf3b9f5a5110138351cb6863226e50c12d20ea28ee2f8e573`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier was added.

## R12 — [supervised session, 2026-08-13] **M11 key-repeat core + WASM boundary**

- **State:** `rust-main` = current master `6ccc2141` plus verified M11 through
  merge head `7b5fb5c3`. The complete pure `keyRepeat.ts` surface is native and
  forced-WASM reachable with no TypeScript fallback.
- **Did:** ported the canonical ten-button mask, bounded shared counter,
  `INITIAL_KEY_REPEAT_STATE`, `readKeys`, and `hasButton`; added one checked
  additive ABI-v1 packet, adapter, and both-mode parity. Canonical TS execution
  supplies **1,580 read cases + 20 membership cases** across all 1,024 masks,
  every reachable counter, and full singleton repeat timelines; corpus sha256
  `f67e38c085fdbb74fc600b9ef7622197295e1919020148bcc3356ce00ebf7482`.
- **Next:** select the next conflict-free pure leaf. M7c opponent generation
  remains deferred while Issue #55 is still open; presentation and generic
  BattleState reducer ownership remain outside the completed M11 surface.
- **Notes:** Terra/max worker plus one supervisor regeneration-hygiene repair.
  Supervisor audited semantics and packet validation, regenerated twice to a
  clean byte-identical tree, and reran cargo **756/756**, fmt, strict Clippy,
  focused parity **3/3** both modes, forced union **19 files / 807/807**, smoke
  **375/375**, full npm **1,044 files / 9,849 passed / 1 skip**, and build **664
  modules** on the current-master union. Artifact is **509,825 bytes**, sha256
  `d7344e1cb390ef88600227bb164e1732d39f4bab8cb39dee10d79709b0c430e4`.
  Scope stayed `core-rs/**` plus only `tests/keyRepeatParity.test.ts`.

## R11 — [supervised session, 2026-08-13] **M10c draft-selection WASM boundary**

- **State:** `rust-main` = current master `8950c86b` plus verified M10c
  `6d1f6267` (merge head `43460263`). The complete 12-helper pure draft
  selection surface is native and forced-WASM reachable with no TS fallback.
- **Did:** added one checked additive ABI-v1 operation packet preserving UTF-8
  species/messages, six full rental sources, u32 boundaries, and optional
  `otId` absence versus present zero. Status 1 owns exact routing errors;
  status 2 owns **56 structural malformed classes** after complete validation.
  Both-mode parity covers **180 cases / 23 categories** and all 12 operations.
- **Next:** select the next conflict-free pure leaf; M7c opponent generation
  still waits on #55, and draft state construction/presentation remain outside
  the completed M10 selection family.
- **Notes:** Sol/high worker, one commit. Supervisor audited all packet suffixes,
  validation order, result tags, optional-field preservation, and no-fallback
  routing; reran cargo **750/750**, fmt, strict clippy, focused parity **4/4**
  both modes, forced union **18 files / 804/804**, release WASM, and post-fold
  smoke **375/375**. Worker exact-commit full npm was **1,041 files / 9,833
  passed / 1 skip**; build was **664 modules**. Artifact is **507,934 bytes**,
  sha256 `f1882396b33623622cd5e90aff7531c335a7b8d71574a647064cccb487ebf471`.

## R10 — [supervised session, 2026-08-13] **M10b draft projections**

- **State:** `rust-main` = current master `7a0dba6e` plus verified M10b
  `36469617` (merge head `96517f2b`). The complete presentation-free draft
  selection helper surface is native; no ABI or adapter was widened.
- **Did:** ported `chosenMonSpecies` with rank-order emission, later-duplicate
  overwrite, sparse-rank skipping, and above-three non-emission; ported
  `selectedRentalParty` as a generic full-record projection with exact first
  invalid/duplicate error ordering and missing-rank error. The coherent corpus
  now has **180 cases / 23 categories**, with all **13 projection branches**;
  sha256 `9264b667c3e7118c5a5d607bf73bd18d554b99d9708d82a0b40f1df34bb3c208`.
- **Next:** M10c — expose the complete draft-selection helper surface through
  one checked additive ABI-v1 packet, adapter, and both-mode parity suite.
  Preserve optional `otId`, UTF-8 species/messages, exact semantic errors, and
  forced-WASM no-fallback routing. Keep presentation/state construction out.
- **Notes:** Sol/high worker, one commit. Supervisor audited Map/projection and
  first-error semantics, regenerated twice, and reran cargo **750/750**,
  focused vectors **6/6**, fmt, strict clippy, release WASM, and post-fold
  smoke **375/375**. Artifact is **493,998 bytes**, sha256
  `206c997958d5c54d5b0ebd0f400d23ee0dfd77008068bf9d26432cdd83b39c55`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier was added.

## R9 — [supervised session, 2026-08-13] **M10a draft-selection helper leaf**

- **State:** `rust-main` = current master `b2a98a3e` plus verified M9 and
  native-only M10a through `a15e75ee`. Ten presentation-free draft-selection
  helpers are native; no ABI or adapter surface was widened.
- **Did:** ported select/deselect numbering and immutable-copy behavior,
  first-pick renumbering (including `findIndex === -1`), selection messages,
  confirmation, exact species stall exceptions, both cursor wraps, and all
  three redraw settle schedulers. The canonically executed TypeScript corpus
  has **102 cases / 12 categories** and regenerates byte-identically at sha256
  `e78b50ca6b407637cafbdb1d71f98eadcb80e93203ea7384735a6848c67af5fb`.
- **Next:** M10b — port the two remaining presentation-free draft selection
  projections (`chosenMonSpecies` and `selectedRentalParty`) as a native-only
  bounded step. Keep draft state construction, presentation expansion,
  rendering, animation, reveal, and controller logic out of scope. M7c still
  waits on #55.
- **Notes:** Terra/max worker, one commit. Supervisor audited all ten source
  branches, regenerated twice, and reran cargo **747/747**, focused vectors
  **4/4**, fmt, strict clippy, release WASM, and post-fold smoke **375/375**.
  Worker same-commit full npm and build passed. Artifact is **491,775 bytes**,
  sha256 `4b5e14d2f789464abf1e60f7c746062abb0c4115238de0666db4d1dc690ff344`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier was added.

## R8 — [supervised session, 2026-08-13] **M9d Factory swap WASM boundary**

- **State:** `rust-main` = current master `b2a98a3e` plus verified M9c–M9d
  through `8ac01891` (merge head `a8e7ee8d`). The complete pure Factory swap
  surface is native and reachable through forced WASM with no TypeScript
  fallback. `RUST_DEFERRED.md` has no open entries.
- **Did:** added one versioned additive ABI-v1 operation packet for all eight
  swap entry points, preserving full state, UTF-8 strings, u32 boundaries,
  optional selections, typed decisions, and the two exact semantic errors.
  The decoder rejects bad version/operation/enum/presence/domain/UTF-8/length,
  truncated, appended, missing-suffix, and forbidden-suffix packets before
  semantic execution. Both-mode parity covers the complete **176-case** M9c
  corpus, all **17 phases x 6 inputs**, and **17 malformed classes**.
- **Next:** select the next conflict-free pure family. M7c opponent generation
  remains blocked until the main lane closes #55; generic BattleState reducer
  replay remains outside the completed M8 planning seam.
- **Notes:** Luna/max worker, two commits. Supervisor audited the packet and
  adapter line-by-line and reran cargo **740 tests**, fmt, strict clippy,
  release WASM, swap parity **3/3** in both modes, forced-WASM union **17 files
  / 800/800**, and smoke **375/375**. Worker same-commit full npm was **1,037
  files / 9,812 passed / 1 skip** plus build **661 modules**. Artifact is
  **491,761 bytes**, sha256
  `980bcf83cec1c2f5eb1b84160247dba2d7e5943b22bacc8fa9efc68d875b1f11`.
  Scope was `core-rs/**` plus the single M2-allowed parity file
  `tests/factorySwapParity.test.ts`; no canonical TypeScript or other lane
  ledger was edited.

## R7 — [supervised session, 2026-08-13] **M9c Factory swap input reducer**

- **State:** `rust-main` = current master `d40eb745` plus verified M9c
  `556e307d`. The complete pure `factorySwap.ts` state, mutation, cursor,
  decision, and six-input reducer surface is now native. `RUST_DEFERRED.md`
  has no open entries.
- **Did:** ported every `handleFactorySwapInput` readiness gate, picker/action
  wrap, cursor-copy staging flag, player-option route, duplicate-species
  route, accept/quit prompt branch, and transition-phase no-op. The
  canonical-TypeScript-executed corpus has **176 full-state cases / 22
  categories**, including the complete **17 phases x 6 inputs** matrix;
  sha256 `6798e1b084014722be065fc45f6d0b817754d05330d95cd7269ac099f0d90759`.
- **Next:** M9d — expose the complete Factory swap pure surface through one
  additive ABI-v1 operation packet, a new `core-rs/adapter` module, and one
  new both-mode parity suite. Forced WASM must call the export directly with
  no TypeScript fallback. M7c opponent generation still waits on #55.
- **Notes:** Terra/max worker, one commit. Supervisor audited the reducer
  branch-by-branch, regenerated the corpus twice byte-identically, and reran
  cargo **737 tests**, focused vectors **5/5**, fmt, strict clippy, release
  WASM, and smoke **375/375**. Worker same-commit full npm was **1,035 files /
  9,804 passed / 1 skip** plus build **661 modules**. Artifact is **471,931
  bytes**, sha256
  `aa740344412b2daa2c904bf1e67f181fe7cf28e43f16a2caed057936405d5fe4`.
  Scope stayed entirely inside `core-rs/**`; no adapter, canonical TypeScript,
  TS test/config, or other lane ledger changed.

## R6 — [supervised session, 2026-08-13] **M8d–M8j live planning + M9a–M9b Factory swap leaves**

- **State:** `rust-main` = master `3121473f` plus verified M8d–M9b through
  `b68307d1`. The complete pure `createFactoryAiViewFromLiveRules` projection
  and source-shaped mask-0/1/7 move chooser are native and WASM differential-
  green end-to-end; the live driver's private RNG replay/checkpoint leaf is
  native, and a single native projection drives every existing chooser.
  `RUST_DEFERRED.md` has no open entries.
- **Did:** ported the source-shaped view with exact optional-property presence,
  JS-number/bit-mask behavior, status and side conditions, M8a history slot-0
  projection, M8c weather/stages, challenge defaults, and attacker-before-
  target ability error ordering. The twice-byte-identical TS-executed corpus
  has **17 cases** across 9 categories; sha256
  `8020bcd29c0e9dc6fd48da3ff008ebbdf3dd3e8d4375fd7da246448a4e2d6186`.
- **M8e DONE:** additive ABI-v1 variable-width packets preserve all Number,
  UTF-8, history, and optional-property states. Status 0 carries the complete
  view, status 1 the exact typed ability error, and status 2 checked malformed
  input. The adapter routes forced WASM directly with no TS fallback; parity
  covers complete views, optional combinations, numeric/history edges, error
  order, and five malformed packets.
- **M8f DONE:** ported private `replayAiDraws` semantics with lossless u32 RNG
  state, JS-safe call counters, before/after checkpoint validation, draw
  ordering/ordinals, random-value failure, and exact divergence/overflow
  errors. The twice-byte-identical, canonically executed corpus has **17
  cases** across **10 categories**; sha256
  `e8e8e9778e82e252f80a454207b1f8f75728fba535655898d1514e53fa7d7c7b`.
- **M8g DONE:** added the sole source-view-to-policy bridge and proved complete
  canonical chooser receipts for masks 0/1/7 across history, weather, status,
  type/ability, stages, optional fields, and turn-RNG ownership. Variable move
  history retains observable entries beyond four while four-slot positional
  gates use canonical `?? 0` behavior. The twice-identical corpus has **12
  cases / 9 categories**; sha256
  `0aa8b03965284418c563df3418a3906b7f7d27f1a68a52bfe7ce62722e80eea1`.
- **M8h DONE:** additive ABI-v1 packets reuse the exact M8e live prefix and add
  u32 RNG state, authoritative request records, and turn-RNG ownership. Rust
  constructs the live view, selects the mask, and returns the existing complete
  chooser receipts. Status 2 owns every structurally malformed packet before
  semantic evaluation; valid packets preserve canonical live-view -> request ->
  mask ordering. Forced WASM calls the export directly with no TS fallback.
  Parity covers **12 cases / 9 categories**, exact errors, eight-entry history,
  u32 RNG edges, and malformed prefix/suffix combinations.
- **M8i DONE:** added the native-only pure planning prefix of
  `submitLiveFactoryAiDecision`, composing history sync, live view, switch
  policy, selected-switch bypass, move filtering, and the live chooser without
  the generic BattleState reducer. Scored moves retain battle-turn-boundary
  ownership of the stored random number. The twice-identical canonical-driver
  corpus has **12 cases / 10 categories**; sha256
  `dd298a0fbf083b0e6d01749ca9b36af34b0467c80269833e705d375493fd54b3`.
- **M8j DONE:** one additive ABI-v1 planner packet encodes canonical
  BattleState/rules fields once; Rust atomically derives the history/live and
  switch projections, so contradictory battler copies are impossible. The
  output frames complete history, view, switch policy, action gate, submission,
  RNG, and chooser trace. Forced WASM has no TS fallback. Structural status 2
  is pinned for truncation, append, egg/boundary/request/legal tags, including
  packets whose live view would otherwise fail semantically.
- **M9a DONE:** ported the native-only pure Factory swap mutation leaf:
  duplicate-species exclusion, accepted copy/commit, friendship reset, rental
  `enemy + 3` indexing, typed missing-selection errors, and the round-decision
  timing seam. The twice-byte-identical canonical-TS corpus has **17 cases / 6
  categories**; sha256
  `5fdaa2feb71d1fa6e8617bcb4661d66cf719eb246e4475d3eb6597d5ce441846`.
- **M9b DONE:** ported Factory swap initialization, presentation
  acknowledgement, and the old-state-derived VBlank cursor/option copy
  pipeline. Deep-clone ownership and each pending/lag/no-op path are pinned.
  The extended twice-byte-identical canonical-TS corpus has **28 cases / 12
  categories**; sha256
  `d0a218bc3336e0f2f3e329d46c391ddda90a3ef10746ef576aefdacd7b7b6bfb`.
- **Next:** select the next unblocked pure family; generic reducer replay stays
  outside M8 because the canonical BattleState reducer is not yet native. M7c
  opponent generation still waits on #55.
- **Notes:** Terra/max worker, 3 commits. Supervisor audited the complete TS/Rust
  property mapping, regenerated the corpus twice, and reran cargo **716 tests**,
  fmt, clippy, WASM, and smoke **375/375**. The rebuilt artifact is 391,563
  bytes, sha256 `6b587cb1e3887a0ccc7ad3a4d2c40181044a100b61e2b0b1ffe8aac6ff8aeb99`.
  M8e used Luna/max; supervisor audited the wire and no-fallback routing and
  reran cargo **716 tests**, fmt, clippy, both-mode focused **5/5**, forced
  union **14 files / 790/790**, and smoke **375/375**. Final artifact is
  412,104 bytes, sha256
  `d5abf0a57f8b3a587ad9ff5ef8faa0891cbecf3acaf17f57e089544fea57e725`;
  worker same-commit full npm was **1,020 files / 9,723 passed / 1 skip** plus
  build. M8f used Terra/max; supervisor audited its extracted-private-helper
  generator and all checkpoint/error paths, regenerated twice byte-identical,
  and reran cargo **720 tests**, release WASM, and smoke **375/375**. Final
  artifact is 412,118 bytes, sha256
  `a25b1b216c1493811b135c481c1d3b6623bacf2b0dfdd8e5f5fa57ba2cdce3d4`.
  M8g used Luna/max; a Sol/high correction ratcheted a supervisor-found
  over-four positional-history panic before fold. Supervisor audited every
  history scan and the live/policy property bridge, regenerated twice, and
  reran cargo **722 tests**, fmt, clippy, WASM, and smoke **375/375**. Artifact:
  417,761 bytes, sha256
  `68e9768c138fdf6c6d60debe966be7f95e901dd83b3138271b9446f7cc0e1f2e`.
  Both worker same-commit full npm runs were **1,020 files / 9,723 passed / 1
  skip** plus build. Scope stayed within `core-rs/**` plus the one
  M8e-authorized parity file; no canonical TS engine or existing test/config
  changed. M8h used Sol/high plus two bounded Sol/high corrections for exact
  validation text/order and structural precedence. Supervisor audited the wire,
  projection, and no-fallback route, reran focused both-mode **4/4**, cargo
  **724 tests**, fmt, clippy, WASM, smoke **375/375**, full npm **1,021 files /
  9,727 passed / 1 skip**, and build. Artifact: 434,944 bytes, sha256
  `81df933139ea8ea7f4d4e1cfcd1d0788408ec84291cfbfcb9496d73d9c9e0107`.
  M8h scope stayed within `core-rs/**` plus its one newly authorized parity
  file; no canonical TS engine or existing test/config changed. M8i used
  Terra/max. Supervisor audited its composition/order, regenerated the corpus
  twice, and reran focused parity **2/2**, cargo **726 tests**, fmt, clippy,
  WASM, and smoke **375/375**. Worker same-commit full npm was **1,021 files /
  9,727 passed / 1 skip** plus build. Artifact: 416,805 bytes, sha256
  `e47a6a361a8c04fa2fc116edcfb2192b4c4aa10724075450eecc0468950caed1`.
  M8i stayed entirely inside `core-rs/**`; no WASM export, adapter, canonical
  TS engine, or TS test/config changed. M8j used Sol/high plus one Terra/max
  acceptance correction. Supervisor audited the single-copy packet, full
  structural-before-semantic decode, result frames, and direct forced-WASM
  path; focused both-mode is **3/3**, cargo **726 tests**, fmt, clippy, rebuilt
  WASM, smoke **375/375**, and the forced **15-file / 793/793** union are green.
  Worker same-commit full npm is **1,022 files / 9,730 passed / 1 skip** plus
  build **659 modules**. Artifact: 455,721 bytes, sha256
  `10d7fca84423652c206eb60a40fbd28d02db82215cd9c4277d95aad17f6aa32f`.
  Scope stayed within `core-rs/**` plus one newly authorized parity file; no
  canonical TS engine or existing TS test/config changed. M9a used Terra/max;
  supervisor audited the Rust/TS field mapping, generator provenance, full
  result/error comparison, and all player/enemy offsets, regenerated twice,
  and reran focused **6/6**, cargo **732 tests**, fmt, strict clippy, and WASM.
  Worker smoke and build **659 modules** were green; its full npm process
  completed but lost the aggregate status stream and is not claimed. Artifact:
  461,613 bytes, sha256
  `f94d5f7cebd4f04cb6e941a0eb1a469533fe365b58c95ac8a9b9887f66264623`.
  M9a stayed entirely inside `core-rs/**`; no WASM export, adapter, canonical
  TS engine, or TS test/config changed. M9b used Sol/high; supervisor audited
  old-state cursor ordering and clone/default semantics, regenerated twice,
  and reran focused **7/7**, cargo **733 tests**, fmt, strict clippy, and WASM.
  Worker full npm was **1,022 files / 9,730 passed / 1 skip** plus build **659
  modules**. Artifact: 474,121 bytes, sha256
  `a2720645060b58cbcb563f770615685f0f6eefe25bd101bc36af5e42d115e16a`.
  M9b stayed entirely inside `core-rs/**`; no WASM export, adapter, canonical
  TS engine, or TS test/config changed.

## R5 — [supervised session, 2026-08-12] **M5–M7 COMPLETE; M8 live-driver leaves advancing**

- **State:** rust-main = master `256c43e5`, which contains the verified M8a–M8c
  folds. Battle history is native and WASM differential-green end-to-end;
  live-view weather and stat-stage projections are native.
  Factory trainer selection and the seven-trainer schedule are now
  native and WASM differential-green end-to-end.
  The complete Factory AI mask 0/1/7 decision family and the singles switch-in
  selector/full switch policy are native and WASM differential-green. Factory
  trainer selection/scheduling is now native and corpus-differential-green.
  `RUST_DEFERRED.md` has no open entries.
- **M6a DONE:** ported pure RNG-free `GetMostSuitableMonToSwitchInto`, including
  both source passes, strict ties, defender dedup, mono-attacker double apply,
  Levitate/Foresight, active-type STAB, u8 wrap, special move behavior, and the
  PARTY_SIZE sentinel. Its byte-idempotent TS-executed corpus is **215 cases**,
  sha256 `331bd58adb890bac3460adf06665c2746a511c00c699ce8cc64bcf89c627bc1e`.
- **M6b DONE:** ported pure `factoryAiSwitchPolicy.ts`, reusing M6a and
  preserving the complete result, RNG, draw, branch, and error surface. The
  byte-idempotent TS-executed corpus has **416 cases** and ratchets all **3**
  choices, **10** draw kinds, **17** branch kinds, and **5** outcomes; sha256
  `2d1aa4dafe0fb3d22c410d28d55b071acc1b2b8d505112fd826a6127fe02edf4`.
  Source-derived species types and both ability slots cover dense IDs 1..411;
  table sha256 `7ae8feed6dcedad22fd5dc9d8f4f4f2746951019b68a3a65b231b7481fe3ec94`.
  Supervisor caught and corrected a generator-only FACTORY-bit error before
  fold; policy outputs were unaffected and the repaired corpus separately pins
  Factory, double-battle, battler-count, and non-trainer prechecks.
- **Verification:** supervisor reviewed the native policy and canonical TS,
  spot-checked seven generated species rows, regenerated both switch corpora
  byte-for-byte, and reran cargo **690 test harness cases**, fmt, clippy, WASM,
  smoke **375/375**, and the forced nine-file WASM union **772/772**. Release
  artifact is 287,620 bytes, sha256
  `b6acb929ccf9026ee33a0e471997cb60cbb25b3cda37b3ac68c10b565aeb34c7`.
  Post-fold full npm is **1,007 files / 9,659 passed / 1 skip**; build is green
  at **655 modules**.
- **M6c DONE:** additive ABI-v1 exports cross the selector's fixed 114-byte
  input and the policy's fixed 401-byte input with typed length/policy errors.
  The adapter calls WASM directly and reconstructs the full choice, selection,
  RNG, **10-kind** draw/reason, and **17-kind / 5-outcome** branch surface.
  Both-mode parity covers **100 selector cases + 160 policy inputs**, all 3
  choices, three policy errors, and six malformed lengths. Supervisor audited
  wire widths/order and no-fallback routing, then reran cargo **693 harness
  cases**, fmt, clippy, artifact build, smoke **375/375**, targeted **3/3**, and
  forced-WASM union **11 files / 779/779**. Artifact: 324,348 bytes, sha256
  `3f8094c9c20f4d77dc5a9b168cbb62c53dd230af2496aa37eaef2e4213a9cbf1`.
  Post-fold full npm: **1,010 files / 9,673 passed / 1 skip**; build **657
  modules**.
- **M7a DONE:** ported complete pure `factoryTrainerSchedule.ts`: generated
  normal/hard ranges and history policy, one-draw-per-attempt retries, the hard
  final battle, post-challenge clamp, battle-6 history omission, injected RNG
  port validation, complete ledgers, and validation ordering. The twice-byte-
  identical TS corpus has **69 cases** (56 selections + 13 schedule operations,
  including errors) across 12 categories; data sha256 `ce55325080c072381cb0139105845a3dc7b91869489265954de2b0b03d400ce8`,
  corpus sha256 `de321b7cd478549a104bdc7fb1acc9aacbdcade8b24a556b4432e53337b520e6`.
  Supervisor reran cargo **699 harness cases**, fmt, clippy, WASM, smoke
  **375/375**, forced union **779/779**, full npm **1,011 files / 9,682 passed /
  1 skip**, and build **657 modules**. Artifact: 336,570 bytes, sha256
  `e040c86b15f82b9b4a10ad50d9ba5d031e28af61fb2413df9c1a5f959f0c9d1b`.
- **M7b DONE:** additive ABI-v1 exports accept JS-number-preserving `f64`
  inputs (selection `28+8N` bytes; schedule 16 bytes), return typed errors and
  the complete result/35-byte ledger records, and keep scripted RNG native-
  only. The new adapter routes forced WASM directly with no TS fallback.
  Both-mode parity covers **425 selections + 64 schedules per adapter**, **25**
  production error inputs, and **9** malformed lengths; real GBA seed 31 pins
  duplicate rejections at battles 1 and 5. Supervisor audited width/validation
  order and arbitrary history-number preservation, then reran cargo **699
  harness cases**, fmt, clippy, WASM, smoke **375/375**, forced union **12 files
  / 782/782**, full npm **1,014 files / 9,695 passed / 1 skip**, and build
  **657 modules**. Artifact: 348,371 bytes, sha256
  `a8a5a9f2fefce59d495a9786767a9257a91ee24513f6e32afed8b8145ca00bb4`.
- **M8a DONE:** ported the independent pure battle-history leaf from
  `factoryAiLiveDriver.ts`: create, record ability/item, target last-move
  SameValueZero dedup/cap, party-change move+ability invalidation with item
  retention, and observed ability/item overlays. The source-derived dense
  ability-name table covers IDs 0..77; unknown IDs preserve the canonical
  error. The twice-byte-identical TS corpus has **15 cases** across create,
  record, target move, party change, observation, unknown-ability, and
  arbitrary-history categories; table sha256
  `19d8dc6a9e7a40600454be12d59167d228d3434d2ce8713116c4ab2f7c6dbac5`,
  corpus sha256
  `abc612fc71cb4f469f99e3138e0f8dd495372a0831eeb216c97080e5578e00a4`.
  Supervisor audited the live-driver ordering and JS-number edge semantics,
  regenerated both artifacts twice, and reran cargo **708 harness cases**,
  fmt, clippy, WASM, smoke **375/375**, forced union **12 files / 782/782**,
  full npm **1,014 files / 9,696 passed / 1 skip**, and build **657 modules**.
  Artifact: 348,965 bytes, sha256
  `f593924927773e3f223334bbc2d3316e6f52fab57178b9e8a2ba81e86e5cbdfa`.
- **M8b DONE:** additive ABI-v1 operation packets now expose history create,
  record ability/item, and sync. Variable-width histories preserve arbitrary
  JS Numbers as `f64`, UTF-8 abilities, canonical errors, and fully checked
  malformed-input status without traps. The new adapter routes forced WASM
  directly with no TS fallback; its sole new both-mode suite covers the full
  history lifecycle, NaN/−0/Infinity, Unicode, unknown abilities, and six bad
  packets. Supervisor audited the layout/decoder and reran cargo **708 harness
  cases**, fmt, clippy, WASM, smoke **375/375**, forced union **13 files /
  785/785**, full npm **1,016 files / 9,706 passed / 1 skip**, build **657
  modules**, vanilla soak **20/20**, and full soak **60/60**. Artifact: 395,869
  bytes, sha256
  `1d566618694f3ced4718c39a0a4170927fa73d43d63c1963e44e465c2f59782f`.
- **M8c DONE:** ported only `currentWeather` and `statStages` from the live
  view constructor. Weather preserves Sun→Rain→Sandstorm→Hail precedence and
  ECMAScript `ToInt32` for arbitrary Number inputs; stages project slots 1..7
  in canonical order with unvalidated numeric cells intact. The twice-byte-
  identical TS-executed corpus has **25 cases** (10 raw weather, 2 precedence,
  10 coercion, 3 stage); sha256
  `1a3fce2c30b3a17c16d086b85803a5da948bf46c40efea7f9e543cea357be77c`.
  Supervisor audited the helpers/generator and reran cargo **712 harness
  cases**, fmt, clippy, WASM, full npm **1,018 files / 9,714 passed / 1 skip**,
  build **659 modules**, vanilla soak **20/20**, and full soak **60/60** on the
  final master-v28 union. Artifact remains 395,869 bytes, sha256
  `1d566618694f3ced4718c39a0a4170927fa73d43d63c1963e44e465c2f59782f`.
- **Next:** M8d — port `createFactoryAiViewFromLiveRules` natively with
  TS-executed vectors, reusing M8a/M8c; keep its WASM boundary separate. M7c
  opponent generation still waits on #55.
- **Notes:** M6b used Sol/high plus one narrow Terra/max correction; M6c used
  Sol/high; M7a, M8a, and M8c used Terra/max, and M7b/M8b used Sol/high. Scope stayed within
  `core-rs/**` plus authorized new parity tests; no canonical TS engine or
  main-lane ledger file changed. M7c opponent generation is intentionally
  waiting: its personality construction cursors are fed by unresolved #55,
  and the Rust charter forbids porting that dependency before the TS clock
  closes.

---

## R4 — [supervised session, 2026-08-11 night through 2026-08-12] **M5f-2 folded: the pure DecisionPolicy is native**

- **State:** rust-main = master `bb43e44b` + verified Rust folds through
  M5f-2b `5deb6ff9`/`34cead26`. The full pure DecisionPolicy (mask 0/1/7),
  mask selector, CheckBadMove, TryToFaint, and CheckViability are native;
  all boundary-bearing surfaces through CheckViability cross the WASM
  differential harness. Main-tree artifact is 253,842 bytes, sha256
  `86b488d6…`; Rust **680/680** and post-fold smoke **375/375**. Only the
  final DecisionPolicy WASM boundary/adapter parity step remains in M5.
  No open rust deferrals.
  Start-of-session merged baseline was full npm **993 files / 9,591 passed /
  1 pre-existing skip** + build; the M5e worker's same-commit full npm gate
  was **994 files / 9,600 passed / 1 skip** + build. No open rust deferrals.
- **Did:** supervisor verification on the worker branch before fold:
  scope clean (5 files, all core-rs/), cargo **204/204** + fmt +
  clippy(--all-targets) + wasm build rerun independently, BOTH generators
  rerun byte-identical, 2 vector rows re-derived from the TS module by an
  independent script (inputs reconstructed from pokeemerald headers, not
  the generator): Ninjask stale-weather collision (−8, 0 draws) and
  Lanturn Magnitude 3-draw chain — every rng before/after, randomValue,
  and guessed ability exact. `CBM_HANDLED_EFFECTS_M5B1` = exactly the 32
  batch effects. Post-fold on rust-main: cargo 204/204, artifact rebuilt,
  smoke 375/375. Worker: sonnet, 23.6 min of a 90-min cap, 2 commits.
- **M5b-2 DONE (fold `cf4520e8`):** all 33 RNG-gated status/stat-DOWN
  effects native (OHKO/Sleep/Roar/Paralyze/Confuse-Swagger-Flatter/
  Toxic-Poison/WillOWisp/LeechSeed/FakeOut, the 14-effect stat-DOWN
  shared-tail family, KnockOff+Trick, Attract full gender matrix,
  Explosion, DreamEater, SpitUp+Swallow) + `computeAiEffectiveness`
  ported once (x0→1 clamp preserved; its table-entry iteration naturally
  avoids dual-same-type double-count, unlike `typeMultiplierTenths`'s
  per-slot loop — asymmetry preserved and tested). Native tests 58→133;
  111 scored + 8 direct-handler TS-generated vector rows
  (gen-cbm-m5b2-vectors.mjs, byte-idempotent). Unported = 44, pinned.
  MAX_CHECK_BAD_MOVE_DRAWS re-verified UNCHANGED at 3 (AttackDown/AccDown
  add 2 handler draws but their movers are all power 0 → negates-type
  never co-occurs; KnockOff hits 3 via negates-type+soundproof+own).
  Worker quirk finding: FIVE M5b-2 effects have zero real Gen-3 moves
  (SPECIAL_ATTACK_DOWN(+_2), SPECIAL_DEFENSE_DOWN, ACCURACY_DOWN_2,
  EVASION_DOWN_2) — one more than the scout's vestigial list; siblings
  exercise their shared arms. Supervisor rerun: scope clean, cargo
  **282/282** + fmt/clippy(--all-targets) + wasm build, all THREE
  generators byte-idempotent, 2 rows re-derived independently (Growl vs
  Marowak 3-draw both-sites chain; Attract vs known-Oblivious −10/0-draw)
  — exact. Post-fold: artifact rebuilt, smoke 375/375. Worker: sonnet,
  30.0 min, 2 commits.
- **M5b-3 DONE (fold `57de92b1`) — CheckBadMove is 109/109 native.** All
  44 zero-RNG stat-UP/screens/singles effects;
  `unported_cbm_table_effects()` = `[]`; completeness probe flipped to
  the all-ported arm; `NotYetPorted` barrier stays (honesty analog of
  TS's own dead barrier). Native tests 135→281; 107 scored + 9 direct
  AccUp vector rows (gen-cbm-m5b3-vectors.mjs, byte-idempotent). Both
  same-function pairs (Curse↔BulkUp, PsychUp↔Haze) proven identical
  through the full dispatcher. Port findings worth keeping: (1) dual-stat
  stat-UP composition is ADDITIVE (BulkUp both-maxed = −18, not −10) —
  TS doc phrasing "sequential, no interaction" is easy to misread;
  (2) Snore (power 40) is the ONE M5b-3 move where isMovePowerOther is
  false → negates-type + soundproof both draw (directed vector added);
  (3) hp_percent maxHp=0 guard saturates to i32::MAX — verified faithful:
  both TS uses compare `< threshold`, and Infinity/NaN/i32::MAX all fail
  `<` identically (unreachable input regardless). Supervisor rerun: scope
  clean, cargo **330/330** + fmt/clippy(--all-targets) + wasm build, all
  FOUR generators byte-idempotent, 2 rows re-derived independently
  (Snore ambiguous 2-draw preamble chain; BulkUp both-maxed −18) —
  exact. Post-fold: artifact rebuilt, smoke 375/375. Worker: sonnet,
  21.4 min, 1 commit. Worker PAPERCUT worth adopting as lane practice:
  always verify move ids against moves.json before hand-typing them in
  directed cases — several first-pass guesses were wrong.
- **M5c DONE (fold `910a302e`) — the Factory AI surface is behind the
  differential harness.** 2 additive fw_ exports (ABI v1 unchanged):
  `fw_select_factory_ai_mask` (scalar args in; 28 B ok / 10 B error out,
  all 4 FactoryAiMaskError sites cross as codes) and
  `fw_run_check_bad_move_preamble` (132 B input — rng, move_id,
  RoarTarget 29 + Attacker 29 fields, ~50 optionals presence-preserving
  via per-field flag byte; 105 B scored / 9 B not-yet-ported /
  variable-length error out; unknown-move throw crosses as
  message-matched error, no trap). Layout decision recorded: mirrored
  sequential byte-cursor reader/writer on both sides instead of
  hand-transcribed offset literals (~60 fields = transcription risk);
  offset table still documented in the doc comment. New
  `core-rs/adapter/factoryAiEngine.ts` + `tests/factoryAiMaskParity.test.ts`
  (17) + `tests/factoryAiCheckBadMoveParity.test.ts` (80, incl. 327-case
  seeded sweep across all 109 effects). Supervisor rerun: scope = core-rs
  + exactly the 2 authorized test files, cargo **335/335** + fmt/clippy +
  wasm build, new suites **97/97 in BOTH modes**, existing union 660/660
  in wasm mode, adapter wiring skimmed (wasm path genuinely routes
  through loadFactoryWasm encode/decode — no TS fallback faking parity).
  Worker ran full npm test green (977 files / 9,527 + 1 skip) + build in
  its tree; supervisor full suite on rust-main runs post-fold (doubles
  as the wind-down suite). Worker: sonnet, 33.1 min, 3 commits.
  **Scout correction from the sweep:** 10 (not 5) CBM_TABLE_EFFECTS
  members have zero real Gen-3 moves — the batching doc's §4 list plus
  EVASION_UP_2, EVASION_DOWN_2, SPECIAL_DEFENSE_DOWN, SPECIAL_DEFENSE_UP,
  SPEED_UP (base variants; their _2 siblings do carry moves). Verified
  against moves.json.
- **M5d batching scout folded (`b651742a`):**
  `docs/rust-m5d-checkviability-batching.md` — CheckViability (9516
  lines, 122 table effects, TS-side 598/598 complete) partitioned into
  **M5d-0 (preamble+shared infra) then M5d-1..5** (13/29/30/22/28
  effects, sum script-verified) with exact dispatch/handler/test ranges.
  Key scout verdicts, supervisor spot-verified: CV does NOT reuse CBM's
  draw plumbing (zero nextGetAbilityDraw hits — re-implements the
  cascade inline; a TS duplication to preserve, not fix); Flatter
  (M5d-5) calling Confuse (M5d-3) is the ONE cross-batch dependency
  (Swagger rides with Confuse in-batch); CBM's Curse→BulkUp /
  PsychUp→Haze reuse pairs do NOT transfer (independent CV bodies);
  ~half the 90 dispatched handlers have NO ground-truth-doc backing
  (both the module header and factory-ai-checkviability-ground-truth.md
  are stale ~22-handler snapshots) — future workers go straight to
  data/battle_ai_scripts.s. 89/122 EFFECT_* consts already exist in
  factory_ai_check_bad_move.rs. Worker: sonnet, 21.4 min, 1 commit,
  docs-only.
- **Wind-down gates (this tree, supervisor-run, post-M5c):** cargo
  **335/335** + fmt/clippy clean + wasm build, artifact rebuilt, parity
  union (rng+damage+turn+rental+partyMember+aiMask+aiCbm) **757/757 in
  wasm mode** (default mode covered inside the full suite), full npm
  test **977 files / 9,527 passed / 1 pre-existing skip**, npm build
  green, soak **vanilla 20/20 OK** + **full 60/60 OK**. No orphan
  worker worktrees or branches; RUST_DEFERRED.md has no open entries.
- **M5d-0 DONE (fold `3ece0829`):** `factory_ai_check_viability.rs` —
  unified `FactoryAiCheckViabilityBattler` (42 fields, recounted =
  scout), `CheckViabilityDraw` 62 variants over a shared flat
  101-leaf `CvDrawKind` enum (worker recount: **136** distinct TS leaf
  kind strings vs scout's "~85" — documented in-module; several TS
  members union multiple numbered kinds), `next_draw`, CV-specific
  stale-funcResult maps + 3 helpers (ability side reuses CBM's pub fn),
  33 new EFFECT consts appended to CBM's block (spot-verified against
  battle_move_effects.h), CV_TABLE_EFFECTS[122] + probe machinery +
  dispatcher shell with NotYetPorted trailing barrier and zero-score/
  funcResultCarry fallthrough. MAX_CHECK_VIABILITY_DRAWS = 8
  (deliberately conservative; proven single-pass worst case in
  EvasionUp is 7 — M5d-2 re-verifies). **Worker scoping judgment,
  supervisor-verified correct:** Result stays 2 variants
  (Scored/NotYetPorted) — TS's own "unsupported-branch" has exactly ONE
  emission site (the trailing barrier, :7205, dead at 122/122), so
  NotYetPorted IS that variant; the scout's "2 + a 3rd" phrasing was
  confused. 14 native tests + 41 shell vector rows
  (gen-cv-shell-vectors.mjs, byte-idempotent). Supervisor rerun: scope
  clean, cargo **350/350** + fmt/clippy + wasm, generator
  byte-idempotent, funcResultCarry pass-through re-derived from TS
  independently (fallback present→carried, absent→absent; table-effect
  sanity proves shell vectors can't cover them). Post-fold: artifact
  rebuilt, smoke 375/375. Worker: sonnet, 21.6 min, 1 commit.
- **M5d-1 DONE (fold `4d9abe50`):** 13 effects (Sleep, SpeedDown+_2,
  SpeedDownFromChance→SpeedDown delegation ported as a call, Toxic+
  LeechSeed, Protect, Pursuit, HighCrit+BlazeKick+PoisonTail, AlwaysHit,
  VitalThrow — the last three are the module's CV-only handlers).
  unported = 109, pinned. 47 native tests (roll seeds FOUND via a
  find_seed search, not hand-picked) + 111 TS-generated vector rows with
  per-draw site/rng/funcResultAfter assertions (gen-cv-m5d1-vectors.mjs,
  byte-idempotent). Worker quirk findings: HighCrit's fallthrough burns
  1-or-2 draws depending on the first roll; AlwaysHit's ScoreUp1 does
  NOT short-circuit (falls into the second roll); Protect's
  EFFECT_ID_IN_WEATHER_RANGE map needed 2 file-local consts (EFFECT_HIT=0,
  EFFECT_POISON_HIT=2) the M5d-0 const inventory missed. Supervisor
  rerun: scope clean, cargo **384/384** + fmt/clippy + wasm, generator
  byte-idempotent, 2 rows re-derived independently (Protect roll-1 +1
  with funcResultAfter=0; Karate Chop vs Ghost immune 2-draw
  fallthrough) — exact. Post-fold: artifact rebuilt, smoke 375/375.
  Worker: sonnet, 29.0 min, 1 commit.
- **M5d-2 DONE (fold `9a849279`):** 29 effects, all three shared-tail
  clusters (run_cv_stat_down, run_cv_attack_style_stat_up,
  run_cv_side_screen_type_gate). unported = 80, pinned. 56 native
  tests + 208 vector rows (gen-cv-m5d2-vectors.mjs, byte-idempotent).
  **EvasionUp worst case proven 7, not 8** (site 1 needs hp≥90, site 8
  needs hp∈[40,70] — disjoint, exhaustively checked 0-100;
  MAX_CHECK_VIABILITY_DRAWS stays 8 per brief). Design note, verified
  behaviorally identical by supervisor re-derivation: TS's one-line
  pass-through wrappers (runCvDefenseDown etc.) collapsed into
  selector-driven shared-tail dispatch. 6 of 29 effects vestigial
  (SPEED_UP, SPECIAL_DEFENSE_UP, SPECIAL_DEFENSE_DOWN base variants +
  EVASION_UP_2/ACCURACY_DOWN_2/EVASION_DOWN_2), live-verified.
  Supervisor rerun: scope clean, cargo **441/441** + fmt/clippy + wasm,
  generator byte-idempotent, 2 rows re-derived independently (Tickle
  through the DefenseDown shared tail −2; Double Team toxic-pair 2-draw
  chain) — exact. Post-fold: artifact rebuilt, smoke 375/375. Worker:
  sonnet, 31.8 min, 2 commits.
- **M5d-3 DONE (fold `d583e526`):** 30 effects (weather trio with
  SunnyDay/Hail sharing weather_setter_cv_score and RainDance's own
  diverging body kept separate; heal family; OHKO as an inline arm;
  SelfKO for Explosion+Memento; SemiInvulnerable 129-line handler;
  Confuse kept pub(crate) for M5d-5's Flatter; Swagger delegates to
  run_cv_confuse; Counter). unported = 50, pinned. ~130 native tests +
  181 vector rows (gen-cv-m5d3-vectors.mjs, byte-idempotent), incl. the
  weather stale-funcResult collision cases exercising M5d-0's maps
  end-to-end. **Port finding, supervisor-confirmed independently:**
  AI_CV_SemiInvulnerable5's tryEncourage tail returns its own fresh
  draws array, silently DROPPING the speed-tie draw's receipt while
  keeping its rng advance (TS :2180-2198; calls 2, draw_count 1,
  surviving ordinal 2) — caught by the differential vectors mid-port,
  replicated bug-for-bug. Supervisor rerun: scope clean, cargo
  **528/528** + fmt/clippy + wasm, generator byte-idempotent, 2 rows
  re-derived independently (Fly tie-draw dropped-receipt; SunnyDay
  stale-fallback carry) — exact. Post-fold: artifact rebuilt, smoke
  375/375. Worker: sonnet, 38.6 min, 1 commit.
- **M5d-4 DONE (fold `116f1e74`):** 22 effects (BrickBreak, shared
  ChargeUpMove ×4, Overheat, Facade, Curse and PsychUp with their OWN
  independent bodies — the CBM reuse shortcuts verifiably don't
  transfer, MirrorCoat 91-line 7-roll handler, DragonDance, BatonPass,
  KnockOff, FocusPunch, Revenge, Superpower, MagicCoat, Foresight,
  Endeavor, Encore, HealBell, Substitute 107-line handler). unported =
  28 (M5d-5's set), pinned; barrier probe moved to EFFECT_TRICK. 74
  native tests + 153 vector rows (gen-cv-m5d4-vectors.mjs,
  byte-idempotent; all 153 matched first-run). Worker findings: Encore's
  EncouragedMovesToEncore = 61 raw effect ids (most have no EFFECT_*
  const here — inline literals with name comments, header-sourced);
  MagicCoat roll site 3 is dead code in the compiled ROM, ported
  faithfully; protect_last_move_effect_func_result is genuinely shared
  by Protect/Encore/Substitute in TS. Supervisor rerun: scope clean,
  cargo **601/601** + fmt/clippy + wasm, generator byte-idempotent, 2
  rows re-derived independently (MirrorCoat low-hp 4-roll chain +3;
  Curse neutral-stage 3-roll +2) — exact. Post-fold: artifact rebuilt,
  smoke 375/375. Worker: sonnet, 29.4 min, 2 commits.
- **M5d-5 DONE (fold `8be982df`) — CheckViability is 122/122 native;
  the M5d program is COMPLETE.** All 28 remaining effects (Trick,
  Snatch 94-line closer, MirrorMove, Haze, the MudSport/WaterSport
  same-function pair proven identical through both arms,
  Flatter→run_cv_confuse cross-batch delegation proven through the
  dispatcher, ChangeSelfAbility's inline ability cascade ported
  bug-for-bug — NOT CBM's plumbing, both vestigial handlers pub(crate)
  + direct-call tested). `unported_cv_table_effects()` = [];
  completeness probe flipped to the all-ported arm; ZERO
  #[allow(dead_code)] attributes remain on Draw variants/kinds; 4
  stale intermediate-state barrier pins updated (the M5b-3 precedent).
  320 native tests + 88 dispatcher + 9 vestigial direct-call vector
  rows (gen-cv-m5d5-vectors.mjs, byte-idempotent). **Port finding,
  supervisor-confirmed live:** run_cv_haze never increments `ordinal`
  between its two draw sites — both draws carry the SAME ordinal label
  while rng advances twice; bug-for-bug. Supervisor rerun: scope clean,
  cargo **662/662** + fmt/clippy + wasm, generator byte-idempotent, 2
  rows re-derived independently (Haze both-blocks repeated-ordinal;
  SkillSwap known-Static 1-draw) — exact. Worker: sonnet, 33.9 min,
  3 commits.
- **M5e DONE (folds `8786b4de`/`c662b8af`) — CheckViability boundary,
  adapter, and parity.** Additive ABI-v1 `fw_run_check_viability` uses a
  236-byte fixed input prefix plus UTF-8 `reasonPrefix`: two complete
  108-byte, 42-field battlers preserve every optional's presence. The
  variable output preserves final RNG, optional `funcResultAfter`, score,
  and every typed draw receipt. `factoryAiEngine.ts` now has a genuine WASM
  path; `factoryAiCheckViabilityParity.test.ts` has 9 tests, a 122-effect
  census, and 672 runnable seeded cases across 112 source-addressable
  effects. Directed cases pin max-seven draws, stale carry/collisions,
  Haze's repeated ordinal, SemiInvulnerable's dropped receipt with retained
  RNG advance, UTF-8 reasons, and both caller errors. Supervisor reran scope
  audit, cargo **662/662** + fmt/clippy + wasm, new suite **9/9 BOTH modes**,
  prior WASM union **757/757**, post-fold smoke **375/375**. Worker:
  gpt-5.6-terra/max, ~45 min, 2 commits.
- **M5f-1 DONE (folds `c03a6876`/`305708c2`) — TryToFaint native.**
  Complete 275-line leaf port in `factory_ai_try_to_faint.rs`; it reuses
  the shared damage/type/RNG modules and exposes DecisionPolicy-ready
  battler/target/input/result structs. Six directed native tests + 93
  TS-executed scored vectors (64 seeded) + 2 exact-error vectors; generator
  rerun byte-identical. Source quirks pinned: per-slot simulated RNG reuse,
  the sole optional x4 draw and >=80 fallthrough +2, Explosion +0, Quick
  Attack +6, strict sibling comparison, power-other behavior, unknown
  sibling zero vs unknown considered panic, and Levitate/Ground loop skip.
  Supervisor re-derived Pound's 19-HP KO and the x4 calls 4→5/ordinal-17
  receipt from TS, then reran cargo **670/670** + fmt/clippy + wasm. Post-fold
  artifact 253,573 bytes (`74b778ce…`), smoke **375/375**. Worker:
  gpt-5.6-terra/max, ~26 min, 2 commits; scope six `core-rs/**` files only.
- **M5f-2a DONE (fold `2b09c068`) — mask-zero DecisionPolicy native.**
  Added the pure typed setup, mask-zero chooser, and shared best-score/tie
  seam. It preserves all four unconditional setup draws, the unconditional
  fifth tie draw even for one legal move, 100/0 scores, legal target identity,
  mask receipt, and exact typed-reachable errors. The checked-in TS-executed
  corpus has **113 success + 22 error** cases across every nonempty legal-slot
  subset, targets, seeds/cursors, mask rejection, request/legality guards, and
  one documented typed-only empty-list guard. Supervisor scope audit was
  exactly five `core-rs/**` files; generator reran byte-identically
  (`290b78f6…`); cargo **674/674** + fmt/clippy/wasm passed. After merging
  current master, artifact = 253,791 bytes (`034833c1…`) and smoke =
  **375/375**. Worker: gpt-5.6-terra/max, ~18 min, 1 commit.
- **M5f-2b DONE (folds `5deb6ff9`/`34cead26`) — scored masks 1/7 native.**
  Added the pure typed scored chooser, reusing the landed setup/tie seam and
  all three leaf scorers. It preserves logic-ID-major whole-slot passes,
  optional decision-owned turn-start draw, authoritative legal targets,
  every delta and final score, and the shared stale `funcResult` channel from
  the last writing TryToFaint slot across the complete CheckViability pass.
  Four direct tests + a TS-executed corpus of **45 success + 13 error** cases:
  all 15 nonempty legal subsets under both masks, winners/ties, multiple
  seeds/cursors, CBM/TTF/CV choice influence, x4, draw-heavy and turn-owner
  paths, stale preserve/overwrite, mask/request/legal and unknown-move errors.
  Full retained result/trace receipts are field-hashed on both sides.
  Supervisor audited exactly five `core-rs/**` files, reran generator
  byte-identical (`b3b483de…`), cargo **680/680** + fmt/clippy/wasm, and
  independently checked the mask-7 `[104,104,104,89]` directed score vector.
  Worker full npm = **999 files / 9,620 passed / 1 skip** + build; post-fold
  current-master artifact = 253,842 bytes (`86b488d6…`), smoke **375/375**.
  Worker: gpt-5.6-sol/high, ~29 min, 2 commits.
- **Prior wind-down gates (this tree, supervisor-run):** cargo
  **662/662** + fmt/clippy clean, artifact rebuilt (final hash
  9d53f91e…), parity union (7 suites) **757/757 in wasm mode**, smoke
  375/375. Full npm test **977 files / 9,527 passed / 1 pre-existing
  skip**, npm build, soak **vanilla 20/20** + **full 60/60** were all
  recorded post-M5c this session; every fold after M5c was
  core-rs/-only (plus one rust-lane docs commit), so the TS side is
  bit-identical to those runs. No orphan worker worktrees or branches;
  RUST_DEFERRED.md has no open entries.
- **Next:** M5f-3 — add the final DecisionPolicy WASM boundary, adapter, and
  both-mode family parity for mask 0/1/7. Re-check TS conflicts before brief,
  then run the full wind-down gates and soaks if M5 closes.
- **Notes:** worker moved one M5b-0 test's "still-unported power≤1"
  example pin from Psywave (now handled) to Mean Look — the exact
  staleness pattern the TS doc comment warns about for its own
  generic-barrier pins; M5b-2/3 workers will do the same dance.

---

## R3 — [supervised session, 2026-08-11 eve] **M4 COMPLETE + M5 opened: battle-kernel family end-to-end; AI family scouted and groundwork folded**

- **State:** rust-main = master (merged at orient, fast-forward) + the
  verified M4a fold `71465dd2`. **M4a DONE:** all 13 exported
  functions/consts of `src/engine/damageCalc.ts` ported in source order to
  `core-rs/crates/factory-core/src/damage_calc.rs` (i32 arithmetic
  matching the C s32 widths, truncation order preserved, the pokemon.c:3371
  unconditional `+2` included), with 9 hand-written native tests (both
  RAM-pinned regressions carried over: Rock Slide 32→48→42, corrected
  Fury Cutter base=4) + 1129 TS-generated vector rows
  (`core-rs/tools/gen-damage-vectors.mjs` → checked-in
  `damage_vectors_gen.rs`, byte-idempotent, regeneration command in
  header). Supervisor verification: scope clean (5 files, all core-rs/),
  cargo **82/82** + fmt/clippy clean + wasm build OK rerun independently,
  generator rerun byte-identical, 2 vector rows re-derived from the TS
  module by hand (directed huge_power + sweep_0), type chart re-checked
  against src/data/gen/type-effectiveness.json (111 rows − 1
  TYPE_FORESIGHT sentinel = 110 embedded). TS-side baseline on this tree:
  full npm test **957 files / 9,153 passed / 1 pre-existing skip**, build
  green.
- **Did:** session opened per docs/rust-m4-battle-kernel-scout.md (user
  decision: battle-kernel leaf family first). Fresh conflict check at
  orient: zero ISSUES.md hits for damageCalc/turnOrder/turnRng; main lane
  is in #55 m4a-audio territory (unrelated namespace), animation lane in
  reducer coverage. M4a worker (sonnet-5, 90-min cap) finished in ~50 min.
- **M4b DONE (fold `d0039740`):** 12 new `fw_` exports (ABI v1 unchanged;
  fixed-width documented LE buffers: DamageCalcInput 117 B = 2×48 B
  battlers + 21 B top-level, AccuracyCalcInput 26 B, type-effectiveness
  8 B output); TYPE_EFFECTIVENESS_TABLE promoted out of the vector file
  into `gen_tables.rs` (codegen-owned by gen-data.mjs, sourced from
  type-effectiveness.json) so no 110-row table crosses the ABI; new
  `core-rs/adapter/damageEngine.ts` (TS default / POKEBENCH_ENGINE=wasm
  opt-in, strings→ids TS-side); `tests/damageCalcParity.test.ts` 14
  batched blocks (18×18 type grid, stage grids, ~230 base-damage cases,
  crit/STAB/endeavor/multiplier/accuracy sweeps). Boundary scoping
  decision, documented both sides: `activeBattlerAbilities` (doubles-only
  Plus/Minus field scan) is NOT encodable at this boundary — adapter
  throws if set; the singles default pairing IS the full field, and M4a's
  native hand tests cover the scan. Supervisor rerun: cargo **91/91** +
  fmt/clippy, artifact 68,963 B, damageCalcParity **14/14 in BOTH modes**,
  existing parity files 440/440 in wasm mode, smoke 375/375, both codegen
  scripts byte-idempotent. Worker also ran full npm test green twice
  (958 files / 9,167 passed / 1 skip); supervisor's one full-suite run
  happens at wind-down per the standing cadence.
- **M4c DONE (fold `ffd9cfbf`):** `turn_order.rs` (effective_speed,
  get_who_strikes_first, sort_battlers_by_turn_order; reuses damage_calc's
  STAT_STAGE_RATIOS; ids verified: SWIFT_SWIM=33, CHLOROPHYLL=34,
  MACHO_BRACE=24, QUICK_CLAW=26) + `turn_rng.rs` (7-step/12-call ledger
  over GbaRng, u8-discriminant step enum); gen-turn-vectors.mjs → 204
  checked-in rows + 27 hand-directed native tests; 4 new fw_ exports
  (incl. a self-describing variable-length sort buffer);
  `core-rs/adapter/turnEngine.ts`; `tests/turnOrderParity.test.ts` 206
  tests. Supervisor rerun: cargo **126/126** + fmt/clippy, generator
  byte-idempotent, turnOrderParity 206/206 default mode, full parity
  union **660/660 in wasm mode**, smoke 375/375; Quick Claw
  threshold-boundary pair + speed-tie parity re-derived from the TS
  module by hand.
- **M5 scout folded (`1f2f36cb`):** `docs/rust-m5-scout.md` — next family
  is the **Factory AI move-scoring leaves** (maskSelection → CheckBadMove
  → boundary → CheckViability in effect-group batches → TryToFaint +
  DecisionPolicy). factorySwap (state fused with #55-adjacent ball-anim
  presentation), round-policy consumers (= opponent selection, the R2
  exclusion), and draft-screen (no separable state core) all REJECTED
  with receipts. Supervisor re-verified: zero ISSUES/PROGRESS hits for
  factoryAi*, maskSelection imports only the policy JSON.
- **M5a DONE (fold `1e0731b3`):** `factory_ai_mask.rs`
  (select_factory_ai_mask + receipt, branch id as #[repr(u8)]
  discriminant; policy JSON codegen-validated into gen_tables so the
  no-branch-matched failPolicy is provably unreachable → documented
  .expect(); the 4 RangeError sites ported as FactoryAiMaskError with
  the documented quirk that Rust's u8/u32 inputs exclude TS's
  negative/NaN triggers — upper-bound violations remain) + 529
  TS-generated success vectors + 8 error-site vectors + **MOVES 355-row
  codegen table** (effect ids parsed from battle_move_effects.h, target/
  flag bits from battle.h:46-53 / pokemon.h:208-213). Supervisor rerun:
  cargo **145/145** + fmt/clippy, both generators byte-idempotent,
  FOCUS_PUNCH row cross-checked JSON↔table↔header (effect 170,
  priority −3), tent+brain mask case re-derived from TS by hand.
- **Wind-down gates (this tree, supervisor-run):** cargo **145/145**,
  fmt/clippy clean, artifact rebuilt 80,342 B, parity union
  (rng+damage+turn+rental+partyMember) **660/660 in BOTH engine modes**,
  smoke 375/375, full npm test **959 files / 9,373 passed / 1
  pre-existing skip**, npm build green, soak **vanilla 20/20 OK** +
  **full 60/60 OK**. No orphan worker worktrees or branches;
  RUST_DEFERRED.md has no open entries.
- **M5b batching scout folded (`5142f3f8`):**
  `docs/rust-m5b-checkbadmove-batching.md` — the CheckBadMove port is now
  a mechanical four-step program: **M5b-0** (preamble + shared infra:
  nextGetAbilityDraw/checkAbilityAiTarget/typeMultiplierTenths +
  completeness-probe machinery + NotYetPorted trailing barrier), then
  **M5b-1** (HighRisk cluster + weather + zero-RNG singles, 32 effects),
  **M5b-2** (RNG-gated status/stat-DOWN, 33 effects, largest), **M5b-3**
  (stat-UP/screens/singles, 44 effects, cheapest) — each with exact
  dispatch/handler/test line ranges, shared-handler clusters kept whole,
  and the module's quirks enumerated (never-caching ability draws,
  abilityDummyVariable collapse, stale-funcResult weather bug,
  computeAiEffectiveness x0→1 clamp, vestigial dispatches needing
  direct-handler tests, CURSE→BulkUp / PSYCH_UP→Haze same-function
  pairs). Supervisor spot-verified handler/clamp line ranges and the
  109 = 32+33+44 partition.
- **M5b-0 DONE (fold `b8a8eae0`):**
  `factory_ai_check_bad_move.rs` — 113 EFFECT_* consts verified
  line-by-line against battle_move_effects.h + 13 ABILITY_* consts
  (representation decision: abilities cross numerically, same id space
  as gen_tables::SpeciesRow.abilities); data heads (weather collision
  table, IGNORED_POWERFUL_MOVE_EFFECTS, trapper/negating/soundproof
  sets, ids verified against the JSONs); full Target/Attacker/RoarTarget
  structs (28/29/1 fields — the batching doc's 22/27 counts were stale);
  never-caching next_get_ability_draw + check_ability_ai_target
  (dummy-variable collapse) + type_multiplier_tenths; completeness-probe
  machinery (CBM_TABLE_EFFECTS[109], empty handled union,
  unported_cbm_table_effects, first_move_id_with_effect,
  Result::NotYetPorted trailing barrier); run_check_bad_move_preamble
  (immunity −10, FISSURE/HORN_DRILL short-circuit, 5 ability-negation
  branches, Soundproof, soundproofGuess stale-funcResult exposure). 29
  native tests + 48 TS-generated scored-case vectors
  (gen-cbm-preamble-vectors.mjs, byte-idempotent). **Worker scoping
  correction, verified live:** TS is 109/109 so its preamble never emits
  barrier results — NotYetPorted coverage is native-hand-test-only;
  TS-differential vectors use preamble-exit and non-table-effect flows.
  Supervisor rerun: cargo **175/175** total, fmt/clippy(--all-targets)
  clean, wasm build green, generator byte-identical, EFFECT consts
  spot-checked against the header, type-immunity case re-derived from TS
  by hand (scored −10, rng untouched, 0 draws — exact match).
- **Next:** M5b-1 (HighRisk cluster + weather + zero-RNG singles, 32
  effects), then M5b-2/M5b-3 (independent), per
  docs/rust-m5b-checkbadmove-batching.md — each batch adds its
  CBM_HANDLED_EFFECTS const + handler-direct tests + TS-differential
  vectors (now derivable per batch since handlers exist TS-side), and
  shrinks the pinned unported set. Then M5c boundary+adapter+parity.
  Re-verify scout conflict checks at orient per the standing M4+ rule.
- **Notes (ops):** the two parity suites HARD-FAIL under plain `npm test`
  in a tree whose gitignored `artifacts/wasm/factory_wasm.wasm` is
  present but STALE (absent → skip; stale → 204 failures, seen live this
  session when the R2-era 62,344 B artifact met the M4 suites). Recipe:
  `./core-rs/build-wasm.sh` before any full suite in a supervisor tree —
  exactly what launcher hardening `aabaff6f` does for main-supervisor
  folds. Artifact hash is reproducible per source state but shifts with
  any factory-core change (M5a moved it despite no fw_ change).
- **Notes:** worker-reported TS quirks worth keeping: (1) Plus/Minus only
  boosts spAttack, never attack (damageCalc.ts:371-376) — dead weight on
  physical moves; (2) CritChanceInput.attackerSpecies declared but never
  read (:492 vs :499-511) — isChansey/isFarfetchd pre-resolve it; not
  ported; (3) Wonder Guard has no row in type-effectiveness.json (out of
  scope per the TS header); (4) the JSON's TYPE_FORESIGHT/TYPE_FORESIGHT
  sentinel row is excluded from the Rust embed (can never match real ids).
  Random sweeps include physically-unreachable flag combos (isBurned
  without hasStatus1) — deliberate: both engines get identical inputs and
  TS treats them as independent booleans.

---

## R2 — [supervised session, 2026-08-11] **M1→M3d landed: ABI, adapter, rental generation AND mon construction differential-green**

- **State:** **M1, M2, and the FULL M3 vertical slice (rental generation
  + mon construction, M3a–M3d) are DONE and folded into rust-main.**
  master merged in at session start; six worker folds, every one
  gate-verified by the supervisor before merging. Wind-down union gates,
  supervisor-run on rust-main: cargo **62/62** + fmt/clippy clean, wasm
  artifact 62,344 B, parity specs **440/440** (77 party-member + 290
  rental + 73 rng) in BOTH default and POKEBENCH_ENGINE=wasm modes, full
  npm test **950 files / 9,123 passed / 1 pre-existing skip**
  (tests/animation/hypnosisEvidence), soak **vanilla 20/20 OK** and
  **full 60/60 OK**. No file under src/ or tools/ was modified all
  session; tests/ gained exactly the three lane-created parity files.
  **M3c (mon-construction data groundwork) is also folded:** codegen
  extended additively (FRONTIER_MONS moves+ev_flags, MOVE_PP 355,
  held-item hold effects, SPECIES 376 rows with base
  stats/gender/abilities/exp@50, NATURE_MODIFIERS) plus stats/gender/
  shiny/EV helper ports — 52 native tests, idempotent, supervisor
  re-verified row samples (LUDICOLO species row + entries[400]
  moves/ev-mask) against the JSON independently. SPECIES is deliberately
  scoped to the 376 frontier-referenced species (25 SPECIES_OLD_UNOWN_*
  rows lack exp entries; check verified: 0 referenced species missing).
  - **M3d:** `create_factory_corpus_party_member`/`_party` ported
    (ability-slot taken from the instance per the TS spec — NOT
    `ability_slot_for_personality`, which is the generation-time
    derivation); `fw_create_factory_party_member` 91-byte documented
    boundary; decoder + `tests/factoryPartyMemberParity.test.ts` — full
    882-set sweep, 72-config variation block, error parity, party
    triple.
  - **M3a:** `core-rs/tools/gen-data.mjs` codegen → checked-in
    `gen_tables.rs` (882 frontier mons, 63 held items, 411
    species-second-ability, 25 natures, round policy), deterministic +
    idempotent (supervisor re-sampled rows 0/400/777/881 against the
    JSON independently); helper ports in `rental_data.rs` with
    TS-pinned tests. Worker added `core-rs/rustfmt.toml`
    (struct_lit_width=80) to keep generated rows one-line.
  - **M3b:** `rental_generation.rs` — faithful port incl. the
    curr_species stateful-retry quirk; `fw_generate_initial_rentals`
    LE-buffer boundary (layout doc'd in factory-wasm);
    `core-rs/adapter/factoryEngine.ts` decoder;
    `tests/factoryRentalParity.test.ts` with the FULL 288-config matrix
    (16 seeds × 3 winStreaks × 3 rentsCounts × 2 construction cursors)
    deep-equal on complete results including the draw ledger, plus
    challenge-8 error parity and the seed-0 fixture anchor. **Port
    finding:** TS deliberately throws on challengeNum 7 + better-range
    fixed IV (the documented retail-OOB non-portability boundary,
    factoryRentalGeneration.ts:184); the port mirrors the error and the
    matrix compares errors symmetrically.
  - **M1 (fold da8d5aee):** fw_ ABI v1 surface (fw_abi_version/
    fw_rng_advance/fw_rng_output/fw_alloc/fw_free), `core-rs/build-wasm.sh`
    → `artifacts/wasm/factory_wasm.wasm` (gitignored), hand-written typed
    Node loader `core-rs/adapter/loadFactoryWasm.ts`, smoke
    `core-rs/adapter/smoke.mts` pinning the wasm rng stream to the
    TS-generated values. One in-territory deviation: narrowly-scoped
    `#[allow(clippy::should_implement_trait)]` on `GbaRng::next` (mirrors
    the TS name deliberately).
  - **M2:** engine adapter `core-rs/adapter/rngEngine.ts` (TS default,
    `POKEBENCH_ENGINE=wasm` opt-in) + `tests/rngEngineParity.test.ts` —
    spec conformance parameterized over both engines, 64-seed ×
    1024-step differential sweep, ABI pin. Artifact-absent worktrees skip
    the wasm half (verified 4 passed/69 skipped); opt-in without the
    artifact hard-fails naming build-wasm.sh. No existing TS file
    modified; tsconfig untouched (adapter enters the tsc program via the
    test's import).
- **Did:** **M1 decision — hand-rolled C ABI; wasm-bindgen declined on
  merits, not necessity.** Receipt: network IS available in this session
  (crates.io CDN probe 2026-08-11: HTTP 200, 184,119 bytes for the
  wasm-bindgen 0.2.92 crate download), so the choice was free. Rationale:
  (a) preserves factory-core/factory-wasm's zero-dependency, fully-offline
  build — a property future sandboxed sessions rely on; (b) avoids the
  wasm-bindgen-cli install and its crate↔CLI version-locking; (c) the data
  crossing the boundary is fixed-width GBA-shaped structs (mons, seeds,
  ids), naturally expressed as documented little-endian byte layouts, not
  rich dynamic types; (d) the JS glue is a small hand-written loader we
  own. **Revisit trigger:** if the boundary ever genuinely needs dynamic
  types (strings/maps/callbacks), reopen the decision with wasm-bindgen as
  the candidate — record here first.
  **ABI conventions v1:** all exports prefixed `fw_`; `fw_abi_version()
  -> u32` (starts at 1, bumps on any breaking layout change); scalars
  cross as u32; structured data crosses as caller-allocated
  length-prefixed LE byte buffers via `fw_alloc(len) -> ptr` /
  `fw_free(ptr, len)`; every layout is documented in factory-wasm doc
  comments and mirrored by the TS-side decoder next to the adapter.
- **Next:** M4 expansion, port by family with the harness deciding
  done-ness. The natural candidates (opponent selection in
  `factoryRoundBattleOrchestrator.ts`, anything near
  `factoryConstructionClock.ts`) are ALL #55-adjacent modules the TS
  lane has open — per the sequencing rule they stay unported until TS
  closes and wires the clock. Conflict-free M4 openers to scout next
  session: `factoryDraftStateAdapter`/draft-screen state, swap-flow
  policy (`factory-round-policy.json` roundFlow), or the battle-kernel
  leaf families (type chart, damage stages) after checking ISSUES.md
  afresh. Keep following the M2/M3 pattern: codegen-data step, then
  port+boundary+parity step. **Resolved by user decision 2026-08-11
  (recorded by the planning session): open M4 with the battle-kernel
  leaf family — see the M4 bullet in RUST_SUPERVISOR.md and
  `docs/rust-m4-battle-kernel-scout.md`.**
- **Notes:** clippy/fmt gates are ON as of M1. Session ops findings:
  (1) the shared OFF oracle at :8014 was killed mid-session by a
  process-group sweep (its log ended mid-line at "listening"); restart
  recipe that survives: spawn `run-oracle.sh --profile battle-scene-off`
  via `python3 subprocess.Popen(..., start_new_session=True)` — plain
  nohup+disown from a tool shell did NOT survive. Rust-lane workers
  never query the oracle; it is only a run-subagent launch precondition.
  (2) A failed launch leaves a dead worker worktree + branch — remove
  exactly that timestamped pair before relaunching. (3) TS quirk
  discovered by the M3b port, worth knowing when reading parity output:
  challengeNum 7 + better-range fixed IV deliberately throws in TS
  (documented retail-OOB boundary, factoryRentalGeneration.ts:184); the
  parity matrix compares errors symmetrically there.

## R1 — [solo session, 2026-08-11] **Lane born: scaffold + rng port proven**

- **State:** `core-rs/` exists and is green: cargo workspace,
  `factory-core` (Gen-3 LCG ported from `src/engine/rng.ts`, 4/4 tests),
  `factory-wasm` C-ABI stub, wasm32 release build produced a 448-byte
  artifact. Zero dependencies; builds and tests fully offline. No TS
  file was modified. No supervisor runs have started in this lane yet.
- **Did:** user decisions recorded: repo restructured to
  `pokeemerald-factory-core` (workspace/ layout, warm-bison history
  promoted); Rust chosen for the rewrite; TS stays canonical until the
  user archives it; animation lane continues in TS by explicit decision
  (discovery transfers, see RUST_SUPERVISOR.md). Expected rng values
  were generated from the TS implementation
  (`node --experimental-strip-types` over `src/engine/rng.ts`), not
  hand-computed.
- **Did (addendum):** lane fully wired into the launchers —
  `./run-supervisor.sh -l rust` (persistent `.worktrees/rust-main`
  worktree, branch `rust-main`, OFF oracle only, gate file
  `RUST_DEFERRED.md`) and `./tools/run-subagent.sh --lane rust` (fresh
  `worker/rust-*` worktrees, OFF profile). Verified via `--print-config`
  for rust/animation/bogus on both launchers; the main supervisor's
  prompt now folds `rust-main` at orients alongside `animation-main`.
- **Next:** M1 (boundary decision: wasm-bindgen vs hand-rolled ABI +
  Vite-consumable artifact path), then M2 (vitest engine adapter, rng
  spec running against both engines). See the milestone ladder in
  RUST_SUPERVISOR.md.
- **Notes:** cargo is NOT on the login PATH — use
  `export PATH="$HOME/.rustup/toolchains/stable-aarch64-apple-darwin/bin:$PATH"`;
  `rustup run stable cargo` fails in sandboxed non-interactive shells
  ("could not execute process `rustc -vV`"). wasm32-unknown-unknown
  target is already installed.
