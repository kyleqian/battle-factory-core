# Factory AI voluntary-switch receipt — C2 Perish Song sentinel

This is a ROM-only Battle Scene OFF receipt for the Perish Song half of
Recipe C in `docs/factory-ai-switch-scout.md` §7.  It is intentionally a
separate receipt from the pending Natural Cure C fold.  The committed fixture
uses `mechanicLab.overrides.parties` only: three complete legal records on
each side, no transient-state injection, and ordinary controller input.

`tools/probe/factory-ai-switch-receipt-c2.py` runs each seed in two fresh
processes: a fast `sRandCount` pass identifies every draw frame, then a fresh
targeted single-step pass attributes each `Random()+2` caller/LR and LCG
transition.  Both committed JSON ledgers were reproduced byte-for-byte in a
second fresh `tools/run-mgba-probe.py` process.

## Source-derived staging plan

`Cmd_trysetperishsong` writes each affected battler a timer of 3
(`battle_script_commands.c:8508-8524`).  At end turn,
`HandleWishPerishSongOnTurnEnd` first checks zero, otherwise decrements and
returns through `BattleScript_PerishSongCountGoesDown`
(`battle_util.c:1785-1866`, `battle_scripts_1.s:3438-3454`).  Thus the turn
that leaves the AI at zero must be completed with its active alive; a timer of
zero is not itself a faint until the *following* end-turn handler call.

The legal fixture stages Misdreavus as the AI active with only Perish Song and
Magikarp as all three player records.  The player uses Splash twice, then
voluntarily changes to party index 1.  Switch actions resolve before ordinary
moves (`battle_main.c:4817-4850`), so Misdreavus's third Perish Song affects
the incoming Magikarp, while Misdreavus retains its older count:

| turn | player command | AI command | timers immediately after AI move | end-turn timers | reason |
| ---: | --- | --- | --- | --- | --- |
| 1 | Splash | Perish Song | player 3 / AI 3 | player 2 / AI 2 | establish the shared count |
| 2 | Splash | Perish Song fails (already affected) | player 2 / AI 2 | player 1 / AI 1 | advance both original counts |
| 3 | switch `0 → 1` | Perish Song | player replacement 3 / AI 1 | player 2 / AI 0 | the switched-out record keeps the original player count; the live AI reaches zero alive |
| 4 command boundary | pending player input | `ShouldSwitchIfPerishSong` | player 2 / AI 0 | n/a | zero-timer sentinel is observable before a faint handler |

The replacement is clean at the legal switch itself; Misdreavus then marks it
with its forced third Perish Song.  That does not compromise the receipt: only
the AI active has timer zero at the next command boundary.

## Receipt

The AI benches are identical Jolteon records at party indexes 1 and 2, each
with Thunderbolt.  The sentinel route calls `GetMostSuitableMonToSwitchInto`;
in singles its score path is deterministic and chooses the earliest qualifying
bench, index 1 (`battle_ai_switch_items.c:629-789`).  The live command is at
frame 2095 for both seeds.  Its immediately preceding unrelated turn-start
draw is frame 2089 (`BattleTurnPassed+0x157`); no draw occurs in the command
frame itself, and the targeted attribution ledger contains no helper or
suitable-selector call there.

| seed | committed ledger | live command | player / AI Perish timer | command draw delta | action / selected party index |
| ---: | --- | ---: | --- | ---: | --- |
| 1 | `tools/probe/receipts/factory-ai-switch-receipt-c2-perish-seed-1.json` | 2095 | 2 / 0 | 0 | `B_ACTION_SWITCH` (2) / 1 |
| 2 | `tools/probe/receipts/factory-ai-switch-receipt-c2-perish-seed-2.json` | 2095 | 2 / 0 | 0 | `B_ACTION_SWITCH` (2) / 1 |

### §7C Perish Song prediction verdict

**Held.**  At a legal live zero-timer AI command, the Perish helper writes its
sentinel without a `Random()` call; singles suitable scoring also adds zero
draws and deterministically resolves Jolteon party index 1.  The probe pins
that exact command state (`chosenActions[1] = 2`,
`monToSwitchIntoId[1] = 1`) and an empty `attributedDrawsAtCommand` array for
both independent seeds.
