# S10 Gate 3 — status-animation family evidence

## Verdict

`Cmd_statusanimation` has an honest atomic boundary for the generic Battle
Script interpreter. The interpreter owns only the controller-idle barrier,
the one-byte selector, `GetBattlerForBattleScript` resolution, active/pending
controller bookkeeping, one-instruction advancement, and the typed semantic
receipt. One shared preparation/rules port owns the complete emission
decision for primary live status1, masked live status2, and explicit status
requests, returning either an exact frozen receipt or frozen suppression.

This slice does not apply a status, inspect or mutate battle rules, consume
RNG, model controller bytes, or model the visual animation/completion timing.

## Pinned source shape

The generated catalogs pin:

- dispatch slot/opcode `100 / 0x64`, `Cmd_statusanimation`;
- `battle_script_commands.c` lines 5753–5767 and definition SHA-256
  `32b0e911465c8133751e9d35babd513cc4c5f71df919c08b24eda4c41e38f792`;
- exactly 13 concrete starts:
  `804, 847, 2708, 2721, 2733, 2745, 2809, 2815, 2822, 2826, 2830, 2834, 2841`;
- exactly one `u8` operand at every start, using only `BS_ATTACKER` or
  `BS_EFFECT_BATTLER`;
- an outer `gBattleControllerExecFlags == 0` guard, selector resolution by
  `GetBattlerForBattleScript(gBattlescriptCurrInstr[1])`, and unconditional
  `gBattlescriptCurrInstr += 2` inside the idle branch;
- emission only when the resolved battler is not
  `STATUS3_SEMI_INVULNERABLE`, has `substituteHP == 0`, and
  `HITMARKER_NO_ANIMATIONS` is clear;
- the emitted controller payload selects status2 mode `FALSE` and carries the
  resolved battler's complete `status1`, then marks that battler pending.

`BtlController_EmitStatusAnimation` writes controller command 27, mode byte
zero, and the little-endian `u32 status1`; player and opponent controllers
launch `InitAndLaunchChosenStatusAnimation` and acknowledge only after
`statusAnimActive` clears. Those transport bytes and presentation timings are
source evidence only and are deliberately absent from the semantic receipt.

## Scene-OFF mechanicLab evidence

The committed
`tools/battle-lab/mechanic-toxic-statusanimation-off.json` is a legal
Level-50 `mechanicLab` scenario. It gives the active player stock Toxic
(move 92), gives the opponent Splash, uses `ppUps: [0,0,0,0]` for both move
overrides, and drives the normal Fight/Toxic controller inputs. Seed 1 is the
same OFF-profile Toxic case in the umbrella oracle smoke suite.

At the start of this bounded session, `bin/oracle info` confirmed the
Battle Scene OFF bootstrap (version 5, canonical hash
`9c89c74113f29e7d4595571c3aceb728417c4fe441b644ec0022fb498463f297`).
A dense 151-capture scratch run over frames 0..300 (stride 2) using the same
legal parties and controller route but seed `948121078` reached Toxic's real
accuracy check and missed: both battlers remained `status1 == 0`, the
player's Toxic PP changed 10→9, RNG changed
`0x4d313bb4`→`0xbf5fa417`, and no controller command 27 appeared. This is the
reachable no-status/no-receipt control.

The supervisor-owned service briefly became unavailable between probes; per
the worker-lane contract this worker did not restart it. After it recovered,
the committed seed-1 fixture captured frame 0 plus every frame 200..300
(**102 semantic captures**). The stock ROM consumed Toxic PP 10→9, changed
RNG `0x266378b7`→`0x7bac885e` at frame 226, and changed the opponent from
`status1 == 0 / none` to `status1 == 0x80 / toxic` at frame 264. Across the
complete dense effect window, opponent controller command 27 never appeared;
the next pending controller work began at frame 266 with command 2. This is
the reachable Scene-OFF suppression case: real Toxic created a major status,
then opcode 100 advanced without emitting its visual status-animation
controller receipt because `HITMARKER_NO_ANIMATIONS` was set.

Together the two real-ROM cases distinguish no-status (accuracy miss, opcode
100 never reached) from status-created-but-animation-suppressed (successful
Toxic, opcode 100 reached but no command 27). The emitted branch is not
reachable in the OFF profile used by the main lane; its exact receipt is
instead pinned by the handler and `BtlController_EmitStatusAnimation` source.

The current lab cannot directly stage substitute HP,
`STATUS3_SEMI_INVULNERABLE`, or `HITMARKER_NO_ANIMATIONS`; transient-state
injection is intentionally forbidden. Suppression predicates are therefore
covered by exact source evidence and rules-port Tier-1 cases, not fabricated
oracle state.

## Port and test boundary

The generic port accepts frozen `live-status1`, `masked-live-status2`, or
`explicit-status` requests and returns:

- `{ kind: "emit", receipt }`, where `receipt` is the exact frozen
  `{ kind: "status-animation", battler, isStatus2, status }`; or
- frozen `{ kind: "suppress" }`.

`null` means required rules context is unavailable and identity-blocks. The
handler validates the receipt against its request but does not derive live
status or suppression. Emission marks the resolved battler pending;
suppression advances while changing only the source-equivalent active
battler. Busy execution never decodes operands or calls either external port.

Tier-1 tests pin source hash/body/provenance, all starts and widths, idle/busy
ordering, selector null/invalid handling, emitted and suppressed results,
unavailable/malformed preparation, pending/ack, deterministic replay,
receipt identity, immutable rules/RNG ownership, malformed encodings, and
exact handler composition.

## Production rules-context follow-up

The abstract preparation boundary is now backed by the first durable
`BattleScriptRulesContext` slice. It contains exactly four indexed battlers
with `status1/status2/status3/substituteHP`, explicit attacker/effect-battler
role bindings, global `hitMarker`, and the already-landed
`multiHitCounter`. Construction validates source widths and deep-freezes the
context. No PP, damage, RNG, turn, controller-timing, or presentation field is
present.

The production selector port implements only the two
`GetBattlerForBattleScript` cases observed across opcodes 100--102:
`BS_ATTACKER == 1` and `BS_EFFECT_BATTLER == 2`. Missing bindings and all
other selector values remain unavailable. The source function has thirteen
other cases, but their required roles/position mapping are deliberately
deferred until an opcode family proves which surrounding context owns them;
this slice does not invent doubles or faint/scripting state.

The production preparation port reads live primary status, computes live
`status2 & wantedMask` (including the low confusion-turn bits), or forwards
the explicit raw mode/status. It returns frozen emission/suppression values
and shares the exact semi-invulnerable/substitute/no-animations predicates.
`createBattleScriptStatusRulesHandlers` composes it with the existing generic
control, source-command, and multi-hit factories;
`createBattleScriptStatusRulesExecution` and the named acknowledgement export
provide the production execution boundary without replacing any injected
unit-test port.

Fresh OFF runs of both committed zero-PP-Up fixtures are pinned test-only in
`tests/fixtures/status-animation-mechanic-lab-evidence.json`: Toxic consumes
PP **10→9** and creates opponent `status1 == 0x80`; Confuse Ray consumes PP
**10→9** and creates opponent `status2 == 4` / confusion turns **4**.
The evidence stays outside the production bundle; the runtime has no oracle
or fixture dependency.
