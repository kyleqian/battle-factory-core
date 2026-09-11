# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---


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


## R91 — [supervised session, 2026-09-11 03:05 UTC–, unattended] **M88 ACCURACYCHECK part 3/3 (absorb/Flash-Fire tail) folded — opcode complete**

- **State:** `rust-main` = R90 + `a02f4ef78` M88 fold (merge `ad11d5ec4`)
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
