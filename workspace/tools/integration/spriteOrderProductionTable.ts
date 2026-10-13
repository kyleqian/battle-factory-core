// Generates src/engine/spriteOrderProductionPlans.ts: the compact production sprite-order plan table (EXACT-PLAN rows only)
// from the evidence fixtures, so the app bundle never imports the 1.6 MB plan JSON.
//   bodies: tools/integration/fixtures/sprite-order-body-plans-ext.json (committed + ext table, docs/sprite-order-plan-coverage.md)
//   extra bodies: fixtures/sprite-order-policy-gaps/relative-y-plans.json (283/313 proposal B) + sprite-order-body-plans-rely.json (tier "confirmed" rows only)
//   anims:  tools/integration/fixtures/sprite-order-gap-causes.json midBattleAnimations (docs/sprite-order-gap-causes.md §1 Q3)
//   appended (indexed after the base table): fixtures/prep43/plan-rows.json bodies + anims (docs/next-adapters-prep43.md),
//     then fixtures/prep45/plan-rows.json bodies + anims (docs/next-adapters-prep45.md), plans48, plans51 (docs/next-adapters-plans51.md)
//     and plans54 (docs/next-adapters-plans54.md), prep61, prep64 (docs/next-adapters-prep64.md; land68), plans69 (fold71), ret80
//     (Return 216 ReturnStrongest as 30216, docs/ret80-return-order.md), ret88 (ReturnWeak as 40216, docs/ret88-return-weak.md)
//   overrides (in place, same plan index): fixtures/cf78/plan-overrides.json (Needle Arm 302's SortSprites tie, docs/cf78-castform-needle-arm.md)
//   run: node --experimental-strip-types tools/integration/spriteOrderProductionTable.ts   (rewrites the module)
// tests/spriteOrderEventTransform.test.ts regenerates the module text from the JSON and pins it byte-for-byte.
import { readFileSync, writeFileSync } from "node:fs";

type Token = readonly ["n", number] | readonly ["c", number, number] | readonly ["o", number];
interface Window { readonly C?: readonly (readonly ["n", number, "f" | "e"])[]; readonly D?: readonly Token[]; readonly pw?: readonly number[] }
type Plan = readonly Window[];
interface Row { readonly verdict: string; readonly plan: Plan; readonly args?: readonly string[] }

/** `C<modes>` / `D<tokens>` / `P<priority words>` per window ("/"), windows joined by ";". `n` tokens are bare indices,
 * `c<ago>.<r>`, `o<slot>`. Create indices are implicit (running count), checked here. */
export function encodeSpriteOrderPlan(plan: Plan): string {
  let made = 0;
  return plan.map(window => {
    const parts: string[] = [];
    if (window.C) {
      for (const [, k] of window.C) if (k !== made++) throw new Error(`plan create index ${k} is not sequential`);
      parts.push(`C${window.C.map(token => token[2]).join("")}`);
    }
    if (window.D) {
      parts.push(`D${window.D.map(token => token[0] === "n" ? `${token[1]}`
        : token[0] === "c" ? `c${token[1]}.${token[2]}` : `o${token[1]}`).join(",")}`);
    }
    if (window.pw) parts.push(`P${window.pw.join(",")}`);
    if (parts.length === 0) throw new Error("empty plan window");
    return parts.join("/");
  }).join(";");
}

const statClass = (arg: number): 1 | 2 | null =>
  (arg >= 15 && arg <= 28) || arg === 55 || arg === 57 ? 1 : arg >= 39 && arg <= 52 ? 2 : null;

/** abs-invariant rely rows admitted to production (283:player is already supplied, identically, by the policy-gaps rows): every sprite in a KEYS group has a y that depends only on battler-position
 * constants and script constants (Fissure: a common elevation offset), proved per row in docs/sprite-order-absinv-source-check.md. */
export const SOURCE_CONFIRMED_ABS_INVARIANT: ReadonlySet<string> = new Set(
  [45, 46, 336, 263, 90, 69, 230, 18, 215, 312].flatMap(move => [`${move}:player`, `${move}:opponent`])
    .concat(["135:player", "236:player"]));

/** Extra EXACT-PLAN body rows merged after the ext table (policy-gaps relative-y rows; rely rows of tier "confirmed" + source-confirmed abs-invariant). */
/** `appended` row sets (prep43, then prep45 plan-rows.json: bodies + anims) are indexed after the whole base table and their bodies listed after its
 * bodies, so every existing plan index and line stays put; each row must replace a non-EXACT (or absent) row. */
export function renderSpriteOrderProductionTable(ext: { bodies: Record<string, Row> }, gapCauses: {
  midBattleAnimations: { anims: Record<string, Row> };
}, extraBodies: readonly Record<string, Row & { readonly tier?: string }>[] = [],
appended: readonly { readonly bodies: Record<string, Row>; readonly anims: Record<string, Row> }[] = [],
overrides: Readonly<Record<string, Row>> = {}): string {
  const plans: string[] = [];
  const index = (plan: Plan) => {
    const text = encodeSpriteOrderPlan(plan);
    const found = plans.indexOf(text);
    if (found >= 0) return found;
    plans.push(text);
    return plans.length - 1;
  };
  const merged: Record<string, Row> = { ...ext.bodies };
  for (const extra of extraBodies) {
    for (const [key, row] of Object.entries(extra)) {
      if (row.tier !== undefined && row.tier !== "confirmed" && !(row.tier === "abs-invariant" && SOURCE_CONFIRMED_ABS_INVARIANT.has(key))) continue;
      if (merged[key]?.verdict === "EXACT-PLAN") throw new Error(`body row ${key} is already in the table`);
      merged[key] = row;
    }
  }
  const bodies: [string, number][] = [];
  for (const key of Object.keys(merged).sort(compareKeys)) {
    const row = merged[key]!;
    if (row.verdict !== "EXACT-PLAN" || !/^[1-9][0-9]*:(player|opponent)$/.test(key)) continue;
    bodies.push([key, index(row.plan)]);
  }
  const anims: [string, number][] = [];
  const statPlans = new Map<1 | 2, string>();
  for (const key of Object.keys(gapCauses.midBattleAnimations.anims).sort()) {
    const row = gapCauses.midBattleAnimations.anims[key]!;
    if (row.verdict !== "EXACT-PLAN") continue;
    if (key.startsWith("General:B_ANIM_STATS_CHANGE[")) {
      // Every observed argument of a class has one plan (AnimTask_StatsChange, one invisible copy sprite); the class plan
      // is applied to the class's argument range (docs/sprite-order-gap-causes.md §2 "stat (+-1, multiple)" / "(+-2)").
      for (const arg of row.args ?? []) {
        const klass = statClass(Number(arg));
        if (klass === null) throw new Error(`stat animation argument ${arg} has no class`);
        const text = encodeSpriteOrderPlan(row.plan);
        if ((statPlans.get(klass) ?? text) !== text) throw new Error(`stat class ${klass} has two plans`);
        statPlans.set(klass, text);
      }
      continue;
    }
    const name = key.replace(/^General:B_ANIM_/, "").replace(/^Status:B_ANIM_/, "");
    anims.push([name, index(row.plan)]);
  }
  for (const klass of [1, 2] as const) {
    const text = statPlans.get(klass);
    if (text === undefined) throw new Error(`stat class ${klass} unobserved`);
    anims.push([`STATS_CHANGE_CLASS_${klass}`, plans.includes(text) ? plans.indexOf(text) : (plans.push(text), plans.length - 1)]);
  }
  const appendedBodies: [string, number][] = [];
  for (const rows of appended) {
    for (const key of Object.keys(rows.bodies).sort(compareKeys)) {
      const row = rows.bodies[key]!;
      if (row.verdict !== "EXACT-PLAN" || !/^[1-9][0-9]*:(player|opponent)$/.test(key)) throw new Error(`appended body row ${key} is not an EXACT (move, side) row`);
      if (merged[key]?.verdict === "EXACT-PLAN" || [...bodies, ...appendedBodies].some(([present]) => present === key)) throw new Error(`appended body row ${key} is already in the table`);
      appendedBodies.push([key, index(row.plan)]);
    }
    for (const key of Object.keys(rows.anims).sort()) {
      const row = rows.anims[key]!;
      const name = key.replace(/^General:B_ANIM_/, "").replace(/^Status:B_ANIM_/, "");
      if (row.verdict !== "EXACT-PLAN" || name.startsWith("STATS_CHANGE")) throw new Error(`appended anim row ${key} is not an EXACT non-stat row`);
      if (anims.some(([present]) => present === name)) throw new Error(`appended anim row ${key} is already in the table`);
      anims.push([name, index(row.plan)]);
    }
  }
  // cf78: an override replaces the plan text of an EXACT body row's plan index in place (every index and line stays put); every row
  // sharing that index must carry the same override.
  for (const [key, row] of Object.entries(overrides)) {
    const entry = [...bodies, ...appendedBodies].find(([present]) => present === key);
    if (entry === undefined || row.verdict !== "EXACT-PLAN") throw new Error(`override row ${key} replaces no EXACT body row`);
    const text = encodeSpriteOrderPlan(row.plan);
    for (const [user, at] of [...bodies, ...appendedBodies]) {
      if (at === entry[1] && (overrides[user] === undefined || encodeSpriteOrderPlan(overrides[user]!.plan) !== text)) {
        throw new Error(`override row ${key}: plan index ${at} is shared with ${user}, which is not overridden identically`);
      }
    }
    if (plans.includes(text) && plans.indexOf(text) !== entry[1]) throw new Error(`override row ${key}: plan text already in the table`);
    plans[entry[1]] = text;
  }
  anims.sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  const lines = [
    "// GENERATED by tools/integration/spriteOrderProductionTable.ts from tools/integration/fixtures/sprite-order-body-plans-ext.json",
    "// (EXACT-PLAN (move, side) bodies) and tools/integration/fixtures/sprite-order-gap-causes.json (midBattleAnimations EXACT-PLAN).",
    "// Do not edit; tests/spriteOrderEventTransform.test.ts regenerates and pins this file. Plan encoding: see encodeSpriteOrderPlan.",
    "",
    "/** Distinct encoded plans (windows `;`, parts `/`: `C<f|e...>`, `D<k|c<ago>.<r>|o<slot>,...>`, `P<priority words>`). */",
    "export const SPRITE_ORDER_PRODUCTION_PLANS: readonly string[] = Object.freeze([",
    ...plans.map(text => `  ${JSON.stringify(text)},`),
    "]);",
    "",
    "/** `<moveId>:<attacker side>` -> plan index; EXACT-PLAN bodies only (NEEDS-KEYS / NOT-OBSERVED are absent = invalidate). */",
    "export const SPRITE_ORDER_PRODUCTION_BODIES: Readonly<Record<string, number>> = Object.freeze({",
    ...[bodies, appendedBodies].flatMap(list => chunk(list.map(([key, plan]) => `${JSON.stringify(key)}: ${plan},`), 8).map(row => `  ${row.join(" ")}`)),
    "});",
    "",
    "/** Mid-battle (non-move) animations -> plan index. STATS_CHANGE_CLASS_1 = args 15..28 (+-1) and 55/57 (multiple +1/-1),",
    "  * STATS_CHANGE_CLASS_2 = args 39..52 (+-2: the copy sprite survives the unit; its destroy is carried). */",
    "export const SPRITE_ORDER_PRODUCTION_ANIMS: Readonly<Record<string, number>> = Object.freeze({",
    ...anims.map(([key, plan]) => `  ${key}: ${plan},`),
    "});",
    "",
  ];
  return lines.join("\n");
}

function compareKeys(left: string, right: string): number {
  const [lm, ls] = left.split(":"), [rm, rs] = right.split(":");
  return Number(lm) - Number(rm) || (ls! < rs! ? -1 : ls! > rs! ? 1 : 0);
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let start = 0; start < items.length; start += size) out.push(items.slice(start, start + size));
  return out;
}

export function renderSpriteOrderProductionTableFromFixtures(): string {
  const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
  return renderSpriteOrderProductionTable(fixture("sprite-order-body-plans-ext.json"), fixture("sprite-order-gap-causes.json"), [
    fixture("sprite-order-policy-gaps/relative-y-plans.json").bodies, fixture("sprite-order-body-plans-rely.json").bodies,
    fixture("prep28/plan-rows.json").bodies, fixture("prep28/plan-rows-sky-attack.json").bodies,
  ], [fixture("prep43/plan-rows.json"), fixture("prep45/plan-rows.json"), fixture("plans48/plan-rows.json"), fixture("plans51/plan-rows.json"),
    fixture("plans54/plan-rows.json"), fixture("prep61/plan-rows.json"), fixture("prep64/plan-rows.json"), fixture("plans69/plan-rows.json"),
    fixture("ret80/plan-rows.json"), fixture("ret88/plan-rows.json"), fixture("ord124/ord124-plan-rows.json")],
  fixture("cf78/plan-overrides.json").bodies);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const target = new URL("../../src/engine/spriteOrderProductionPlans.ts", import.meta.url);
  const text = renderSpriteOrderProductionTableFromFixtures();
  writeFileSync(target, text);
  console.log(`wrote ${target.pathname} (${text.length} bytes)`);
}
