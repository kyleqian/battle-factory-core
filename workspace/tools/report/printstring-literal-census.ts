#!/usr/bin/env node --experimental-strip-types
/**
 * Closes ISSUES #71-adjacent same-day-crash follow-up (PROGRESS 893):
 * STRINGID_PKMNFELLFORTAUNT and its sibling STRINGID_PKMNCANTUSEMOVETAUNT
 * both crashed battleStringResolver's completeness guard despite being
 * fully extracted, because ISSUES #70's original sweep grepped `src/engine/
 * *.ts` for `STRINGID_` TS literals -- and neither id is ever spelled out
 * as a TS literal anywhere. Both are emitted purely by the generic
 * `printstring <STRINGID_X>` opcode handler reading the operand straight
 * out of the parsed battle-script program
 * (`src/data/gen/battle-script-program.json`), so no TS code needs to name
 * them. That is a distinct blind-spot *class* from #70's (which was scoped
 * to `printfromtable`'s table-indexed ids): every literal `printstring`
 * operand in the parsed program is a candidate this sweep never saw.
 *
 * Method: enumerate every literal `printstring` operand in the parsed
 * program (mechanical, not a `printfromtable` table lookup -- those stay
 * #70's scope and are already closed), then classify each by whether
 * `battleResolutionPresentation.ts`'s `messageLines` can resolve every
 * placeholder its template references: either an explicit
 * `messageId === "STRINGID_X"` branch exists, or every placeholder token is
 * in the generic fallback's fixed supply set
 * (`B_ATK_NAME_WITH_PREFIX`/`B_EFF_NAME_WITH_PREFIX`/
 * `B_SCR_ACTIVE_NAME_WITH_PREFIX`/`B_LAST_ITEM`). This is a syntactic
 * upper-bound census, not a reachability trace like #70's: an id flagged
 * UNRESOLVED will throw the completeness guard *if* a non-barriered path
 * ever reaches its `printstring`, but this script does not itself prove
 * that path is live (that per-id reachability work is #70's proven-heavier
 * method, out of this bounded step's scope).
 *
 * Rerun: node --experimental-strip-types tools/report/printstring-literal-census.ts
 * Output: docs/printstring-literal-census.md (deterministic for an
 * unchanged tree).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

type ProgramStatement = Readonly<{
  source: Readonly<{ label: string; labelLine: number; line: number }>;
  mnemonic: string;
  actualOperands: readonly string[];
}>;
type ProgramBlock = Readonly<{ label: string; line: number; statements: readonly ProgramStatement[] }>;
type ProgramFile = Readonly<{ blocks: readonly ProgramBlock[] }>;

type TemplateSegment =
  | Readonly<{ type: "text"; value: string }>
  | Readonly<{ type: "placeholder"; token: string }>
  | Readonly<{ type: "control"; name: string; args: readonly string[] }>
  | Readonly<{ type: "linebreak"; code: string }>;
type TemplateEntry = Readonly<{ id: number; symbol: string; template: string; segments: readonly TemplateSegment[] }>;
type TemplatesFile = Readonly<{ stringTable: readonly TemplateEntry[]; usedMove: TemplateEntry }>;

const program = JSON.parse(
  readFileSync(join(ROOT, "src/data/gen/battle-script-program.json"), "utf8"),
) as ProgramFile;
const templates = JSON.parse(
  readFileSync(join(ROOT, "src/data/gen/battle-message-templates.json"), "utf8"),
) as TemplatesFile;
const presentationSource = readFileSync(
  join(ROOT, "src/engine/battleResolutionPresentation.ts"),
  "utf8",
);

const TEMPLATE_BY_SYMBOL = new Map<string, TemplateEntry>(
  [...templates.stringTable, templates.usedMove].map((entry) => [entry.symbol, entry]),
);

// Every id explicitly branched in messageLines (`messageId === "STRINGID_X"`).
const EXPLICIT_IDS = new Set<string>(
  [...presentationSource.matchAll(/messageId === "(STRINGID_[A-Z0-9_]+)"/g)].map((m) => m[1]!),
);

// The generic fallback (battleResolutionPresentation.ts's tail of
// messageLines) only ever supplies these four tokens, each conditional on a
// tracked battler being non-null at that point in the event stream.
const GENERIC_FALLBACK_TOKENS = new Set([
  "B_ATK_NAME_WITH_PREFIX",
  "B_EFF_NAME_WITH_PREFIX",
  "B_SCR_ACTIVE_NAME_WITH_PREFIX",
  "B_LAST_ITEM",
]);

type PrintstringOccurrence = Readonly<{ symbol: string; label: string; line: number }>;
const occurrences: PrintstringOccurrence[] = [];
for (const block of program.blocks) {
  for (const statement of block.statements) {
    if (statement.mnemonic !== "printstring") continue;
    const symbol = statement.actualOperands[0];
    if (!symbol || !symbol.startsWith("STRINGID_")) continue;
    occurrences.push({ symbol, label: statement.source.label, line: statement.source.line });
  }
}

const bySymbol = new Map<string, PrintstringOccurrence[]>();
for (const occurrence of occurrences) {
  const list = bySymbol.get(occurrence.symbol) ?? [];
  list.push(occurrence);
  bySymbol.set(occurrence.symbol, list);
}

type Classification = "explicit" | "generic-ok" | "UNRESOLVED" | "no-template";
type Row = Readonly<{
  symbol: string;
  classification: Classification;
  template: string;
  placeholders: readonly string[];
  offendingPlaceholders: readonly string[];
  labels: readonly string[];
}>;

const rows: Row[] = [...bySymbol.keys()].sort().map((symbol) => {
  const labels = [...new Set(bySymbol.get(symbol)!.map((o) => o.label))].sort();
  if (EXPLICIT_IDS.has(symbol)) {
    const entry = TEMPLATE_BY_SYMBOL.get(symbol);
    return {
      symbol,
      classification: "explicit",
      template: entry?.template ?? "(id below extracted table range -- hand-mapped, see battleIntroStrings.ts)",
      placeholders: [],
      offendingPlaceholders: [],
      labels,
    };
  }
  const entry = TEMPLATE_BY_SYMBOL.get(symbol);
  if (!entry) {
    // No extracted-table entry and no explicit branch: resolveBattleStringLines
    // itself throws "unknown battle string id" before ever reaching a
    // placeholder question. Still a real gap, just a different guard.
    return {
      symbol,
      classification: "no-template",
      template: "(none -- not in battle-message-templates.json)",
      placeholders: [],
      offendingPlaceholders: [],
      labels,
    };
  }
  const placeholderTokens = entry.segments
    .filter((s): s is Extract<TemplateSegment, { type: "placeholder" }> => s.type === "placeholder")
    .map((s) => s.token);
  const controlTokens = entry.segments
    .filter((s): s is Extract<TemplateSegment, { type: "control" }> => s.type === "control" && s.args.length === 0)
    .map((s) => s.name);
  const allTokens = [...placeholderTokens, ...controlTokens];
  const offending = allTokens.filter((t) => !GENERIC_FALLBACK_TOKENS.has(t));
  return {
    symbol,
    classification: offending.length === 0 ? "generic-ok" : "UNRESOLVED",
    template: entry.template,
    placeholders: allTokens,
    offendingPlaceholders: offending,
    labels,
  };
});

const unresolved = rows.filter((r) => r.classification === "UNRESOLVED" || r.classification === "no-template");
const explicit = rows.filter((r) => r.classification === "explicit");
const genericOk = rows.filter((r) => r.classification === "generic-ok");

const lines: string[] = [];
lines.push("# printstring literal-operand census (same-day Taunt-crash follow-up, ISSUES #72 source)");
lines.push("");
lines.push(
  "Regenerable via `node --experimental-strip-types tools/report/printstring-literal-census.ts`. "
    + "See the script header for method and scope (syntactic upper bound, not a per-id reachability trace).",
);
lines.push("");
lines.push(
  `**Totals:** ${rows.length} unique STRINGID literal \`printstring\` operands in the parsed program `
    + `(${occurrences.length} raw occurrences across ${new Set(occurrences.map((o) => o.label)).size} script labels). `
    + `${explicit.length} already explicitly branched in messageLines, ${genericOk.length} resolvable by the generic `
    + `fallback's fixed token set, **${unresolved.length} UNRESOLVED** (would hit battleStringResolver's completeness `
    + `guard the moment a non-barriered path reaches their printstring).`,
);
lines.push("");
lines.push("## UNRESOLVED (candidate gaps -- filed as ISSUES #72, NOT individually reachability-traced here)");
lines.push("");
lines.push("| STRINGID | Emitting script label(s) | Offending placeholder(s) | Template |");
lines.push("| --- | --- | --- | --- |");
for (const row of unresolved) {
  lines.push(
    `| \`${row.symbol}\` | ${row.labels.map((l) => `\`${l}\``).join(", ")} | ${
      row.classification === "no-template" ? "(no template entry)" : row.offendingPlaceholders.map((t) => `\`{${t}}\``).join(", ")
    } | ${row.template.replace(/\|/g, "\\|")} |`,
  );
}
lines.push("");
lines.push(
  `## Already safe (${explicit.length + genericOk.length} ids, for completeness -- ${explicit.length} explicit + ${genericOk.length} generic-fallback-only)`,
);
lines.push("");
lines.push(
  [...explicit, ...genericOk]
    .map((r) => `\`${r.symbol}\``)
    .join(", "),
);
lines.push("");

writeFileSync(join(ROOT, "docs/printstring-literal-census.md"), `${lines.join("\n")}\n`);
console.log(`${rows.length} unique ids, ${unresolved.length} UNRESOLVED. Wrote docs/printstring-literal-census.md`);
