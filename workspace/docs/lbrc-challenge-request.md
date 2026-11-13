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

* Mount option `start: "after-save"`: see the section at the end of this file.
