import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { readFileSync as read } from "node:fs";
import { describe, expect, it } from "vitest";

const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

describe("MOVE_ROCK_TOMB source evidence checkpoint", () => {
  it("pins the complete exclusive body, carrier, and unsupported sibling", () => {
    const result = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/rockTombSourceAudit.ts"], { encoding: "utf8" }));
    expect(result.sourceBounds).toEqual({ start: "0x082d6224", endExclusive: "0x082d630b", bytes: 231 });
    expect(result.components).toHaveLength(6);
    expect(result.carriers).toBe(19);
    expect(result.carrier).toContain("FRONTIER_MON_GRIMER");
    expect(result.commands.filter((line: string) => line.startsWith("createsprite gRockTombRockSpriteTemplate"))).toHaveLength(4);
    expect(result.siblingAudit).toMatchObject({ move: "MOVE_HYPER_VOICE", shared: ["visualCommand:shake_battle_platforms"], promoted: false });
  });

  it("retains complete bilateral full-state and raw-RGB maps without claiming exact", () => {
    const rows = [
      ["player", "acdadfecc2696700dacc0b13d2ef16886b3efdab30c9c2e522df6d2e97ef9648", "0f0b9a2ab307253da54d0cf59ef2a5825d52d37798a8f30fb00990e4d5902bd9", "58e21ab113979298509df6b04d37f06de705ed676bc98039f3a1e2ab85b753a7"],
      ["opponent", "af616bc3c654d91af1c251fa143d20d0fbbc95100f8cf792b42b47eeced02a53", "bd5bc48b57376307c69a7f3e211f219b60072b549a732a39cf24ce0e1cefb28f", "e967063de8886772262922748a06e22b03d9208c42d547e8140a20fdc683fc79"],
    ] as const;
    for (const [side, stateSha, rawSha, mapSha] of rows) {
      const compressed = read(`tools/compare/evidence/rock-tomb-${side}-dense-state.json.gz`);
      expect(sha256(compressed)).toBe(stateSha);
      expect(sha256(read(`tools/compare/evidence/rock-tomb-${side}-raw-rgb.tar.gz`))).toBe(rawSha);
      expect(sha256(read(`tools/compare/evidence/rock-tomb-changemap-${side}.txt`))).toBe(mapSha);
      const probe = JSON.parse(gunzipSync(compressed).toString("utf8"));
      expect(probe.frames).toHaveLength(174);
      expect(probe.frames[0]).toMatchObject({ scriptOffset: 0 });
      expect(probe.frames.at(-1)).toMatchObject({ gAnimScriptActive: false });
      expect(probe.frames.slice(1).every((row: any, i: number) => JSON.stringify(row.hardwareOam) === JSON.stringify(probe.frames[i].softwareOam))).toBe(true);
      expect(probe.frames.slice(1).every((row: any, i: number) => row.registers.bg3hofs === (probe.frames[i].battleBg3.x & 0x1ff) && row.registers.bg3vofs === (probe.frames[i].battleBg3.y & 0x1ff))).toBe(true);
    }
  });
});
