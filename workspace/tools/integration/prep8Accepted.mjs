// prep8: accepted Scene-ON presentation configs of the ten allocator-plan-v2 moves, rebuilt by the accepted tests' own builders (tools/compare/<move>Framebuffer.ts
// <move>ConfigFor, swiftFramebuffer/trickFramebuffer, and the uproarActualCore.ts configFor body copied below since it is not exported). All numbers are accepted values, never production-derived.
//   acceptedConfig(move, o) -> { config, species:[attackerSpecies, targetSpecies], sourceWindow:[start,end], scenario } ; o = "player-back" | "opponent-front" = attacker side.
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { swiftConfigFor } from "../compare/swiftFramebuffer.ts";
import { trickConfigFor } from "../compare/trickFramebuffer.ts";
import { thunderboltConfigFor } from "../compare/thunderboltFramebuffer.ts";
import { frustrationConfigFor, frustrationRowsFor } from "../compare/frustrationFramebuffer.ts";
import { hornDrillConfigFor } from "../compare/hornDrillFramebuffer.ts";
import { seismicTossConfigFor } from "../compare/seismicTossFramebuffer.ts";
import { auroraBeamConfigFor } from "../compare/auroraBeamFramebuffer.ts";
import { stockpileConfigFor, stockpileRowsFor } from "../compare/stockpileFramebuffer.ts";
import { zapCannonConfigFor } from "../compare/zapCannonFramebuffer.ts";
export const rd = (p) => JSON.parse(readFileSync(p, "utf8"));
export const O = ["player-back", "opponent-front"];
export const sideOf = (o) => (o === "player-back" ? "player" : "opponent");
export const otherSide = (s) => (s === "player" ? "opponent" : "player");
export const MOVE_ID = { SWIFT: 129, TRICK: 271, THUNDERBOLT: 85, FRUSTRATION: 218, HORN_DRILL: 32, SEISMIC_TOSS: 69, AURORA_BEAM: 62, STOCKPILE: 254, UPROAR: 253, ZAP_CANNON: 192 };
export const EVIDENCE = { SWIFT: "swift", TRICK: "trick", THUNDERBOLT: "thunderbolt", FRUSTRATION: "frustration", HORN_DRILL: "horn-drill", SEISMIC_TOSS: "seismic-toss", AURORA_BEAM: "aurora-beam", STOCKPILE: "stockpile", UPROAR: "uproar", ZAP_CANNON: "zap-cannon" };
const rows = (path) => JSON.parse(gunzipSync(readFileSync(path)).toString("utf8")).frames;
function uproarConfig(o) { // copy of tools/compare/uproarActualCore.ts configFor (not exported there)
  const first = rows(`tools/compare/evidence/uproar-${sideOf(o)}-dense-state.json.gz`)[0]; const pb = o === "player-back";
  const vig = { species: "VIGOROTH", geometry: pb ? { side: "player", spriteCorner: { x: 40, y: 58 }, animationCenter: { x: 72, y: 90 }, battlePositionCenter: { x: 72, y: 80 } } : { side: "opponent", spriteCorner: { x: 144, y: 8 }, animationCenter: { x: 176, y: 40 }, battlePositionCenter: { x: 176, y: 40 } } };
  const onix = { species: "ONIX", geometry: pb ? { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } } : { side: "player", spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 80 }, battlePositionCenter: { x: 72, y: 80 } } };
  return { move: "UPROAR", attacker: vig, target: onix, fieldProfile: { playerHp: first.battlers.player.hp, playerMaxHp: first.battlers.player.maxHp, opponentHp: first.battlers.opponent.hp, opponentMaxHp: first.battlers.opponent.maxHp, playerGender: "male", opponentGender: "male" },
    animationInputs: { ringSlots: [3, 3, 3], noteSlots: [4, 5], spriteOrder: first.spriteOrder, attackerMatrixSlot: pb ? 1 : 2, ringMatrixSlots: [0, 0, 0], attackerCenter: pb ? { x: 72, y: 98 } : { x: 176, y: 40 } } };
}
const BUILD = {
  SWIFT: (o) => swiftConfigFor(o), TRICK: (o) => trickConfigFor(o), THUNDERBOLT: (o) => thunderboltConfigFor(o),
  FRUSTRATION: (o) => frustrationConfigFor(o, frustrationRowsFor(o)), HORN_DRILL: (o) => hornDrillConfigFor(o), SEISMIC_TOSS: (o) => seismicTossConfigFor(o),
  AURORA_BEAM: (o) => auroraBeamConfigFor(o), STOCKPILE: (o) => stockpileConfigFor(o, stockpileRowsFor(o)), UPROAR: uproarConfig, ZAP_CANNON: (o) => zapCannonConfigFor(o),
};
export function acceptedConfig(move, o) {
  const config = BUILD[move](o);
  const species = [config.attacker?.species ?? null, config.target?.species ?? null];
  const ev = move === "UPROAR" ? null : rd(`tools/compare/fixtures/${EVIDENCE[move]}-evidence.json`).orientations?.[o];
  return { config, species, sourceWindow: ev?.sourceWindow ? [ev.sourceWindow.startFrame, ev.sourceWindow.endFrame] : null, evidence: ev ? { denseState: ev.denseState ?? null, scenario: ev.scenario ?? null } : null };
}
if (process.argv[1] && process.argv[1].endsWith("prep8Accepted.mjs")) {
  const out = {};
  for (const m of Object.keys(MOVE_ID)) for (const o of O) { try { out[`${m}/${o}`] = acceptedConfig(m, o); } catch (e) { out[`${m}/${o}`] = { error: String(e).slice(0, 300) }; } }
  console.log(JSON.stringify(out, null, 1));
}
