"""sub260 (docs/sub260-ignore-substitute.md): turn an extracted engine tree (git archive of the fixed commit, tools + src) into the UNFIXED, leak-logging classifier tree.
  python3 tools/integration/sub260Instrument.py <tree>     # after `patch -R -p1` of the datahpupdate fix in <tree>
Logs, per census seed, every healthbarupdate where HITMARKER_IGNORE_SUBSTITUTE is set, the target has an active Substitute and the running script label differs from the
last `orword ... IGNORE_SUBSTITUTE` script (i.e. a stale bit, not a script's own heal); SUB260_LEAKS=<file> receives one JSON line per seed that has any."""
import sys
from pathlib import Path
T = Path(sys.argv[1])
def edit(rel, fn):
    p = T / rel; s = p.read_text(); n = fn(s); assert n != s, rel; p.write_text(n)
edit("src/engine/battleScriptOrwordOpcode.ts", lambda s: s.replace(
    "    const hitMarker = (rules.hitMarker | value) >>> 0;\n    return transitionBattleScriptCommand(",
    "    const hitMarker = (rules.hitMarker | value) >>> 0;\n    if ((value & BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE) !== 0) (globalThis as any).__lastIgnoreSubOrword = context.instruction.source.label;\n    return transitionBattleScriptCommand(", 1))
HELPER = '''
function __sub260Log(kind: string, context: any, battler: number) {
  const rc = context.state.rulesContext; const b = rc.battlers[battler];
  if ((rc.hitMarker & (1 << 8)) !== 0 && (b.status2 & (1 << 24)) !== 0 && b.substituteHP !== 0
    && context.instruction.source.label !== (globalThis as any).__lastIgnoreSubOrword) {
    ((globalThis as any).__sub260Leaks ??= []).push({ kind, label: context.instruction.source.label, battler, move: rc.currentMove,
      damage: rc.battleMoveDamage, hp: b.hp, subHP: b.substituteHP, lastOrword: (globalThis as any).__lastIgnoreSubOrword });
  }
}
'''
HB = "    const battlerState = rulesContext.battlers[battler];\n    const substituteActive = (battlerState.status2 & BATTLE_SCRIPT_STATUS2_SUBSTITUTE) !== 0\n      && battlerState.substituteHP !== 0\n      && (rulesContext.hitMarker & HITMARKER_IGNORE_SUBSTITUTE) === 0;\n\n    if (substituteActive) {\n      const message = prepareMessage"
def hit(s):
    s = s.replace("const HITMARKER_IGNORE_SUBSTITUTE = 1 << 8;", "const HITMARKER_IGNORE_SUBSTITUTE = 1 << 8;" + HELPER, 1)
    assert s.count(HB) == 1
    return s.replace(HB, HB.replace("const substituteActive", "__sub260Log('healthbarupdate', context, battler);\n    const substituteActive", 1))
edit("src/engine/battleScriptHitChainOpcode.ts", hit)
def census(s):
    s = s.replace('import { writeFileSync } from "node:fs";', 'import { writeFileSync, appendFileSync } from "node:fs";', 1)
    s = s.replace("for (let seed = from!; seed <= to!; seed += 1) {", "for (let seed = from!; seed <= to!; seed += 1) {\n  (globalThis as any).__sub260Leaks = []; (globalThis as any).__lastIgnoreSubOrword = null;", 1)
    return s.replace("  lines.push(JSON.stringify({ seed, scene,", "  if ((globalThis as any).__sub260Leaks.length) appendFileSync(process.env.SUB260_LEAKS!, JSON.stringify({ seed, scene, leaks: (globalThis as any).__sub260Leaks }) + '\\n');\n  lines.push(JSON.stringify({ seed, scene,", 1)
edit("tools/integration/lsd194Census.ts", census)
