import { execFileSync } from "node:child_process";
import { deepStrictEqual } from "node:assert";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(
  resolve(root, "tests/fixtures/soft-boiled-animation-source-staging.json"),
  "utf8",
));

const completeRecordKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level",
  "moves", "nature", "ppUps", "shiny", "species",
];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(resolve(root, path))).digest("hex");
}

function assertStageShape(stage: Record<string, any>, playerAttacker: boolean): void {
  if (stage.profile !== "battle-scene-on" || stage.mode !== "mechanicLab"
    || stage.level !== 50 || stage.challengeNum !== 2 || stage.battleNum !== 2
    || stage.trainerId !== 110 || Object.keys(stage.overrides).join(",") !== "parties") {
    throw new Error("Soft Boiled stage shape drifted");
  }
  if ("captureFrames" in stage.trace || "preCheckpointCaptureAllFrames" in stage) {
    throw new Error("Soft Boiled staging must remain capture-free");
  }
  for (const segment of stage.trace.segments) {
    if (segment.frames <= 0 || segment.buttons.some((button: string) => button !== "A")) {
      throw new Error("Soft Boiled staging must remain ordinary A-only controller input");
    }
  }
  const parties = stage.overrides.parties as Record<string, Array<Record<string, unknown>>>;
  if (parties.player.length !== 3 || parties.opponent.length !== 3) {
    throw new Error("Soft Boiled staging must retain three complete records per side");
  }
  for (const mon of [...parties.player, ...parties.opponent]) {
    if (JSON.stringify(Object.keys(mon).sort()) !== JSON.stringify([...completeRecordKeys].sort())
      || JSON.stringify(Object.keys(mon.ivs as Record<string, unknown>).sort()) !== JSON.stringify(statKeys)
      || JSON.stringify(Object.keys(mon.evs as Record<string, unknown>).sort()) !== JSON.stringify(statKeys)
      || (mon.moves as unknown[]).length !== 4 || (mon.ppUps as unknown[]).length !== 4) {
      throw new Error("Soft Boiled stage record is incomplete");
    }
    for (const transient of ["hp", "status", "statStages", "volatile"]) {
      if (transient in mon) throw new Error(`Soft Boiled stage injects ${transient}`);
    }
  }
  const attacker = playerAttacker ? parties.player : parties.opponent;
  const defender = playerAttacker ? parties.opponent : parties.player;
  if (!attacker.every((mon) => mon.species === 113 && mon.level === 50
    && mon.nature === 7 && mon.item === 200 && mon.abilitySlot === 0
    && JSON.stringify(mon.evs) === JSON.stringify({ hp: 0, attack: 0, defense: 170, speed: 0, spAttack: 0, spDefense: 170 })
    && JSON.stringify(mon.moves) === JSON.stringify([135, 135, 135, 135]))) {
    throw new Error("Soft Boiled attacker must stay source-shaped Chansey with four legal move slots");
  }
  if (!defender.every((mon) => mon.species === 95 && mon.level === 50 && mon.abilitySlot === 0
    && JSON.stringify(mon.moves) === JSON.stringify([33, 33, 33, 33]))) {
    throw new Error("Soft Boiled stock AI must remain constrained only by four legal Tackle slots");
  }
}

function runStage(name: "playerBack" | "opponentFront", playerAttacker: boolean) {
  const stageFixture = fixture.stages[name];
  const stagePath = stageFixture.scenario as string;
  const stage = JSON.parse(readFileSync(resolve(root, stagePath), "utf8"));
  assertStageShape(stage, playerAttacker);
  if (sha256(stagePath) !== stageFixture.scenarioSha256) {
    throw new Error(`${name} scenario receipt drifted`);
  }
  const output = execFileSync("mktemp", ["-d", "/tmp/soft-boiled-stage.XXXXXX"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  execFileSync(resolve(root, "bin/oracle"), [
    "--profile", "battle-scene-on", "lab", stagePath, "-o", output,
  ], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const manifest = JSON.parse(readFileSync(resolve(output, "manifest.json"), "utf8"));
  const capture = manifest.captures.at(-1);
  const state = capture.state;
  const attacker = playerAttacker ? state.battlers.player : state.battlers.opponent;
  const defender = playerAttacker ? state.battlers.opponent : state.battlers.player;
  const receipt = {
    frame: capture.frame,
    framebufferSha256: capture.sha256,
    softBoiledPp: attacker.pp,
    consumedSoftBoiledPpSlot: attacker.pp.findIndex((pp: number) => pp === 9),
    attackerHp: attacker.hp,
    attackerMaxHp: attacker.maxHp,
    defenderPp: defender.pp,
    partyChecksums: {
      player: state.parties.player.map((mon: { checksumValid: boolean }) => mon.checksumValid),
      opponent: state.parties.opponent.map((mon: { checksumValid: boolean }) => mon.checksumValid),
    },
    battleOutcome: state.battleOutcome,
    allPartyChecksumsValid: [...state.parties.player, ...state.parties.opponent]
      .every((mon: { checksumValid: boolean }) => mon.checksumValid),
  };
  const endpoint = stageFixture.endpoint;
  for (const key of [
    "frame", "framebufferSha256", "softBoiledPp", "consumedSoftBoiledPpSlot", "attackerHp",
    "attackerMaxHp", "defenderPp", "partyChecksums", "battleOutcome", "allPartyChecksumsValid",
  ]) deepStrictEqual(receipt[key], endpoint[key], `${name} ${key} drifted`);
  if (receipt.attackerHp !== receipt.attackerMaxHp
    || receipt.softBoiledPp.reduce((sum: number, pp: number) => sum + pp, 0) !== 39
    || receipt.defenderPp.reduce((sum: number, pp: number) => sum + pp, 0) !== 139
    || receipt.battleOutcome !== 0 || !receipt.allPartyChecksumsValid) {
    throw new Error(`${name} semantic Soft Boiled receipt drifted`);
  }
  return receipt;
}

const orientations = {
  playerBack: [runStage("playerBack", true), runStage("playerBack", true)],
  opponentFront: [runStage("opponentFront", false), runStage("opponentFront", false)],
};
deepStrictEqual(orientations.playerBack[0], orientations.playerBack[1], "player-back runs differ");
deepStrictEqual(orientations.opponentFront[0], orientations.opponentFront[1], "opponent-front runs differ");

console.log(JSON.stringify({
  schema: "soft-boiled-stage-verification/v1",
  oracleProfile: "battle-scene-on",
  move: "MOVE_SOFT_BOILED",
  orientations,
}, null, 2));
