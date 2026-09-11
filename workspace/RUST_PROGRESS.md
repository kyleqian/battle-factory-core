# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---


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


## R94 — [supervised session, 2026-09-11 15:04 UTC–, unattended] **M91 array-family trio folded (second green fold this session)**

- **State:** `rust-main` = R93 + `6e3dbc305` M91 fast-forward + this
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

- **State:** `rust-main` = R92 + `d60845fbd` M90 fast-forward + this
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
