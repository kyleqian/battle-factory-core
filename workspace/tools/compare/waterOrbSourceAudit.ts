import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const scripts = readFileSync(
  resolve(root, "reference/pokeemerald/data/battle_anim_scripts.s"),
  "utf8",
);
const water = readFileSync(
  resolve(root, "reference/pokeemerald/src/battle_anim_water.c"),
  "utf8",
);
const rock = readFileSync(
  resolve(root, "reference/pokeemerald/src/battle_anim_rock.c"),
  "utf8",
);
const mons = readFileSync(
  resolve(
    root,
    "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
  ),
  "utf8",
);
const constants = readFileSync(
  resolve(
    root,
    "reference/pokeemerald/include/constants/battle_frontier_mons.h",
  ),
  "utf8",
);
const components = JSON.parse(readFileSync(
  resolve(root, "src/data/gen/battle-animation-components.json"),
  "utf8",
)) as {
  moves: Array<{ move: string; componentIds: string[] }>;
};
const coverage = JSON.parse(readFileSync(
  resolve(root, "ANIMATION_COVERAGE.json"),
  "utf8",
)) as { entries: Array<{ move: string; status: string }> };

function need(haystack: string, needle: string): void {
  if (!haystack.includes(needle)) throw new Error(`missing ${needle}`);
}

function carrier(
  label: string,
  nextLabel: string,
  id: number,
  species: string,
  move: string,
): string {
  need(constants, `#define ${label}`);
  const numeric = constants.match(
    new RegExp(`#define ${label}\\s+(\\d+)`),
  )?.[1];
  if (Number(numeric) !== id) {
    throw new Error(`${label} expected ${id}, got ${numeric}`);
  }
  const body = mons.slice(
    mons.indexOf(`[${label}]`),
    mons.indexOf(`[${nextLabel}]`),
  );
  need(body, `.species = ${species}`);
  need(body, move);
  return body;
}

const hydro = scripts.slice(
  scripts.indexOf("Move_HYDRO_PUMP:"),
  scripts.indexOf("Move_SIGNAL_BEAM:"),
);
const whirlpool = scripts.slice(
  scripts.indexOf("Move_WHIRLPOOL:"),
  scripts.indexOf("Move_FLY:"),
);

if ((hydro.match(/call HydroPumpBeams/g) ?? []).length !== 11
  || (hydro.match(/createsprite gHydroPumpOrbSpriteTemplate/g) ?? []).length !== 4) {
  throw new Error("Hydro Pump expected 11 calls × 4 WATER_ORB creates");
}
if ((hydro.match(/call HydroPumpHitSplats/g) ?? []).length !== 6
  || (hydro.match(/createsprite gWaterHitSplatSpriteTemplate/g) ?? []).length !== 2) {
  throw new Error("Hydro Pump expected 6 calls × 2 WATER_IMPACT creates");
}
for (const token of [
  "loadspritegfx ANIM_TAG_WATER_ORB",
  "loadspritegfx ANIM_TAG_WATER_IMPACT",
  "createvisualtask AnimTask_ShakeMon, 5, ANIM_ATTACKER, 0, 2, 40, 1",
  "createvisualtask AnimTask_StartSinAnimTimer, 5, 100",
  "createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 3, 0, 37, 1",
  "panse SE_M_HYDRO_PUMP",
  "setalpha 12, 8",
  "blendoff",
]) need(hydro, token);

if ((whirlpool.match(/call WhirlpoolEffect/g) ?? []).length !== 3
  || (whirlpool.match(/createsprite gWhirlpoolSpriteTemplate/g) ?? []).length !== 6) {
  throw new Error("Whirlpool expected 3 calls × 6 WATER_ORB creates");
}
for (const token of [
  "loadspritegfx ANIM_TAG_WATER_ORB",
  "simple_palette_blend",
  "playsewithpan SE_M_WHIRLPOOL",
  "createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 0, 2, 50, 1",
  "setalpha 12, 8",
]) need(whirlpool, token);

for (const token of [
  "const struct SpriteTemplate gHydroPumpOrbSpriteTemplate",
  ".callback = AnimToTargetInSinWave",
]) need(water, token);
for (const token of [
  "const struct SpriteTemplate gWhirlpoolSpriteTemplate",
  ".callback = AnimParticleInVortex",
  "sAffineAnim_Whirlpool",
]) need(rock, token);

const masquerain = carrier(
  "FRONTIER_MON_MASQUERAIN_2",
  "FRONTIER_MON_FURRET_2",
  303,
  "SPECIES_MASQUERAIN",
  "MOVE_HYDRO_PUMP",
);
need(masquerain, "BATTLE_FRONTIER_ITEM_LAX_INCENSE");
need(masquerain, "F_EV_SPREAD_SP_ATTACK | F_EV_SPREAD_DEFENSE");
need(masquerain, "NATURE_QUIET");
const wailmer = carrier(
  "FRONTIER_MON_WAILMER_1",
  "FRONTIER_MON_MAWILE_1",
  170,
  "SPECIES_WAILMER",
  "MOVE_WHIRLPOOL",
);
need(wailmer, "BATTLE_FRONTIER_ITEM_LAX_INCENSE");
need(wailmer, "F_EV_SPREAD_SP_DEFENSE | F_EV_SPREAD_DEFENSE");
need(wailmer, "NATURE_DOCILE");

const expected = {
  MOVE_HYDRO_PUMP: [
    "asset:ANIM_TAG_WATER_IMPACT",
    "asset:ANIM_TAG_WATER_ORB",
    "sprite:gHydroPumpOrbSpriteTemplate",
    "sprite:gWaterHitSplatSpriteTemplate",
    "subroutine:HydroPumpBeams",
    "subroutine:HydroPumpHitSplats",
    "task:AnimTask_ShakeMon",
    "task:AnimTask_StartSinAnimTimer",
    "visualCommand:blendoff",
    "visualCommand:clearmonbg",
    "visualCommand:monbg",
    "visualCommand:panse",
    "visualCommand:setalpha",
    "visualCommand:splitbgprio",
  ],
  MOVE_WHIRLPOOL: [
    "asset:ANIM_TAG_WATER_ORB",
    "sprite:gWhirlpoolSpriteTemplate",
    "subroutine:WhirlpoolEffect",
    "task:AnimTask_ShakeMon",
    "visualCommand:clearmonbg",
    "visualCommand:monbg",
    "visualCommand:setalpha",
    "visualCommand:simple_palette_blend",
    "visualCommand:splitbgprio",
  ],
} as const;
for (const [move, componentIds] of Object.entries(expected)) {
  const actual = components.moves.find((entry) => entry.move === move);
  if (JSON.stringify(actual?.componentIds) !== JSON.stringify(componentIds)) {
    throw new Error(`${move} component graph changed`);
  }
}
for (const move of ["MOVE_MUD_SHOT", "MOVE_WATER_GUN"]) {
  if (!coverage.entries.some(
    (entry) => entry.move === move && entry.status === "exact",
  )) {
    throw new Error(`${move} reusable primitive proof is no longer exact`);
  }
}

console.log(
  "WATER_ORB source audit: Hydro Pump set 303/challenge 2, "
  + "44 sine orbs + 12 proved impacts; Whirlpool set 170/challenge 0, "
  + "18 affine vortex orbs; shared exact controls MUD_SHOT + WATER_GUN",
);
