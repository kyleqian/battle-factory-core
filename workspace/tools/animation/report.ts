import {
  animationComponentLeverage,
  animationCoverageSummary,
  animationWorkPlan,
  openLevelVariantAudit,
  queuedAnimationComponentTracks,
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

const work = animationWorkPlan();
console.log(`\nLevel 50 work: ${work.ready.length} ready for investigation, ${work.blocked.length} explicitly blocked, ${work.remaining} unfinished (${work.state})`);
console.log("Move acceptance queue (manual priorities + derived unfinished moves):");
for (const [index, move] of work.ready.entries()) {
  console.log(
    `${index + 1}. ${move.move} (${move.name}) — ${move.status}; ` +
    `${move.frontierMonCount} Factory sets; ${move.unprovenComponentCount}/${move.componentCount} components without an exact representative; ${move.animationScript}`,
  );
}

console.log("\nBlocked moves (remain unsupported; no acceptance credit):");
for (const move of work.blocked) {
  console.log(`- ${move.move}: ${move.reason} Resume when: ${move.resumeWhen} Evidence: ${move.evidence.join(", ")}`);
}
if (work.state === "blocked") console.log("No dispatchable Level 50 work; review the explicit blockers. This is not complete coverage.");
if (work.state === "complete") console.log("All Level 50 moves are exact.");

const unfinished = new Set([...work.ready, ...work.blocked].map((move) => move.move));
console.log("\nExisting component tracks touching unfinished moves:");
for (const track of queuedAnimationComponentTracks().filter((track) =>
  track.representatives.some((move) => unfinished.has(move)))) {
  console.log(`- ${track.id} — ${track.representatives.join(", ")}; ${track.components.length} source components`);
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

const firstQueued = work.ready[0];
if (firstQueued) {
  console.log(`\nSource neighbors for ${firstQueued.move}:`);
  for (const related of relatedAnimationMoves(firstQueued.move, 5)) {
    console.log(
      `- ${related.move}: ${related.sharedComponents.length} shared components ` +
      `(${related.sharedComponents.slice(0, 3).join(", ")})`,
    );
  }
}
