/// <reference types="vite/client" />

// Injected by vite.config.ts `define` — commit stamp of the served build.
declare const __POKEBENCH_BUILD_STAMP__: string;

// Injected by vite.config.ts `define` — content hash of the headless build (ENGINE_BUILD).
declare const __POKEBENCH_ENGINE_BUILD__: string;

// dl3: tools/build/monPicFiles.ts. Species -> URL of its picture file in a build; null in the dev server and vitest.
declare module "virtual:pokebench-mon-pic-files" {
  const files: Readonly<Record<string, string>> | null;
  export default files;
}

// dl4: tools/build/monPicFiles.ts. Animation asset name -> URL of its file in a build; null in the dev server and vitest.
declare module "virtual:pokebench-anim-asset-files" {
  const files: Readonly<Record<string, string>> | null;
  export default files;
}

// dl3: injected by the vite configs. SPRITE_FILES: the picture files exist (any build). SPRITE_FULL: the full-table chunk is bundled
// (the app build and the dev server, not the library build).
declare const __POKEBENCH_SPRITE_FILES__: boolean | undefined;
declare const __POKEBENCH_SPRITE_FULL__: boolean | undefined;
