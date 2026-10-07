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

## D4 — OPEN: animations whose exact timing depends on emulator CPU load (lag frames / VBlank phase)

**Decision needed.** Several remaining Factory move animations are deterministic in the ROM, but their exact
row timing depends on how much CPU work the game does in a frame: an optional "lag frame" (VBlank overrun), or
which side of VBlank a register / palette write lands. Battle state does not predict it. It differs between
species pairs, and sometimes between the two accepted orientations of the same move. These moves cannot meet
the scoped-exact bar (every acceptance window 0 px), so they stay on the fallback pause. Should they ship with
the dominant measured timing as a separately counted claim, like D3's "faithful random"?

**Evidence (all reproduced by the supervisor; receipts committed):**
- Megahorn (0.29% of Factory move uses): every input derivable except two phase bits (monbg BGnCNT write row
  7/8; restorebg fade end early/late); they differ across 6 windows, including the two accepted orientations;
  a wrong bit costs 16 rows (`docs/next-adapters-prep24.md`).
- Meteor Mash (0.22%; also Random2): the last row depends on a lag frame at `restorebg`
  (`docs/next-adapters-prep17.md`).
- Mach Punch (0.14%), Extrasensory (0.11%), Nightmare (0.07%), Psywave (0.07%): body length varies +-1 row from
  one optional late lag frame (`tools/integration/fixtures/prep25/lag-frames.json`).
- Ice Ball (0.11%; also Random2): lag rows in accepted bodies 4 and 5 only; Revenge (0.07%): `bg*cnt` write row
  4 vs 5 in the accepted opponent window (`docs/next-adapters-prep26.md`). Flatter (0.08%): confetti birth split
  varies by up to one row.
- Curse, Ghost branch (1 of 20 Factory Curse sets): the row-26 palette transfer lands at vcount 17 or 9 at the
  same script row (`tools/integration/fixtures/curse-live/ghost-p1-vcount.json`).
- Pursuit: first bodies shipped as scoped-exact; 4 of 12 later bodies are one frame short (kept first-body
  only; `docs/later-bodies-curse-oam.md`), and a player-side TYRANITAR attacker lacks the usual lag
  (`docs/live-species-audit-5.md`). Hidden Power vs GOLBAT has a similar tail lag (audit 3).

**Options.**
- (a) Keep the fallback for these moves (status quo; about 1.3% of Factory move uses stay unanimated).
- (b) Recommended: ship them with the dominant measured timing in a separate "faithful timing" bucket in the
  live inventory (not added to scoped-exact). Dense proofs required on every window of the dominant phase; the
  other phase documented with its row / pixel cost. Gameplay, RNG and Factory acceptance unchanged.
- (c) Count them as scoped-exact with a documented phase limitation (as Pursuit / Hidden Power already are).

**Safe work continued:** every move whose timing is constant across its measured windows continued on the
normal exact path (Return, Curse non-Ghost, Fire Punch, Sheer Cold, Hyper Voice, Smog, Sand Tomb, Sky Attack,
Signal Beam, Spikes, Octazooka, Lovely Kiss, Baton Pass / Endeavor / Dive in progress).

(D3, the Random2 animation decision, was ANSWERED by the user on 2026-10-06:
option (a) — implement a separate deterministic presentation RNG using the
ROM's animation algorithms and draw rules; persist its seed in session exports
for reproducible replay; count live adapters separately as "faithful random".
Gameplay RNG and outcomes remain unchanged. Implementation is authorized for
the next run under ROADMAP S10A and ANIMATION_VERIFICATION.md. No Random2
adapter or surrogate module has been implemented by this decision checkpoint;
git retains the original question and evidence.)

(D2, the post-M-A scope question, was ANSWERED by the user on 2026-08-19:
option (b) — make deep play reachable. Recorded as ROADMAP milestone M-B;
git retains the entry text.)

(D1, the user-communication contract, was adopted verbatim
into SUPERVISOR.md "Communicating with the user" by user decision on
2026-08-02 — git retains the entry text.)
