// #145 ordinary-input routes: adapter active every age + ON/OFF logical parity (battle state at each action-menu boundary).
//   npx vite-node tools/integration/issue145Routes.ts
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";
const routes = [
  { name: "DRAGON_RAGE", id: 82, seed: 37, streak: 14, slot: 3 },
  { name: "AERIAL_ACE", id: 332, seed: 3, streak: 0, slot: 0 },
  { name: "QUICK_ATTACK", id: 98, seed: 3, streak: 0, slot: 1 },
] as const;
// Scene bit 0x80 of hitMarker excluded; nextEventSequence differs by the scene-ON-only presentation event (pre-existing, not logical).
const strip = (b: unknown) => JSON.stringify(b, (k, v) => (k === "nextEventSequence" ? undefined : k === "hitMarker" ? (v as number) & ~0x80 : v));
for (const r of routes) {
  const on = generatedCommandAnimationReplay(r.seed, "on", [r.slot], r.streak);
  const off = generatedCommandAnimationReplay(r.seed, "off", [r.slot], r.streak);
  const body = on.animations.find(a => a.moveId === r.id && a.attacker === 0);
  const parity = on.boundaries.length === off.boundaries.length
    && on.boundaries.every((b, i) => strip(b) === strip(off.boundaries[i]));
  console.log(JSON.stringify({ ...r, ages: body?.ages.length ?? null, active: body?.adapterActive.every(Boolean) ?? null,
    contiguous: body ? body.ages.every((a, i) => a === body.ages[0]! + i) : null, boundaries: on.boundaries.length, parity,
    requests: on.requests.map(q => [q.moveId, q.attacker]) }));
}
