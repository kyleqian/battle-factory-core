// prep6 sprite-order dependence scan (prep5TieScan.mjs method): for every presentation age of the accepted window (lags 0,1) collect every sprite-like entry of the
// move view (array fields + singular {x,y}/{centerX,centerY}), key = (subpriority ?? 0, y), count equal-key pairs and overlapping ones (|dx| < 16 / < 32), and
// record any spriteOrder/hardwareTie/creationOrder/spawnIndex/allocationOrder field the view carries.
//   node --experimental-strip-types tools/integration/prep6TieScan.mjs > tools/integration/fixtures/prep6-tie-scan.json
import * as S from "../../src/animation/sceneOnPresentation.ts";
import { acceptedConfig, O } from "./prep6Accepted.mjs";
const VIEW = { SELF_DESTRUCT: S.sceneOnSelfDestructView, DOUBLE_TEAM: S.sceneOnDoubleTeamView, FAINT_ATTACK: S.sceneOnFaintAttackView, ROCK_TOMB: S.sceneOnRockTombView, PAIN_SPLIT: S.sceneOnPainSplitView,
  DRAGON_DANCE: S.sceneOnDragonDanceView, SAFEGUARD: S.sceneOnSafeguardView, SWEET_SCENT: S.sceneOnSweetScentView, FIRE_BLAST: S.sceneOnFireBlastView, SWALLOW: S.sceneOnSwallowView, KNOCK_OFF: S.sceneOnKnockOffView };
const pos = (s) => (typeof s.centerX === "number" ? [s.centerX, s.centerY] : typeof s.x === "number" && typeof s.y === "number" ? [s.x, s.y] : null);
function sprites(v) {
  const out = [];
  for (const [k, x] of Object.entries(v)) {
    if (k === "attacker" || k === "target") continue;
    const list = Array.isArray(x) ? x : x && typeof x === "object" ? [x] : [];
    for (const s of list) if (s && typeof s === "object" && pos(s)) out.push({ field: k, s });
  }
  return out;
}
// identity-only fields: two entries equal after dropping these draw identical pixels, so their relative order cannot matter
const IDENT = new Set(["index", "slot", "spawnIndex", "allocationSlot", "owner", "data", "group", "localAge", "callback", "template", "orbIndex", "wave", "id", "tag"]);
const px = (s) => JSON.stringify(Object.fromEntries(Object.entries(s).filter(([k]) => !IDENT.has(k))));
const res = [];
for (const move of Object.keys(VIEW)) for (const o of O) for (const variant of move === "SWALLOW" ? [1, 2, 3] : [1]) {
  const acc = acceptedConfig(move, o, variant); if (!acc) continue;
  const rows = acc.sourceWindow[1] - acc.sourceWindow[0] + 1;
  const st = S.createSceneOnMovePresentation(acc.config);
  let ties = 0, ov16 = 0, ov32 = 0, distinct16 = 0, distinct32 = 0, maxSprites = 0, orderFields = new Set(); const first = [];
  for (let age = 0; age < rows + 2; age++) for (const lag of [0, 1]) {
    const v = VIEW[move]({ ...st, age: Math.max(0, age - lag) });
    for (const k of Object.keys(v)) if (/spriteOrder|hardwareTie|creationOrder|spawnIndex|allocationOrder|frontClone/i.test(k)) orderFields.add(k);
    const sp = sprites(v); maxSprites = Math.max(maxSprites, sp.length);
    for (let i = 0; i < sp.length; i++) for (let j = i + 1; j < sp.length; j++) {
      const [ax, ay] = pos(sp[i].s), [bx, by] = pos(sp[j].s);
      if (ay !== by || (sp[i].s.subpriority ?? 0) !== (sp[j].s.subpriority ?? 0)) continue;
      ties++; const dx = Math.abs(ax - bx);
      if (dx < 16) { ov16++; if (px(sp[i].s) !== px(sp[j].s)) distinct16++; }
      if (dx < 32) { ov32++; if (px(sp[i].s) !== px(sp[j].s)) distinct32++; if (first.length < 3) first.push({ age: age - lag, a: [sp[i].field, ax, ay], b: [sp[j].field, bx, by] }); }
    }
  }
  res.push({ move, orientation: o, variant: move === "SWALLOW" ? variant : undefined, windowRows: rows, maxSprites, equalKeyPairs: ties, overlapping16: ov16, overlapping32: ov32, overlapping16PixelDistinct: distinct16, overlapping32PixelDistinct: distinct32, orderFieldsInView: [...orderFields], firstTies: first });
}
console.log(JSON.stringify(res, null, 1));
