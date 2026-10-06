// prep20: per-age visible-sprite order check.  Claim under test: the hardware-OAM sprite order of row r equals the stable sort, by
// (oam.priority << 8 | subpriority) ascending then OAM top y descending, of the PREVIOUS row's full 64-slot sSpriteOrder restricted to the
// visible sprites of row r (keys from row r).  usage: node tools/integration/prep20OrderCheck.cjs <altDir> [out.json]
const z = require("zlib"), fs = require("fs"), path = require("path");
const load = (p) => { const b = fs.readFileSync(p); return JSON.parse(p.endsWith(".gz") ? z.gunzipSync(b) : b).frames; };
const E = "tools/compare/evidence/", A = process.argv[2], out = [];
function test(name, F) {
  let rows = 0, ok = 0; const bad = []; let prev = null;
  for (const [a, f] of F.entries()) {
    const key = (s) => { let y = s.attr[0] & 0xff; if (y >= 160) y -= 256; return [(s.attr[2] >> 10 & 3) << 8 | s.subpriority, y]; };
    const vis = f.sprites.filter((s) => !s.invisible && (s.flags & 1)), bySlot = new Map(vis.map((s) => [s.slot, s]));
    const actual = f.spriteOrder.filter((sl) => bySlot.has(sl));
    const cand = (prev ?? f.spriteOrder).filter((sl) => bySlot.has(sl));
    const sorted = [...cand].sort((l, r) => { const kl = key(bySlot.get(l)), kr = key(bySlot.get(r)); return kl[0] - kr[0] || kr[1] - kl[1]; });
    rows += 1; if (JSON.stringify(sorted) === JSON.stringify(actual)) ok += 1; else if (bad.length < 3) bad.push(a);
    prev = f.spriteOrder.slice();
  }
  out.push({ name, rows, exact: ok, firstMismatches: bad }); console.log(name, `${ok}/${rows}`, bad.join(","));
}
const slices = (F, n) => Array.from({ length: Math.floor(F.length / n) }, (_, b) => F.slice(b * n, b * n + n));
for (const [n, f] of [["wisp-player", "will-o-wisp-player"], ["wisp-opponent", "will-o-wisp-opponent"], ["pursuit-player", "pursuit-player"], ["pursuit-opponent", "pursuit-opponent"],
  ["pursuit-switchout", "pursuit-switchout-opponent"], ["megahorn-player", "mega-horn-player"], ["megahorn-opponent", "mega-horn-opponent"]]) test(`accepted-${n}`, load(`${E}${f}-dense-state.json.gz`));
for (const side of ["player", "opponent"]) slices(load(`${E}fury-cutter-${side}-dense-state.json.gz`), 43).forEach((F, b) => test(`accepted-fury-${side}-${b + 1}`, F));
if (A) for (const f of fs.readdirSync(A).filter((x) => /-r1\.json$/.test(x) && /(will-o-wisp|pursuit|megahorn|fury-cutter)-(alt|six)/.test(x))) {
  const F = load(path.join(A, f)), n = f.replace(/-r1\.json$/, "");
  if (/fury/.test(f)) slices(F, 43).forEach((S, b) => test(`${n}-body${b + 1}`, S)); else test(n, F); }
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1) + "\n");
