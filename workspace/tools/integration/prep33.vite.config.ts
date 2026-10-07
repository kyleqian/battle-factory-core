// prep33: vite-node config that (only when PREP33_SHOCKWAVE names a patched copy, see prep33ShockWavePatch.ts) resolves
// sceneOnPresentation.ts's `./shockWave.ts` import to that copy, so the UNCHANGED renderer runs on the proposed reducer change.
import { defineConfig } from "vite";
export default defineConfig({ resolve: { alias: process.env.PREP33_SHOCKWAVE ? [{ find: /^\.\/shockWave\.ts$/, replacement: process.env.PREP33_SHOCKWAVE }] : [] } });
