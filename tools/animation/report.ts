import {
  animationCoverageSummary,
  openLevelVariantAudit,
  queuedAnimationMoves,
} from "./coverage.ts";

const tierNames = {
  level50: "Level 50",
  openOnly: "Open-only",
  outsideFactory: "Outside Factory",
} as const;

for (const summary of animationCoverageSummary()) {
  console.log(
    `${tierNames[summary.tier]}: ${summary.exact}/${summary.total} exact, ` +
    `${summary.partial} partial, ${summary.staged} staged, ${summary.unsupported} unsupported`,
  );
}

const openAudit = openLevelVariantAudit();
console.log(
  `Open-level geometry audit: ${openAudit.auditedSpecies}/${openAudit.species} species audited across ` +
  `${openAudit.monSets} sets and ${openAudit.overlappingMoves} overlapping moves`,
);

console.log("\nQueue:");
for (const [index, move] of queuedAnimationMoves().entries()) {
  console.log(
    `${index + 1}. ${move.move} (${move.name}) — ${move.status}; ` +
    `${move.frontierMonCount} Factory sets; ${move.animationScript}`,
  );
}
