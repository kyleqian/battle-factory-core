// Probe: does the ready-lag "+7 family" residual track
// `dispatchDelay(opponent) < 101` (the discriminator
// `docs/ready-lag-discriminator-scout.md` proposed), or does it track a real
// ROM span the current `generatedBattleStartCommandReady` formula never
// models at all -- the switch-in ability/item/weather-check loop
// (`TryDoEventsBeforeFirstTurn`, reference/pokeemerald/src/battle_main.c:3841)
// plus the `ChooseAction` dispatch-and-AI-decision round trip
// (`HandleTurnActionSelectionState`, battle_main.c:4113-4168) that runs
// AFTER the player's own send-out animation completes and BEFORE the action
// menu is actually interactive?
//
// Method: run two structurally opposite fixtures dense (all pre-checkpoint
// frames captured) through a live Battle Scene OFF oracle and read
// `state.engine.{controllerExecFlags,playerControllerCommand,
// opponentControllerCommand}` directly -- the same RAM fields and the same
// ready predicate (`playerControllerCommand===18 && controllerExecFlags===1`)
// `tools/probe/probe-overrides-ready-lag.ts` already uses.
//
//   - factory-arbitrary-intro-yoshi-off.json: factoryLegal (real
//     generation), GRIMER/COMBUSKEN, dispatchDelay=125 (>=101, the
//     "confirmed 0-residual" regime per the discriminator dossier).
//   - factory-brain-gold-intro-dense-off.json: factoryBrain, NO
//     `overrides.parties` at all (a genuine, un-staged oracle RNG walk --
//     the exact untested cell `docs/overrides-ready-lag-probe.md` named:
//     "factoryBrain mode, no override, dispatchDelay>=101"), BLAZIKEN
//     opponent (dispatchDelay=132, also >=101) / DUGTRIO player.
//
// If the residual (oracle ready tick minus the current formula's naive
// prediction: throwVisible + 98 + cryDuration(player)) is the SAME on both
// -- despite one being factoryLegal/no-override and the other
// factoryBrain/no-override, both deep in the ">=101" regime -- then
// `dispatchDelay(opponent)<101` cannot be the discriminator: the gap is
// present even when every existing "it's the low-dispatchDelay regime" or
// "it's the overrides.parties construction" theory predicts zero.
//
// Read-only against a live oracle (POKEBENCH_ORACLE_URL, default :8014).
// Usage:
//   node --experimental-strip-types tools/probe/probe-ready-lag-chooseaction-handshake.ts

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LAB = path.join(HERE, "..", "battle-lab");
const BASE_URL = (process.env.POKEBENCH_ORACLE_URL ?? "http://127.0.0.1:8014").replace(/\/$/, "");

interface Capture {
  frame: number;
  state: {
    engine?: {
      controllerExecFlags: number;
      playerControllerCommand: number;
      opponentControllerCommand: number;
    };
  };
}

async function runDense(fixtureFile: string): Promise<Capture[]> {
  const req = JSON.parse(readFileSync(path.join(LAB, fixtureFile), "utf8"));
  delete req.preCheckpointCaptureFrames;
  req.preCheckpointCaptureAllFrames = true;
  const response = await fetch(`${BASE_URL}/v1/battle-lab/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!response.ok) {
    throw new Error(`POST /v1/battle-lab/run -> ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  const body = await response.json();
  return body.battleLab.preCheckpointCaptures as Capture[];
}

function firstFrameWhere(
  captures: Capture[],
  predicate: (e: NonNullable<Capture["state"]["engine"]>) => boolean,
  fromFrame = 0,
): number | null {
  for (const c of captures) {
    if (c.frame < fromFrame) continue;
    if (c.state.engine && predicate(c.state.engine)) return c.frame;
  }
  return null;
}

interface Scenario {
  label: string;
  fixtureFile: string;
  opponentDispatchDelay: number;
  playerCryDuration: number;
  playerLineVisualLag: number;
}

const SCENARIOS: Scenario[] = [
  {
    label: "GRIMER/YOSHI (factoryLegal, no override, dispatchDelay=125)",
    fixtureFile: "factory-arbitrary-intro-yoshi-off.json",
    opponentDispatchDelay: 125,
    playerCryDuration: 30, // GRIMER
    playerLineVisualLag: 13, // "Go! GRIMER!" len 11 -> 11-1+3
  },
  {
    label: "DUGTRIO/gold-dense (factoryBrain, NO override, dispatchDelay=132)",
    fixtureFile: "factory-brain-gold-intro-dense-off.json",
    opponentDispatchDelay: 132,
    playerCryDuration: 55, // DUGTRIO
    playerLineVisualLag: 14, // "Go! DUGTRIO!" len 12 -> 12-1+3
  },
  {
    label: "KADABRA/SHIZUKA (factoryLegal, no override, dispatchDelay=111)",
    fixtureFile: "factory-trainer-pic-shizuka-off.json",
    opponentDispatchDelay: 111,
    playerCryDuration: 76, // KADABRA
    playerLineVisualLag: 14, // "Go! KADABRA!" len 12 -> 12-1+3
  },
  {
    // ISSUES #87 option (c): the one committed compare window that crosses
    // the ready transition (silver Brain-reveal tail, 648/701).
    label: "TANGELA/DELCATTY silver Noland reveal (factoryBrain+overrides, dispatchDelay=86)",
    fixtureFile: "factory-round-battle7-noland-reveal-off.json",
    opponentDispatchDelay: 86,
    playerCryDuration: 60, // DELCATTY
    playerLineVisualLag: 15, // "Go! DELCATTY!" len 13 -> 13-1+3
  },
];

async function main(): Promise<void> {
  for (const scenario of SCENARIOS) {
    console.log(`\n--- ${scenario.label} ---`);
    const captures = await runDense(scenario.fixtureFile);

    // CONTROLLER_INTROTRAINERBALLTHROW == 47 (both battle_controller_player.c
    // and battle_controller_opponent.c share the same controller-command
    // enum ordinal). handoffTick is the first frame the OPPONENT is
    // dispatched that command.
    const handoffTick = firstFrameWhere(
      captures,
      (e) => e.opponentControllerCommand === 47 && e.controllerExecFlags !== 0,
      1000,
    );
    if (handoffTick === null) throw new Error("handoffTick not found");

    // Opponent's own intro (cry+anim+healthbox+shiny+4-tick delay) completes
    // when its exec bit clears -- then a 2-tick RecordMonsToDex+
    // PrintPlayerSendsOut relay, then the PLAYER is dispatched the same
    // command (47) for its own throw.
    const playerThrowDispatch = firstFrameWhere(
      captures,
      (e) => e.playerControllerCommand === 47 && e.controllerExecFlags !== 0,
      handoffTick,
    );
    if (playerThrowDispatch === null) throw new Error("playerThrowDispatch not found");
    const playerIntroComplete = firstFrameWhere(
      captures,
      (e) => e.controllerExecFlags === 0,
      playerThrowDispatch + 1,
    );
    if (playerIntroComplete === null) throw new Error("playerIntroComplete not found");
    const readyTick = firstFrameWhere(
      captures,
      (e) => e.playerControllerCommand === 18 && e.controllerExecFlags === 1,
      playerIntroComplete + 1,
    );

    const predictedThrowVisible = handoffTick + scenario.opponentDispatchDelay + scenario.playerLineVisualLag;
    const predictedPlayerComplete = predictedThrowVisible + 98 + scenario.playerCryDuration;
    const residual = readyTick !== null ? readyTick - predictedPlayerComplete : null;

    console.log(`  handoffTick (opponent marked busy):        ${handoffTick}`);
    console.log(`  player throw dispatch (RAM, execFlags==1):  ${playerThrowDispatch}  (predicted ${predictedThrowVisible})`);
    console.log(`  player intro complete (RAM, execFlags==0):  ${playerIntroComplete}  (predicted ${predictedPlayerComplete})`);
    console.log(`  ready predicate true (playerCmd==18 && execFlags==1): ${readyTick}`);
    console.log(`  current-formula-vs-RAM-ready residual:      ${residual === 0 ? "0 (EXACT)" : `+${residual}`}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
