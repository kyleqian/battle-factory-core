# The Factory L50 WIN terminal path — dense oracle ground truth (Battle Scene OFF)

SIDE-LANE step (ISSUES #73 rung B, WIN half). Banks a fresh, generic
`mechanicLab`-staged trace for the WIN half of the terminal seam, the
sibling this repo's WIN-side coverage previously lacked: until now the WIN
quote/text was only cross-checked against the DESTIN-specific *canonical*
challenge recording (`docs/turn17-notes.md`, `docs/postwin-notes.md`), never
against a purpose-built, disjoint staged scenario the way
`docs/terminal-seam-loss-path-ground-truth.md` already did for LOSS. Docs +
committed trace only — no `src/`/`tests/`/`tools/compare/` edits.

**Headline**: a deliberately RNG-cheap WIN — Explosion's unconditional
`setatkhptozero` forces the *opponent's* own AI-constrained move choice to
self-KO three turns running, while the player's own DUSCLOPS trio sits at
full HP the entire battle (Ghost/Ghost is immune to Normal, so Explosion
never scratches them). This reproduces, in a from-scratch staged battle, the
same terminal label sequence `turn17-notes.md` ground-truthed from a real
played-out challenge (`BattleScript_FrontierTrainerBattleWon`,
`STRINGID_PLAYERDEFEATEDTRAINER1` → `trainerslidein` →
`STRINGID_TRAINER1LOSETEXT`), and confirms two things the canonical trace
alone could not, cleanly: (a) the WIN path has **no opponent-recall step** —
unlike `BattleScript_LocalBattleLost`'s explicit
`returnopponentmon1toball`/`returnopponentmon2toball` pair, `battle_scripts_1.s:3027-3048`
(`BattleScript_FrontierTrainerBattleWon`) never calls either `VARIOUS` case,
because the opponent's last mon is already off-screen via its own faint sink
by the time the win script starts running; and (b) the immediate post-fade
teardown (battle-room flash, `gMain.inBattle` clear, RNG resume, all on the
identical tick) is bit-for-bit the same shape `postwin-notes.md` and
`terminal-seam-loss-path-ground-truth.md` already pinned for their own
canonical/staged traces, this time from a disjoint seed/script/roster.

## 0. Staging method

`tools/battle-lab/win-terminal-explosion-dusclops-off.json` (`mechanicLab`,
`overrides.parties`, `profile: "battle-scene-off"`, `trainerId: 50` = DESTIN
— kept per the brief's default, since it lines up `speeches.speechLose`
("PLEASE I NEED"/"SOME WATER") with the already-pinned expectation in
`tests/presentationStringTerminalSeamWin.test.ts` and the real oracle
ground truth in `docs/turn17-notes.md`).

- **Player**: three DUSCLOPS (species 362, Ghost/Ghost — immune to Normal),
  each carrying `MOVE_SPLASH` (id 150) in all four slots — a pure no-op, so
  the player never risks fainting and the trace's own button script never
  needs to navigate a party-menu switch.
- **Opponent**: ONIX (95), SHUCKLE (213), MURKROW (198), each carrying
  `MOVE_EXPLOSION` (id 153) in all four slots, per `AGENTS.md`'s "give all
  four opponent slots the same move to constrain the Factory AI to one
  legal choice" — mirrored from the LOSS fixture's own technique, but on
  the opposite side: here it forces the *opponent* into a guaranteed
  self-KO every turn, since Explosion's `BattleScript_EffectExplosion`
  runs `tryexplosion` (fails only on Damp, which none of these three have)
  then **unconditionally** `setatkhptozero` before the hit/miss/immunity
  branch — same source fact the LOSS doc already cited
  (`reference/pokeemerald/data/battle_scripts_1.s`), just applied to the
  opponent's own HP instead of the player's.
- **Why this is airtight**: the player's Ghost/Ghost typing makes Explosion's
  *damage* to the defender a hard zero (immunity, not resistance), so no
  damage roll, accuracy roll, or crit roll can ever put the player's HP at
  risk; the attacker's own self-zero is unconditional. Three sequential
  opponent self-faints, player HP untouched (**115/115 confirmed in every
  captured frame, from tick 0 through the final captured tick 5079**) — a
  clean, deterministic, source-verified WIN with no reliance on RNG,
  accuracy, or damage rolls, exactly mirroring the LOSS doc's own claim.
- All parties/moves are ordinary `overrides.parties` catalog values (no
  transient state — HP/status/outcome are 100% ROM-computed from three
  played-out Explosion turns).
- Reproduce: `bin/oracle lab tools/battle-lab/win-terminal-explosion-dusclops-off.json -o <fresh-dir>`
  (a `mechanicLab` scenario — needs the `/v1/battle-lab/run` route, same as
  the LOSS fixture; not `bin/oracle run`).
- **Twice-run byte-identical**: two independent fresh runs, 241/241 captures,
  **0 sha256 mismatches, 0 semantic-state mismatches** — and the two runs'
  entire `manifest.json` files hash identically end to end
  (`d20e9fd2ad789d05fde20b3b13f2af10557bafbc74eb6b28b81b512150825520`).
- No forced-switch navigation was needed anywhere in this fixture (unlike
  the LOSS fixture's own §0, which needed real party-menu discovery) —
  because the player's mons never faint, the entire button script is just
  three repetitions of "open FIGHT, confirm SPLASH (cursor already
  defaults to slot 0), idle through resolution, dismiss whatever's held."
  Each of the first two (non-terminal) opponent faints needs exactly **one**
  dismiss press (the held fainted-text screen; the auto-switch-in that
  follows — "BUG CATCHER DESTIN sent out ⟨next mon⟩!" — needs no separate
  press and lands on a fresh, already-interactive "What will DUSCLOPS do?"
  menu on its own). The **third** (terminal) opponent faint needs **three**
  dismiss presses in a row — fainted-text, then "Player defeated...", then
  the loss-quote itself — matching `turn17-notes.md`'s own real-battle
  finding exactly (that dossier's own trace deliberately stopped one press
  short, at the un-dismissed quote; this fixture presses through it).

## 1. Semantic state exposed by the battle lab

Same contract the LOSS doc already established: every `bin/oracle lab`
capture exposes `battleOutcome` (raw `gBattleOutcome`), `rngValue` (raw
`gRngValue`), `engine.mainCallback2`, and `engine.opponentControllerCommand`
directly, plus per-side `parties[].hp`/`maxHp` — no separate RAM-probe
script was needed for any claim in this doc. All frame numbers below are
absolute trace ticks from this fixture's own frame 0.

## 2. The executed sequence and the exact win-text

Cross-referencing `battle_scripts_1.s:3027-3048`
(`BattleScript_FrontierTrainerBattleWon`) against this session's oracle
captures, for the third (terminal) opponent faint:

| tick | `battleOutcome` | opponent-controller cmd | what's on screen | source step |
| --- | --- | --- | --- | --- |
| 3306 | 0 | 16 | turn 3 confirmed (SPLASH vs. EXPLOSION) | both actions dispatch |
| ~3339-3343 | 0 | 16 | "Foe MURKROW used\nEXPLOSION!" settled | `BattleScript_EffectExplosion` running |
| **3344** | 0 | 2 | (still the used-move text on screen; RAM-ahead-of-pixel) | `setatkhptozero` — MURKROW's own HP **135→0**, unconditional |
| **3416** | 0 | 16 | "It doesn't affect\nDUSCLOPS..." settled, auto-held (no press) | the immunity branch prints its own message; DUSCLOPS's damage stays 0 the entire trace |
| 3556-3591 | 0 | 16 | dynamic — sprite shrink/fall + healthbox/badge teardown | `SpriteCB_FaintOpponentMon`/`AnimFaintOpponent`, same faint-sink family `turn17-notes.md` §6b formula-pinned |
| **~3592** | 0 | 16 | "Foe MURKROW\nfainted!♥" settled, held (button-gated) | opponent sprite + healthbox already fully gone by this frame — confirmed, no mon/box visible |
| 4206 (this trace's own dismiss press) | 0 | 16 | still the held fainted text (RAM-ahead-of-pixel) | `checkteamslost` about to run |
| **4219** | **0→1** | 16 | still pixel-identical to the held fainted text | `Cmd_checkteamslost` totals opponent-party HP, ORs `B_OUTCOME_WON` — dismiss+13 |
| 4229 | 1 | 16 | first "Player defeated..." glyph | dismiss+23 — `STRINGID_PLAYERDEFEATEDTRAINER1` printer starts |
| ~4265 | 1 | 16 | "Player defeated\nBUG CATCHER DESTIN!♥" fully typed, held (blinking-heart cursor) | dismiss+59 |
| 4608 (this trace's own dismiss press) | 1 | 16 | held "Player defeated..." | — |
| **4613** | 1 | **16→8** | still pixel-identical | dismiss+5 — `trainerslidein BS_ATTACKER` dispatches |
| 4636-4661 | 1 | 8 | dynamic — composite fade/slide-in transition (DESTIN's trainer sprite entering) | dismiss+28 through +53, same ~30-tick composite class `turn17-notes.md` §6c characterized (there: +27) |
| **4663** | 1 | **8→16** | mid-transition | slide-in animation complete, print controller resumes |
| **~4686** | 1 | 16 | "PLEASE I NEED\nSOME WATER" fully typed, held, **no blinking cursor visible** | dismiss+78 — matches `turn17-notes.md`'s own "no cursor on the trainer-quote screen" finding exactly |
| 5010 (this trace's own dismiss press) | 1 | 16 | held quote | — |
| 5010-5017 | 1 | 16 | still pixel-identical to the held quote (RAM-ahead-of-pixel) | `jumpifbattletype`/`jumpifnotbattletype` both fall through (singles, not `TWO_OPPONENTS`) → `BattleScript_FrontierTrainerBattleWon_End` → `end2` |
| **5018** | 1 | 16 | first dynamic (fade) frame | dismiss+8 — `HandleEndTurn_FinishBattle`'s `BeginFastPaletteFade(3)` |
| 5079 | 1 | 16 | `BattleFrontier_BattleFactoryBattleRoom` visible (hex-tile ring + spectator crowd) | same battle-room flash `postwin-notes.md` §3 and the LOSS doc both already documented on their own return paths |

**Win-text cross-check**: rendered text is **"PLEASE I NEED\nSOME WATER"**,
pixel-read directly from the capture at ticks ~4686-5010, held un-dismissed
through that whole span, no cursor icon at any sampled tick — byte-for-byte
identical to `docs/turn17-notes.md` §4's own real-challenge citation for the
same trainer, and to `tests/presentationStringTerminalSeamWin.test.ts`'s
pinned `TURN17_LOSS_LINE1`/`TURN17_LOSS_LINE2` expectation
(`speeches.speechLose` for `id: 50` / DESTIN in
`src/data/gen/battle-frontier-trainers.json`). "Player defeated\nBUG CATCHER
DESTIN!♥" likewise matches `STRINGID_PLAYERDEFEATEDTRAINER1`'s already-pinned
resolution exactly.

**New, WIN-side-only finding**: the "It doesn't affect DUSCLOPS..." immunity
line (ticks 3416-3555, 140 ticks) is genuinely **not** input-gated — it's a
fixed-duration auto-advance that holds while the faint-sink animation plays
out underneath, then transitions on its own with zero button presses
scripted at that point in the trace. This line is an artifact of this
fixture's own deliberate immunity staging (Explosion vs. Ghost/Ghost) and
has no analog in `turn17-notes.md`'s real MURKROW-vs-MAGBY battle (FIRE_PUNCH
connects normally there) or in the LOSS doc (Dusclops-vs-Explosion there is
the *attacker's own* immunity-irrelevant self-zero, not a defender-side
immunity message) — flagged so a future engine session doesn't mistake it
for a universal step in the terminal sequence.

## 3. RNG ledger

`gRngValue` is **completely frozen at `1298389302`** from tick 3388 (the
last of a small 3-step burst at 3384-3388, plausibly Explosion's own
crit-roll-adjacent bookkeeping — not chased further, out of scope for this
staging doc) through tick **5053** inclusive — spanning the entire terminal
sequence: the fainted-text hold, its dismiss, the outcome flip, the
"Player defeated..." typing and hold, its dismiss, the trainer-slide
transition, the quote typing and hold, and its dismiss. This is the
**identical frozen value** `terminal-seam-loss-path-ground-truth.md` §4
pinned for the LOSS fixture (`1298389302`) — notable convergence given the
two fixtures share the same `seed` (305419896) field and reach this resting
LCG state via similar (if not identical) draw counts up to that point; not
claimed as a general invariant, just an observed cross-check.

At tick **5055**, in the same tick, three things happen together: (a)
`gRngValue` takes its first step after 1667 ticks flat
(`1298389302→1827369923`), (b) `engine.mainCallback2` changes
(`134448161→134766837`, i.e. `gMain.inBattle` clears), matching the
"same-tick" pattern `postwin-notes.md` §2 pinned for the WIN side (there:
dismiss+43; here: dismiss+45, from this trace's own quote-dismiss press at
5010). Ten ticks later (5065), `mainCallback2` settles to `134766173` —
`postwin-notes.md`'s own cited value for
`BattleFrontier_BattleFactoryBattleRoom`, cross-confirming the battle-room
flash pixel-identified at tick 5079 above.

## 4. WIN-vs-LOSS sequencing differences (for the next round's compare wiring)

1. **No opponent recall.** The LOSS script (`BattleScript_LocalBattleLost`)
   explicitly recalls the opponent's still-alive active mon
   (`returnopponentmon1toball`/`returnopponentmon2toball`, `VARIOUS` cases
   19/20) before the trainer slides in, because the player's own faint is
   what ends a LOSS battle while the opponent's mon is untouched and still
   on the field. The WIN script (`BattleScript_FrontierTrainerBattleWon`)
   has **no such calls at all** — source-confirmed
   (`battle_scripts_1.s:3027-3048`) and oracle-confirmed (no
   `set-battler-sprite-visibility`-shaped recall event/animation anywhere
   in this trace's terminal window; the opponent's sprite and healthbox are
   already gone via the ordinary faint-sink well before "fainted!" even
   settles). A generic "return to overworld" implementation must **not**
   assume a recall step always precedes the trainer slide — it is
   LOSS/DRAW-specific, not shared with WIN (confirmed independently of
   `tests/battleScriptFaintedActionsOrchestration.test.ts`'s existing
   kernel-level pin of the same fact).
2. **Gate count differs by outcome, and even within LOSS/WIN by fault
   position.** A *non-terminal* opponent faint (this fixture's turns 1-2)
   needs exactly one dismiss (the held fainted-text) before auto-flowing
   through switch-in text/animation to a fresh, interactive menu. The
   *terminal* WIN faint needs **three** dismisses in series (fainted-text →
   "Player defeated..." → the quote itself) with no auto-skip between any
   of them — each is its own independent `printstring`-class hold. The
   LOSS doc's own committed fixture needed the same 3-dismiss shape for its
   own terminal faint (fainted-text → win-quote, plus the forced-switch
   navigation this WIN fixture never needs at all since the player never
   faints) — structurally the same "every terminal printstring gates
   independently" rule, just without a LOSS-side player-switch tax.
3. **The palette-fade/battle-room-flash/`inBattle`-clear/RNG-resume
   quadruple-coincidence is shared, not WIN- or LOSS-specific.** Both this
   WIN fixture (dismiss+45/+55) and the LOSS doc (dismiss+43, per its own
   §4) land on the same qualitative shape: RNG frozen throughout the whole
   held-text chain, then resumes the exact tick `gMain.inBattle` clears,
   shortly followed by a brief `BattleFrontier_BattleFactoryBattleRoom`
   flash before diverging (LOSS continues to the Lobby per the LOSS doc's
   own headline; WIN — per `postwin-notes.md`, not re-traced this
   session — continues to the pre-battle counter room instead). An
   implementation modeling "return to overworld" as one generic
   outcome-agnostic step, branching only after the battle-room return
   (inside that map's own field script), matches the real ROM on **both**
   outcomes — the LOSS doc's own §5(a) finding, now independently
   reconfirmed from the WIN side with a disjoint fixture.
4. **The defender-immunity auto-hold ("It doesn't affect DUSCLOPS...",
   §2 above) is an artifact of this fixture's own staging choice**, not a
   general WIN-path step — flagged so it isn't mistaken for something the
   engine must always reproduce between a KO'ing hit and the fainted text.

## Verification

- `git diff --stat` for this session's changes: `docs/` (this file) +
  `tools/battle-lab/win-terminal-explosion-dusclops-off.json`. Zero
  `src/`/`tests/`/`tools/compare/` edits.
- The committed trace lives at
  `tools/battle-lab/win-terminal-explosion-dusclops-off.json`, matching this
  repo's `mechanicLab` convention (same reasoning as the LOSS doc's own
  Verification section: reproducible only via `bin/oracle lab`, not
  `bin/oracle run`).
- Reproduced twice via
  `bin/oracle lab tools/battle-lab/win-terminal-explosion-dusclops-off.json -o <fresh-dir>`:
  **241/241 captures byte-identical** (sha256 *and* full semantic `state`
  compared), across two independent fresh runs, no nondeterminism observed;
  the two runs' `manifest.json` files hash identically end to end
  (`d20e9fd2ad789d05fde20b3b13f2af10557bafbc74eb6b28b81b512150825520`).
- Player party HP confirmed **115/115/115 unchanged** at every sampled tick
  from 0 through the trace's final captured tick (5079) — the immunity
  staging holds for the entire battle, not just spot-checked near the end.
- Every tick/value cited in §2-§4 was read directly from this session's own
  reproduced captures (the committed trace's dense clusters around each
  edge, supplemented by a handful of small single-run edge-precision probes
  at the exact dismiss ticks — 4206/4219/4228, 4608/4613/4635, and
  5010/5017/5018 — each cross-checked against the twice-run committed
  trace's own neighboring captures for consistency, same "exploratory
  probe narrows a committed-trace boundary" convention the LOSS doc used
  in its own §4).
- No RAM-probe script was needed (§1) — `bin/oracle lab`'s own semantic
  `state` covers every claim in this doc directly.
