// prep7: accepted Scene-ON presentation configs of the ten prep7 moves, rebuilt as the accepted tests build them (all numbers accepted values, never production-derived).
// Sources: the committed presets in src/animation/sceneOnPresentation.ts (Aerial Ace / Quick Attack / Feather Dance: PIDGEOTTO_TO_ONIX_* and PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_*),
// tools/compare/fixtures/*.json (Ice Punch, Rock Slide, Fake Tears, controller/field profiles), tools/compare/sleepTalkPortable.ts:104-145 (Sleep Talk stageFor), prep6Accepted.mjs (Fire Blast, Dragon Dance, Double Team).
//   acceptedConfig(move, o) -> { config, species:[attackerSpecies, targetSpecies], sourceWindow:[start,end], extras } | null   (o = "player-back" | "opponent-front" = attacker side)
import { readFileSync } from "node:fs";
import {
  PIDGEOTTO_TO_ONIX_AERIAL_ACE_PRESENTATION, PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_AERIAL_ACE_PRESENTATION,
  PIDGEOTTO_TO_ONIX_QUICK_ATTACK_PRESENTATION, PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_QUICK_ATTACK_PRESENTATION,
  PIDGEOTTO_TO_ONIX_FEATHER_DANCE_PRESENTATION, PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_FEATHER_DANCE_PRESENTATION,
  GROVYLE_TO_ONIX_ROCK_SLIDE_PRESENTATION,
} from "../../src/animation/sceneOnPresentation.ts";
import { acceptedConfig as acceptedPrep6, O, sideOf, otherSide } from "./prep6Accepted.mjs";
export { O, sideOf, otherSide };
export const rd = (p) => JSON.parse(readFileSync(p, "utf8"));
const cf = (n) => rd(`tools/compare/fixtures/${n}.json`);
export const MOVE_ID = { AERIAL_ACE: 332, QUICK_ATTACK: 98, ICE_PUNCH: 8, FAKE_TEARS: 313, SLEEP_TALK: 214, FEATHER_DANCE: 297, FIRE_BLAST: 126, DRAGON_DANCE: 349, DOUBLE_TEAM: 104, ROCK_SLIDE: 157 };
const bpc = (side) => (side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 });
const PIDGEOTTO = {
  AERIAL_ACE: [PIDGEOTTO_TO_ONIX_AERIAL_ACE_PRESENTATION, PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_AERIAL_ACE_PRESENTATION, "aerial-ace-pidgeotto-onix", "aerial-ace-player-pidgeotto-onix"],
  QUICK_ATTACK: [PIDGEOTTO_TO_ONIX_QUICK_ATTACK_PRESENTATION, PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_QUICK_ATTACK_PRESENTATION, "quick-attack-pidgeotto-onix", "quick-attack-player-pidgeotto-onix"],
  FEATHER_DANCE: [PIDGEOTTO_TO_ONIX_FEATHER_DANCE_PRESENTATION, PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_FEATHER_DANCE_PRESENTATION, "feather-dance-pidgeotto-onix", "feather-dance-player-pidgeotto-onix"],
};
export function acceptedConfig(move, o) {
  const side = sideOf(o), tside = otherSide(side), pl = side === "player";
  if (PIDGEOTTO[move]) {
    const [opp, plr, fo, fp] = PIDGEOTTO[move]; const preset = pl ? plr : opp; const f = cf(pl ? fp : fo);
    return { config: { move, attacker: preset.attacker, target: preset.target, fieldProfile: f.fieldProfile, ...(f.controllerProfile ? { controllerProfile: f.controllerProfile } : {}), moveTextStartAge: f.moveTextStartAge, animationAgeOffset: preset.animationAgeOffset ?? 0 },
      species: ["PIDGEOTTO", "ONIX"], sourceWindow: [f.denseWindow.startFrame, f.denseWindow.endFrame], extras: { ageOffset: preset.animationAgeOffset ?? 0, presentationAgeAtWindowStart: f.appStage.presentationAge, scenario: f.scenario, fixture: pl ? fp : fo }, scenario: f.scenario };
  }
  switch (move) {
    case "ICE_PUNCH": {
      const f = cf(pl ? "ice-punch-onix-grovyle" : "ice-punch-grovyle-onix"); const g = f.geometry;
      const mk = (x) => ({ species: x.species, geometry: { side: x.side, spriteCorner: x.spriteCorner, animationCenter: x.animationCenter, battlePositionCenter: x.battlePositionCenter } });
      return { config: { move, attacker: mk(g.attacker), target: mk(g.target), fieldProfile: f.fieldProfile, hpDrainProfile: f.hpDrainProfile, controllerDisplayProfile: f.controllerDisplayProfile ?? null, moveTextStartAge: f.presentation.moveTextStartAge },
        species: [g.attacker.species, g.target.species], sourceWindow: [f.denseWindow.startFrame, f.denseWindow.endFrame], extras: { ageOffset: 0, probeArguments: f.probeArguments, oracleFrame: f.appStage.oracleFrame }, scenario: `staged ${f.probe} ${f.probeArguments.join(" ")}` };
    }
    case "ROCK_SLIDE": {
      if (!pl === false) return null; // accepted evidence: opponent-front GROVYLE -> player-back ONIX only
      const f = cf("rock-slide-grovyle-onix"); const g = f.geometry;
      const mk = (x) => ({ species: x.species, geometry: { side: x.side, spriteCorner: x.spriteCorner, animationCenter: x.animationCenter, battlePositionCenter: x.battlePositionCenter } });
      return { config: { move, attacker: mk(g.attacker), target: mk(g.target), ...GROVYLE_TO_ONIX_ROCK_SLIDE_PRESENTATION }, species: ["GROVYLE", "ONIX"], sourceWindow: [f.denseWindow.startFrame, f.denseWindow.endFrame], extras: { ageOffset: 0, probeArguments: f.probeArguments }, scenario: `staged ${f.probe} ${f.probeArguments.join(" ")}` };
    }
    case "FAKE_TEARS": {
      const f = cf(`fake-tears-${pl ? "player-delcatty-opponent-shuckle" : "opponent-delcatty-player-shuckle"}`);
      return { config: { move, attacker: f.attacker, target: f.target, fieldProfile: f.fieldProfile, attackerPictureBounds: f.attackerPictureBounds, controllerPresentation: f.controllerPresentation },
        species: ["DELCATTY", "SHUCKLE"], sourceWindow: [f.sourceVisualWindow.startFrame, f.sourceVisualWindow.endFrame], extras: { ageOffset: 0, controllerWindow: f.controllerWindow, presentationAge: f.appStage.presentationAge }, scenario: f.scenario };
    }
    case "SLEEP_TALK": {
      const f = cf(`sleep-talk-${pl ? "player-seaking-opponent-onix" : "opponent-seaking-player-onix"}`);
      const A = pl ? { side: "player", spriteCorner: { x: 40, y: 67 }, animationCenter: { x: 72, y: 99 }, battlePositionCenter: bpc("player") } : { side: "opponent", spriteCorner: { x: 144, y: 12 }, animationCenter: { x: 176, y: 44 }, battlePositionCenter: bpc("opponent") };
      const T = pl ? { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: bpc("opponent") } : { side: "player", spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 88 }, battlePositionCenter: bpc("player") };
      return { config: { move, attacker: { species: "SEAKING", geometry: A }, target: { species: "ONIX", geometry: T } }, species: ["SEAKING", "ONIX"], sourceWindow: [f.sourceWindow.startFrame, f.sourceWindow.endFrame], extras: { ageOffset: 0, staging: f.staging }, scenario: f.scenario };
    }
    case "FIRE_BLAST": case "DRAGON_DANCE": case "DOUBLE_TEAM": return acceptedPrep6(move, o);
  }
  throw new Error("unknown move " + move);
}
