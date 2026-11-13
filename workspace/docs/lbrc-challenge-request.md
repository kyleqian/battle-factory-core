# lbr-c — `challenge-request`: the library hand-off at the attendant's save dialog

Step lbr-c (handoff item 0b, step 3). Additive library contract change. Engine and session side: `src/engine/factoryLobbyAttendant.ts`
(`saveDialogStarted`), `src/engine/core.ts` (`attendantRequestHold`), `src/factorySession.ts` (the event). Pinned by `tests/lbrc.test.ts`.

## The event

`{ type: "challenge-request", frame }` (`FactoryEvent`, `src/factoryContract.ts`, `lib-types/index.d.ts`).

* **When.** The challenge has ended (`challenge-end` already fired on this mount), the player talks to the singles attendant, picks
  CHALLENGE, LV. 50, answers YES to "I need to save the game. Is that okay?", and the ROM's save dialog starts: the save-info window's
  first frame, 10 ticks after the YES (`menuToSaveInfoFirstGlyph`; the same frame lbr-b draws "Would you like to save the game?" from).
  `frame` is the session frame of that tick.
* **At most once per mount**, never before `challenge-end`, never on a mount whose challenge has not ended (the Lobby is only reachable
  after an end today; the guard is `session.ended !== null`, and a test pins that the lbr-b behaviour is unchanged otherwise).
* NO / B at "I need to save the game" or an earlier menu give the farewell and no event; that path is unchanged.

## The hold

From that frame the engine stops advancing the attendant (`attendantRequestHold`, set by the session once the challenge has ended): input
is ignored, the picture is the save dialog's first frame and does not change, the Lobby RNG keeps running (nothing reads it) and the frame
counter keeps counting. It stays so until the host calls `destroy()`. **If the host does not handle the event, the game simply stays there:
that is the spec, not a bug** (the production route on the website before it wires the event looks like a frozen save window on the Lobby).
The hold exists for the library mount only (`mountFactoryGame`, `replayChallenge`): a session whose `challengeRequest` is `"hold"` (the
default).

## What the host does

1. At `challenge-end` (loss / retire; the trace and the upload stop there, as before) prefetch the next server challenge (seeds).
2. On `challenge-request`: `destroy()` the mount and `mountFactoryGame(...)` the prefetched challenge. The new mount starts at the draft,
   exactly as a first mount does. Nothing after `challenge-end` goes into the uploaded trace (see below).

## `challenge-end` and the trace are untouched

* `challenge-end` fires on the same tick as before (loss: with `battle-end` at the lost battle; retire: on the Lobby-entry tick). Pinned in
  `tests/lbrc.test.ts` and `tests/lbra.test.ts`.
* The session trace is the input recorder's runs; the event adds no frame and no run. Like every event it cuts the run in progress
  (`recorder.cut()`), which only splits idle / conversation frames after the end. `trace()` read at `challenge-end` ends at that event's frame and
  is a byte-identical prefix of every later read; `replayChallenge` of the trace-at-end and of the full trace return the same `ended`,
  `battles`, `streak`, `digest` (all in `tests/lbrc.test.ts`, loss and retire). The host uploads up to `challenge-end` only; the digest and the
  kernel events never change after it.

## Dev shell, soak, goalPlay, `play:random`

* **The soak** (`tools/soak/randomRoundSoakDriver.ts`) runs the engine `tick` directly with no `FactorySession`, so there is no hold and no
  event: `newChallengeFromLobby` still plays the next challenge from the Lobby in-game. Unchanged.
* **The dev shell** (`src/main.ts`, driven by `tools/browser/goalPlay.ts` and `play:random`) mounts with the internal option
  `challengeRequest: "continue"`: the event is reported (once) but the game is not held, so the in-game new challenge keeps working and
  `play:random --lobby-new-challenge` still starts new challenges from the Lobby. `?challengeRequest=hold` in the shell URL gives the
  host behaviour (a frozen save dialog; reload to leave it).
* `mountFactoryGame` always holds (the internal option is not part of the public contract; the public wrapper overrides it).
* `FactorySession` defaults to `"hold"` so `replayChallenge` and the live mount tick the same engine; tests that want the in-game new
  challenge after a loss on a `FactorySession` pass `challengeRequest: "continue"` (`tests/lbra.test.ts`).

## Not done / notes

* Mount option `start: "after-save"`: done, below.

## `start: "after-save"` (additive mount option)

`FactoryGameOptions.start?: "draft" | "after-save"` (also `ReplayOptions.start`, `FactorySessionOptions.start`; `lib-types`). Absent or `"draft"` = today.

* **What it starts at.** The walkable Lobby with the attendant's box open on "Please step this way." (`createAfterSaveState` in
  `src/factorySession.ts`: Lobby free-roam spawn, attendant state `step` at age 0, no ended challenge). The player's A closes the box, then
  the 64-frame door walk, the 37-frame fade, and the same hand-off the in-game new challenge uses (`enterChainedFactoryChallenge` with
  `carryForNewChallengeAfterLobby`): a fresh challenge-0 draft, win streak 0, rents 0, symbols and BP 0 (a new mount has no save).
* **A fresh challenge** the same way a normal mount is one: no `challenge-end` at the start (`ended` is null, the Lobby is "entered" before the
  first tick), events are the usual `battle-end` / `round-end` / `challenge-end`, and a RETIRE later in the mount reports `challenge-end retire`.
* **RNG semantics (ROM-faithful, and what is not).** In the ROM the Lobby runs on the free-running per-VBlank RNG, so the deal after the door
  walk depends on the whole conversation's length (nch231, lbr-b). A fresh mount has no conversation: `gameplaySeed` is the **Lobby RNG cursor on
  the first frame** (absent = the anchor boot cursor), the cursor advances one vblank step per tick like every Lobby frame, and the draft is
  dealt from the cursor of the hand-off tick. That is deterministic from (seed, the player's inputs: how long they take to press A), which the
  trace already holds, so a replay is exact; it is **not** the draft a plain `gameplaySeed` mount deals (that one deals directly from the seed, with
  no ROM counterpart either). The host stores the seed with the server challenge as before and must pass the same `start` to the mount, to
  `resume`'d mounts and to `replayChallenge`: a trace only replays with the start it was played from.
* The server picks `gameplaySeed` for the next challenge; the cursor the player's last conversation reached is not carried over (the previous mount is gone).
* Pinned in `tests/lbrc.test.ts` (start state, deal deterministic from the seed and different across seeds, whole challenge to `challenge-end`
  and a headless replay with the same `start`).
