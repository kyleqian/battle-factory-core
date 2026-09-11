# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---


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


## R92 — [supervised session wind-down (final), 2026-09-11 03:05-~05:15 UTC, unattended] **M89 ADDBYTE folded; session close (four green folds)**

- **State:** `rust-main` = master + four verified Sonnet worker folds this
  session — `4397eabfd` M86 accuracycheck bypass, `338b86785` M87
  full-formula, `a02f4ef78` M88 absorb tail (ACCURACYCHECK complete),
  `311c15284` M89 addbyte — each followed by its ledger commit and a
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
