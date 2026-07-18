// Dev-time extractor: S7 groundwork (docs/battle-turn-notes.md) - the pure
// numeric data turn resolution's damage/order calc needs that isn't
// captured by extract-moves.ts or extract-species-header.ts:
//   - the type-effectiveness chart (gTypeEffectiveness), a flat
//     (atkType, defType, multiplier) triple list terminated by TYPE_ENDTABLE
//   - the small set of named damage-formula constants that are plain
//     literals in source (critical-hit-chance table, HP-bar pixel/color
//     thresholds, the random damage-spread range) - NOT the full
//     CalculateBaseDamage item/ability modifier chain, which is dozens of
//     conditional branches (engine logic, out of this extractor's scope,
//     not "pure data").
// Sources:
//   src/battle_main.c            - gTypeEffectiveness[336], TYPE_MUL_x/TYPE_ENDTABLE defines (include/battle_main.h)
//   src/battle_script_commands.c - sCriticalHitChance[], ApplyRandomDmgMultiplier, Cmd_typecalc's STAB literal
//   src/battle_interface.c       - B_HEALTHBAR_PIXELS + GetHPBarLevel's color thresholds
// Run with:
//   node --experimental-strip-types tools/extract/extract-battle-formula-data.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const DATA_GEN = join(RUN_ROOT, "src", "data", "gen");

mkdirSync(DATA_GEN, { recursive: true });

const battleMainC = readFileSync(join(REF, "src", "battle_main.c"), "utf8");
const battleScriptCommandsC = readFileSync(join(REF, "src", "battle_script_commands.c"), "utf8");
const battleInterfaceC = readFileSync(join(REF, "src", "battle_interface.c"), "utf8");

// const u8 gTypeEffectiveness[336] = { TYPE_x, TYPE_y, TYPE_MUL_z, ... };
// terminated by a TYPE_ENDTABLE, TYPE_ENDTABLE, TYPE_MUL_NO_EFFECT sentinel
// triple (dropped from the output - it's a loop terminator, not a real
// matchup). TYPE_MUL_x -> numeric multiplier/10 per include/battle_main.h.
const TYPE_MUL_VALUES: Record<string, number> = {
  TYPE_MUL_NO_EFFECT: 0,
  TYPE_MUL_NOT_EFFECTIVE: 5,
  TYPE_MUL_NORMAL: 10,
  TYPE_MUL_SUPER_EFFECTIVE: 20,
};

function parseTypeEffectiveness(): { attackingType: string; defendingType: string; multiplierTenths: number }[] {
  const tableMatch = /const u8 gTypeEffectiveness\[\d+\] =\s*\{([\s\S]*?)\n\};/.exec(battleMainC);
  if (!tableMatch) throw new Error("gTypeEffectiveness table not found in battle_main.c");
  const rows: { attackingType: string; defendingType: string; multiplierTenths: number }[] = [];
  for (const m of tableMatch[1]!.matchAll(/(TYPE_\w+),\s*(TYPE_\w+),\s*(TYPE_MUL_\w+),/g)) {
    const [, atk, def, mul] = m as unknown as [string, string, string, string];
    if (atk === "TYPE_ENDTABLE" || def === "TYPE_ENDTABLE") continue;
    const multiplierTenths = TYPE_MUL_VALUES[mul];
    if (multiplierTenths === undefined) throw new Error(`unknown type multiplier constant ${mul}`);
    rows.push({ attackingType: atk, defendingType: def, multiplierTenths });
  }
  if (rows.length === 0) throw new Error("parsed 0 rows from gTypeEffectiveness");
  return rows;
}

// static const u16 sCriticalHitChance[] = {16, 8, 4, 3, 2}; - index is the
// move's crit stage (0 = base rate via held items/moves with high crit
// ratio bump the stage); value is "1 in N" (Cmd_critcalc: !(Random() % N)).
function parseCriticalHitChance(): number[] {
  const m = /static const u16 sCriticalHitChance\[\] = \{([^}]+)\};/.exec(battleScriptCommandsC);
  if (!m) throw new Error("sCriticalHitChance not found in battle_script_commands.c");
  return m[1]!.split(",").map((x) => Number.parseInt(x.trim(), 10)).filter((x) => !Number.isNaN(x));
}

// ApplyRandomDmgMultiplier: u16 randPercent = 100 - (Random() % 16); i.e. a
// uniform 85-100 (inclusive) damage-spread percentage.
function parseRandomDamageSpread(): { min: number; max: number } {
  const m = /u16 randPercent = 100 - \(rand % (\d+)\);/.exec(battleScriptCommandsC);
  if (!m) throw new Error("ApplyRandomDmgMultiplier's spread modulus not found");
  const modulus = Number.parseInt(m[1]!, 10);
  return { min: 100 - (modulus - 1), max: 100 };
}

// Cmd_typecalc: STAB is damage*15/10 (i.e. x1.5) when the attacker's type
// matches the move's type.
function parseStabMultiplier(): { numerator: number; denominator: number } {
  const numM = /gBattleMoveDamage = gBattleMoveDamage \* (\d+);\s*\n\s*gBattleMoveDamage = gBattleMoveDamage \/ (\d+);/.exec(
    battleScriptCommandsC,
  );
  if (!numM) throw new Error("STAB multiplier literals not found in Cmd_typecalc");
  return { numerator: Number.parseInt(numM[1]!, 10), denominator: Number.parseInt(numM[2]!, 10) };
}

// #define B_HEALTHBAR_PIXELS 48; GetHPBarLevel's color thresholds are
// filledPixelsCount > (B_HEALTHBAR_PIXELS * N / 100) for N = 50, 20.
function parseHealthbarConstants(): { pixels: number; greenAbovePercent: number; yellowAbovePercent: number } {
  const pixelsM = /#define B_HEALTHBAR_PIXELS (\d+)/.exec(battleInterfaceC);
  if (!pixelsM) throw new Error("B_HEALTHBAR_PIXELS not found in battle_interface.c");
  return { pixels: Number.parseInt(pixelsM[1]!, 10), greenAbovePercent: 50, yellowAbovePercent: 20 };
}

const output = {
  typeEffectiveness: parseTypeEffectiveness(),
  criticalHitChanceOneIn: parseCriticalHitChance(),
  randomDamageSpreadPercent: parseRandomDamageSpread(),
  stabMultiplier: parseStabMultiplier(),
  healthbar: parseHealthbarConstants(),
  baseDamageFormula:
    "floor(floor(floor(attack * power * (2*level/5 + 2)) / defense) / 50) [+1 if 0], then STAB (*15/10 if attacker's type == move's type), then type-effectiveness multiplier (/10), then the random spread (85-100%, floor) - source: src/pokemon.c CalculateBaseDamage + src/battle_script_commands.c Cmd_typecalc/Cmd_adjustnormaldamage. Item/ability/weather/screen modifiers not included here (engine-logic scope, not pure data) - see CalculateBaseDamage directly for the full modifier chain.",
};

writeFileSync(join(DATA_GEN, "type-effectiveness.json"), `${JSON.stringify({ typeEffectiveness: output.typeEffectiveness }, null, 0)}\n`);
writeFileSync(
  join(DATA_GEN, "damage-formula-constants.json"),
  `${JSON.stringify(
    {
      criticalHitChanceOneIn: output.criticalHitChanceOneIn,
      randomDamageSpreadPercent: output.randomDamageSpreadPercent,
      stabMultiplier: output.stabMultiplier,
      healthbar: output.healthbar,
      baseDamageFormula: output.baseDamageFormula,
    },
    null,
    0,
  )}\n`,
);
console.log(`wrote type-effectiveness.json (${output.typeEffectiveness.length} matchups) and damage-formula-constants.json`);
