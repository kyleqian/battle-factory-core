"""aiv270 (docs/aiv270-ai-effectiveness-paralysis.md): turn an extracted engine tree of the UNFIXED parent (git archive of the commit before aiv270 A) into the observation-only classifier tree.
  python3 tools/integration/aiv270Instrument.py <tree> <fixed-src-dir>
The tree still decides with the OLD code. At every scored AI decision (mask != 0) the same request / RNG is also scored by
  chooser A  = the tree's own factoryAiDecisionPolicy.ts with only the FIXED factoryAiCheckBadMove.ts (cause A) swapped in, over the OLD view, and
  chooser AB = the FIXED factoryAiDecisionPolicy.ts / factoryAiCheckViability.ts / factoryAiCheckBadMove.ts over the FIXED live view (cause A + B).
Event "A": old result != chooser-A result (scores / pick / RNG / draws). Event "B": chooser-A result != chooser-AB result (B alone, on top of A). One JSON line {seed, scene, decisions, events}
per census seed goes to AIV270_LOG; B events also carry the turn-order inputs that made the AI view differ."""
import sys
from pathlib import Path
T = Path(sys.argv[1]); FIXED = Path(sys.argv[2])
def edit(rel, fn):
    p = T / rel; s = p.read_text(); n = fn(s); assert n != s, rel; p.write_text(n)
def sub(s, old, new):
    assert s.count(old) == 1, (old, s.count(old)); return s.replace(old, new, 1)
E = "src/engine/"
CBM, CV, DP, LD = "factoryAiCheckBadMove", "factoryAiCheckViability", "factoryAiDecisionPolicy", "factoryAiLiveDriver"
fixed = lambda n: (FIXED / E / f"{n}.ts").read_text()
(T / E / f"{CBM}Fixed.ts").write_text(fixed(CBM))
(T / E / f"{CV}Fixed.ts").write_text(sub(fixed(CV), f'from "./{CBM}.ts"', f'from "./{CBM}Fixed.ts"'))
(T / E / f"{DP}Fixed.ts").write_text(
    sub(sub(fixed(DP), f'from "./{CBM}.ts"', f'from "./{CBM}Fixed.ts"'), f'from "./{CV}.ts"', f'from "./{CV}Fixed.ts"'))
(T / E / f"{LD}Fixed.ts").write_text(fixed(LD))
(T / E / f"{DP}A.ts").write_text(sub((T / E / f"{DP}.ts").read_text(), f'from "./{CBM}.ts"', f'from "./{CBM}Fixed.ts"'))
(T / E / "aiv270Log.ts").write_text('''export function aiv270Log(ev: Record<string, unknown>): void { ((globalThis as any).__aiv270Events ??= []).push(ev); }
export function aiv270Count(): void { (globalThis as any).__aiv270Decisions = ((globalThis as any).__aiv270Decisions ?? 0) + 1; }
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
export function aiv270Summary(r: any): unknown {
  return { submission: r.submission, rng: r.rng, draws: r.trace.draws, slotScores: r.trace.slotScores };
}
function diffSlots(a: any, b: any): number[] {
  const slots: number[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) if (!same(a[i], b[i])) slots.push(i);
  return slots;
}
export function aiv270Observe(newView: any, oldResult: any, aResult: any, abResult: any, turn: unknown): void {
  aiv270Count();
  const base = { turn, moves: newView.moves };
  if (!same(aiv270Summary(oldResult), aiv270Summary(aResult))) {
    aiv270Log({ fix: "A", ...base, slots: diffSlots(oldResult.trace.slotScores, aResult.trace.slotScores), pickOld: oldResult.submission.decision, pickNew: aResult.submission.decision });
  }
  if (!same(aiv270Summary(aResult), aiv270Summary(abResult))) {
    const a = newView.attacker, t = newView.target;
    aiv270Log({
      fix: "B", ...base, slots: diffSlots(aResult.trace.slotScores, abResult.trace.slotScores), pickOld: aResult.submission.decision, pickNew: abResult.submission.decision,
      speeds: [a.speed, t.speed], stages: [a.statStages.speed, t.statStages.speed], par: [a.isParalyzed === true, t.isParalyzed === true],
      hold: [a.turnOrderHoldEffect ?? null, t.turnOrderHoldEffect ?? null], abil: [a.turnOrderAbility ?? null, t.turnOrderAbility ?? null],
      weather: a.turnOrderWeather ?? null, rtn: a.randomTurnNumber ?? null,
    });
  }
}
''')
def drv(s):
    s = sub(s, 'import { ABILITY_NAME_BY_ID } from "./abilityNameById.ts";\n',
        'import { ABILITY_NAME_BY_ID } from "./abilityNameById.ts";\nimport { aiv270Observe as __observe, aiv270Log as __log } from "./aiv270Log.ts";\n'
        f'import {{ createFactoryAiViewFromLiveRules as __createFixedView }} from "./{LD}Fixed.ts";\n'
        f'import {{ chooseFactoryAiScoredDecision as __chooseFixed }} from "./{DP}Fixed.ts";\n'
        f'import {{ chooseFactoryAiScoredDecision as __chooseA }} from "./{DP}A.ts";\n')
    return sub(s, "  // W2 (docs/rollout-endeavor-prep.md s0.2)",
'''  if (mask !== 0) {
    try {
      const turnStartRandomNumber = Object.freeze({ owner: "battle-turn-boundary" as const, value: state.rules.rulesContext.randomTurnNumber });
      const aResult = __chooseA({ view, request: policyRequest, rng: switchPolicy.rng, turnStartRandomNumber });
      const newView = __createFixedView({ rulesContext: state.rules.rulesContext, history: syncedHistory, challenge });
      const abResult = __chooseFixed({ view: newView, request: policyRequest, rng: switchPolicy.rng, turnStartRandomNumber });
      __observe(newView, policyResult, aResult, abResult, state.rules.rulesContext.battleTurnCounter ?? null);
    } catch (e) { __log({ fix: "X", error: String(e) }); }
  }
  // W2 (docs/rollout-endeavor-prep.md s0.2)''')
edit(E + f"{LD}.ts", drv)
def census(s):
    s = sub(s, 'import { writeFileSync } from "node:fs";', 'import { writeFileSync, appendFileSync } from "node:fs";')
    s = sub(s, "for (let seed = from!; seed <= to!; seed += 1) {", "for (let seed = from!; seed <= to!; seed += 1) {\n  (globalThis as any).__aiv270Events = []; (globalThis as any).__aiv270Decisions = 0;")
    return sub(s, "  lines.push(JSON.stringify({ seed, scene,", "  appendFileSync(process.env.AIV270_LOG!, JSON.stringify({ seed, scene, decisions: (globalThis as any).__aiv270Decisions, events: (globalThis as any).__aiv270Events }) + '\\n');\n  lines.push(JSON.stringify({ seed, scene,")
edit("tools/integration/lsd194Census.ts", census)
