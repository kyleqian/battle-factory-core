# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 287 — Bounded worker (S7 turn 16 rung 2b): **GREEN — FAINT_ATTACK resolution tail**

- **State:** canonical `21047--21169` is **123/123 exact**. Rung 2a remains
  **221/221**, rung 1 canonical/delayed remain **81/81** each, turn-16
  verifier **233/233**, Tier-1 **1028/1028**, and build (**5.432 MB**) pass.
- **Did:** added confirmation-relative post-hit wobble/blink reducers,
  parameterized 1-HP/tick MAGBY drain `138→79`, atomic battle-HP and
  zero-chance secondary-roll state, then the target/current-move/attacker
  handoff and FIRE_PUNCH accuracy/text boundary. Committed the dense
  prefix-exact `turn16-rung2b.json`.
- **Next:** resume S7 at canonical **21170**, the first FIRE_PUNCH
  animation-owned frame. Do not reopen exact turn-16 rungs 1, 2a, or 2b;
  #38 remains parked.
- **Notes:** implementation commit `a24b857`; first FIRE_PUNCH text pixels
  are `M`/`MA` at 21168/21169, while the cast animation begins at 21170.
  No absolute-tick lookup, framebuffer asset, per-frame table, RGB/coordinate
  fitting, trace branch, or excluded capture. Supervisor independently
  reverified every number above. A second false usage-limit digest matched
  project text inside a successful structured command event; detection now
  parses only provider failure events, with both positive and negative logs
  checked.

---
## 286 — Supervisor wind-down (S7 turn 16 rung 2a): **CANONICAL GREEN; +30 REGISTER-RACE FRAME PARKED AS #38**

- **State:** canonical `20826--21046` is **221/221 exact**. The requested
  delayed twin is **220/221**: only delayed tick **21006** differs. Rung 1
  remains **81/81** each, frozen send-out rung 6 **195/195** each,
  turn-16 verifier **233/233**, Tier-1 **1024/1024**, and build
  (**5.430 MB**) pass.
- **Did:** implemented source-extracted `BG_DARK`, BG3 darken/restore,
  Murkrow's source sine ellipse and alpha handoffs, Magby shake, and the
  generic hitsplat; added pure boundary reducers/tests and a dense,
  prefix-verbatim canonical trace. A fresh two-oracle SHA comparison and
  direct RAM/register probes falsified relative identity at age 150:
  animation task state is identical, but canonical hardware `BLDALPHA` is
  `0x0e02` while delayed is `0x0d03`.
- **Next:** resume S7 at canonical **21047** with FAINT_ATTACK's HP-drain/
  move-handoff tail. Do not reopen exact canonical rung 2a; #38 parks the
  extra delayed-control frame unless a general cycle/register-queue model is
  introduced.
- **Notes:** implementation/evidence commit `d74ab10`; the delay sweep
  `+0..+8,+15,+16,+30,+31,+32` reproduced the early register exposure only
  at +30. No framebuffer assets, per-frame tables, RGB/coordinate fitting,
  absolute-tick lookup, trace branch, or red delayed trace was committed.
  Supervisor independently reverified every number above. The launcher's
  first post-run verdict was a false usage-limit positive: its broad regex
  matched `--no-rate-limit` inside a late `ps` listing; no provider limit
  occurred, and the detector is now hardened.

---
## 285 — Bounded worker (S7 turn 16 rung 1): **GREEN — cross-layer handoff**

- **State:** canonical `20745--20825` and delayed `20775--20855` are both
  **81/81 exact**. Rung 6 remains **195/195** each, rung 5 **144/144** each,
  rung 4a **16/16** each; turn-16 verifier (233 captures), Tier-1
  **1019/1019**, and build (**5.415 MB**) pass.
- **Did:** made completed forced SEND OUT reset turn 15's stale choice and
  return input to ordinary FIGHT state with MAGBY's real moveset; added
  open/confirm-relative submenu, bounce-freeze, and FAINT_ATTACK kickoff
  rendering plus contiguous canonical/+30 traces.
- **Next:** supervisor chooses the next increment. Scoped remainder begins at
  canonical **20826** / delayed **20856** (FAINT_ATTACK animation body);
  do not reopen exact send-out or rung-1 windows.
- **Notes:** implementation commit `de7e334`; both traces preserve their
  122-segment prefixes verbatim and the oracle-relative SHA streams are
  **0/81 mismatched**. No framebuffer assets, absolute-tick lookup, RGB
  fitting, trace branch, or excluded capture.
