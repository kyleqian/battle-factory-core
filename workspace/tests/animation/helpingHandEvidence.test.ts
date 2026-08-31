import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createScratchDir } from "../../tools/lib/scratch.ts";

const root = resolve(new URL("../..", import.meta.url).pathname);
const receipt = JSON.parse(readFileSync(join(root, "tools/compare/fixtures/helping-hand-evidence.json"), "utf8"));
const sha = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");

describe("MOVE_HELPING_HAND bilateral Scene-ON singles boundary", () => {
  it("reproduces both complete legal selections without entering the success animation root", () => {
    expect(receipt).toMatchObject({ move: "MOVE_HELPING_HAND", status: "unsupported", coverageCredit: false,
      repeatability: { runsPerOrientation: 2, allMatched: true },
      boundary: { profile: "battle-scene-on", mechanicLab: "v1 Level-50 singles", successRequires: "BATTLE_TYPE_DOUBLE",
        failureBefore: "attackanimation", rootScriptObserved: false, presentationAllocated: false } });
    for (const orientation of ["player-back", "opponent-front"] as const) {
      const item = receipt.orientations[orientation];
      expect(sha(readFileSync(join(root, item.scenario)))).toBe(item.scenarioSha256);
      const scratch = createScratchDir(`helping-hand-${orientation}-`);
      const output = join(scratch, "probe.json");
      execFileSync("python3", ["tools/run-mgba-probe.py", output, "--", "python3", "tools/compare/helpingHandProbe.py", item.scenario, output], {
        cwd: root, stdio: "pipe", timeout: 60_000,
      });
      expect(sha(readFileSync(output))).toBe(item.probeSha256);
      const probe = JSON.parse(readFileSync(output, "utf8"));
      expect(probe.window).toMatchObject(item.window);
      expect(probe.verdict).toMatchObject({ rootScriptObserved: false, presentationAllocated: false });
      expect(probe.rows).toHaveLength(item.window.rows);
      expect(probe.rows.every((row: any) => row.currentMove === 270 && (row.battleTypeFlags & 1) === 0
        && !row.rootScriptActive && row.helpingHandSpriteCount === 0 && row.helpingHandMovementTaskCount === 0
        && row.shakeMon2TaskCount === 0)).toBe(true);
      const ppKey = orientation === "player-back" ? "playerPp" : "opponentPp";
      expect(probe.rows[0][ppKey]).toEqual(item.pp.first);
      expect(probe.rows.at(-1)[ppKey]).toEqual(item.pp.last);
    }
  }, 60_000);
});
