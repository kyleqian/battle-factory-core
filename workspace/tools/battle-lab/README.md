# Battle-lab scenarios

The harness oracle exposes `POST /v1/battle-lab/run` so a worker can stage a
specific real-ROM Factory battle without replaying an entire challenge to
reach it.

Run a checked-in scenario with:

```sh
bin/oracle lab tools/battle-lab/factory-varied.json -o /tmp/factory-varied
bin/oracle lab tools/battle-lab/mechanic-perish-song.json -o /tmp/perish-song
```

The output directory contains framebuffer PNGs and `manifest.json`. Each
capture in the manifest also contains semantic battle state: both active
battlers, stats, moves, PP, abilities, types, items, permanent/volatile
statuses, weather, side conditions, RNG, and controller state. Timed state is
named explicitly, including weather duration, confusion, Leech Seed, Perish
Song, Reflect, Light Screen, Mist, Safeguard, and Spikes.

## The three modes

`factoryLegal` is a real Battle Factory setup. Choose three player Frontier
set IDs, three opponent set IDs, a legal trainer ID, challenge/battle numbers,
the prior rental-swap count, and a seed. The service rejects teams outside
the source ranges or with illegal species/item duplication. Past rentals
unlock higher-band candidate positions at the source's real thresholds. The
ROM constructs the parties and runs normal battle initialization.

`mechanicLab` still routes through a legal Factory base battle, then takes one
of two forms.

**`overrides.parties` (preferred, shipped 2026-07-24 — harness `b30c5d8`).**
The complete pre-battle builder. Supply exactly three Pokémon per side; each
takes `species` and four `moves` plus optional `level`, `nature`, six `ivs`
(`0..31`), six `evs` (`0..255` each, total `<= 510`), `ppUps`, `item`,
`abilitySlot` (must exist on the species), `friendship`, `gender`, `shiny`, and
an exact `personality`. Records are written encrypted and checksummed after the
Factory constructors but **before `CB2_InitBattle`**, so Emerald derives types,
ability, experience, stats, max/current HP, and PP itself. Entry hooks
(Intimidate, Drought, Sand Stream, Trace) therefore fire at their real time,
all three bench records survive for switching tests, and `state.parties.*`
exposes every persistent record with `checksumValid`; active battlers carry
`partyIndex`. To constrain the opponent without injecting an AI result, give
all four of its slots the same move — the Factory AI still runs normally.

**`overrides.battlers` (legacy).** Active-battler loadout only—move slots/PP
Ups, item, ability, types, friendship—applied after the initial send-out and
before either side's first action choice. Mutually exclusive with
`overrides.parties`. Persistent checks consulted during later move execution
work (Own Tempo, Choice Band), but a substituted Drought or Intimidate does
**not** replay its missed switch-in hook, and switching reconstructs from the
unmodified party. Keep it for existing traces; use `overrides.parties` for new
mechanic, entry-hook, and switching work.

Override IDs are source-bounded: moves `0..354`, items `0..376`, abilities
`0..77`, and types `0..17`. The setup arrays contain raw catalog records;
captured battler state is authoritative after construction, including
Emerald's intentional replacement of Return with Frustration for
zero-friendship rentals.

`factoryBrain` stages Noland, the Factory's Frontier Brain, at one of his two
real encounters: `challengeNum` 2 (silver, fixed IV 15) or 5 (gold, fixed IV
31) — the request rejects any other value. The request has no `trainerId`,
`battleNum`, or `opponentSetIds` fields: the trainer is structurally
`TRAINER_FRONTIER_BRAIN`, the battle is always the challenge's final one, and
the opponent party is generated live by the ROM's `FillFactoryBrainParty`
(the real rejection rules, excluding the staged player rentals, at the fixed
IV). The response omits `trainerId`/`rangeIndex` and instead echoes `fixedIv`
and `opponentParty`, the ROM-generated roster read back after battle
initialization. `overrides.parties` is permitted under `factoryBrain`, to pin
a known Brain roster for deterministic replays — the AI still thinks with the
Brain's real, more aggressive aggression mask either way, since
`gTrainerBattleOpponent_A` stays `TRAINER_FRONTIER_BRAIN` regardless of the
party override; `overrides.battlers` is rejected outright (staging the live
generation is the entire point). **Cursor caveat (2026-08-14, PROGRESS
1260):** a free-run `seed` does NOT replay the six preceding battles' RNG
consumption the way `factoryLegal`'s `battleNum` does, so a bare-`seed`
`factoryBrain` request generates a different Brain party than the app's own
post-six-battle cursor for the same seed. When comparing against a live
six-win round, pin the party via `overrides.parties` with the app's own
generated roster — that is the sanctioned pattern, not just a convenience.

None of the modes permit transient battle-state injection. HP damage, status,
volatile effects, stat stages, weather/timers, side conditions, delayed
effects, faint state, and outcomes must be created by actual ROM-executed
moves, items, abilities, switching, and end-turn processing. The nested
`trace` is ordinary controller input; semantic captures expose the resulting
state read-only.

That builder is no longer future work — see `overrides.parties` above and
`../../../../oracle/BATTLE_LAB.md` for the authoritative contract.

Version 1 is Level-50 singles. `factoryLegal`/`mechanicLab`'s `overrides.battlers`
form applies interim loadout choices only to active battlers rather than
constructing bench Pokémon; Noland is staged through the dedicated
`factoryBrain` mode above rather than an ordinary `trainerId`, which stays
rejected for him. The checkpoint for every mode is after the attendant's
scouting speech, so none regenerate that earlier dialogue.

The complete schema and source-level implementation live in the umbrella
harness at `oracle/BATTLE_LAB.md` and `oracle/battle_lab.py`.

## Lab compare (ROM vs engine timing of a lab)

One tool for the sound / presentation timing loop: `tools/integration/labCompare.sh [--scene auto|on|off|both] [--out DIR] [--span A:B] [--rows] [--reuse-rom] LAB.json...`
(`--help` for the rest). Per lab it runs the ROM probe (`hcr3mProbe.py` script rows with exec flags and `gAnimScriptActive`, `soundEventProbe.py lab` SEs) and the engine
(`b4mEngine.ts`: presentation commands with timing, sounds), into a fresh `.integration/evidence/labcmp/<timestamp>/` (never `/tmp`), and prints one table per lab:
the ROM and engine sounds aligned as an ordered (kind, id) list (difflib, as `soundScoreboard.py`; menu SE 5 ignored), `ENG - ROM` per row, the ROM script label / exec flag /
anim flag at the ROM frame and the engine command (and the next one) around the engine frame. The last line per lab is
`SUMMARY <lab>.<scene>: exact E / offset O / missing M / extra X, mass N` (mass = sum of |ENG - ROM| over matched rows). A lab must sit in `tools/battle-lab/`
(the engine stage reads it there) and have `overrides.parties`; `--scene on|off|both` runs the same lab file in that scene (hand-written `APP_STAGES` entries keep their own scene).
The engine json keeps the commands under `cmds` (`[frame, segment, command, type, battler, move, timing, age0]`), the SEs under `se`, all sound kinds under `sounds`.
Replaces the per-step copies `b4mRun.sh` / `bdt1Run.sh` / `gsp3Cmp.py` (kept: receipts reference them). Not covered: `hcr3mLab.py` / `hcr3mLabEngine.ts` (sound-fixture labs under `tools/audio/fixtures/`; copy the lab into this directory instead) and `fsc2mProbe.py` (a scripted A-press policy after the commit: the ready-time probes, `fsc2mRun.sh`).

Lab design tips (each cost a re-run before):
- **No stale files.** `run-mgba-probe.py` refuses an existing output path, so a re-probe needs a fresh name; `labCompare.sh` always writes a fresh run dir and, with an existing `--out`,
  deletes its own outputs first. A ROM file is reused only with `--reuse-rom` and only while the lab file and the ROM build fingerprint match (`DIR/<lab>.<scene>.fp`).
  Do not keep regenerated labs' ROM files in a shared dir such as `/tmp`.
- **Speed ties and RNG decide turn order and the foe's move, and the engine and ROM diverge on them.** Use unequal levels (gsp3: user 50 vs target 12, or 100 vs 50, so the order is fixed)
  and give the other side a move with no RNG (Seismic Toss, 69, for all four slots: fixed damage, no crit / accuracy surprises). Avoid paralysis / confusion / sleep-length rolls
  and secondary effects in the window you compare; a ROM-only row followed by engine-only rows (e.g. `b4m-thunderwave`: ROM full paralysis at frame 472, engine attacks) is an RNG
  divergence, not a timing offset. Do not compare past the first divergence (`--span`).
- **Compare ordered lists, not zipped ones.** When the SE counts differ the old `bdt1Table.py` zip pairs unrelated SEs; labCompare aligns by (kind, id), so a missing / extra row shows up as such.
- **Trace shape:** per turn `A` (2), 18 idle, `A` (2), then 800..1000 idle frames so the whole turn plays out; frames are the lab's own clock (ROM probe frame k = engine `state.frame` k).
- The ROM probes run both at the same time (about 12 s for a one-turn lab, 20 s for three turns).
