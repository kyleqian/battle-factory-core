// aud263: the T1 sound census rules (tools/integration/soundCensusExpected.ts --nonmove) know the three wsh1 General_* commands: rows of the extracted table
// (data/battle_anim_scripts.s General_WishHeal / General_FutureSightHit / General_FocusBand), attacker = the command's battler.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const script = new URL("../tools/integration/soundCensusExpected.ts", import.meta.url).pathname;
const KEYS = ["WISH_HEAL", "FUTURE_SIGHT_HIT", "FOCUS_BAND"].flatMap((a) => [0, 1].map((b) => ["general-animation", b, a]));

function rowsOf(): Record<string, { rows: unknown[][] }> {
  const dir = mkdtempSync(join(tmpdir(), "aud263-"));
  writeFileSync(join(dir, "keys.json"), JSON.stringify(KEYS));
  execFileSync("node", ["--experimental-strip-types", "--no-warnings", script, join(dir, "keys.json"), join(dir, "out.json"), "--nonmove"], { stdio: "pipe" });
  return JSON.parse(readFileSync(join(dir, "out.json"), "utf8"));
}

describe("T1 census rules for the wsh1 General_* SE streams (aud263)", () => {
  it("resolves the table rows with the command battler as the attacker", () => {
    const out = rowsOf();
    expect(out["general-animation,0,WISH_HEAL"]!.rows).toEqual([[35, "se", 140, -64, 0], [110, "se", 179, -64, 0]]);
    expect(out["general-animation,1,WISH_HEAL"]!.rows).toEqual([[35, "se", 140, 63, 0], [110, "se", 179, 63, 0]]);
    expect(out["general-animation,0,FUTURE_SIGHT_HIT"]!.rows).toEqual([[3, "se", 189, -64, 0], [41, "se", 184, 63, 0], [50, "se", 184, 63, 0]]);
    expect(out["general-animation,1,FUTURE_SIGHT_HIT"]!.rows).toEqual([[3, "se", 189, 63, 0], [41, "se", 184, -63, 0], [50, "se", 184, -63, 0]]);
    expect(out["general-animation,0,FOCUS_BAND"]!.rows).toEqual([[0, "se", 171, -64, 0]]);
    expect(out["general-animation,1,FOCUS_BAND"]!.rows).toEqual([[0, "se", 171, 63, 0]]);
  }, 60_000);
});
