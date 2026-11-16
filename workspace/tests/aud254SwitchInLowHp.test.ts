// aud254: the player send-in's HandleLowHpMusicChange (SwitchIn_HandleSoundAndEnd, battle_controller_player.c:1087) after a faint, party-menu forced send-in, both scenes.
// The delay is the controller end (D - 65 after the cry start, switchInTail's forced switch-in duration), not a constant after the restore. Fixture = ROM step windows of seed 237
// (tools/audio/fixtures/aud254-forced-sendin-237-{off,on}.json): Gligar (healthy: stop 90 at the restore / 50 frames after it) and Pupitar 10/164 (SE_LOW_HEALTH on the restore frame in
// Scene OFF, 10 frames after it in Scene ON). The engine side is a live soundCensusRomReplay run on the same setup; rows are matched in kind:id:pan order.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type Row = [number, string, number | null, number | null];
const fixture = JSON.parse(readFileSync(new URL("./fixtures/aud254-switchin-lowhp.json", import.meta.url), "utf8")) as {
  setups: Record<"on" | "off", unknown>;
  windows: Record<string, { scene: "on" | "off"; anchor: { kind: string; id: number; index: number }; rom: Row[] }>;
};
const script = new URL("../tools/integration/soundCensusRomReplay.ts", import.meta.url).pathname;
const KINDS = ["se", "cry", "duck", "stop"];

const cache = new Map<string, Row[]>();
function engineSound(scene: "on" | "off"): Row[] {
  if (!cache.has(scene)) {
    const dir = mkdtempSync(join(tmpdir(), "aud254-"));
    writeFileSync(join(dir, "setup.json"), JSON.stringify(fixture.setups[scene]));
    execFileSync("node", ["--experimental-strip-types", "--no-warnings", script, "replay", "--seed=237", `--scene=${scene}`, `--setup=${join(dir, "setup.json")}`, `--out=${join(dir, "engine.json")}`], { stdio: "pipe", maxBuffer: 1 << 28 });
    const engine = JSON.parse(readFileSync(join(dir, "engine.json"), "utf8")) as { sound: Row[] };
    cache.set(scene, engine.sound.filter((r) => r[0] >= 0 && KINDS.includes(r[1])).map((r): Row => [r[0], r[1], r[2], r[3]]));
  }
  return cache.get(scene)!;
}

function engineWindow(name: string): Row[] {
  const w = fixture.windows[name]!;
  const rows = engineSound(w.scene);
  const at = rows.map((r, i) => (r[1] === w.anchor.kind && r[2] === w.anchor.id ? i : -1)).filter((i) => i >= 0)[w.anchor.index]!;
  const before = w.rom.findIndex((r) => r[0] === 0 && r[1] === w.anchor.kind);
  return rows.slice(at - before, at - before + w.rom.length).map((r): Row => [r[0] - rows[at]![0], r[1], r[2], r[3]]);
}

describe("forced send-in low-HP sounds (aud254)", () => {
  for (const name of Object.keys(fixture.windows)) {
    it(`${name}: the same rows on the ROM's frames`, { timeout: 120_000 }, () => {
      const ours = engineWindow(name);
      const rom = fixture.windows[name]!.rom;
      expect(ours.map(([, kind, id, pan]) => `${kind}:${id}:${pan}`)).toEqual(rom.map(([, kind, id, pan]) => `${kind}:${id}:${pan}`));
      expect(ours.map((r, i) => r[0] - rom[i]![0])).toEqual(rom.map(() => 0));
    });
  }
});
