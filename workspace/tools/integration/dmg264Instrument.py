"""dmg264 (docs/dmg264-type-order-screens.md): turn an extracted engine tree of the UNFIXED parent (git archive of the commit before the dmg264 fix) into the observation-only classifier tree.
  python3 tools/integration/dmg264Instrument.py <tree>
The tree still returns the OLD (unfixed) results. Every calc where ROM row order of the type table (#206) or the defender side's Reflect / Light Screen (#208) would change the result is appended,
per census seed, to the file in DMG264_LOG as one JSON line {seed, scene, events}. Sites: base damage with screens (hit chain), typecalc / typecalc2 opcodes (reference = the same handler text
with the fixed row-order loop), applyTypeEffectiveness (AI damage sims, probes), battleAiSwitchInto candidate damage."""
import sys
from pathlib import Path
T = Path(sys.argv[1])
def edit(rel, fn):
    p = T / rel; s = p.read_text(); n = fn(s); assert n != s, rel; p.write_text(n)
def sub(s, old, new):
    assert s.count(old) == 1, (old, s.count(old)); return s.replace(old, new, 1)
(T / "src/engine/dmg264Log.ts").write_text('''export function dmg264Log(ev: Record<string, unknown>): void { ((globalThis as any).__dmg264Events ??= []).push(ev); }
export function refRows(moveType: string, t: readonly [string, string], table: readonly any[], hasForesight: boolean): any[] {
  const rows: any[] = [];
  for (const row of table) {
    if (row.attackingType === "TYPE_FORESIGHT") { if (hasForesight) break; continue; }
    if (row.attackingType !== moveType) continue;
    if (row.defendingType === t[0] || (row.defendingType === t[1] && t[0] !== t[1])) rows.push(row);
  }
  return rows;
}
''')
OLD_LOOP_HEAD = '''    const hasForesight = (targetBattler.status2 & BATTLE_SCRIPT_STATUS2_FORESIGHT) !== 0;
    const distinctTypes = targetBattler.types[0] === targetBattler.types[1]
      ? [targetBattler.types[0]]
      : targetBattler.types;
    for (const defType of distinctTypes) {
      if (hasForesight && defType === "TYPE_GHOST" && (moveType === "TYPE_NORMAL" || moveType === "TYPE_FIGHTING")) {
        continue;
      }
      const entry = TYPE_EFFECTIVENESS.find(
        (candidate) => candidate.attackingType === moveType && candidate.defendingType === defType,
      );
      if (!entry) continue;
'''
NEW_LOOP_HEAD = '''    const hasForesight = (targetBattler.status2 & BATTLE_SCRIPT_STATUS2_FORESIGHT) !== 0;
    for (const entry of __refRows(moveType, targetBattler.types, TYPE_EFFECTIVENESS, hasForesight)) {
'''
def hit(s):
    s = 'import { dmg264Log as __dmg264Log, refRows as __refRows } from "./dmg264Log.ts";\n' + s
    # --- #208: base damage with / without the defender side's screens
    s = sub(s, "    isCriticalHit: rulesContext.critMultiplier === 2,\n    moveEffect: moveRow.effect,\n    weather: rulesContext.weather,",
        "    isCriticalHit: rulesContext.critMultiplier === 2,\n    sideStatusReflect: (globalThis as any).__dmg264Screens === true && (rulesContext.sideStatuses[targetBattler.side] & 1) !== 0,\n    sideStatusLightScreen: (globalThis as any).__dmg264Screens === true && (rulesContext.sideStatuses[targetBattler.side] & 2) !== 0,\n    moveEffect: moveRow.effect,\n    weather: rulesContext.weather,")
    s = sub(s, "export function calculateBattleScriptBaseDamageWithPowerForCurrentMove(\n  rulesContext: BattleScriptRulesContext,\n): { readonly damage: number; readonly movePower: number } {",
        '''export function calculateBattleScriptBaseDamageWithPowerForCurrentMove(
  rulesContext: BattleScriptRulesContext,
): { readonly damage: number; readonly movePower: number } {
  const g = globalThis as any;
  g.__dmg264Screens = false;
  const old = __dmg264Orig(rulesContext);
  g.__dmg264Screens = true;
  let full: { readonly damage: number; readonly movePower: number };
  try { full = __dmg264Orig(rulesContext); } finally { g.__dmg264Screens = false; }
  if (old.damage !== full.damage) {
    const tb = rulesContext.battlers[rulesContext.selectorRoles.target as number];
    __dmg264Log({ site: "screens-basedamage", old: old.damage, full: full.damage, move: rulesContext.currentMove, targetSideStatus: rulesContext.sideStatuses[tb.side], crit: rulesContext.critMultiplier });
  }
  return old;
}
function __dmg264Orig(
  rulesContext: BattleScriptRulesContext,
): { readonly damage: number; readonly movePower: number } {''')
    # --- #206: typecalc / typecalc2: duplicate the handler text with the fixed loop as reference
    for name, endmark, tag in (("typecalcOpcodeHandler", "/**\n * Cmd_dmgtolevel", "typecalc"), ("typecalc2OpcodeHandler", "/**\n * Cmd_counterdamagecalculator", "typecalc2")):
        a = s.index(f"export const {name}: BattleScriptOpcodeHandler<BattleScriptRulesContext> = ")
        b = s.index(endmark, a)
        body = s[a:b]
        assert body.count(OLD_LOOP_HEAD) == 1, name
        ref = body.replace(OLD_LOOP_HEAD, NEW_LOOP_HEAD).replace(f"export const {name}:", f"const __{name}Ref:")
        orig = body.replace(f"export const {name}:", f"const __{name}Orig:")
        wrapper = f'''export const {name}: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (context) => {{
  const old: any = __{name}Orig(context);
  const ref: any = __{name}Ref(context);
  const a = old.rulesContext, b = ref.rulesContext;
  if (a.battleMoveDamage !== b.battleMoveDamage || a.moveResultFlags !== b.moveResultFlags || a.missType !== b.missType) {{
    const t = a.battlers[a.selectorRoles.target as number];
    __dmg264Log({{ site: "{tag}", move: a.currentMove, damage: [a.battleMoveDamage, b.battleMoveDamage], flags: [a.moveResultFlags, b.moveResultFlags], missType: [a.missType, b.missType], defTypes: t.types }});
  }}
  return old;
}};

'''
        s = s[:a] + orig + ref + wrapper + s[b:]
    return s
edit("src/engine/battleScriptHitChainOpcode.ts", hit)
def dc(s):
    s = sub(s, "export function applyTypeEffectiveness(", "function __applyTypeEffectivenessOld(")
    s = 'import { dmg264Log as __dmg264Log, refRows as __refRows } from "./dmg264Log.ts";\n' + s
    return s + '''
export function applyTypeEffectiveness(
  damage: number,
  moveType: string,
  defenderTypes: readonly [string, string],
  table: readonly TypeEffectivenessEntry[],
): { damage: number; multiplierTenths: number } {
  const old = __applyTypeEffectivenessOld(damage, moveType, defenderTypes, table);
  let r = damage, m = 10;
  for (const e of __refRows(moveType, defenderTypes, table, false)) {
    m = Math.trunc((m * e.multiplierTenths) / 10);
    r = Math.trunc((r * e.multiplierTenths) / 10);
    if (r === 0 && e.multiplierTenths !== 0) r = 1;
  }
  if (r !== old.damage || m !== old.multiplierTenths) __dmg264Log({ site: "applyTypeEffectiveness", damage: [old.damage, r], mult: [old.multiplierTenths, m], moveType, defenderTypes });
  return old;
}
'''
edit("src/engine/damageCalc.ts", dc)
def sw(s):
    s = 'import { dmg264Log as __dmg264Log, refRows as __refRows } from "./dmg264Log.ts";\n' + s
    s = sub(s, "function typeCalcCandidateDamage(\n", "function __typeCalcCandidateDamageOld(\n")
    return s + '''
function typeCalcCandidateDamage(moveId: number, fallback: BattleAiSwitchDamageFallback): number {
  const old = __typeCalcCandidateDamageOld(moveId, fallback);
  const move = MOVES_BY_ID.get(moveId);
  if (!move || moveId === MOVE_STRUGGLE) return old;
  let damage = fallback.baseDamage;
  if (fallback.activeTypes[0] === move.type || fallback.activeTypes[1] === move.type) damage = Math.trunc((damage * 15) / 10);
  if (fallback.opposingAbility === LEVITATE_ID && move.type === "TYPE_GROUND") return old;
  for (const row of __refRows(move.type, fallback.opposingTypes, TYPE_EFFECTIVENESS, (fallback.opposingStatus2 & STATUS2_FORESIGHT) !== 0)) {
    damage = Math.trunc((damage * row.multiplierTenths) / 10);
    if (damage === 0 && row.multiplierTenths !== 0) damage = 1;
  }
  if (damage !== old) __dmg264Log({ site: "aiSwitchCandidateDamage", damage: [old, damage], moveId });
  return old;
}
'''
edit("src/engine/battleAiSwitchInto.ts", sw)
def census(s):
    s = sub(s, 'import { writeFileSync } from "node:fs";', 'import { writeFileSync, appendFileSync } from "node:fs";')
    s = sub(s, "for (let seed = from!; seed <= to!; seed += 1) {", "for (let seed = from!; seed <= to!; seed += 1) {\n  (globalThis as any).__dmg264Events = [];")
    return sub(s, "  lines.push(JSON.stringify({ seed, scene,", "  if ((globalThis as any).__dmg264Events.length) appendFileSync(process.env.DMG264_LOG!, JSON.stringify({ seed, scene, events: (globalThis as any).__dmg264Events }) + '\\n');\n  lines.push(JSON.stringify({ seed, scene,")
edit("tools/integration/lsd194Census.ts", census)
