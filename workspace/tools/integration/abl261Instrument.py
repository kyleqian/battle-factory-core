"""abl261 (docs/abl261-ability-damage.md): turn an extracted engine tree of the UNFIXED parent (git archive of the commit before the abl261 fix) into the observation-only classifier tree.
  python3 tools/integration/abl261Instrument.py <tree>
The tree still returns the OLD (unfixed) results. Every calc where the full ability map / hp-aware Cloud Nine+Air Lock would change the result is appended, per census seed, to the
file in ABL261_LOG as one JSON line {seed, scene, events}. Sites: base damage (hit chain), confusion self-hit, endturn weatherHasEffect, damaging-weather, Castform weather nullify."""
import sys
from pathlib import Path
T = Path(sys.argv[1])
def edit(rel, fn):
    p = T / rel; s = p.read_text(); n = fn(s); assert n != s, rel; p.write_text(n)
def sub(s, old, new):
    assert s.count(old) == 1, (old, s.count(old)); return s.replace(old, new, 1)
(T / "src/engine/abl261Log.ts").write_text('''import hooks from "../data/gen/ability-item-hooks.json" with { type: "json" };
export const FULL: ReadonlyMap<number, string> = new Map((hooks as any).universes.abilities.map((r: any) => [r.id, r.name]));
export function abl261Log(ev: Record<string, unknown>): void { ((globalThis as any).__abl261Events ??= []).push(ev); }
export function wouldWeatherBeNullifiedFull(rules: any): boolean {
  const n = rules.battleTopology.battlersCount;
  for (let i = 0; i < n; i += 1) { const b = rules.battlers[i]; if ((b.ability === 13 || b.ability === 77) && b.hp !== 0) return true; }
  return false;
}
export function wouldWeatherBeNullifiedOld(rules: any): boolean {
  const n = rules.battleTopology.battlersCount;
  for (let i = 0; i < n; i += 1) if (rules.battlers[i].ability === 13) return true;
  return false;
}
export function logWeatherSite(site: string, rules: any): void {
  const o = wouldWeatherBeNullifiedOld(rules), f = wouldWeatherBeNullifiedFull(rules);
  if (o !== f) abl261Log({ site, old: o, full: f, weather: rules.weather, abilities: rules.battlers.slice(0, rules.battleTopology.battlersCount).map((b: any) => [b.ability, b.hp]) });
}
''')
def hit(s):
    s = sub(s, "const ABILITY_NAME_BY_ID: Readonly<Record<number, string>> = Object.freeze({",
        'import { FULL as __FULL, abl261Log as __abl261Log } from "./abl261Log.ts";\nconst __OLD_NAMES: Readonly<Record<number, string>> = Object.freeze({')
    s = sub(s, '  62: "ABILITY_GUTS",\n});\n', '  62: "ABILITY_GUTS",\n});\nconst ABILITY_NAME_BY_ID: any = new Proxy({}, { get: (_t, k) => ((globalThis as any).__abl261Full ? __FULL.get(Number(k)) : (__OLD_NAMES as any)[k as any]) });\n')
    s = sub(s, "export function calculateBattleScriptBaseDamageWithPowerForCurrentMove(\n  rulesContext: BattleScriptRulesContext,\n): { readonly damage: number; readonly movePower: number } {",
        '''export function calculateBattleScriptBaseDamageWithPowerForCurrentMove(
  rulesContext: BattleScriptRulesContext,
): { readonly damage: number; readonly movePower: number } {
  const g = globalThis as any;
  g.__abl261Full = false;
  const old = __abl261Orig(rulesContext);
  g.__abl261Full = true;
  let full: { readonly damage: number; readonly movePower: number };
  try { full = __abl261Orig(rulesContext); } finally { g.__abl261Full = false; }
  if (old.damage !== full.damage || old.movePower !== full.movePower) {

    __abl261Log({ site: "basedamage", old: old.damage, full: full.damage, move: rulesContext.currentMove,
      abilities: rulesContext.battlers.slice(0, rulesContext.battleTopology.battlersCount).map((b: any) => [b.ability, b.hp, b.maxHP, b.status1]) });
  }
  return old;
}
function __abl261Orig(
  rulesContext: BattleScriptRulesContext,
): { readonly damage: number; readonly movePower: number } {''')
    return s
edit("src/engine/battleScriptHitChainOpcode.ts", hit)
edit("src/engine/battleEndTurnOrchestration.ts", lambda s: sub(s,
    "export function weatherHasEffect(rulesContext: BattleScriptRulesContext): boolean {\n",
    'import { logWeatherSite as __logW } from "./abl261Log.ts";\nexport function weatherHasEffect(rulesContext: BattleScriptRulesContext): boolean {\n  __logW("endturn-weatherHasEffect", rulesContext);\n'))
edit("src/engine/battleScriptDamagingWeatherOpcode.ts", lambda s: sub(s,
    "function battlerCarriesCloudNine(rules: BattleScriptRulesContext): boolean {\n",
    'import { logWeatherSite as __logW } from "./abl261Log.ts";\nfunction battlerCarriesCloudNine(rules: BattleScriptRulesContext): boolean {\n  __logW("damaging-weather", rules);\n'))
edit("src/engine/battleScriptTryCastformDataChangeOpcode.ts", lambda s: sub(s,
    "function weatherIsNullified(rules: BattleScriptRulesContext): boolean {\n",
    'import { logWeatherSite as __logW } from "./abl261Log.ts";\nfunction weatherIsNullified(rules: BattleScriptRulesContext): boolean {\n  __logW("castform-weather", rules);\n'))
def conf(s):
    s = sub(s, "        nextSelfDmg = 1;\n", '''        if (sourceBattler.confusionDamage === undefined) {
          const __ab = (__FULL.get(sourceBattler.ability) ?? null);
          const __live = { level: damage.level, attack: damage.attack, defense: damage.defense, spAttack: 1, spDefense: 1, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as any,
            statStages: { ...NEUTRAL_STAT_STAGES, atk: damage.attackStage, def: damage.defenseStage }, hasStatus1: sourceBattler.status1 !== 0, ability: __ab };
          const __full = calculateBaseDamage({ attacker: { ...__live, isBurned: damage.isBurned }, defender: __live, movePower: 40, moveType: "TYPE_NORMAL", isCriticalHit: false });
          if (__full !== nextDamage) __abl261Log({ site: "confusion-self-hit", old: nextDamage, full: __full, ability: sourceBattler.ability, status1: sourceBattler.status1 });
        }
        nextSelfDmg = 1;
''')
    return 'import { FULL as __FULL, abl261Log as __abl261Log } from "./abl261Log.ts";\n' + s
edit("src/engine/battleScriptActionAdmission.ts", conf)
def census(s):
    s = sub(s, 'import { writeFileSync } from "node:fs";', 'import { writeFileSync, appendFileSync } from "node:fs";')
    s = sub(s, "for (let seed = from!; seed <= to!; seed += 1) {", "for (let seed = from!; seed <= to!; seed += 1) {\n  (globalThis as any).__abl261Events = [];")
    return sub(s, "  lines.push(JSON.stringify({ seed, scene,", "  if ((globalThis as any).__abl261Events.length) appendFileSync(process.env.ABL261_LOG!, JSON.stringify({ seed, scene, events: (globalThis as any).__abl261Events }) + '\\n');\n  lines.push(JSON.stringify({ seed, scene,")
edit("tools/integration/lsd194Census.ts", census)
