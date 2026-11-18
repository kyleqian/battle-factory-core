// dl4: the browser's move-animation asset provider, one small file per asset (docs/dl3-per-species-pictures.md, section dl4). A file is the
// asset's JSON text. Same shape as the picture store (monPicSpriteStore.ts): a read before the file arrived records the name, starts the
// fetch and throws AnimAssetPending; `pending(wanted)` starts the fetches and `whenLoaded` awaits them; one retry, then a sticky failure.
// `takeMissed` lists the assets a draw read while pending even when a `catch` inside the renderer swallowed the throw, so the loop can
// discard that frame (render() is pure) instead of presenting it. No JSON import and no side effect: the headless graph never reaches this module.
import { AnimAssetPending, type AnimAssetSource } from "./animAssets.ts";

export interface AnimAssetStore {
  readonly source: AnimAssetSource;
  /** Every asset that has a file. */
  readonly names: readonly string[];
  has(name: string): boolean;
  /** The assets of `wanted` whose file has not arrived; starts the fetch of each one not yet requested. Unknown names are ignored. */
  pending(wanted: Iterable<string>): string[];
  /** Resolves when every file of `wanted` has arrived; rejects with the load error if one failed (after one retry). */
  whenLoaded(wanted: Iterable<string>): Promise<void>;
  /** The assets read while pending since the last call (cleared by the call). */
  takeMissed(): string[];
  readonly failure: Error | null;
}

export interface AnimAssetStoreOptions {
  names: readonly string[];
  /** The file text of one asset. */
  load(name: string): Promise<string>;
}

type Entry = { state: "loading"; promise: Promise<void> } | { state: "loaded" };

export function createAnimAssetStore(options: AnimAssetStoreOptions): AnimAssetStore {
  const known = new Set(options.names);
  const entries = new Map<string, Entry>();
  const texts = new Map<string, string>();
  const parsed = new Map<string, object>();
  let missed = new Set<string>();
  let failure: Error | null = null;

  function fetchOnce(name: string, attempt: number): Promise<void> {
    return options.load(name).then(
      (text) => {
        texts.set(name, text);
        entries.set(name, { state: "loaded" });
      },
      (error: unknown) => {
        if (attempt < 1) return fetchOnce(name, attempt + 1);
        entries.delete(name);
        failure ??= new Error(`animation asset ${name} failed to load: ${error instanceof Error ? error.message : String(error)}`);
        throw failure;
      },
    );
  }

  function request(name: string): Entry {
    let entry = entries.get(name);
    if (entry === undefined) {
      const promise = fetchOnce(name, 0);
      promise.catch(() => undefined);
      entry = { state: "loading", promise };
      entries.set(name, entry);
    }
    return entry;
  }

  return {
    source: {
      get(name) {
        const cached = parsed.get(name);
        if (cached !== undefined) return cached;
        const text = texts.get(name);
        if (text === undefined) {
          if (!known.has(name)) throw new Error(`animation asset ${name} has no file`);
          missed.add(name);
          if (failure === null) request(name);
          throw new AnimAssetPending(name);
        }
        const value = JSON.parse(text) as object;
        parsed.set(name, value);
        return value;
      },
    },
    names: options.names,
    has: (name) => known.has(name),
    pending(wanted) {
      const waiting: string[] = [];
      for (const name of wanted) {
        if (!known.has(name)) continue;
        if (request(name).state !== "loaded") waiting.push(name);
      }
      return waiting;
    },
    whenLoaded(wanted) {
      const waits: Promise<void>[] = [];
      for (const name of wanted) {
        if (!known.has(name)) continue;
        const entry = request(name);
        if (entry.state === "loading") waits.push(entry.promise);
      }
      return Promise.all(waits).then(() => undefined);
    },
    takeMissed() {
      const out = [...missed];
      missed = new Set();
      return out;
    },
    get failure() {
      return failure;
    },
  };
}

let current: AnimAssetStore | undefined;
let currentKey: string | undefined;

/** The shared store for this file source; a different `key` (a different base) starts a new one. */
export function sharedAnimAssetStore(key: string, create: () => AnimAssetStore): AnimAssetStore {
  if (current === undefined || currentKey !== key) {
    current = create();
    currentKey = key;
  }
  return current;
}

/** The shared store when `source` (the provider's installed source) is its own, else undefined. */
export function activeAnimAssetStore(source: AnimAssetSource | undefined): AnimAssetStore | undefined {
  return current !== undefined && source === current.source ? current : undefined;
}
