"""aiv266 (docs/aiv266-ai-view-fields.md): turn an extracted engine tree of the UNFIXED parent (git archive of the commit before the aiv266 fix) into the observation-only classifier tree.
  python3 tools/integration/aiv266Instrument.py <tree> <fixed-factoryAiLiveDriver.ts>
The tree still decides with the OLD (unfilled) view. At every scored AI decision (mask != 0) the FIXED view is built too (the fixed factoryAiLiveDriver.ts, copied in as factoryAiLiveDriverFixed.ts) and
the same scored chooser runs on it with the same RNG; one JSON line {seed, scene, events} per census seed goes to AIV266_LOG with, per decision: the view fields whose new value differs from the old
default (attacker / target) and whether the scores, picked move or RNG differ."""
import sys
from pathlib import Path
T = Path(sys.argv[1]); FIXED = Path(sys.argv[2])
def edit(rel, fn):
    p = T / rel; s = p.read_text(); n = fn(s); assert n != s, rel; p.write_text(n)
def sub(s, old, new):
    assert s.count(old) == 1, (old, s.count(old)); return s.replace(old, new, 1)
(T / "src/engine/factoryAiLiveDriverFixed.ts").write_text(FIXED.read_text())
edit("src/engine/factoryAiCheckBadMove.ts", lambda s: s + '''
export function speciesAbilityNames(species: number): readonly [string, string] {
  const row = SPECIES_BY_ID.get(species);
  if (!row) throw new Error(`factory-ai: unknown species ${species}`);
  return row.abilities;
}
''')
edit("src/engine/battleScriptRulesContext.ts", lambda s: s + '''
export function resolveBattleScriptItemHoldEffect(itemId: number): number {
  if (itemId >= BATTLE_SCRIPT_ITEMS_COUNT) return 0;
  return GENERATED_ITEM_HOLD_EFFECTS.get(itemId) ?? 0;
}
''')
(T / "src/engine/aiv266Log.ts").write_text('''export function aiv266Log(ev: Record<string, unknown>): void { ((globalThis as any).__aiv266Events ??= []).push(ev); }
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
// the consumers read an absent field as 0 / false / ["ABILITY_NONE","ABILITY_NONE"] (`?? 0`, `?? false`); only gender has no default and stays distinguishable
const norm = (k: string, v: unknown): unknown => v !== undefined ? v : k === "speciesAbilities" ? ["ABILITY_NONE", "ABILITY_NONE"] : k === "gender" ? undefined : (k.startsWith("is") || k.endsWith("Up") || k.startsWith("any") || k.endsWith("Others") || k === "targetPartyStatusEqualsAny") ? false : 0;
export function aiv266Diff(oldView: any, newView: any): { attacker: string[]; target: string[] } {
  const out = { attacker: [] as string[], target: [] as string[] };
  for (const side of ["attacker", "target"] as const) {
    const keys = new Set([...Object.keys(oldView[side]), ...Object.keys(newView[side])]);
    for (const k of keys) if (!same(norm(k, oldView[side][k]), norm(k, newView[side][k]))) out[side].push(k);
  }
  return out;
}
export function aiv266Summary(r: any): unknown {
  return { submission: r.submission, rng: r.rng, draws: r.trace.draws, slotScores: r.trace.slotScores };
}
export function aiv266Observe(oldView: any, newView: any, oldResult: any, newResult: any, turn: unknown): void {
  const fields = aiv266Diff(oldView, newView);
  const outcomeDiffers = !same(aiv266Summary(oldResult), aiv266Summary(newResult));
  if (fields.attacker.length === 0 && fields.target.length === 0 && !outcomeDiffers) return;
  const so = oldResult.trace.slotScores, sn = newResult.trace.slotScores;
  const slots: number[] = [];
  for (let i = 0; i < Math.max(so.length, sn.length); i += 1) if (!same(so[i], sn[i])) slots.push(i);
  aiv266Log({ turn, moves: oldView.moves, fields, outcomeDiffers, slots, pickOld: oldResult.submission.decision, pickNew: newResult.submission.decision });
}
''')
def drv(s):
    s = sub(s, 'import { ABILITY_NAME_BY_ID } from "./abilityNameById.ts";\n',
        'import { ABILITY_NAME_BY_ID } from "./abilityNameById.ts";\nimport { aiv266Observe as __observe, aiv266Log as __log } from "./aiv266Log.ts";\nimport { createFactoryAiViewFromLiveRules as __createFixedView } from "./factoryAiLiveDriverFixed.ts";\n')
    return sub(s, "  // W2 (docs/rollout-endeavor-prep.md s0.2)",
'''  if (mask !== 0) {
    try {
      const newView = __createFixedView({ rulesContext: state.rules.rulesContext, history: syncedHistory, challenge });
      const newResult = chooseFactoryAiScoredDecision({
        view: newView,
        request: policyRequest,
        rng: switchPolicy.rng,
        turnStartRandomNumber: Object.freeze({ owner: "battle-turn-boundary" as const, value: state.rules.rulesContext.randomTurnNumber }),
      });
      __observe(view, newView, policyResult, newResult, state.rules.rulesContext.battleTurnCounter ?? null);
    } catch (e) { __log({ error: String(e) }); }
  }
  // W2 (docs/rollout-endeavor-prep.md s0.2)''')
edit("src/engine/factoryAiLiveDriver.ts", drv)
def census(s):
    s = sub(s, 'import { writeFileSync } from "node:fs";', 'import { writeFileSync, appendFileSync } from "node:fs";')
    s = sub(s, "for (let seed = from!; seed <= to!; seed += 1) {", "for (let seed = from!; seed <= to!; seed += 1) {\n  (globalThis as any).__aiv266Events = [];")
    return sub(s, "  lines.push(JSON.stringify({ seed, scene,", "  if ((globalThis as any).__aiv266Events.length) appendFileSync(process.env.AIV266_LOG!, JSON.stringify({ seed, scene, events: (globalThis as any).__aiv266Events }) + '\\n');\n  lines.push(JSON.stringify({ seed, scene,")
edit("tools/integration/lsd194Census.ts", census)
