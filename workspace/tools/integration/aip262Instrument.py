"""aip262 (docs/aip262-usable-party-mons.md): turn an extracted engine tree of the UNFIXED parent (git archive of the commit before the aip262 fix) into the observation-only classifier tree.
  python3 tools/integration/aip262Instrument.py <tree>
The tree still decides with the OLD (view without usablePartyMons) result. Every scored AI decision (mask != 0) where one of the four moves is Baton Pass / Memento / Explosion / Roar and
the TRUE Cmd_count_usable_party_mons value would change that CBM branch is appended, per census seed, to the file in AIP262_LOG as one JSON line {seed, scene, events}."""
import sys
from pathlib import Path
T = Path(sys.argv[1])
def edit(rel, fn):
    p = T / rel; s = p.read_text(); n = fn(s); assert n != s, rel; p.write_text(n)
def sub(s, old, new):
    assert s.count(old) == 1, (old, s.count(old)); return s.replace(old, new, 1)
(T / "src/engine/aip262Log.ts").write_text('''import { MOVES_BY_ID } from "./factoryAiCheckBadMove.ts";
export function aip262Log(ev: Record<string, unknown>): void { ((globalThis as any).__aip262Events ??= []).push(ev); }
function count(party: any, active: number): number {
  let n = 0;
  for (let i = 0; i < party.length; i += 1) { const m = party[i]; if (i !== active && m.hp !== 0 && m.species !== 0 && !m.isEgg) n += 1; }
  return n;
}
// old (unfixed) CBM result is computed with both counts 0; "changes" = the true counts move the delta (conservative for Memento, whose target stat-stage gates are not evaluated here)
export function aip262Observe(rules: any, view: any, mask: number): void {
  if (mask === 0) return;
  const user = count(rules.party.opponent, rules.battlers[1].partyIndex);
  const target = count(rules.party.player, rules.battlers[0].partyIndex);
  view.moves.forEach((id: number, slot: number) => {
    const effect = id === 0 ? null : MOVES_BY_ID.get(id)?.effect;
    let changes = false;
    if (effect === "EFFECT_BATON_PASS" || effect === "EFFECT_MEMENTO") changes = user > 0;
    else if (effect === "EFFECT_EXPLOSION") changes = user > 0 || target > 0;
    else if (effect === "EFFECT_ROAR") changes = target > 0;
    if (changes) aip262Log({ site: effect, slot, moveId: id, user, target, turn: rules.battleTurnCounter ?? null });
  });
}
''')
edit("src/engine/factoryAiLiveDriver.ts", lambda s: sub(sub(s,
    'import { ABILITY_NAME_BY_ID } from "./abilityNameById.ts";\n',
    'import { ABILITY_NAME_BY_ID } from "./abilityNameById.ts";\nimport { aip262Observe as __observe } from "./aip262Log.ts";\n'),
    "  // W2 (docs/rollout-endeavor-prep.md s0.2)",
    "  __observe(state.rules.rulesContext, view, mask);\n  // W2 (docs/rollout-endeavor-prep.md s0.2)"))
def census(s):
    s = sub(s, 'import { writeFileSync } from "node:fs";', 'import { writeFileSync, appendFileSync } from "node:fs";')
    s = sub(s, "for (let seed = from!; seed <= to!; seed += 1) {", "for (let seed = from!; seed <= to!; seed += 1) {\n  (globalThis as any).__aip262Events = [];")
    return sub(s, "  lines.push(JSON.stringify({ seed, scene,", "  if ((globalThis as any).__aip262Events.length) appendFileSync(process.env.AIP262_LOG!, JSON.stringify({ seed, scene, events: (globalThis as any).__aip262Events }) + '\\n');\n  lines.push(JSON.stringify({ seed, scene,")
edit("tools/integration/lsd194Census.ts", census)
