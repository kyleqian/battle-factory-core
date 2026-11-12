"""aiv271 (docs/aiv271-ai-damage-terms.md): turn an extracted engine tree of the UNFIXED parent (git archive of 8cf0d8bba, the commit before the aiv271 wiring) into the observation-only classifier tree.
  python3 tools/integration/aiv271Instrument.py <tree> <fixed-src-dir>
The tree still decides with the OLD code. At every scored AI decision (mask != 0) the same request / RNG is also scored by the FIXED chooser over the FIXED live view (the view carrying damageTerms, built by the fixed
factoryAiLiveDriver / factoryAiDecisionPolicy / factoryAiTryToFaint / damageCalc / battleScriptHitChainOpcode copied in as *Fixed.ts). Event "C": old result != fixed result (scores / pick / RNG / draws).
Each C event is tagged by neutralising one term group of the fixed damageTerms at a time (species, hold effect + param, status, pinch hp, weather, sports, frontier) and re-scoring: a group is a cause when
neutralising it changes the fixed result. Event "Z" is a self-check: the fixed view with damageTerms removed (legacy flat-field path) must equal the old result. Event "X": observer error.
One JSON line {seed, scene, decisions, events} per census seed goes to AIV271_LOG."""
import sys
from pathlib import Path
T = Path(sys.argv[1]); FIXED = Path(sys.argv[2])
def edit(rel, fn):
    p = T / rel; s = p.read_text(); n = fn(s); assert n != s, rel; p.write_text(n)
def sub(s, old, new):
    assert s.count(old) == 1, (old, s.count(old)); return s.replace(old, new, 1)
E = "src/engine/"
MODS = ["damageCalc", "battleScriptHitChainOpcode", "factoryAiTryToFaint", "factoryAiDecisionPolicy", "factoryAiLiveDriver"]
def retarget(s):
    for m in MODS:
        s = s.replace(f'from "./{m}.ts"', f'from "./{m}Fixed.ts"')
    return s
for m in MODS:
    src = (FIXED / E / f"{m}.ts").read_text()
    (T / E / f"{m}Fixed.ts").write_text(retarget(src))
(T / E / "aiv271Log.ts").write_text('''export function aiv271Log(ev: Record<string, unknown>): void { ((globalThis as any).__aiv271Events ??= []).push(ev); }
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
export function aiv271Summary(r: any): unknown {
  return { submission: r.submission, rng: r.rng, draws: r.trace.draws, slotScores: r.trace.slotScores };
}
function diffSlots(a: any, b: any): number[] {
  const slots: number[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) if (!same(a[i], b[i])) slots.push(i);
  return slots;
}
const GROUPS: Record<string, (t: any) => any> = {
  species: (t) => ({ ...t, attacker: { ...t.attacker, species: undefined }, defender: { ...t.defender, species: undefined } }),
  hold: (t) => ({ ...t, attacker: { ...t.attacker, holdEffect: null, holdEffectParam: 0 }, defender: { ...t.defender, holdEffect: null, holdEffectParam: 0 } }),
  status: (t) => ({ ...t, attacker: { ...t.attacker, isBurned: false, hasStatus1: false }, defender: { ...t.defender, isBurned: false, hasStatus1: false } }),
  pinch: (t) => ({ ...t, attacker: { ...t.attacker, hp: t.attacker.maxHP } }),
  weather: (t) => ({ ...t, weather: 0, weatherHasEffect: false }),
  sports: (t) => ({ ...t, mudSportActive: false, waterSportActive: false }),
  frontier: (t) => ({ ...t, isFrontierBattle: false }),
};
const withTerms = (view: any, terms: any): any => ({ ...view, target: { ...view.target, damageTerms: terms } });
export function aiv271Observe(newView: any, oldResult: any, fixedResult: any, rescore: (view: any) => any, turn: unknown): void {
  const base = { turn, moves: newView.moves };
  const t = newView.target.damageTerms;
  const legacy = rescore(withTerms(newView, undefined));
  if (!same(aiv271Summary(oldResult), aiv271Summary(legacy))) aiv271Log({ fix: "Z", ...base });
  if (same(aiv271Summary(oldResult), aiv271Summary(fixedResult))) return;
  const causes: string[] = [];
  for (const [g, f] of Object.entries(GROUPS)) {
    if (!same(aiv271Summary(fixedResult), aiv271Summary(rescore(withTerms(newView, f(t)))))) causes.push(g);
  }
  const snap = (b: any) => ({ species: b.species ?? null, hold: b.holdEffect ?? null, param: b.holdEffectParam ?? 0, burned: b.isBurned === true, st1: b.hasStatus1 === true, hp: b.hp ?? null, maxHP: b.maxHP ?? null, abil: b.ability ?? null, types: b.types });
  aiv271Log({
    fix: "C", ...base, causes, slots: diffSlots(oldResult.trace.slotScores, fixedResult.trace.slotScores),
    pickOld: oldResult.submission.decision, pickNew: fixedResult.submission.decision,
    atk: snap(t.attacker), def: snap(t.defender), weather: t.weather, weatherHasEffect: t.weatherHasEffect,
    sports: [t.mudSportActive, t.waterSportActive], frontier: t.isFrontierBattle,
  });
}
''')
def drv(s):
    s = sub(s, 'import { ABILITY_NAME_BY_ID } from "./abilityNameById.ts";\n',
        'import { ABILITY_NAME_BY_ID } from "./abilityNameById.ts";\nimport { aiv271Observe as __observe, aiv271Log as __log } from "./aiv271Log.ts";\n'
        'import { createFactoryAiViewFromLiveRules as __createFixedView } from "./factoryAiLiveDriverFixed.ts";\n'
        'import { chooseFactoryAiScoredDecision as __chooseFixed } from "./factoryAiDecisionPolicyFixed.ts";\n')
    return sub(s, "  // W2 (docs/rollout-endeavor-prep.md s0.2)",
'''  if (mask !== 0) {
    try {
      const turnStartRandomNumber = Object.freeze({ owner: "battle-turn-boundary" as const, value: state.rules.rulesContext.randomTurnNumber });
      const newView = __createFixedView({ rulesContext: state.rules.rulesContext, history: syncedHistory, challenge });
      const rescore = (v: any) => __chooseFixed({ view: v, request: policyRequest, rng: switchPolicy.rng, turnStartRandomNumber });
      __observe(newView, policyResult, rescore(newView), rescore, state.rules.rulesContext.battleTurnCounter ?? null);
      (globalThis as any).__aiv271Decisions = ((globalThis as any).__aiv271Decisions ?? 0) + 1;
    } catch (e) { __log({ fix: "X", error: String(e) }); }
  }
  // W2 (docs/rollout-endeavor-prep.md s0.2)''')
edit(E + "factoryAiLiveDriver.ts", drv)
def census(s):
    s = sub(s, 'import { writeFileSync } from "node:fs";', 'import { writeFileSync, appendFileSync } from "node:fs";')
    s = sub(s, "for (let seed = from!; seed <= to!; seed += 1) {", "for (let seed = from!; seed <= to!; seed += 1) {\n  (globalThis as any).__aiv271Events = []; (globalThis as any).__aiv271Decisions = 0;")
    return sub(s, "  lines.push(JSON.stringify({ seed, scene,", "  appendFileSync(process.env.AIV271_LOG!, JSON.stringify({ seed, scene, decisions: (globalThis as any).__aiv271Decisions, events: (globalThis as any).__aiv271Events }) + '\\n');\n  lines.push(JSON.stringify({ seed, scene,")
edit("tools/integration/lsd194Census.ts", census)
