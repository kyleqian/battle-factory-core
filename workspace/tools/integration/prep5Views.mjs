// Shared: builds the accepted-config presentation stage + view for each prep5 move (used by prep5TieScan.mjs). Run from workspace root.
import { readFileSync } from "node:fs";
import * as S from "../../src/animation/sceneOnPresentation.ts";
const fx = (n) => JSON.parse(readFileSync(`tools/compare/fixtures/${n}.json`, "utf8"));
const names = (m, a, t, o) => (o === "player" ? `${m}-player-${a}-opponent-${t}` : `${m}-opponent-${a}-player-${t}`);
export const HB = { player: { attacker: { species: "CHIMECHO", geometry: { side: "player", spriteCorner: { x: 40, y: 55 }, animationCenter: { x: 72, y: 95 }, battlePositionCenter: { x: 72, y: 80 } } }, target: { species: "ONIX", geometry: { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } } }, fieldProfile: { playerHp: 152, playerMaxHp: 161, opponentHp: 110, opponentMaxHp: 110, playerGender: "female", opponentGender: "male" } },
  opponent: { attacker: { species: "CHIMECHO", geometry: { side: "opponent", spriteCorner: { x: 144, y: 2 }, animationCenter: { x: 176, y: 34 }, battlePositionCenter: { x: 176, y: 40 } } }, target: { species: "ONIX", geometry: { side: "player", spriteCorner: { x: 40, y: 53 }, animationCenter: { x: 72, y: 93 }, battlePositionCenter: { x: 72, y: 80 } } }, fieldProfile: { playerHp: 110, playerMaxHp: 110, opponentHp: 151, opponentMaxHp: 161, playerGender: "male", opponentGender: "female" } } };
export const MOVES = [
  ["HEAL_BELL", (o) => ({ move: "HEAL_BELL", ...HB[o] }), S.sceneOnHealBellView, 261],
  ["MIST_BALL", (o) => ({ ...fx(names("mist-ball", "latias", "registeel", o)), move: "MIST_BALL" }), S.sceneOnMistBallView, 213],
  ["AROMATHERAPY", (o) => ({ ...fx(names("aromatherapy", "vileplume", "onix", o)), move: "AROMATHERAPY" }), S.sceneOnAromatherapyView, 400],
  ["PERISH_SONG", (o) => ({ ...fx(names("perish-song", "murkrow", "onix", o)), move: "PERISH_SONG" }), S.sceneOnPerishSongView, 259],
  ["DRAGON_RAGE", (o) => ({ ...fx(names("dragon-rage", "charmeleon", "onix", o)), move: "DRAGON_RAGE" }), S.sceneOnDragonRageView, 150],
  ["FOLLOW_ME", (o) => ({ ...fx(names("follow-me", "togetic", "onix", o)), move: "FOLLOW_ME" }), S.sceneOnFollowMeView, 185],
  ["TAUNT", (o) => ({ ...fx(names("taunt", "murkrow", "shuckle", o)), move: "TAUNT" }), S.sceneOnTauntView, 125],
  ["METRONOME", (o) => ({ ...fx(names("metronome", "chansey", "onix", o)), move: "METRONOME" }), S.sceneOnMetronomeView, 127],
  ["LEAF_BLADE", (o) => ({ ...fx(names("leaf-blade", "sceptile", "onix", o)), move: "LEAF_BLADE" }), S.sceneOnLeafBladeView, 224],
];
export function stageFor(cfgFn, o) {
  const f = cfgFn(o);
  const { move, attacker, target, fieldProfile } = f;
  return S.createSceneOnMovePresentation({ move, attacker, target, fieldProfile, ...Object.fromEntries(["attackerHead", "attackerTop", "targetProfile", "animationAgeOffset", "appStage"].filter((k) => f[k] !== undefined && k !== "appStage").map((k) => [k, f[k]])) });
}
