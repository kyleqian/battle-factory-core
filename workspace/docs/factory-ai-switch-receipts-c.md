# Factory AI voluntary-switch receipts — C

ROM-only Battle Scene OFF receipt for Recipe C in
`docs/factory-ai-switch-scout.md` §7.  The committed fixture uses
`mechanicLab.overrides.parties` with three complete legal records per side:
Parasect (Effect Spore) repeatedly selects Spore, and full-HP Swablu (Natural
Cure) is the active AI mon.  Its benches are Vaporeon index 1 and Jolteon
index 2, both with Bite.  `tools/probe/factory-ai-switch-receipt-c.py` runs a
fast `sRandCount` pass and a fresh targeted single-step pass that attributes
every `Random()+2` LR and LCG transition.

The two committed ledgers are:

- `tools/probe/receipts/factory-ai-switch-receipt-c-natural-success-seed-2.json`
- `tools/probe/receipts/factory-ai-switch-receipt-c-natural-control-seed-1.json`

They were each reproduced byte-for-byte in a second fresh
`tools/run-mgba-probe.py` process.  The wrapper accepted its documented
teardown SIGSEGV only after parsing the newly written JSON.

## Natural Cure status-move arm

At the next AI command after Spore lands, both cases reach the zero-power
`lastLandedMove` arm of `ShouldSwitchIfNaturalCure`.  A selected switch leaves
`B_ACTION_SWITCH` (`2`) in `chosenActions[1]`; at that same command state the
ROM has copied the deterministic suitable selection to
`monToSwitchIntoId[1] = 1`.  (The temporary `AI_monToSwitchIntoId` sentinel is
consumed/reset by the controller before that frame ends.)

| Case / seed | attributed caller + LR | pre RNG → post RNG | u16 / parity | chosen action | `AI_monToSwitchIntoId` / selected index | command draw delta |
| --- | --- | --- | --- | --- | --- | ---: |
| odd success, 2 | `ShouldSwitchIfNaturalCure+0x89`, `0x08063149` | `0xf69f135c` → `0xcec9a69f` | 52937 / odd | `B_ACTION_SWITCH` (2) | sentinel arm; `monToSwitchIntoId[1] = 1` | 1 |
| even control, 1 (first draw) | `ShouldSwitchIfNaturalCure+0x89`, `0x08063149` | `0xde17efe2` → `0xc6145fad` | 50708 / even | `B_ACTION_SWITCH` (2) | falls through; selected index 1 after final coin | 2 |
| even control, 1 (final draw) | `ShouldSwitchIfNaturalCure+0xc1`, `0x08063181` | `0xc6145fad` → `0x78a1d31c` | 30881 / odd | `B_ACTION_SWITCH` (2) | sentinel arm; `monToSwitchIntoId[1] = 1` | included above |

The command frames are 341 (seed 2) and 340 (seed 1).  Neither successful
command has an active-move/setup/score/tie draw: seed 2 has exactly its
status-move-arm coin.  Seed 1 proves the source `else if`/fallback ordering:
the even zero-power coin does **not** select; it reaches the final Natural
Cure `Random() & 1`, whose odd result selects instead.  The suitable selector
adds zero singles RNG in both cases and deterministically chooses the earliest
legal bench, Vaporeon party index 1.  The Ghost-target/Bite super-effective
gate belongs to the pending Perish Song variant, not this Parasect staging.

### §7C Natural Cure prediction verdict

**Held, with the predicted even-control refinement.**  The odd return writes
the Natural Cure sentinel and the controller emits a switch after one command
draw.  The even control does not use an ordinary move ledger: because the
status move leaves no immunity/NVE candidate in this staged Parasect case, it
continues to the helper's final coin, so its command delta is two.  In both
cases single-battle suitable scoring consumes zero RNG and resolves party
index 1.

## Perish Song variant status

**Not banked in this bounded receipt.**  A first legal all-A staging with
Misdreavus Perish Song correctly reached the shared countdown, but it leaves
both active Pokémon marked; when the timer reaches zero, the end-turn script
faints both before a subsequent opponent command can invoke
`ShouldSwitchIfPerishSong`.  The necessary legal continuation is a
player-side escape from the shared Perish countdown before the AI's zero-timer
command.  This receipt deliberately does not substitute a different mechanic
or transient-state injection.  The source claim remains unaccepted here:
helper delta 0, suitable-selector delta 0, index 1, pending that legal input
route.
