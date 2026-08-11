# `STATUS2ANIMATION` / `CHOSENSTATUSANIMATION` Gate-3 evidence

Scope: source audit, semantic receipt implementation, and Mechanics Lab
evidence. This note does not inject a battle result or make a pixel claim.

## Identity, bytes, and source coverage

| command | opcode | dispatch / handler | macro bytes | advance |
| --- | ---: | --- | --- | ---: |
| `STATUS2ANIMATION` | **101** (`0x65`) | `Cmd_status2animation`, `battle_script_commands.c:432,5769-5786` | selector `u8`, wanted-status2 mask `u32` | **6** |
| `CHOSENSTATUSANIMATION` | **102** (`0x66`) | `Cmd_chosenstatusanimation`, `battle_script_commands.c:433,5788-5805` | selector `u8`, is-status2 `u8`, explicit status `u32` | **7** |

The direct macro declarations are at
`reference/pokeemerald/asm/macros/battle_script.inc:582-592`. They use
`.byte` then `.4byte`, so the status word is little-endian. The wrapper
`chosenstatus2animation battler,status` at `:1378-1380` supplies the middle
byte as `0x1`; its status1 companion supplies `0x0`.

The generated observation catalog records all concrete starts in the assembled
`battle_scripts_1.s` program:

| opcode | starts | every observed operand-width sequence | catalog indexes |
| --- | ---: | --- | --- |
| 101 | **5** | `[1,4]` | 2760, 2792, 2799, 2803, 3033 |
| 102 | **2** | `[1,1,4]` | 2754, 2851 |

All seven source invocations are in `battle_scripts_1.s`; a whole-source scan
of that file plus `battle_scripts_2.s` finds none elsewhere:

| command | label / line | selector | status operand |
| --- | --- | --- | --- |
| 102 | `BattleScript_ThrashConfuses:3791` | `BS_ATTACKER` | explicit `STATUS2_CONFUSION` |
| 101 | `BattleScript_MoveUsedIsConfused:3799` | `BS_ATTACKER` | mask `STATUS2_CONFUSION` |
| 101 | `BattleScript_MoveUsedIsInLove:3843` | `BS_ATTACKER` | mask `STATUS2_INFATUATION` |
| 101 | `BattleScript_NightmareTurnDmg:3854` | `BS_ATTACKER` | mask `STATUS2_NIGHTMARE` |
| 101 | `BattleScript_CurseTurnDmg:3860` | `BS_ATTACKER` | mask `STATUS2_CURSED` |
| 102 | `BattleScript_MoveEffectConfusion:3933` | `BS_EFFECT_BATTLER` | explicit `STATUS2_CONFUSION` |
| 101 | `BattleScript_CuteCharmActivates:4194` | `BS_ATTACKER` | mask `STATUS2_INFATUATION` |

In particular, opcode 101 is not an arbitrary explicit volatile-status
animation instruction: it reads `wantedToAnimate = T1_READ_32(instr + 2)`
and transmits `gBattleMons[active].status2 & wantedToAnimate`. Opcode 102
reads `wantedStatus = T1_READ_32(instr + 3)` and transmits that exact word;
it **does not** read or mask `gBattleMons[active].status2`. Thus the two
confusion calls have materially distinct contracts: normal confused-turn
feedback reflects live confusion, while the effect/Thrash scripts explicitly
request the animation after their move-effect path has chosen it.

`STATUS2_CONFUSION` is the low three status2 bits (`0x00000007`), so its
low bits retain the current confusion-turn count in opcode 101's emitted word
(`include/constants/battle.h:129-130`). The controller's presentation helper
only tests that mask nonzero, alongside the documented priority order
infatuation, confusion, curse, nightmare, wrapped
(`battle_gfx_sfx_util.c:421-457`).

## Exact receipt gate

Both handlers have exactly the same outer gate:

1. If `gBattleControllerExecFlags != 0`, do nothing: no selector resolution,
   no controller command, no pending bit, and no instruction advance. The
   normal dispatcher only calls a script command with that word zero
   (`battle_util.c:3822-3826`). A machine therefore blocks at the same PC
   on a non-idle controller word.
2. Resolve byte 1 with `GetBattlerForBattleScript`, not `GetBattlerAtPosition`.
   This selector maps values such as `BS_ATTACKER` and `BS_EFFECT_BATTLER` to
   live script context (`battle_util.c:694+`).
3. Suppress the receipt when **any** shared predicate holds:
   `gStatuses3[battler] & STATUS3_SEMI_INVULNERABLE`,
   `gDisableStructs[battler].substituteHP != 0`, or
   `gHitMarker & HITMARKER_NO_ANIMATIONS`. The semi-invulnerable aggregate is
   underground/on-air/underwater and `HITMARKER_NO_ANIMATIONS` is bit 7
   (`include/constants/battle.h:178,184`). Suppression still advances six or
   seven bytes; it does not mark a controller pending.
4. Otherwise call `BtlController_EmitStatusAnimation(B_COMM_TO_CONTROLLER,
   isStatus2, status)` and `MarkBattlerForControllerExec(active)`; then make
   the fixed advance once.

`BtlController_EmitStatusAnimation` serializes exactly six bytes:
`[CONTROLLER_STATUSANIMATION (26), isStatus2, status byte 0, byte 1, byte 2,
byte 3]` (`battle_controllers.c:1297-1305`; controller enum at
`battle_controllers.h:187-214`). `STATUS2ANIMATION` therefore emits
`[26, 1, LE32(liveStatus2 & wantedMask)]`; `CHOSENSTATUSANIMATION` emits
`[26, rawInstrByte2, LE32(explicitStatus)]`. The raw middle byte matters:
the source type is `bool8`, but opcode 102 carries its byte unnormalised.

Normal player, opponent, partner, recorded, and link controller families
reconstruct bytes 2--5 little-endian and call
`InitAndLaunchChosenStatusAnimation(buffer[1], status)` before waiting for
`statusAnimActive` to clear (for example player
`battle_controller_player.c:2768-2776`, opponent `:1725-1733`). The helper
sets that flag, chooses the first supported animation in the above priority,
and clears it immediately for unsupported/zero status. Wally and Safari
instead acknowledge this controller command as no-ops
(`battle_controller_wally.c:1303-1306`, `battle_controller_safari.c:507-510`).
Receipt acknowledgement must consequently mean controller work was accepted,
not universal visual completion or a fixed Scene-OFF/ON duration.

## Generated-catalog pins

Pinned source and catalog hashes:

| input | SHA-256 |
| --- | --- |
| `battle_script_commands.c` (both handler records) | `e0847cd2aa83ee5e18134c32baad348b7c763095cf59efa33da67c4a4e90120c` |
| `Cmd_status2animation` definition | `8fec336dae0b5ada2c3e2b5fc475fc0762098c9cd2774f6808dfdd9e6675d781` |
| `Cmd_chosenstatusanimation` definition | `033b302b866ee39e0b9d5706c72cec285d22639e84521d06893b69a92297c430` |
| macro source | `0a8e1c3bdf4c49d07b2e09ff8ab524812a5217b9735106e1b79b6be261a6db7e` |
| `battle_scripts_1.s` | `4ac3e610b68c11ef0f4e4c0fc62ddba7fda5a8400e43705428868978ec7551a6` |
| `battle_scripts_2.s` | `6f64a730ba75ff062587ca99fa6416899b865edae30d0f349d5a155e08d22c11` |
| handler catalog | `b065d380af048cff9f1f4574c9f4a679d95ac7918b7ab9a2ebda2a2cf3c8b32a` |
| lexical catalog | `c7528e7afce898835a23ede8e3fafd174c4f0f9b8a68edf59d8f533348517174` |
| observation catalog | `9f6c162de155a337355e17423302f372911913a8aa706ead5b08c72159f1dda3` |
| program catalog | `77dd161fa630f6245beeee29efbaa6068e5f258a7eb8eb517bfc73e5479255f6` |
| joined candidate audit | `2f54df1d993c05eeb517a90a00023d79b00285ef7411670618880979953d3c91` |

The five catalogs agree on 249 slots, 3,306 concrete starts, 232 used slots,
and 17 unused slots. The lexical catalog retains 93 `T1_READ_*` calls overall;
these handlers each retain precisely one `T1_READ_32`, and each has the sole
literal pointer write shown above. They are intentionally not classified as
unconditional fixed-width candidates because their outer idle `if` is real
control flow (the candidate audit has 22 such unconditional candidates).

## Mechanics Lab request and evidence

The refreshed Battle Scene OFF contract documents `mechanicLab` as
post-initialization loadout staging only; status2 must be created by ordinary
stock-ROM input. This is the exact Level-50 request, run against
`/v1/battle-lab/run` through `bin/oracle lab`:

```json
{"schemaVersion":1,"mode":"mechanicLab","profile":"battle-scene-off","trainerId":110,"challengeNum":2,"battleNum":2,"level":50,"playerSetIds":[274,354,338],"opponentSetIds":[291,339,327],"seed":948121078,"overrides":{"battlers":{"player":{"moves":[109,33,33,33],"ppUps":[0,0,0,0]},"opponent":{"moves":[150,150,150,150],"ppUps":[0,0,0,0],"ability":0}}},"trace":{"segments":[{"frames":2,"buttons":["A"]},{"frames":30,"buttons":[]},{"frames":2,"buttons":["A"]},{"frames":866,"buttons":[]}],"captureFrames":[0,900]}}
```

It is a legal Factory base party with only active loadout substitution; the
ordinary inputs open Fight and choose Confuse Ray (move 109). Fresh OFF-service
captures prove ROM-created volatile status, not injection:

| frame | framebuffer SHA-256 | player PP0 | opponent PP1 | opponent status2 / confusion turns |
| ---: | --- | ---: | ---: | --- |
| 0 | `7e8e418a19090cd3e434ef6390f835d197a7fdb7a99fe8958f217ba517a4f386` | 10 | 40 | `0 / 0` |
| 900 | `3d78ece90f13fbad3537d0af206af2a78b4991988e39db13b755cbc615f82dbf` | 9 | 39 | **`4 / 4`** |

The player consumes Confuse Ray PP (`10 -> 9`), the opponent then consumes
Splash PP (`40 -> 39`), and the service reports its live `status2 == 4` and
`volatile.confusionTurns == 4`. This agrees with the refreshed live smoke
assertion in `oracle/battle-lab-smoke-test.py:326-373`. A direct local Python
probe was also attempted through `tools/run-mgba-probe.py`; it correctly
reported the local `_cffi_backend` import failure, while the shared mGBA-backed
OFF service supplied the successful authoritative run above.

The exact request is now committed as
`tools/battle-lab/mechanic-confuse-ray-status2animation-off.json`. A fresh
2026-07-24 OFF run reproduced both framebuffer hashes above. A checked
manifest assertion confirmed zero PP Ups at both captures, player Confuse Ray
PP **10→9**, and stock-created opponent `status2` / confusion turns **0→4**.
The fixture SHA-256 is
`ebc9b0d780a38af64b20aa92958e6c479092541be8d4149250420069c52a71c3`;
the fresh scratch manifest SHA-256 is
`871decd46fef2148633955baed69fcb36dda1a824e66255ee8a921c693cfdefc`.

## Minimum preparation boundary and verdicts

`battleScriptSourceCommands.ts` now installs opcodes 100--102 through one
read-only preparation port, not a rules mutation API:

```ts
type StatusAnimationRequest =
  | { kind: "live-status1" }
  | { kind: "masked-live-status2"; wantedMask: number }
  | { kind: "explicit-status"; isStatus2: number; status: number };

type PrepareStatusAnimation<RulesContext extends object> = (
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  battler: BattleScriptBattlerId,
  request: StatusAnimationRequest,
) =>
  | Readonly<{ kind: "emit"; receipt: Readonly<{
      kind: "status-animation";
      battler: BattleScriptBattlerId;
      isStatus2: number;
      status: number;
    }> }>
  | Readonly<{ kind: "suppress" }>
  | null;
```

The interpreter owns the idle gate, exact `[u8,u32]` / `[u8,u8,u32]`
decoding, source-pinned constant values, selector resolution/validation,
immutable request/receipt validation, active/pending scheduler bookkeeping,
and fixed advance/suppression behavior. The port alone reads live
status1/status2, semi-invulnerable status3, substitute HP, and hit-marker
suppression. `null` means unavailable source context and identity-blocks;
suppression advances with no event or pending mark. The interpreter consumes
neither RNG nor rule transitions and mutates no status or PP.

- **Opcode 101 — IMPLEMENTED.** Its
  request is `masked-live-status2`; the external port owns the required live
  `status2 & wantedMask` read. It must not be approximated by forwarding the
  script mask or by adding status2 to interpreter state.
- **Opcode 102 — IMPLEMENTED.** Its
  request is `explicit-status`; it must forward the explicit `u32` and raw
  middle `u8` unchanged while still using the same suppression preparation.
  It must not mask the explicit word against current status2.

Both verdicts are semantic receipt implementations only. Defer animation
selection, controller callbacks/acks, status sprite lifetime, Scene-ON/OFF
timing, rendering, pixels, rules/RNG, and all status mutation to their owning
layers.

Tier-1 pins both source definitions/hashes, all **5+2** generated starts,
operand widths and `.4byte` layout, all four observed status2 constants,
explicit raw-u8 and full-u32 forwarding, the live-mask versus explicit-word
distinction, idle ordering, unavailable selector/rules context, invalid
battlers, frozen suppression, emitted/pending/ack behavior, malformed widths
and expressions, request/receipt mismatch rejection, deterministic replay,
rules/RNG identity, and exact three-opcode composition.
