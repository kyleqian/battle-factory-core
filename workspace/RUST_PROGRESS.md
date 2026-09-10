# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---


## R84 — [supervised session wind-down (final), 2026-09-10 03:01–~06:00 UTC, unattended] **M81 jumpifstatus pair + session close (five green folds)**

- **State:** `rust-main` = master (no-op merge at orient) plus five verified
  Sonnet worker fast-forwards this session — `b3d9cb554` M77 critcalc,
  `0bdd9dccd` M78 adjust-damage family, `5bb8fab60` M79 fixed-damage
  cluster (supervisor-repair commit), `1fe7c7104` M80 side-status family,
  `f016e17c0` M81 jumpifstatus/jumpifstatus2 — each followed by its ledger
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
  Sonnet worker fast-forwards this session — `b3d9cb554` M77 critcalc,
  `0bdd9dccd` M78 adjust-damage family, `5bb8fab60` M79 fixed-damage cluster
  (supervisor-repair commit), `1fe7c7104` M80 side-status family — each
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

- **State:** `rust-main` = master + M77 `b3d9cb554` + M78 `0bdd9dccd` + M79
  `5bb8fab60`, each verified and checkpointed (ledger commit +
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
  worker branch commit `5bb8fab60` (supervisor-repair provenance recorded
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
