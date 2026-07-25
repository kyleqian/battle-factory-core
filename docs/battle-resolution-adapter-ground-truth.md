# `BattleResolution` adapter ground truth (ROADMAP S10 step (iv) PREP, part 3)

Answers the two claims `docs/round-controller-outcome-seam.md` §4 piece 5
flagged as "not confirmed against source/oracle — verify before
implementation," plus one adjacency question. No `src/` production code is
touched by this doc's worker. Builds on `docs/faint-outcome-ground-truth.md`
(opcode topology) and `docs/round-controller-outcome-seam.md` (the adapter
seam itself).

Rerunnable verify script: `tools/probe/verify-battle-resolution-ground-truth.ts`
(`node --experimental-strip-types tools/probe/verify-battle-resolution-ground-truth.ts`).

## 1. Draw reachability

**Verdict: reachable.** A Level-50 Factory 3v3 singles battle can end with
`gBattleOutcome == B_OUTCOME_DREW` (3). Confirmed from source; live staging
of a positive case was attempted and assessed as not cheap within this
session's budget (see "Staging attempt" below) — the verdict rests on source
citations plus the already-live-verified `Cmd_checkteamslost` party-sum
mechanics from `docs/faint-outcome-ground-truth.md` §2c.

### 1a. Every writer of `gBattleOutcome`, classified

Exhaustive grep over `reference/pokeemerald/src/*.c` for assignments to
`gBattleOutcome` (not reads):

| Site | Gate | Applies to Factory singles? |
| --- | --- | --- |
| `battle_script_commands.c:3564` `\|= B_OUTCOME_LOST`, `:3577` `\|= B_OUTCOME_WON` | `Cmd_checkteamslost`, unconditional (non-link) | **Yes — the only live-outcome writer** |
| `battle_util.c:500/505` `\|= LOST/WON` (link run) | `& (BATTLE_TYPE_LINK\|BATTLE_TYPE_RECORDED_LINK)` | No — Factory never sets these |
| `battle_util.c:481` `B_OUTCOME_RAN`, `:535` `B_OUTCOME_MON_FLED` | wild-battle run mechanics | No — Factory is always `BATTLE_TYPE_TRAINER` |
| `battle_main.c:1874`, `battle_script_commands.c:6489/6491` | `PLAYER_TELEPORTED`/`MON_TELEPORTED` (Roar vs. roamer) | No — wild-only bug path |
| `battle_main.c:5061/5067` `B_OUTCOME_FORFEITED` | link disconnect | No |
| `battle_controller_{link_opponent,link_partner,player_partner,wally,recorded_opponent,recorded_player,player,safari}.c` (`gBattleOutcome = gBattleBufferA[...][1]`, some XOR `B_OUTCOME_DREW`) | controller-side copy of an *already-decided* value, transmitted via `Cmd_endlinkbattle`/`BtlController_EmitEndLinkBattle` (`battle_script_commands.c:5340`) | Plumbing only — re-assigns the same value locally per controller, never originates WON/LOST/DREW |
| `battle_pike.c:1625`, `battle_pyramid.c:861`, `trainer_hill.c:411`, `recorded_battle.c:502`, `frontier_util.c:841` | facility-specific resets to 0 | Not Factory |

**Conclusion:** for a live Factory singles trainer battle, `Cmd_checkteamslost`
(`battle_script_commands.c:3534-3619`, already the subject of
`docs/faint-outcome-ground-truth.md` §1a row 12) is the **only** mechanism
that ever writes `B_OUTCOME_WON`/`LOST`/`DREW`. Its logic (already quoted in
full in the prior doc, re-verified here at `:3560-3578`):

```c
if (HP_count == 0)          // player party sum
    gBattleOutcome |= B_OUTCOME_LOST;
HP_count = 0;
... // enemy party sum
if (HP_count == 0)
    gBattleOutcome |= B_OUTCOME_WON;
```

`B_OUTCOME_DREW` is `3` = `B_OUTCOME_WON (1) | B_OUTCOME_LOST (2)`
(`include/constants/battle.h:100-102`). Because both branches **OR** into the
same byte and the link-only "empty battler spot" branch below them is gated
on `BATTLE_TYPE_LINK|BATTLE_TYPE_RECORDED_LINK` (never set by Factory, so
Factory always falls straight through to `gBattlescriptCurrInstr += 5`,
`:3617`), **any call to `checkteamslost` that observes both parties' summed
HP at 0 sets both bits in that single call — and the OR also survives across
separate calls**: `HandleFaintedMonActions()`'s state-4 loop
(`battle_util.c:1930-1943`, already documented in the prior doc's §1) invokes
`BattleScript_HandleFaintedMon` — and therefore `checkteamslost` — **once per
fainted battler**, and nothing in the loop or in `BattleTurnPassed`
(`battle_main.c:3956-4013`) checks `gBattleOutcome != 0` to short-circuit
*before* every already-fainted battler has been processed for that action.
So DREW is reachable either by one `checkteamslost` call seeing both sums at
0 simultaneously, or by two sequential calls (processing battler 0 then
battler 1) each independently OR-ing in their own bit, as long as both
zero-outs happen before `BattleTurnPassed` falls through to
`sEndTurnFuncsTable[gBattleOutcome & 0x7F]` dispatch (`battle_main.c:4948`,
`B_OUTCOME_DREW` mapped to `HandleEndTurn_BattleLost`,
`battle_main.c:559`).

### 1b. Named mechanisms that can zero both sides' last mon in one episode

For a 3v3 party to hit `HP_count == 0`, **all three** of that side's slots
must already be at 0 (species-nonzero, non-egg slots only,
`battle_script_commands.c:3554/3568`) — i.e. this always requires "both
sides already down to their final mon," with the final action zeroing both
finals together. Four source-confirmed mechanisms can do that zeroing in a
single episode (a plain damaging move cannot: only one side takes damage per
action, so a natural "mutual KO" under normal sequential turn order is
structurally impossible without one of these):

1. **Explosion/Self-Destruct, final-mon-vs-final-mon.**
   `BattleScript_EffectExplosion` (`data/battle_scripts_1.s:374-403`):
   `setatkhptozero` (`:380`) unconditionally zeros the user's own HP *before*
   the target's damage is even calculated, then the normal damage sequence
   (`damagecalc`/`typecalc`/`adjustnormaldamage`/`datahpupdate BS_TARGET`)
   can also zero the target. If both are their side's last mon, both HP
   sums hit 0 within the same script, before `HandleFaintedMonActions` ever
   runs.
2. **Destiny Bond avenging faint.** `Cmd_accuracycheck`'s normal-hit path
   (`battle_script_commands.c:1099-1183`, the `else` branch used by every
   `accuracycheck ..., ACC_CURR_MOVE` call — which is what plain
   `BattleScript_EffectHit` uses at `data/battle_scripts_1.s:243`) ends by
   calling `JumpIfMoveFailed(7, move)` (`:1181`), which calls
   `TrySetDestinyBondToHappen()` (`:1020`) whenever the hit didn't fail —
   i.e. **any** move that connects, not just OHKO/Pursuit-switch moves,
   checks the target's `STATUS2_DESTINY_BOND` and sets
   `HITMARKER_DESTINYBOND` (`battle_script_commands.c:8285-8294`). Later in
   the *same* script, `Cmd_tryfaintmon`'s target-faint branch
   (`:3020-3026`) sees that marker and, if the attacker is still alive,
   pushes `BattleScript_DestinyBondTakesLife` with
   `gBattleMoveDamage = gBattleMons[attacker].hp` — killing the attacker
   too, in the same script, before `HandleFaintedMonActions` runs.
3. **Perish Song simultaneous double-timeout.**
   `HandleWishPerishSongOnTurnEnd` (`battle_util.c:1804-1854`) processes one
   battler with `perishSongTimer == 0` per call
   (`BattleScript_PerishSongTakesLife`, sets that battler's HP to 0), then
   `return`s. Critically, `BattleTurnPassed` (`battle_main.c:3968-3972`)
   re-enters `HandleFaintedMonActions()` **before** re-entering
   `HandleWishPerishSongOnTurnEnd` on every subsequent call — so if *both*
   active battlers have `perishSongTimer == 0` on the same end-of-turn pass,
   the first one's faint gets fully processed (including its own
   `checkteamslost` call, which may already set one outcome bit) and only
   *then* does the second battler's Perish Song faint get processed — but
   nothing gates `HandleWishPerishSongOnTurnEnd` on `gBattleOutcome == 0`
   either, so the second faint (and its own `checkteamslost` call, OR-ing in
   the second bit) still runs within the same `BattleTurnPassed` episode,
   before `sEndTurnFuncsTable` dispatch.
4. **Recoil-move self-KO ordering.** `BattleScript_EffectRecoil` falls
   straight into plain `BattleScript_EffectHit`
   (`data/battle_scripts_1.s:897-901`) with
   `MOVE_EFFECT_RECOIL_25 | MOVE_EFFECT_CERTAIN` set as the move's "on-hit"
   effect. `seteffectwithchance` (which always fires for a `CERTAIN` effect)
   runs `BattleScript_MoveEffectRecoil` (`data/battle_scripts_1.s:3938-3947`)
   — `datahpupdate BS_ATTACKER` then `tryfaintmon BS_ATTACKER` — **before**
   `BattleScript_EffectHit`'s own trailing `tryfaintmon BS_TARGET`
   (`:264`). So the attacker's own recoil-faint check runs, in-script,
   ahead of the target's faint check; if both are last-mon and the recoil
   (guarded off by `jumpifability BS_ATTACKER, ABILITY_ROCK_HEAD`,
   `data/battle_scripts_1.s:3940`) also drops the attacker to 0, both zero
   out in the same script.

### 1c. Factory-legal Level-50 eligibility (generated catalog, not assumed)

`src/data/gen/battle-frontier-mons.json` (882 entries) is the full rental
set catalog; **Level-50 eligibility is `index <= 849`**
(`FRONTIER_MONS_HIGH_TIER = 849`, `reference/pokeemerald/include/constants/battle_frontier_mons.h:862`,
gated at `reference/pokeemerald/src/battle_factory.c:350`: `if (lvlMode ==
FRONTIER_LVL_50 && monId > FRONTIER_MONS_HIGH_TIER) continue;` — the naive
"any of the 882 entries" reading is wrong for Level 50 specifically; entries
850-881 are Open-Level-only). Filtering to `index <= 849` (850 eligible
entries) and grepping `moves`:

| Move | Level-50-eligible sets carrying it |
| --- | -: |
| `MOVE_EXPLOSION` | 24 (e.g. `FRONTIER_MON_GLALIE_2`, `FRONTIER_MON_FORRETRESS_3`) |
| `MOVE_SELF_DESTRUCT` | 2 (`FRONTIER_MON_PINECO`, `FRONTIER_MON_SUDOWOODO_2`) |
| `MOVE_DESTINY_BOND` | 10 (e.g. `FRONTIER_MON_WOBBUFFET_2`, `FRONTIER_MON_GENGAR_4`) |
| `MOVE_PERISH_SONG` | 4 (`FRONTIER_MON_MURKROW_2`, `FRONTIER_MON_JYNX_2`, `FRONTIER_MON_ALTARIA_2`, `FRONTIER_MON_MISDREAVUS_3`) |
| `MOVE_DOUBLE_EDGE` / `MOVE_TAKE_DOWN` / `MOVE_SUBMISSION` (recoil) | 52 / 5 / 2 |

All four named mechanisms have real, Level-50-eligible carriers on **both**
the player's rentable pool and the opponent's trainer pool (same catalog,
`reference/pokeemerald/src/battle_factory.c:389+`/`:421+` — both
`gPlayerParty` and `gEnemyParty` are built from `gFacilityTrainerMons`).
Draw is therefore not a theoretical corner case reachable only through
illegal or Open-Level-only sets — it's reachable through ordinary Level-50
Factory rentals on either side.

### Staging attempt (why no live positive case is banked)

A live positive case needs a real 3v3 battle where **both** sides are
already down to their last party member (2 of 3 slots on each side
genuinely fainted from real damage — `overrides.parties` forbids injecting
HP/status directly, and requires exactly three real Pokémon per side, so
there is no shortcut via empty/egg slots). That requires two independent,
alternating attrition sequences (whichever side's active mon is stronger at
each moment wins that exchange; naively leading with one strong "finisher"
on one side just depletes the other side's fodder while that side's own
bench stays fully healthy and undamaged, never reaching "last mon" — this
was worked through in detail and is a structural property, not a tuning
slip) before the terminal double-KO action, i.e. at least 4 precisely
speed/power-tiered turns of real combat, plus the terminal action itself.
This session used its live-oracle budget instead on the two
explicitly-required Q2 live probes (§2) and confirmed the mechanism (§1a/1b)
and legality (§1c) from source instead; a follow-up session with a
dedicated budget for it is the right way to bank a positive
`battleOutcome === 3` capture. The **source verdict stands on its own**:
`Cmd_checkteamslost`'s OR-based accumulation (already live-verified for the
WON case in `docs/faint-outcome-ground-truth.md` §2c) plus the four named
same-episode double-zeroing mechanisms make DREW a straightforward
consequence of already-proven mechanics, not a new hypothesis.

## 2. Post-battle party status semantics

**Mechanism (source-certain, both legs): the party record is live-synced to
`gBattleMons[battler].status1`/`.hp` on every change during battle, via the
same controller round-trip both directions.**

- **Status application** (e.g. `Cmd_seteffectprimary`/`seteffectsecondary`'s
  shared status-set logic, `battle_script_commands.c:2476-2489`): sets
  `gBattleMons[gEffectBattler].status1 |= ...` then immediately
  `BtlController_EmitSetMonData(B_COMM_TO_CONTROLLER, REQUEST_STATUS_BATTLE,
  0, sizeof(...status1), &gBattleMons[gEffectBattler].status1)` +
  `MarkBattlerForControllerExec` (`:2488-2489`). Ten total call sites emit
  `REQUEST_STATUS_BATTLE` across `battle_script_commands.c`/`battle_util.c`
  (grepped) — every status1 mutation syncs out immediately, not just at
  battle end.
- **The controller's receiving end** (`battle_controller_player.c`,
  `SetPlayerMonData`): `case REQUEST_STATUS_BATTLE: SetMonData(&gPlayerParty[monId],
  MON_DATA_STATUS, &gBattleBufferA[gActiveBattler][3]); break;` (`:2102-2104`).
  `REQUEST_HP_BATTLE` is the identical pattern for HP (`:2107-2109`, fed by
  `Cmd_datahpupdate`'s own emit at `battle_script_commands.c:1974`). The
  opponent-side controller (`battle_controller_opponent.c:1063/1069`) mirrors
  this into `gEnemyParty`.
- **Fainting clears it the same way.** `Cmd_cleareffectsonfaint`
  (`battle_script_commands.c:3063-3078`, already registered as opcode 27 per
  `PROGRESS.md` #437): `gBattleMons[gActiveBattler].status1 = 0;` followed by
  the identical `BtlController_EmitSetMonData(..., REQUEST_STATUS_BATTLE, ...,
  &gBattleMons[gActiveBattler].status1)` (`:3070-3071`) — the zeroed value
  round-trips into `SetMonData(&gPlayerParty[monId], MON_DATA_STATUS, 0)` via
  the exact same handler.
- **Switching out does not touch status.** `Cmd_returnatktoball`
  (`:4595-4603`) emits only `BtlController_EmitReturnMonToBall` — a pure
  sprite-return animation command, no `SetMonData` call at all. Switching
  *in* (`Cmd_getswitchedmondata` + `Cmd_switchindataupdate`,
  `:4606-4666`) re-fetches the incoming mon's **entire** `BattlePokemon`
  record from the party via `REQUEST_ALL_BATTLE` (which reads
  `MON_DATA_STATUS` among other fields — confirmed at the controller's
  `GetMonData`-style read case) and overwrites `gBattleMons[battler]`
  wholesale. So the round-trip is exact: status set while active → synced
  out to the party → nothing clears it while benched → re-read verbatim from
  the party when it comes back in.

### (a) Fainted mon — party status reads "none"

**Confirmed.** Direct consequence of `Cmd_cleareffectsonfaint`'s sync above
— by the time a battler is done fainting, its party record's `MON_DATA_STATUS`
is `0` regardless of what it was before death. Live-corroborated (existing
committed evidence, no new fixture needed): rerunning the already-committed
`tools/battle-lab/mechanic-hit-chain-ko-off.json` (used throughout
`docs/faint-outcome-ground-truth.md`) shows all three fainted opponent party
slots at the terminal frame (1734) reading `hp: 0`, `status: { kind: "none"
}` (verify script check 1). That fixture's fainted mons never carried a
prior status, so it confirms the "no status → faints to none" floor; the
*clearing* of a genuinely prior status is established by the source citation
above (no live capture of "statused mon faints" was completed this session
— see the note at the end of §2).

### (b) Benched mon, statused then switched out — status persists

**Confirmed**, entirely from the source round-trip above: nothing in the
switch-out path clears `status1`, and the party record already holds the
correct value (synced at the moment the status was first applied, not
deferred to battle end or to the switch itself). The new probe in §2c below
additionally demonstrates, live, that the party record is genuinely
kept **live** during battle (matching `gBattleMons` in real time, not just
snapshotted once) — the mechanism §2b's persistence argument depends on.
A direct oracle capture of the literal "paralyze → voluntarily switch out →
read bench slot" sequence was attempted this session (`overrides.parties` +
a scripted `DOWN, A, RIGHT, A` mid-battle menu sequence, mirroring the
button pattern documented in `docs/soundproof-off-evidence.md`'s
`mechanic-uproar-soundproof-switch-off.json`) but the switch never actually
occurred in three attempts (`battlers.player.partyIndex` stayed `0`
throughout every trace tried) — the exact menu-cursor timing/geometry for a
voluntary switch via `overrides.parties` wasn't nailed down within this
session's budget, unlike the *forced* post-faint switch-in the existing KO
fixture already exercises successfully (AI-side only). This leg's verdict
rests on the source round-trip, not an oracle capture of the exact scenario;
flagging the switch-menu button sequence as a good bounded follow-up probe.

### (c) Surviving active mon's status — reads real `status1`

**Confirmed live**, new probe (`tools/battle-lab/mechanic-party-status-sync-off.json`,
committed this session): a Wobbuffet given `MOVE_REST`×4 uses Rest while
active; the opponent (a second, faster, harder-hitting Wobbuffet with
`MOVE_STRENGTH`×4) also lands a hit the same window. Captured at frame 320:
`state.parties.player[0]` reads `hp: 224`, `maxHp: 265`,
`status: { kind: "sleep", turns: 3 }` — matching
`state.battlers.player.status`/`.hp` exactly (the same live-sync mechanism
as §2's citations, observed directly). Slots 1/2 (never sent out) correctly
still read `hp: 265/265`, `status: { kind: "none" }` — confirming the seam
doc's third assumption ("undamaged bench keeps its pre-battle value") too,
as a free byproduct. Verify script check 2.

## 3. Adjacency: anything besides `datahpupdate` mutating party HP/status on the WIN path?

**HP:** `Cmd_datahpupdate` (`battle_script_commands.c:1844-1974`) is the
**only** call site that emits `REQUEST_HP_BATTLE` from a hit-chain/faint
context (grepped: the only other `REQUEST_HP_BATTLE` emit in
`battle_script_commands.c` is line 6584, `Cmd_dofaintanimation`'s ally-sibling
`itemrecovery`-style path — unrelated to Factory singles' plain WIN path).
No other HP-mutating call sites exist on the minimal WIN path already
enumerated in `docs/faint-outcome-ground-truth.md` §1a.

**Status:** the minimal WIN path (`docs/faint-outcome-ground-truth.md`
§1a rows 1-14) touches status1 exactly where already documented —
`Cmd_cleareffectsonfaint`'s clear (row 5) — and nowhere else. Specifically
checked and ruled out:

- **`Cmd_getexp`'s Frontier short-circuit** (`case 6`,
  `battle_script_commands.c:3519-3527`): `gBattleMons[fainted].item =
  ITEM_NONE; gBattleMons[fainted].ability = ABILITY_NONE;` — item/ability
  only, **no `BtlController_EmitSetMonData` call at all** here, so this
  doesn't even reach the party (matches `docs/faint-outcome-ground-truth.md`
  §1a row 10's existing citation, which already scoped `getexp`'s Factory
  path to item/ability, not HP/status).
- **`TryClearRageStatuses`** (`battle_util.c:1973-1980`, the closest
  "adjacent end-of-turn clear" to the task brief's `TryClearRageAndFuryCutter`
  mention — no function of that exact name exists in this source tree):
  only touches `status2` (`STATUS2_RAGE`, a volatile/non-persisted flag, not
  part of `MON_DATA_STATUS`) and never HP; not called from any point on the
  WIN-terminal path anyway (it's a residual-turn-start clear, not
  faint-adjacent).
- **`FaintClearSetData()`** (`battle_main.c:3264-3345`, called from
  `Cmd_cleareffectsonfaint` — already fully enumerated in `PROGRESS.md` #437):
  every field it touches (`status2`/`status3`/stat stages/`DisableStruct`/
  `ProtectStruct`/cross-battler infatuation/`gLastMoves` etc.) is
  battle-only volatile state, not a `MON_DATA_*` field — none of it reaches
  `gPlayerParty`/`gEnemyParty`.
- **`Cmd_endlinkbattle`-adjacent code**
  (`battle_script_commands.c:5340`, `BtlController_EmitEndLinkBattle`):
  transmits the already-decided `gBattleOutcome` byte to each controller for
  end-of-battle bookkeeping (save-block writes, `battle_records.c`,
  `battle_tower.c:2687`, etc.) — none of those handlers touch
  `gPlayerParty`/`gEnemyParty` HP or status; they read `gBattleOutcome`
  and `gBattleResults`, not per-mon data.

**Conclusion:** at terminal time, the kernel's party HP/status state (once
piece 1's party-HP slice exists and is kept in sync at every
`datahpupdate`/status-set/`cleareffectsonfaint` call, mirroring the real
game's round-trip) equals exactly what the real game's party would show —
no other mechanism on the WIN path needs to be modeled to keep that
invariant.

## Adapter implications for piece 5

- **The `draw` outcome is a real, reachable case for ordinary Level-50
  Factory play** (§1c: Explosion/Self-Destruct/Destiny Bond/Perish
  Song/recoil moves are all present in Level-50-eligible rentals on both
  sides), not a theoretical corner the adapter can dismiss as
  Frontier-impossible. The seam doc's tentative "assert/throw on `draw` for
  now" is still the right minimal step-(iv) scope (since
  `roundController.BattleResolution.outcome` is genuinely only `"win" |
  "loss"` today and widening that vocabulary is out of scope for the
  adapter alone) — but it should be tracked as a **known, confirmed gap**
  the adapter will eventually hit in real play, not filed away as unlikely.
  Whoever eventually resolves it should widen `BattleResolution.outcome` to
  a 3-valued type (or decide a Factory-specific draw ruling — the real game
  routes `B_OUTCOME_DREW` through `HandleEndTurn_BattleLost`, i.e. treats it
  as a loss for turn-dispatch purposes, `battle_main.c:559`; that's a
  plausible fallback mapping if a 3-valued type isn't wanted, but it wasn't
  the brief's decision to make here).
- **`id`/`maxHp` still need to come from the pre-battle snapshot, not the
  kernel** — unchanged from the seam doc; nothing in §2 changes that.
- **`status` for all six slots can now be derived with a single uniform
  rule, not three separate cases:** once the party-HP/status slice (piece 1)
  is kept synced the same way the real game keeps it synced (write on every
  `datahpupdate` and every status-set/-clear, not just at battle end), the
  adapter does **not** need fainted-mon/active-mon/benched-mon special
  cases at all — it can just read the slice's `status` field per slot
  verbatim, because the kernel's own bookkeeping (if it mirrors this
  session's confirmed real-game round-trip) already has the fainted slot at
  `"none"`, the active slot at its real `status1`, and every benched slot
  (touched or untouched) at whatever it was last synced to. This is a
  simplification opportunity for piece 1's design, not just a piece 5
  correctness fix.
