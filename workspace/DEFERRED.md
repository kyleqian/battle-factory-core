# Deferred supervisor questions

Unresolved user-level decisions discovered during autonomous supervisor
sessions. This is not the bug/debt backlog: confirmed implementation problems
belong in `ISSUES.md`.

Supervisors add an entry only when the choice is material, cannot be resolved
safely from the mission, roadmap, oracle, or existing evidence, and guessing
would change scope or create hard-to-reverse work. A deferred question never
pauses the session: continue with independent in-scope work or gather evidence
that may resolve it.

Keep entries short and remove them after the user decides (git retains the
history). Number entries without reuse and use the exact machine-readable
heading `## D<number> — OPEN: <short title>`; `run-supervisor.sh` refuses to
start another session while any such heading remains by default. A bounded
unattended schedule may explicitly preserve the entry and continue only
independent reversible work. Each entry should state:

- the decision needed and why it matters;
- the evidence checked and why it was insufficient;
- the supervisor's recommendation or bounded options;
- what safe work continued meanwhile.

At wind-down, summarize every question added or still blocking work in the top
`PROGRESS.md` entry and final session report.

## D3 — OPEN: Random2 animations — ship a surrogate presentation RNG?

- **Decision:** 52 of the 78 remaining accepted Factory animations draw
  presentation randomness with `Random2()` (particle/fist/dirt positions;
  never gameplay). Should they go live with a surrogate random source, or
  stay on the scene-off fallback?
- **Evidence (2026-10-05, `docs/random2-trackability.md`, supervisor
  reproduced):** in the oracle, the wireless-link layer draws one
  `Random2()` every main-loop pass (`RfuMain1`, `link_rfu_2.c:2023`;
  `gWirelessCommType` = 1). Lag frames between turns vary (3 or 4, 2 or 3)
  with identical inputs, so no tracker can keep the value exact in play
  (strict chain: 2 of 29 route bodies). Within a body, words are exact once
  the activation value is known (staged scenarios only).
- **Options:** (a) surrogate presentation RNG with the ROM's draw rules,
  seeded per battle from a non-gameplay source; adapters dense-proven with
  pinned words; inventory counts them in a separate "faithful random"
  bucket, never as exact. (b) keep all 52 on the fallback; continue only
  the 26 non-Random2 moves. (c) model "no wireless adapter" (advance only
  on animation draws): matches a real GBA without the adapter, not the
  oracle.
- **Recommendation:** (a), with the separate claim bucket.
- **Safe work meanwhile:** non-Random2 adapters, post-knock-out geometry,
  sprite-order coverage. No Random2 adapter or surrogate module was built.

(D2, the post-M-A scope question, was ANSWERED by the user on 2026-08-19:
option (b) — make deep play reachable. Recorded as ROADMAP milestone M-B;
git retains the entry text.)

(D1, the user-communication contract, was adopted verbatim
into SUPERVISOR.md "Communicating with the user" by user decision on
2026-08-02 — git retains the entry text.)
