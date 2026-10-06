// prep13: Hidden Power is only ever used by FRONTIER_MON_UNOWN (battle-frontier-mons.json index 126). The ROM's attacker coordinates use the personality's letter form (GET_UNOWN_LETTER ->
// SPECIES_UNOWN_B..Z coords). Does the production art view reproduce the ROM orbit-center for form-specific species ids?   npx vite-node tools/integration/prep13UnownForm.ts
import { readFileSync, writeFileSync } from "node:fs";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { hiddenPowerUnownFormIndex } from "../../src/animation/hiddenPower.ts";
const species = readFileSync("reference/pokeemerald/include/constants/species.h", "utf8");
const id = (n: string) => Number(new RegExp(`#define SPECIES_${n}\\s+(\\d+)`).exec(species)?.[1] ?? NaN);
const H = JSON.parse(readFileSync("tools/integration/fixtures/prep13/prep13-hidden-power-check.json", "utf8")) as Record<string, any>;
const A = JSON.parse(readFileSync("tools/integration/fixtures/prep13/prep13-analysis.json", "utf8")) as Record<string, any[]>;
const out: Record<string, unknown> = {};
for (const [sc, h] of Object.entries(H)) {
  if (!/unown/.test(sc)) continue;
  const r = A[sc]![0]!;
  const form = hiddenPowerUnownFormIndex(h.personality);
  const letter = form === 0 ? "UNOWN" : `UNOWN_${String.fromCharCode(65 + form)}`;
  const sid = id(letter);
  const side = h.side as "player" | "opponent";
  const mk = (sp: number) => createBattleCommandFieldArtView({ player: { species: side === "player" ? sp : r.monsAtAct[0].species }, opponent: { species: side === "opponent" ? sp : r.monsAtAct[1].species } } as never);
  let formAnch: unknown = "unavailable";
  try { formAnch = liveBattlerAnchors(side, mk(sid)).picOffsetPoint; } catch (e) { formAnch = `error: ${(e as Error).message}`; }
  const baseAnch = liveBattlerAnchors(side, mk(id("UNOWN"))).picOffsetPoint;
  out[sc] = { side, personality: h.personality, formIndex: form, letter, formSpeciesId: sid, romCenter: h.centerCandidates.rom, anchorsBaseUnown: baseAnch, anchorsFormSpecies: formAnch };
  console.log(sc.padEnd(52), "form", form, letter, sid, "ROM", JSON.stringify(h.centerCandidates.rom), "base", JSON.stringify(baseAnch), "form", JSON.stringify(formAnch));
}
writeFileSync("tools/integration/fixtures/prep13/prep13-unown-form.json", JSON.stringify(out, null, 1));
