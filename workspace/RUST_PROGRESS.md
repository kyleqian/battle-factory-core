# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---


## R97 — [supervised session, 2026-09-12 03:06 UTC–, unattended] **M94 PPREDUCE folded (second green fold this session)**

- **State:** `rust-main` = R96 + `9bcbce5cf` M94 fast-forward + this
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

- **State:** `rust-main` = R95 + `0af6724cc` M93 fast-forward + this
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
  Sonnet worker folds this session — `d60845fbd` M90 copyarray,
  `6e3dbc305` M91 array-family trio, `94ec3c6ab` M92 multihit
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


