// dl3: the per-species battle picture files (docs/dl3-per-species-pictures.md). In a build the virtual module `virtual:pokebench-mon-pic-files`
// emits one file per species, `sprites/<SPECIES>.txt` = `<front sheet>\n<back sheet>` (the dl2 row strings), next to the chunks, and exports
// `{ SPECIES: new URL(<file>, import.meta.url).href }`, so a host bundler picks every file up as an asset the same way it does the audio
// files. In the dev server and vitest it exports `null` (no files exist there; the full install is used).
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const MON_PIC_FILES_MODULE = "virtual:pokebench-mon-pic-files";
const RESOLVED = `\0${MON_PIC_FILES_MODULE}`;
// dl4: the same for the move-animation assets, `sprites/anim/<asset>.txt` = the asset's minified JSON, so one copied `sprites/` directory serves both.
export const ANIM_ASSET_FILES_MODULE = "virtual:pokebench-anim-asset-files";
const ANIM_RESOLVED = `\0${ANIM_ASSET_FILES_MODULE}`;

/** Every asset that is fetched as a file: the ones the lib does not import statically (`eager` in the move table). */
export function animAssetFileTexts(root = "."): Record<string, string> {
  const dir = resolve(root, "src/animation/assets");
  const eager = new Set((JSON.parse(readFileSync(resolve(root, "src/assets/gen/anim-asset-moves.json"), "utf8")) as { eager: string[] }).eager);
  const out: Record<string, string> = {};
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".json") && !eager.has(name.slice(0, -5))).sort()) {
    out[file.slice(0, -5)] = JSON.stringify(JSON.parse(readFileSync(resolve(dir, file), "utf8")));
  }
  return out;
}

export function monPicFileTexts(root = "."): Record<string, string> {
  const read = (name: string): Record<string, string> => JSON.parse(readFileSync(resolve(root, "src/assets/gen", name), "utf8"));
  const front = read("battle-opponent-front-sprite-rows.json");
  const back = read("battle-back-sprite-rows.json");
  const out: Record<string, string> = {};
  for (const species of Object.keys(front)) {
    if (back[species] === undefined) throw new Error(`mon pic files: ${species} has a front sheet and no back sheet`);
    out[species] = `${front[species]}\n${back[species]}`;
  }
  if (Object.keys(back).length !== Object.keys(out).length) throw new Error("mon pic files: the front and back sheets name different species");
  return out;
}

// Structurally typed: vite.config.ts (vitest's vite) and vite.lib.config.ts (the app's vite) are two different vite versions.
export function monPicFilesPlugin() {
  let building = false;
  return {
    name: "pokebench-mon-pic-files",
    configResolved(config: { command: string }) {
      building = config.command === "build";
    },
    resolveId(id: string) {
      return id === MON_PIC_FILES_MODULE ? RESOLVED : id === ANIM_ASSET_FILES_MODULE ? ANIM_RESOLVED : null;
    },
    load(this: { emitFile(file: { type: "asset"; fileName: string; source: string }): string }, id: string) {
      if (id === ANIM_RESOLVED) {
        if (!building) return "export default null;";
        const entries = Object.entries(animAssetFileTexts()).map(([name, source]) => {
          const ref = this.emitFile({ type: "asset", fileName: `sprites/anim/${name}.txt`, source });
          return `${JSON.stringify(name)}: new URL(import.meta.ROLLUP_FILE_URL_${ref}).href`;
        });
        return `export default {\n${entries.join(",\n")}\n};`;
      }
      if (id !== RESOLVED) return null;
      if (!building) return "export default null;";
      const entries = Object.entries(monPicFileTexts()).map(([species, source]) => {
        const ref = this.emitFile({ type: "asset", fileName: `sprites/${species}.txt`, source });
        return `${JSON.stringify(species)}: new URL(import.meta.ROLLUP_FILE_URL_${ref}).href`;
      });
      return `export default {\n${entries.join(",\n")}\n};`;
    },
  };
}
