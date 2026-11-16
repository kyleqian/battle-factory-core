// The battle sprite sheets in their former plain `{tileset, palette, frame2?}` shape (dl2 packed them; src/engine/monPicSheetCodec.ts).
// These are the provider's own tables, so reads are cached and identical to what the renderers see.
import { bundledMonPicTables } from "../../src/engine/monPicPixelsInstall.ts";

// biome-ignore lint/suspicious/noExplicitAny: test fixtures read nested pixel fields freely
export const backSprites = bundledMonPicTables().back as Record<string, any>;
// biome-ignore lint/suspicious/noExplicitAny: as above
export const frontSprites = bundledMonPicTables().front as Record<string, any>;
