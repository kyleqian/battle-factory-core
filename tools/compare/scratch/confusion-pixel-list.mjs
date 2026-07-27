import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createSceneOnMovePresentation,
} from "../../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../../src/engine/core.ts";
import { getMonGender } from "../../../src/engine/monGender.ts";

const scratch = process.argv[2];
const frame = Number(process.argv[3]);
const fixture = JSON.parse(
  readFileSync("tools/compare/fixtures/confusion-player-kadabra-opponent-onix.json", "utf8"),
);
const probe = JSON.parse(readFileSync(join(scratch, "probe.json"), "utf8"));
const framesByNum = new Map(probe.frames.map((f) => [f.frame, f]));
const GENDER_RATIO = { KADABRA: 63, ONIX: 127 };
const startOracle = framesByNum.get(fixture.denseWindow.startFrame);
const playerGender = getMonGender(GENDER_RATIO.KADABRA, startOracle.playerPersonality);
const opponentGender = getMonGender(GENDER_RATIO.ONIX, startOracle.opponentPersonality);
const stage = createSceneOnMovePresentation({
  move: "CONFUSION",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: {
    playerHp: startOracle.player.hp,
    playerMaxHp: startOracle.player.maxHp,
    opponentHp: startOracle.opponent.hp,
    opponentMaxHp: startOracle.opponent.maxHp,
    playerGender: playerGender === "genderless" ? undefined : playerGender,
    opponentGender: opponentGender === "genderless" ? undefined : opponentGender,
  },
});
const age = fixture.appStage.presentationAge + frame - fixture.denseWindow.startFrame;
const engine = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } };
const app = render(engine);
const oracleRgb = readFileSync(join(scratch, "rgb", `${String(frame).padStart(5, "0")}.rgb`));
let printed = 0;
for (let y = 0; y < 160 && printed < 30; y += 1) {
  for (let x = 0; x < 240 && printed < 30; x += 1) {
    const ai = (y * 240 + x) * 4;
    const oi = (y * 240 + x) * 3;
    const ar = app[ai], ag = app[ai + 1], ab = app[ai + 2];
    const or_ = oracleRgb[oi], og = oracleRgb[oi + 1], ob = oracleRgb[oi + 2];
    if (ar !== or_ || ag !== og || ab !== ob) {
      console.log(`${x},${y}: app=${ar},${ag},${ab} oracle=${or_},${og},${ob}`);
      printed += 1;
    }
  }
}
