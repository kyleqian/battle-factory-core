"""aiv267 (docs/aiv267-ai-screens-self-hit.md): turn an extracted engine tree of the UNFIXED parent (git archive of the commit before the aiv267 fix) into the observation-only classifier tree.
  python3 tools/integration/aiv267Instrument.py <tree> <fixed-src-dir>
The tree still decides with the OLD code. Fix A: at every scored AI decision (mask != 0) the FIXED view (fixed factoryAiLiveDriver.ts) is built and scored by the FIXED chooser (fixed
factoryAiDecisionPolicy.ts / factoryAiTryToFaint.ts copied in as *Fixed.ts) with the same RNG; one event per decision whose target side has a screen up or whose scores / pick / RNG differ.
Fix B: at every confusion self-hit the damage is recomputed with the live battler's hold item as both roles and an event is logged when it differs from the old value.
One JSON line {seed, scene, events} per census seed goes to AIV267_LOG."""
import sys
from pathlib import Path
T = Path(sys.argv[1]); FIXED = Path(sys.argv[2])
def edit(rel, fn):
    p = T / rel; s = p.read_text(); n = fn(s); assert n != s, rel; p.write_text(n)
def sub(s, old, new):
    assert s.count(old) == 1, (old, s.count(old)); return s.replace(old, new, 1)
E = "src/engine/"
(T / E / "factoryAiTryToFaintFixed.ts").write_text((FIXED / E / "factoryAiTryToFaint.ts").read_text())
(T / E / "factoryAiDecisionPolicyFixed.ts").write_text(
    sub((FIXED / E / "factoryAiDecisionPolicy.ts").read_text(), 'from "./factoryAiTryToFaint.ts"', 'from "./factoryAiTryToFaintFixed.ts"'))
(T / E / "factoryAiLiveDriverFixed.ts").write_text((FIXED / E / "factoryAiLiveDriver.ts").read_text())
(T / E / "aiv267Log.ts").write_text('''export function aiv267Log(ev: Record<string, unknown>): void { ((globalThis as any).__aiv267Events ??= []).push(ev); }
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
export function aiv267Summary(r: any): unknown {
  return { submission: r.submission, rng: r.rng, draws: r.trace.draws, slotScores: r.trace.slotScores };
}
export function aiv267Observe(newView: any, oldResult: any, newResult: any, turn: unknown): void {
  const reflect = newView.target.targetSideReflectUp === true, lightScreen = newView.target.targetSideLightScreenUp === true;
  const outcomeDiffers = !same(aiv267Summary(oldResult), aiv267Summary(newResult));
  if (!reflect && !lightScreen && !outcomeDiffers) return;
  const so = oldResult.trace.slotScores, sn = newResult.trace.slotScores;
  const slots: number[] = [];
  for (let i = 0; i < Math.max(so.length, sn.length); i += 1) if (!same(so[i], sn[i])) slots.push(i);
  aiv267Log({ fix: "A", turn, moves: newView.moves, reflect, lightScreen, outcomeDiffers, slots, pickOld: oldResult.submission.decision, pickNew: newResult.submission.decision });
}
''')
def drv(s):
    s = sub(s, 'import { ABILITY_NAME_BY_ID } from "./abilityNameById.ts";\n',
        'import { ABILITY_NAME_BY_ID } from "./abilityNameById.ts";\nimport { aiv267Observe as __observe, aiv267Log as __log } from "./aiv267Log.ts";\n'
        'import { createFactoryAiViewFromLiveRules as __createFixedView } from "./factoryAiLiveDriverFixed.ts";\n'
        'import { chooseFactoryAiScoredDecision as __chooseFixed } from "./factoryAiDecisionPolicyFixed.ts";\n')
    return sub(s, "  // W2 (docs/rollout-endeavor-prep.md s0.2)",
'''  if (mask !== 0) {
    try {
      const newView = __createFixedView({ rulesContext: state.rules.rulesContext, history: syncedHistory, challenge });
      const newResult = __chooseFixed({
        view: newView,
        request: policyRequest,
        rng: switchPolicy.rng,
        turnStartRandomNumber: Object.freeze({ owner: "battle-turn-boundary" as const, value: state.rules.rulesContext.randomTurnNumber }),
      });
      __observe(newView, policyResult, newResult, state.rules.rulesContext.battleTurnCounter ?? null);
    } catch (e) { __log({ fix: "A", error: String(e) }); }
  }
  // W2 (docs/rollout-endeavor-prep.md s0.2)''')
edit(E + "factoryAiLiveDriver.ts", drv)
edit(E + "battleScriptHitChainOpcode.ts", lambda s: sub(s, "const BATTLE_TYPE_FRONTIER = (", "export const BATTLE_TYPE_FRONTIER = ("))
def adm(s):
    s = sub(s, "  resolveBattleScriptBattlerHoldEffect,\n", "  resolveBattleScriptBattlerHoldEffect,\n  resolveBattleScriptBattlerHoldEffectParam as __holdParam,\n")
    s = sub(s, 'import { advanceRngValue } from "./rng.ts";\n',
        'import { advanceRngValue } from "./rng.ts";\nimport { HOLD_EFFECT_NAME_BY_ID as __HE, BATTLE_TYPE_FRONTIER as __FRONTIER } from "./battleScriptHitChainOpcode.ts";\nimport { aiv267Log as __log } from "./aiv267Log.ts";\n')
    return sub(s, "        nextSelfDmg = 1;\n", '''        if (sourceBattler.confusionDamage === undefined) {
          const __he = __HE[resolveBattleScriptBattlerHoldEffect(rulesContext, attacker)] ?? null;
          const __hp = __holdParam(rulesContext, attacker);
          const __role = {
            level: damage.level, attack: damage.attack, defense: damage.defense, spAttack: 1, spDefense: 1,
            types: ["TYPE_NORMAL", "TYPE_NORMAL"] as [string, string],
            statStages: { ...NEUTRAL_STAT_STAGES, atk: damage.attackStage, def: damage.defenseStage },
            hasStatus1: confusionHasStatus1, ability: confusionAbility,
            species: sourceBattler.species, holdEffect: __he, holdEffectParam: __hp,
          };
          const __newDamage = calculateBaseDamage({
            attacker: { ...__role, isBurned: damage.isBurned }, defender: __role,
            movePower: 40, moveType: "TYPE_NORMAL", isCriticalHit: false,
            isFrontierBattle: (rulesContext.battleTopology.battleTypeFlags & __FRONTIER) !== 0,
          });
          if (__newDamage !== nextDamage) __log({ fix: "B", attacker, oldDamage: nextDamage, newDamage: __newDamage, item: sourceBattler.item, holdEffect: __he, species: sourceBattler.species, side: sourceBattler.side });
        }
        nextSelfDmg = 1;
''')
edit(E + "battleScriptActionAdmission.ts", adm)
def census(s):
    s = sub(s, 'import { writeFileSync } from "node:fs";', 'import { writeFileSync, appendFileSync } from "node:fs";')
    s = sub(s, "for (let seed = from!; seed <= to!; seed += 1) {", "for (let seed = from!; seed <= to!; seed += 1) {\n  (globalThis as any).__aiv267Events = [];")
    return sub(s, "  lines.push(JSON.stringify({ seed, scene,", "  if ((globalThis as any).__aiv267Events.length) appendFileSync(process.env.AIV267_LOG!, JSON.stringify({ seed, scene, events: (globalThis as any).__aiv267Events }) + '\\n');\n  lines.push(JSON.stringify({ seed, scene,")
edit("tools/integration/lsd194Census.ts", census)
