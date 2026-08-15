# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## R39 — [supervised session, 2026-08-14] **M38 Battle Script attacker/target swap leaf**

- **State:** `rust-main` = current master `da55e159` plus verified
  `Cmd_swapattackerwithtarget` worker `3ace7c14`. The complete three-command
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

- **State:** `rust-main` = current master `edb54f4f` plus verified
  `Cmd_snatchsetbattlers` worker `cc70dc78`. The complete pure selector-role
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

- **State:** `rust-main` = current master `770a40ee` plus verified Snatch
  worker `93453150`. The pure `Cmd_trysetsnatch` decision/state/control
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
