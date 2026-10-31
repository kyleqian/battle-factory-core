# nch231 — start a new Factory challenge from the Lobby, without reloading

Scope: `appRoute === "generated-orchestrator"` (the route the app boots into), Battle Scene ON and OFF alike.
Out of scope: title screen, touch/gamepad, localStorage save, doubles attendant, exit warp.

## What the boot state is, in ROM terms

The app boots straight into the Lv-50 singles rental draft: "Select the first POKéMON." is open and interactive, cursor
on slot 1, nothing selected, no dialogue printing. Boot pool ONIX/MAGBY/BAYLEEF/BUTTERFREE/HAUNTER/QUILAVA, gameplay RNG
0xd2ddeec8. That is 6970 frames after the canonical bootstrap: continue, then the Lobby attendant flow, the PreBattleRoom
briefing and the fade into the draft. So "the flow the app boots into" = ROM `FactoryLobby attendant -> factory_init ->
InitFactoryChallenge -> PreBattleRoom -> rental draft`, with the front half already consumed.

## What the new path does

In the free-roam Lobby (`EngineState.lobbyFreeRoam`), pressing A while idle, standing at (4,8) facing north at the singles
attendant at (4,7) (`isFactoryLobbyFacingSinglesAttendant`, `src/engine/factoryLobbyFreeRoam.ts`), hands off to
`enterChainedFactoryChallenge` (`src/engine/core.ts`, the same field resets the record-choice auto-chain already used).
That generates the next draft from the LIVE gameplay RNG cursor via `generateFactoryChallengeDraft(carry, rngValue)`.

Kept across the handoff: gameplay RNG cursor (not reset to the boot anchor), presentation seed (Random2 stream), scene
setting, recorder (it is only an RLE input log).
Reset: everything the chained handoff resets (battle/draft/postwin state), and the carry per below.
Other lobby NPCs stay silent (A facing them does nothing, as before).

## Carry reset and the retire-streak answer

`carryForNewChallengeAfterLobby` (`src/engine/factoryRoundChaining.ts`): `factoryWinStreak = 0`, `rentsCount = 0`;
symbols / BP kept. Source: `InitFactoryChallenge`, battle_factory.c:208-212 (the Lobby `factory_init` path resets the
win streak and rent count unconditionally; it does not look at how the last challenge ended).

**Retire answer:** a RETIRE-YES lands in the Lobby via PreBattleRoom `AskRetireChallenge -> WarpToLobbyLost`; the next
attendant start goes through `InitFactoryChallenge`, which zeroes the streak and rents exactly as after a loss. So the
streak does NOT carry across a retire in the source either. (Whether the ROM also leaves the "lost" save flags set is
not modelled here; nothing in this engine reads them.)

## Finding: a loss does not reach the Lobby on this route

On the generated-orchestrator route, the record-choice answer after a loss (and after a 7-win with a non-null
`roundOutcome`) already auto-chains into the next challenge. That behaviour predates this step and I did not touch it
("no gameplay change before the terminal"). So the only way to reach the free-roam Lobby on this route is RETIRE-YES
(`roundOutcome === null`). The new path therefore serves that case; the loss case never gets to the attendant.
This means the "lose, walk to the attendant, press A" scenario in the brief is actually exercised with a retire.

## ROM frames skipped (documented divergence)

The attendant dialogue is not modelled; the handoff is direct. Skipped, relative to the ROM: attendant greeting and
the "Which challenge?" menu, the save prompt (`SaveBeforeChallenge`), "step this way", the door walk and warp into
PreBattleRoom, the PreBattleRoom comments / briefing, and the fade into the draft. The first draft frame is available
the frame after A. The timing of the real sequence was not measured against the ROM; the new draft's own contents and
interaction come from the existing generator and are unchanged.

Assumption: the idle player at (4,8) with facing north (reached by walking north into the attendant's tile, which
blocks) counts as standing facing the attendant; the predicate reads only position and facing, not the bump counter.

## Determinism

`tests/newChallengeFromLobby.test.ts` records a retire -> lobby -> walk -> A -> second draft session (scene ON and OFF)
and replays it from `createInitialState`; the replayed final state equals the live one. The same file checks: handoff
to a fresh draft from the live cursor (presentation seed, scene, route, carry reset kept/zeroed as above), a different
cursor deals a different pool, no-op for B / away from the attendant / a held A / mid-turn, and the reset from the
initial carry. The route gate (`generated-orchestrator` only) and silence of other NPCs are enforced in code (the
branch only fires for the singles-attendant cell; other cells were never given an A handler) but have no dedicated test.

## Policies (opt-in; defaults unchanged)

- `npm run soak -- --lobby-new-challenge`: after a lobby terminal the player walks to the attendant and presses A.
  Default soak (no flag) still ends at the lobby, so existing soak results do not move.
  `tests/soakLobbyNewChallenge.test.ts` covers it via a lobby start state: the "full" policy almost never reaches the
  lobby organically (12 seeds x 150k frames: none).
- `npm run play:random -- --lobby-new-challenge` (goal mode): wander, walk back to the attendant, press A, same page
  plays the next challenge. Default off: a lobby ends the page as before. With the flag the policy also picks RETIRE
  at 50% of continuation menus (`LOBBY_RETIRE_RATE`, `retireRate` on `RandomPlayer`), because the normal roll is
  ~0.6% per round and the lobby would otherwise be unreachable in a short run. This changes only flagged runs.
- The default goal-play lobby wander substitutes A -> B at the attendant so default behaviour is unchanged.
- Caveat: `play:random --uniform` (real keyboard fuzz) can now start a new challenge from a random A press at the
  attendant. That is intended by the spec ("A at the attendant starts one") but it is a behaviour change for the
  uniform mode only after a retire.

## Not verified

No ROM/oracle comparison of the attendant dialogue frames (not modelled). A live adapter is not whole-playable
arbitrary-history exactness.
