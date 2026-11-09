// Importing this module installs the battle sprite pixel tables into the provider (monPicPixels.ts). Imported by src/lib.ts, the vitest setup
// and the render tools; never by the headless graph (src/headless.ts), which is what keeps the sprite JSON out of dist-lib/chunks-headless.
import backSpritesData from "../assets/gen/battle-back-sprites.json" with { type: "json" };
import frontSpritesData from "../assets/gen/battle-opponent-front-sprites.json" with { type: "json" };
import { installMonPicPixels, type MonPicPixelTables } from "./monPicPixels.ts";

installMonPicPixels({ back: backSpritesData, front: frontSpritesData } as unknown as MonPicPixelTables);
