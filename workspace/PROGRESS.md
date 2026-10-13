# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-10-13 — ret165: Factory parties turn Return into Frustration (ISSUES #165 FIXED; main/ts gameplay correction)

- **State:** local master; production src changed by `cd99c8073` (helper + tests + attributed re-pins); ROM receipt `98f4f8a05`.
  Full suite / build: see Notes. Census 0..999 99.34 % / 99.60 % live (27,075 / 27,256 commands), Return 84 -> **0**, Frustration 90 -> 154.
- **Did:** `setMonMoveAvoidReturn` (battle_factory.c:913-919) in `createFactoryCorpusPartyMember`, the shared builder behind every
  source call site (kernel parties both sides, generated / Brain opponents, swap rebuild, draft SUMMARY data); the opponent battle-style
  hint (battle_factory.c:672) reads the raw set (`factoryFacilitySetMoveIds`). ROM (OFF labs, `tools/probe/ret165/`): 6 / 6 Return
  carriers hold 218 in gBattleMons / both parties, friendship 0; TS == ROM for 12 / 12 members; FIGHT menu reads FRUSTRATION (PNG).
  `tests/factoryReturnToFrustration.test.ts` (9). docs/ret165-return-to-frustration.md has the ripple table.
- **Ripple (all attributed):** core-rs parity sweep (exactly the 11 Return sets; core-rs NOT edited — its `mon_construction.rs` lacks
  the mapping), liveReturnAdapter routes 24/14 PIDGEOT 355 and 51/28 EXEGGUTOR 534 (now a live 229-row Frustration body). Census: 34
  battles changed, each first diverging at its first Return command (player 20 / opponent 14 carriers), 0 unattributed.
  Soak vanilla 0:20 20 / 20 OK, per-seed lines identical to soak-gates-20261012.
- **Next:** #141 (rampage / Sticky Hold RNG draws), #140, #139 per ROADMAP S10A item 0; the other gameplay gates (full / winning /
  winning-swap 0:60, fifth gate) were not run by this step. The live Return adapter stays (Metronome can call Return).
- **Notes:** gates on the tested tree (`e0b518d9a` + the test-only type fix in the next commit): typecheck 0 errors, smoke 448,
  full `npm test` (2 vitest shards) 1,655 files / 13,725 tests passed, 0 failed (44 files / 223 tests skipped), build OK. Draft SUMMARY
  ROM capture not done (no cheap staged draft with a Return set); source-cited + Tier-1. Scratch: `.integration/validation/ret165-20261013/`.

---

## 2026-10-13 — User scope update: all remaining Factory correctness work is authorized

- **State:** scope/instructions checkpoint on local master; production src `65a45fcc` and the green final receipt on `c4d38e1f3`
  are unchanged. Move-animation coverage remains 99.34% of commands / 99.60% of frames; no fix is credited by this scope change.
- **Did:** recorded `docs/factory-finish-scope.md` and updated the roadmap, lane/supervisor instructions and launch prompt. All
  remaining animation variants, presentation corrections and source-proven battle-engine bugs are authorized. Main-lane changes
  to damage / AI / RNG / event ordering are allowed with source proof; presentation workers retain their narrow ownership.
- **Next:** FIRST #165 Return -> Frustration; then #141's rampage / Sticky Hold RNG draws, #140's Mimic/Transform targeting branch,
  and #139's Focus Punch pre-pass. Continue independent banked #168 fixes, fallback variants and presentation/timing remainders.
  Use the engine gates in ANIMATION_VERIFICATION.md, including all five gameplay gates; attribute intentional trajectory changes.
- **Notes:** audio remains deferred, settled exceptions stay settled, and no run is launched by this checkpoint. Reuse the unchanged
  production receipt. Scope/ledger checks, `git diff --check`, shell syntax / `--print-config`, and all 62 launcher-profile tests passed.

---

## 2026-10-12 (evening) .. 2026-10-13 — S10A: Scene ON status-condition animations DONE (#168: timed + all nine drawn), sound-effect waits, Double Team / Smokescreen timing, ordinary-row idle rest; live share 0..999 98.95 -> 99.34 % of commands (99.32 -> 99.60 % of frames)

- **State:** local master `63f6850b2` (production src == union `c4d38e1f3`). Supervisor FINAL gates on that union: typecheck, smoke 448,
  full suite 1,653 files / 13,710 tests 0 failed, build; differential vs session start `cfe4e26ca`: both canonical railroad traces
  byte-identical (235 + 216), the app-only presentation-rng trace 172 / 173 (Double Team's intended +9 tail). Census 0..999: **99.34 % /
  99.60 %** live (27,221 / 27,402 commands), 0 render throws. Catalogue `236+13+27+0+0=276` + Struggle (Smokescreen -> faithful timing).
  Preview <http://127.0.0.1:5191/> serves `63f6850b2` (4 samples hash-equal, export + ON -> OFF restart passed, no browser errors).
  Soak on `74cbec2b8` (last Scene OFF change): vanilla 0:20 20 / 20, full 0:60 60 / 60, winning 0:60 60 / 60, winning-swap 0:60 60 / 60;
  fifth gate 100 / 100 x 4.
- **Did (production; every worker runner re-run by the supervisor into a fresh dir, ALL SAME; unions gated in detached worktrees):**
  ordl126 (ord124 order plans: +106 commands live), sa125 (#168 SA1 + SA3: the status-animation command with ROM controller rows, the
  32-frame stand-in removed), sag130 (the IsBattleSEPlaying gate before status animations: 72 commands / 729 frames), sar131 + sad133 +
  sae135 (**all nine status animations drawn**: 88 dense ROM windows 0 px on every command row; source-derived x2 rows), gaf140 (the
  drawn animation waits out the gate: a union defect sae135 found), sgl138 (the same gate on stats-change in both scenes and multi-hit
  2nd+ hits: 366 / 240 commands), tmr136 (#166 Double Team tail +9 rows; Smokescreen first-use D4 phase), rsl141 (ordinary Scene ON rows
  draw ONIX's idle rest: 22,746 / 22,746 ROM rows 0 px).
- **Did (evidence):** seg127, stp128, stq132, sgs134, rst139 (prep for the above); live audits 27 (aud129: Golbat Mega Punch flag = a D4
  phase, 0 defects) and 28 (aud137: 121 / 121 status-animation command rows 0 px, 0 new defects); inv142 (a status animation over a hidden
  Dig battler: the ROM draws its sprites; banked patch, 5 census cases, not landed).
- **Supervisor union fixes:** sad133 x stq132 typecheck break (TS2366); sad133 x sae135 diverged `liveStatusAnimationRow` signatures (5-file
  resolution); tmr136 x sgl138 render conflict + one route-total re-pin (seed 9: 3 live Double Teams).
- **Next:** ROADMAP S10A "Next (2026-10-13)": land inv142 (banked); FRZ 115 / 116 frozen-turn phase (aud137, D4); #167 remainders; Hyper
  Beam / Astonish / Extrasensory / doll-cell fallbacks; a live audit after every batch. (The app-only differential traces were
  regenerated on the final timeline, `bba4d9dc6`: 173 -> 190 captures; differential 831 / 831 byte-identical, smoke 448.)
- **Notes:** no DEFERRED entries. ISSUES: #168 trimmed to inv142's remainder, #166 removed (fixed). Worker branches merged, worktrees
  removed (scratch under `.integration/validation/*-2026101[23]/`, transcripts `.codex-logs/workers/`).
