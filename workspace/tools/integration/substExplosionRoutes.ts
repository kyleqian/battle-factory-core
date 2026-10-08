// S10A Substitute: Explosion (153) one-turn routes (r3ProfileRouteSearch.ts 153 8 1 4000 candidates) with the stall allowed (forced
// replacement after the self-KO): which reach the live 212-row body, and which hit a Substitute doll (decline).
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";
for (const [seed, streak, slot] of [[14, 42, 3], [17, 35, 0], [17, 42, 0], [28, 42, 3], [35, 35, 3], [35, 42, 3], [41, 35, 3], [41, 42, 3]] as const) {
  const run = generatedCommandAnimationReplay(seed, "on", [slot], streak, true);
  const body = run.animations.find((a) => a.moveId === 153 && a.attacker === 0);
  console.log(JSON.stringify({ seed, streak, slot, requests: run.requests.map((q) => `${q.moveId}:${q.attacker}->${q.target}`),
    ages: body?.ages.length ?? 0, active: body?.adapterActive.every(Boolean) ?? false, stalled: run.stalled, forced: Boolean(run.state.battleForcedPartySelect) }));
}
