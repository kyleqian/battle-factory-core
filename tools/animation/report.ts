import {
  animationComponentLeverage,
  animationCoverageSummary,
  openLevelVariantAudit,
  queuedAnimationComponentTracks,
  queuedAnimationMoves,
  relatedAnimationMoves,
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

console.log("\nComponent work tracks (non-exclusive):");
for (const [index, track] of queuedAnimationComponentTracks().entries()) {
  console.log(
    `${index + 1}. ${track.id} — ${track.representatives.join(", ")}; ` +
    `${track.components.length} source components`,
  );
}

console.log("\nMove acceptance queue:");
for (const [index, move] of queuedAnimationMoves().entries()) {
  console.log(
    `${index + 1}. ${move.move} (${move.name}) — ${move.status}; ` +
    `${move.frontierMonCount} Factory sets; ${move.animationScript}`,
  );
}

const leverage = animationComponentLeverage();
console.log("\nHighest-leverage source components already exercised by an exact move:");
for (const item of leverage.proven.slice(0, 6)) {
  console.log(
    `- ${item.component}: ${item.remainingMoves.length} remaining Level 50 moves ` +
    `(proved by ${item.provenBy.join(", ")})`,
  );
}
console.log("\nHighest-leverage source components without an exact representative:");
for (const item of leverage.unproven.slice(0, 6)) {
  console.log(`- ${item.component}: ${item.remainingMoves.length} Level 50 moves`);
}

const firstQueued = queuedAnimationMoves()[0];
if (firstQueued) {
  console.log(`\nSource neighbors for ${firstQueued.move}:`);
  for (const related of relatedAnimationMoves(firstQueued.move, 5)) {
    console.log(
      `- ${related.move}: ${related.sharedComponents.length} shared components ` +
      `(${related.sharedComponents.slice(0, 3).join(", ")})`,
    );
  }
}
