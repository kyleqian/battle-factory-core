// dl1: estimate for tighter packing of the big generated tables (brotli q11 per file). Every flat array of integers (length >= 8) is lifted out
// of the JSON into a binary side blob (uint8 if all values 0..255, else int16 LE, else left in place); the JSON keeps a {$bin:n} stub.
// Reports shipped-JSON brotli vs lifted JSON + blob brotli. An estimate of the encoding gain only: decode cost is one typed-array view per table.
// Usage: node tools/bundle/packTables.mjs [file.json ...]   (default: the largest tables of the lib build)
import { readFileSync } from "node:fs";
import { brotliCompressSync, constants } from "node:zlib";

const br = (b) => brotliCompressSync(b, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_LGWIN]: 24 } }).length;
const defaults = ["src/data/gen/battle-script-program.json", "src/data/gen/battle-script-graph.json", "src/data/gen/battle-script-macro-emissions.json", "src/data/gen/battle-frontier-trainers.json", "src/data/gen/battle-frontier-mons.json", "src/assets/gen/party-mon-icons.json", "src/assets/gen/frontier-trainer-pics.json", "src/assets/gen/battle-room-npcs.json", "src/assets/gen/battle-sprite-palettes.json", "src/assets/gen/party-menu-chrome.json", "src/assets/gen/menu-idle-base.json", "src/animation/assets/hidden-power-red-orb.json", "src/animation/assets/surf-wave.json", "src/data/gen/anim-sound-timing.json", "src/data/gen/moves.json"];
const files = process.argv.slice(2).length ? process.argv.slice(2) : defaults;
const kib = (n) => (n / 1024).toFixed(1).padStart(7);
let totJ = 0, totP = 0;
console.log("file".padEnd(52), "raw KiB", " json br", " lifted br", " int-array share of raw");
for (const f of files) {
  const text = readFileSync(f, "utf8");
  const blobs = [];
  let lifted = 0;
  const walk = (v) => {
    if (Array.isArray(v)) {
      if (v.length >= 8 && v.every((x) => Number.isInteger(x))) {
        let lo = Infinity, hi = -Infinity; for (const x of v) { if (x < lo) lo = x; if (x > hi) hi = x; }
        if (lo >= 0 && hi < 256) { blobs.push(Buffer.from(v)); lifted += v.length; return { $bin: blobs.length - 1 }; }
        if (lo >= -32768 && hi < 32768) { const b = Buffer.alloc(v.length * 2); v.forEach((x, i) => b.writeInt16LE(x, i * 2)); blobs.push(b); lifted += v.length * 2; return { $bin: blobs.length - 1 }; }
        return v;
      }
      return v.map(walk);
    }
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  const stripped = JSON.stringify(walk(JSON.parse(text)));
  const j = br(Buffer.from(text)), p = br(Buffer.from(stripped)) + br(Buffer.concat(blobs));
  totJ += j; totP += p;
  console.log(f.replace(/^src\//, "").padEnd(52), kib(text.length), kib(j), kib(p), `  ${lifted} bytes lifted`);
}
console.log("TOTAL".padEnd(61), kib(totJ), kib(totP));
