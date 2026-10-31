// ENGINE_BUILD is a content hash of the headless build (tools/build/engineBuild.ts):
// stable for the same tree (any path, any commit), unmoved by files the headless
// graph does not emit, moved by any emitted module. Pinned on a small fixture
// project because a real headless build is ~16 s.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { computeEngineBuild, hashChunks } from "../tools/build/engineBuild.ts";

function writeFixture(dir: string): void {
  mkdirSync(join(dir, "src"), { recursive: true });
  mkdirSync(join(dir, "docs"), { recursive: true });
  writeFileSync(join(dir, "docs", "notes.md"), "notes\n");
  writeFileSync(join(dir, "src", "headless.js"), 'import { tick } from "./engine.js";\nexport const run = () => tick(3);\nexport const build = __POKEBENCH_ENGINE_BUILD__;\n');
  writeFileSync(
    join(dir, "src", "engine.js"),
    'import { paint } from "./renderer.js";\nexport const tick = (n) => n + 1;\nexport const draw = (ctx) => paint(ctx);\n',
  );
  writeFileSync(join(dir, "src", "renderer.js"), "export const paint = (ctx) => ctx.fill('red');\n");
}

const entry = "src/headless.js";
const build = (root: string) => computeEngineBuild({ root, entry });

describe("ENGINE_BUILD content hash", () => {
  const base = mkdtempSync(join(tmpdir(), "engine-build-"));
  writeFixture(base);

  it("is deterministic and path-independent", async () => {
    const first = await build(base);
    expect(first).toMatch(/^eb-[0-9a-f]{16}$/);
    expect(await build(base)).toBe(first);
    const copy = mkdtempSync(join(tmpdir(), "engine-build-copy-"));
    cpSync(base, copy, { recursive: true });
    expect(await build(copy)).toBe(first);
  });

  it("ignores docs and modules the headless output does not emit", async () => {
    const before = await build(base);
    writeFileSync(join(base, "docs", "notes.md"), "edited notes\n");
    writeFileSync(join(base, "src", "renderer.js"), "export const paint = (ctx) => ctx.fill('blue');\n");
    expect(await build(base)).toBe(before);
  });

  it("changes when an emitted module changes", async () => {
    const before = await build(base);
    writeFileSync(
      join(base, "src", "engine.js"),
      'import { paint } from "./renderer.js";\nexport const tick = (n) => n + 2;\nexport const draw = (ctx) => paint(ctx);\n',
    );
    expect(await build(base)).not.toBe(before);
  });

  it("hashChunks is order-independent and content-sensitive", () => {
    const a = { fileName: "a.js", code: "1" };
    const b = { fileName: "b.js", code: "2" };
    expect(hashChunks([a, b])).toBe(hashChunks([b, a]));
    expect(hashChunks([a, b])).not.toBe(hashChunks([a, { ...b, code: "3" }]));
  });

  it("the dev server and vitest do not build: ENGINE_BUILD falls back to \"dev\"", async () => {
    const { engineBuildDefine } = await import("../vite.config.ts");
    expect(await engineBuildDefine("serve")).toEqual({ __POKEBENCH_ENGINE_BUILD__: '"dev"' });
  });

  it("the headless graph does not read the commit stamp", () => {
    for (const file of ["src/factorySession.ts", "src/headless.ts", "src/lib.ts"]) {
      expect(readFileSync(file, "utf8"), file).not.toContain("__POKEBENCH_BUILD_STAMP__");
    }
  });
});
