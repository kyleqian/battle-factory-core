import { execFileSync } from "node:child_process";

const output = execFileSync(process.execPath, [
  "--experimental-strip-types",
  "tools/compare/doubleKickAssetAudit.ts",
], { encoding: "utf8" });

const expected = "IMPACT 37ca40afc9002588e5f62d2d20e5dd37058ba7ad57c9615d1e46282372cc55fc";
if (!output.includes(expected)) throw new Error("Double Slap IMPACT source/generated asset audit changed");
console.log(`MOVE_DOUBLE_SLAP deterministic asset audit exact: ${expected}`);
