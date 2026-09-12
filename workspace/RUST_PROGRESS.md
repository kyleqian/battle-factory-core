# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---


## R99 — [supervised session wind-down (final), 2026-09-12 03:06-~05:50 UTC, unattended] **M96 hit-feedback family folded; session close (FOUR green folds)**

- **State:** `rust-main` = master (no-op merge at orient) + four verified
  Sonnet worker folds this session — `0af6724cc` M93 machine-control
  family, `9bcbce5cf` M94 PPREDUCE, `cdbbc7775` M95 ATTACKSTRING,
  `c236931bd` M96 HITANIMATION/EFFECTIVENESSSOUND — each followed by its
  ledger commit and a successful `backup-refs.sh` push. Tree clean,
  committed, green; no worker worktree or branch left behind. Core-only
  all session: no ABI, adapter, canonical TS, or npm file touched, so
  the main supervisor's fold is `core-rs/**` + `RUST_PROGRESS*.md`
  only. **112 of 215 TS opcode names ported.**
- **Did (this step):** worker (claude-sonnet-5, 50-min cap, one commit,
  21.8 min, $3.43, foreground gates) ported the two thin hit-feedback
  opcodes as `battle_script_hit_feedback_family.rs` — HITANIMATION 0x5C
  (`Cmd_hitanimation` battle_script_commands.c:5558-5576): NO
  controller-busy gate (pinned per the TS doc comment), the shared
  `resolveHitChainBattlerOperand` ladder (BS_TARGET/BS_ATTACKER/
  BS_FAINTED with verbatim role throws; other selectors -> the verbatim
  unsupported-branch Halt incl. `<missing>`), NO_EFFECT short-circuit,
  three-conjunct substitute suppression, no-duplicate pending + one
  HIT_ANIMATION event; EFFECTIVENESSSOUND 0x0E (`Cmd_effectivenesssound`
  :2001-2047): busy-gate-first Block, verbatim target-role throw, the
  two-tier (exact-match then bitwise) sound ladder over SE 12/13/14,
  play-se event + pending(target). **15 + 12 behavior + 4 registration**
  generated cases + 16 inline unit tests over the censuses (14 = 12
  BS_TARGET + 2 BS_ATTACKER; 18); corpus sha256
  `f2d8f29db05e23cd62f954270bb8a00dde7583f6d6a1e69804b56c85b76ecc1a`.
- **Next:** merge master, re-run the four Rust gates, then continue.
  Suggested scouts: ATTACKANIMATION 0x09 (the deliberately-skipped heavy
  sibling — call directive into BattleScript_Pausex20, anim counters,
  MOVES power, multihit interplay; hitChainOpcode.ts:2204-2296),
  HEALTHBARUPDATE (:2404+, prepareMessage + substitute message path),
  PRINTSTRING/WAITMESSAGE family. The attackstring/hit-feedback
  port-injection + event/pending modeling is the proven shape for all
  of these.
- **Notes:** supervisor audit walked both handler ladders, the resolver
  arms and all four verbatim error/construct texts, the two-tier sound
  ladder both directions, the no-busy-gate pin, and both censuses;
  independent regeneration byte-identical (generated Rust **28,820
  bytes**, sha
  `76cb9dbdcc2606bd505e8971d5bdb42903d6da9f7f85c0378f432f074f9b7d89`;
  generator **34,678 bytes**, sha256
  `142e0ed733c0cf228db693f077f1f7fcfa129d61d9422beaa88e61f1cfcc0936`).
  Worker note: `createEffectivenesssoundOpcodeHandler` is
  module-private, so the generator drives it through the registered
  handler map (registration exercised for real). Final gates on
  `rust-main`: **1,814/1,814** native (up from 1,730 at orient, +84
  across four leaves), fmt, strict workspace Clippy, wasm32 release;
  artifact **512,234 bytes**, sha256
  `e86f4b9d9b13507897e1015cf0acba4187501a2b82ac7345a732c7f604922e22`.
  Session-wide: four Sonnet workers (21.8-29.6 min, $3.43-$6.69,
  ~$17.84 total), four clean landings, ZERO cap expiries. R96 archived.
  No npm gate required; no deferral or barrier added. No PAPERCUT.

## R98 — [supervised session wind-down (final), 2026-09-12 03:06-~05:10 UTC, unattended] **M95 ATTACKSTRING folded; session close (three green folds)**

- **State:** `rust-main` = master (no-op merge at orient) + three verified
  Sonnet worker folds this session — `0af6724cc` M93 machine-control
  family, `9bcbce5cf` M94 PPREDUCE, `cdbbc7775` M95 ATTACKSTRING — each
  followed by its ledger commit and a successful `backup-refs.sh` push.
  Tree clean, committed, green; no worker worktree or branch left
  behind. Core-only all session: no ABI, adapter, canonical TS, or npm
  file touched, so the main supervisor's fold is `core-rs/**` +
  `RUST_PROGRESS*.md` only. **110 of 215 TS opcode names ported.**
- **Did (this step):** worker (claude-sonnet-5, 55-min cap, one commit,
  22.2 min, $4.18, foreground gates) ported 0x02 ATTACKSTRING
  (`Cmd_attackstring` battle_script_commands.c:1191-1203,
  `createAttackstringOpcodeHandler` battleScriptHitChainOpcode.ts
  :1308-1349) as `battle_script_attackstring.rs`: the lane's first
  controller-busy Block (canonical isControllerIdle = pending-list
  empty) and first prepareMessage port modeling — gate order busy >
  printed > print; the printed short-circuit (NO_ATTACKSTRING 1<<9 |
  ATTACKSTRING_PRINTED 1<<10) clearing only messageDisplayActive; the
  print path's canonical STRINGID_USEDMOVE payload as a total native
  function (scriptingBattler + actionSnapshot iff attacker role set,
  substitutions always empty — generator fails loudly if canonical TS
  ever adds a field); the unreachable-under-production null-port Block
  driven via injected stub; pc modeled as pure pass-through input.
  Generator exposes the private canonical `externalPorts()` via a
  mktemp scratch copy (src/ untouched, tree clean after regen).
  **21 behavior + 2 registration** cases + 9 inline unit tests over the
  135-site census; corpus sha256
  `ec4b7f719748803c7968ad09e688df19be2dadc7b7503323318ed57e38681733`.
- **Next:** merge master, re-run the four Rust gates, then continue.
  Suggested scouts for the next session: PRINTSTRING/PRINTSELECTIONSTRING
  + WAITMESSAGE (the attackstring prepareMessage/scheduler modeling now
  exists as the native precedent; check `battleScriptMachine.ts`'s
  waitstate/waitmessage ownership first), or further thin hit-chain
  siblings from `createBattleScriptHitChainOpcodeHandlers`' install list
  (hitChainOpcode.ts:4708+). Machine-control (M93) closed the
  GOTO/CALL/RETURN/END/END2/END3 gap; no scouted-but-unported leaf
  remains from prior sessions.
- **Notes:** supervisor audit walked the gate order, the payload shape
  pins, both Block shapes, and registration against TS both directions;
  independent regeneration byte-identical (generated Rust **23,886
  bytes**, sha
  `93f76a12f119afb5a7326bbb6f99037f760927c8f22c2f8949bf644fbbfc0796`;
  generator **25,772 bytes**, sha256
  `17ce4d512454441035c5590f84b140be6cf84e0d26a1acad84169edfa2aef9d3`).
  Final gates on `rust-main`: **1,790/1,790** native (up from 1,730 at
  orient, +60 across three leaves), fmt, strict workspace Clippy,
  wasm32 release; artifact **512,234 bytes**, sha256
  `8fa8f706b767fee9523b244985ab53c00f4f230b0c19fc3eb08613a7b377b23f`.
  Session-wide: three Sonnet workers (22.2-29.6 min, $3.54-$6.69,
  ~$14.41 total), three clean landings, ZERO cap expiries. R95
  archived. No npm gate required; no deferral or barrier added. No
  PAPERCUT.

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

