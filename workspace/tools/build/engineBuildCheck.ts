// Prints this tree's ENGINE_BUILD (a content hash of the headless build; see engineBuild.ts).
//   node --experimental-strip-types tools/build/engineBuildCheck.ts
import { computeEngineBuild } from "./engineBuild.ts";
import { manualChunks } from "../../vite.config.ts";

console.log(await computeEngineBuild({ root: ".", entry: "src/headless.ts", manualChunks }));
