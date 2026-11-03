// vis243a: send-in window census. Per Factory species: the player back-animation wait tick (per nature), the front-animation end, and each
// path's send-in window, with the frames the current voluntary player path clips.
//   node --experimental-strip-types --no-warnings tools/integration/vis243aCensus.ts <out.json> [--md=<out.md>]
import { readFileSync, writeFileSync } from "node:fs";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { SEND_IN_TAIL_ANIM_IDS, SEND_IN_TAIL_FRONT_ANIM_DURATION, SEND_IN_TAIL_SPECIES, sendInTail } from "../../src/data/sendInTail.ts";
import { SEND_IN_TAIL_OFF_CRY_FRAMES } from "../../src/data/sendInTailOff.ts";
import { SWITCH_IN_SPAN_FRAMES, SWITCH_IN_WAITSTATE_HOLD_FRAMES, switchInTiming } from "../../src/engine/battleResolutionPresentation.ts";
import { backAnimWaitTick, sceneOnPlayerForcedSwitchInDuration } from "../../src/engine/switchInTail.ts";

const MID_BATTLE_SWITCH_BACK_ANIM_START_ELAPSED = 66;
const ids: number[] = JSON.parse(readFileSync(new URL("./fixtures/forced-switch/factory-species-ids.json", import.meta.url), "utf8"));
const names = new Map(speciesStats.species.map((s) => [s.id, s.name.replace(/^SPECIES_/, "")]));
const NATURES = 25;
const voluntary = (species: number, nature: number) => {
  const t = switchInTiming(0, species, true, "", false, nature);
  return t.minimumFrames + SWITCH_IN_WAITSTATE_HOLD_FRAMES;
};
type Row = Record<string, unknown>;
const rows: Row[] = [];
for (const id of ids) {
  const backs = Array.from({ length: NATURES }, (_, n) => backAnimWaitTick(id, n));
  const known = backs.filter((b): b is number => b !== null);
  const forced = Array.from({ length: NATURES }, (_, n) => sceneOnPlayerForcedSwitchInDuration(id, n));
  const need = forced.map((f) => f + SWITCH_IN_WAITSTATE_HOLD_FRAMES);
  const have = Array.from({ length: NATURES }, (_, n) => voluntary(id, n));
  const animClip = backs.map((b) => b === null ? 0 : Math.max(0, MID_BATTLE_SWITCH_BACK_ANIM_START_ELAPSED + b - have[0]!));
  const lateBy = need.map((n, i) => n - have[i]!);
  const row = SEND_IN_TAIL_SPECIES[id];
  const S = row?.[0] ?? 0;
  const A = row === undefined ? 0 : (SEND_IN_TAIL_FRONT_ANIM_DURATION[SEND_IN_TAIL_ANIM_IDS[row[1]]!] ?? 0);
  const delay = row?.[2] ?? 0;
  const opp = sendInTail(id, "opponent");
  rows.push({
    id, name: names.get(id), cry: SEND_IN_TAIL_OFF_CRY_FRAMES[id] ?? null,
    backTickMin: known.length ? Math.min(...known) : null, backTickMax: known.length ? Math.max(...known) : null, backNatures: known.length,
    voluntaryWindow: have[0], correctWindowMin: Math.min(...need), correctWindowMax: Math.max(...need),
    animClippedNatures: animClip.filter((c) => c > 0).length, animClipMax: Math.max(...animClip), animClipMin: Math.min(...animClip),
    shortNatures: lateBy.filter((c) => c > 0).length, shortMax: Math.max(...lateBy), shortMin: Math.min(...lateBy),
    frontS: S, frontA: A, frontDelay: delay, frontAnimEnd: Math.max(S, A + (delay > 0 ? delay - 1 : 0)),
    oppSlideStart: opp.slideStart, oppWindow: opp.messageStart,
  });
}
const out = process.argv[2]!;
const clipped = rows.filter((r) => (r.animClippedNatures as number) > 0);
const summary = {
  species: rows.length, voluntaryWindow: SWITCH_IN_SPAN_FRAMES + SWITCH_IN_WAITSTATE_HOLD_FRAMES,
  speciesWithAnimClippedNature: clipped.length, speciesWithShortWindowNature: rows.filter((r) => (r.shortNatures as number) > 0).length,
  speciesAlwaysShort: rows.filter((r) => (r.shortMin as number) > 0).length,
  worstShort: Math.max(...rows.map((r) => r.shortMax as number)), worstAnimClip: Math.max(...rows.map((r) => r.animClipMax as number)),
  noBackReducer: rows.filter((r) => r.backNatures === 0).map((r) => r.name),
};
writeFileSync(out, JSON.stringify({ summary, rows }, null, 1) + "\n");
console.log(JSON.stringify(summary));
const md = process.argv.find((a) => a.startsWith("--md="));
if (md !== undefined) {
  const lines = ["| id | species | cry | back wait tick (min..max) | current window | window the ROM rule needs (min..max) | back-anim frames clipped (min..max) | natures clipped / 25 |", "|---|---|---|---|---|---|---|---|"];
  for (const r of [...rows].sort((a, b) => (b.animClipMax as number) - (a.animClipMax as number))) {
    if ((r.shortMax as number) <= 0) continue;
    lines.push(`| ${r.id} | ${r.name} | ${r.cry} | ${r.backTickMin}..${r.backTickMax} | ${r.voluntaryWindow} | ${r.correctWindowMin}..${r.correctWindowMax} | ${r.animClipMin}..${r.animClipMax} | ${r.animClippedNatures} |`);
  }
  writeFileSync(md.slice(5), lines.join("\n") + "\n");
}
