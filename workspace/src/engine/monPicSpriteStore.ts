// dl3: the browser's battle picture provider, one small file per species (docs/dl3-per-species-pictures.md). A file is
// `<front sheet>\n<back sheet>`, each in the dl2 row format (monPicSheetCodec.ts). The store builds the same two tables the full install
// does, but a species is readable only after its file arrived: a read before that throws MonPicPending (monPicPending.ts) and the lib
// loop fetches it and holds. No JSON import and no side effect: the headless graph never reaches this module.
import { MonPicPending } from "./monPicPending.ts";
import { decodeMonPicSheet, type UnpackedMonPicSheet } from "./monPicSheetCodec.ts";
import type { MonPicPixelTables } from "./monPicPixels.ts";

export interface MonPicSpriteStore {
  /** The provider tables to install (monPicPixels.ts `installMonPicPixels`). */
  readonly tables: MonPicPixelTables;
  /** Every species that has a file (key order of the sheets). */
  readonly species: readonly string[];
  /** Whether `species` has a picture file. */
  has(species: string): boolean;
  /** The species of `wanted` whose file has not arrived; starts the fetch of each one not yet requested. Unknown names are ignored. */
  pending(wanted: Iterable<string>): string[];
  /** Resolves when every file of `wanted` has arrived; rejects with the load error if one failed (after one retry). */
  whenLoaded(wanted: Iterable<string>): Promise<void>;
  /** The first load error, or null. A failed species stays failed. */
  readonly failure: Error | null;
}

export interface MonPicSpriteStoreOptions {
  species: readonly string[];
  /** The file text of one species (`front\nback`). */
  load(species: string): Promise<string>;
}

type Entry = { state: "loading"; promise: Promise<void> } | { state: "loaded" };

export function createMonPicSpriteStore(options: MonPicSpriteStoreOptions): MonPicSpriteStore {
  const known = new Set(options.species);
  const entries = new Map<string, Entry>();
  const sheets = { front: new Map<string, UnpackedMonPicSheet>(), back: new Map<string, UnpackedMonPicSheet>() };
  const raw = new Map<string, readonly [string, string]>();
  let failure: Error | null = null;

  function fetchOnce(species: string, attempt: number): Promise<void> {
    return options.load(species).then(
      (text) => {
        const cut = text.indexOf("\n");
        if (cut < 0) throw new Error(`mon pic file for ${species} is malformed`);
        raw.set(species, [text.slice(0, cut), text.slice(cut + 1)]);
        entries.set(species, { state: "loaded" });
      },
      (error: unknown) => {
        if (attempt < 1) return fetchOnce(species, attempt + 1);
        entries.delete(species);
        failure ??= new Error(`mon pic file for ${species} failed to load: ${error instanceof Error ? error.message : String(error)}`);
        throw failure;
      },
    );
  }

  function request(species: string): Entry {
    let entry = entries.get(species);
    if (entry === undefined) {
      // The rejection is surfaced through `failure` and `whenLoaded`; this catch only keeps a fire-and-forget fetch from being unhandled.
      const promise = fetchOnce(species, 0);
      promise.catch(() => undefined);
      entry = { state: "loading", promise };
      entries.set(species, entry);
    }
    return entry;
  }

  function sheet(side: "front" | "back", species: string): UnpackedMonPicSheet {
    const cached = sheets[side].get(species);
    if (cached !== undefined) return cached;
    const files = raw.get(species);
    if (files === undefined) {
      if (failure === null) request(species);
      throw new MonPicPending(species);
    }
    const decoded = decodeMonPicSheet(files[side === "front" ? 0 : 1]);
    sheets[side].set(species, decoded);
    return decoded;
  }

  const table = (side: "front" | "back"): Record<string, UnpackedMonPicSheet> => {
    const view: Record<string, UnpackedMonPicSheet> = {};
    for (const species of options.species) {
      Object.defineProperty(view, species, { enumerable: true, configurable: true, get: () => sheet(side, species) });
    }
    return view;
  };

  return {
    tables: { back: table("back"), front: table("front") } as unknown as MonPicPixelTables,
    species: options.species,
    has: (species) => known.has(species),
    pending(wanted) {
      const missing: string[] = [];
      for (const species of wanted) {
        if (!known.has(species)) continue;
        if (request(species).state !== "loaded") missing.push(species);
      }
      return missing;
    },
    whenLoaded(wanted) {
      const waits: Promise<void>[] = [];
      for (const species of wanted) {
        if (!known.has(species)) continue;
        const entry = request(species);
        if (entry.state === "loading") waits.push(entry.promise);
      }
      return Promise.all(waits).then(() => undefined);
    },
    get failure() {
      return failure;
    },
  };
}

// The store the browser mounts share, so a second mount (or a re-mount after destroy()) reuses the pictures already fetched.
let current: MonPicSpriteStore | undefined;
let currentKey: string | undefined;

/** The shared store for this file source; a different `key` (a different spriteBase) starts a new one. */
export function sharedMonPicSpriteStore(key: string, create: () => MonPicSpriteStore): MonPicSpriteStore {
  if (current === undefined || currentKey !== key) {
    current = create();
    currentKey = key;
  }
  return current;
}

/** The shared store when `tables` (the provider's installed tables) are its own, else undefined. */
export function activeMonPicSpriteStore(tables: MonPicPixelTables | undefined): MonPicSpriteStore | undefined {
  return current !== undefined && tables === current.tables ? current : undefined;
}
