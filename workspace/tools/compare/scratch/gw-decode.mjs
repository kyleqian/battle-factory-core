import { createSceneOnMovePresentation } from "../../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../../src/engine/core.ts";
import { readFileSync } from "node:fs";
// Render candidate strings with the app's message text renderer and compare to oracle line2 region.
import { drawText } from "../../../src/engine/font.ts";
import { LINE2_ORIGIN, MESSAGE_PALETTE, MESSAGE_TEXT_COLORS } from "../../../src/engine/battleScene.ts";
console.log("LINE2_ORIGIN", JSON.stringify(LINE2_ORIGIN));
console.log("LINE1_ORIGIN", (await import("../../../src/engine/battleScene.ts")).LINE1_ORIGIN);
