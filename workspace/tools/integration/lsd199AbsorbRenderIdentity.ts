// lsd199 (docs/lsd198-leech-seed-drain-animation.md, lsd199 section): the ordinary (controller-hosted) MOVE_ABSORB live render, every age -2..196, both orientations,
// LOMBRE/ONIX and VENUSAUR/ONIX, as one sha256 per case plus an all-case digest. Run on two trees: equal output = the ordinary Absorb pixels did not move, so the
// prep9 dense zero-residual proof still describes them.   node --experimental-strip-types --no-warnings tools/integration/lsd199AbsorbRenderIdentity.ts
import { createHash } from "node:crypto";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { prepareLiveMoveSpriteOrder } from "../../src/engine/liveMoveSpriteAllocator.ts";
import { knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";

const mon = (name: string) => ({ species: speciesStats.species.find((s) => s.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
  hp: 100, maxHP: 100, gender: "male", status: "none", personality: 3 });
const all = createHash("sha256");
for (const [atk, def] of [["LOMBRE", "ONIX"], ["VENUSAUR", "ONIX"]]) for (const attacker of [0, 1] as const) {
  const field = (attacker === 0 ? { player: mon(atk!), opponent: mon(def!) } : { player: mon(def!), opponent: mon(atk!) }) as any;
  const request = { moveId: 71, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0 } as const;
  const order = prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request).input!;
  const h = createHash("sha256");
  for (let age = -2; age <= 196; age++) {
    const view = { field, fieldArt: createBattleCommandFieldArtView(field),
      healthboxes: { player: { name: field.player.name, level: 50, gender: "male", hpFraction: 1, status: "none", currentHp: 100, maxHp: 100 },
        opponent: { name: field.opponent.name, level: 50, gender: "male", hpFraction: 1, status: "none" } },
      message: { lines: ["X used", "ABSORB!"], visibleCharacters: 99 }, effect: { type: "move", request, age, spriteOrderInput: order },
      visibility: { player: { sprite: true, healthbox: true }, opponent: { sprite: true, healthbox: true } },
      waitCursor: null, bottom: "message", confirmHandoff: null, switchIn: null, midBattleSwitchIn: null, switchOut: null, partySummary: null,
      midBattleSwitchFade: null, midBattleSwitchParticles: null, trainerSlide: null } as any;
    const fb = new Uint8Array(240 * 160 * 4);
    renderBattleResolutionLiveView(fb, view);
    h.update(fb); all.update(fb);
  }
  console.log(`${atk}->${def} attacker ${attacker}: ${h.digest("hex").slice(0, 16)}`);
}
console.log(`all: ${all.digest("hex").slice(0, 16)}`);
