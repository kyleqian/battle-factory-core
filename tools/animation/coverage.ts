import inventoryJson from "../../src/data/gen/factory-animation-inventory.json" with { type: "json" };
import coverageJson from "../../ANIMATION_COVERAGE.json" with { type: "json" };

export type AnimationCoverageStatus = "staged" | "partial" | "exact";
export type AnimationTier = "level50" | "openOnly" | "outsideFactory";

interface InventoryMove {
  readonly move: string;
  readonly name: string;
  readonly id: number;
  readonly frontierMonCount: number;
  readonly animationScript: string;
}

interface CoverageEntry {
  readonly move: string;
  readonly status: AnimationCoverageStatus;
  readonly covered: readonly string[];
  readonly evidence: readonly string[];
  readonly remaining?: string;
}

interface CoverageSummary {
  readonly tier: AnimationTier;
  readonly total: number;
  readonly unsupported: number;
  readonly staged: number;
  readonly partial: number;
  readonly exact: number;
}

const inventory = inventoryJson as {
  tiers: Record<AnimationTier, { moveCount: number; moves: InventoryMove[] }>;
  variantAudits: {
    openLevelExclusiveMons: {
      monIndices: { count: number };
      speciesCount: number;
      moveCount: number;
      species: Array<{ species: string }>;
    };
  };
};
const coverage = coverageJson as {
  schema: string;
  entries: CoverageEntry[];
  queue: string[];
  variantAudits: {
    openLevelSpecies: Array<{
      species: string;
      evidence: string[];
      notes: string;
    }>;
  };
};

const statuses = new Set<AnimationCoverageStatus>(["staged", "partial", "exact"]);
const tiers = Object.entries(inventory.tiers) as Array<
  [AnimationTier, { moveCount: number; moves: InventoryMove[] }]
>;
const tierByMove = new Map<string, AnimationTier>();
for (const [tier, data] of tiers) {
  for (const move of data.moves) {
    if (tierByMove.has(move.move)) throw new Error(`${move.move} appears in more than one priority tier`);
    tierByMove.set(move.move, tier);
  }
}

export function validateAnimationCoverage(): void {
  if (coverage.schema !== "factory-animation-coverage/v1") {
    throw new Error(`unsupported coverage schema ${coverage.schema}`);
  }
  const seen = new Set<string>();
  for (const entry of coverage.entries) {
    if (seen.has(entry.move)) throw new Error(`duplicate coverage entry ${entry.move}`);
    seen.add(entry.move);
    if (!tierByMove.has(entry.move)) throw new Error(`coverage references unknown move ${entry.move}`);
    if (!statuses.has(entry.status)) throw new Error(`invalid status for ${entry.move}: ${entry.status}`);
    if (entry.covered.length === 0 || entry.evidence.length === 0) {
      throw new Error(`${entry.move} needs covered cases and evidence`);
    }
    if (entry.status === "exact" && entry.remaining) {
      throw new Error(`${entry.move} cannot be exact with a remaining obligation`);
    }
    if (entry.status !== "exact" && !entry.remaining) {
      throw new Error(`${entry.move} needs a bounded remaining obligation`);
    }
  }
  const queue = new Set<string>();
  for (const move of coverage.queue) {
    if (queue.has(move)) throw new Error(`duplicate queue move ${move}`);
    queue.add(move);
    if (tierByMove.get(move) !== "level50") {
      throw new Error(`queue move ${move} is not in the Level 50 priority tier`);
    }
  }
  const openSpecies = new Set(
    inventory.variantAudits.openLevelExclusiveMons.species.map((entry) => entry.species),
  );
  const auditedSpecies = new Set<string>();
  for (const audit of coverage.variantAudits.openLevelSpecies) {
    if (!openSpecies.has(audit.species)) {
      throw new Error(`open-level audit references unknown species ${audit.species}`);
    }
    if (auditedSpecies.has(audit.species)) {
      throw new Error(`duplicate open-level species audit ${audit.species}`);
    }
    auditedSpecies.add(audit.species);
    if (audit.evidence.length === 0 || audit.notes.length === 0) {
      throw new Error(`${audit.species} audit needs evidence and notes`);
    }
  }
}

export function animationCoverageSummary(): CoverageSummary[] {
  validateAnimationCoverage();
  const statusByMove = new Map(coverage.entries.map((entry) => [entry.move, entry.status]));
  return tiers.map(([tier, data]) => {
    const counts = { unsupported: 0, staged: 0, partial: 0, exact: 0 };
    for (const move of data.moves) {
      const status = statusByMove.get(move.move) ?? "unsupported";
      counts[status] += 1;
    }
    return { tier, total: data.moveCount, ...counts };
  });
}

export function queuedAnimationMoves(): Array<InventoryMove & { status: AnimationCoverageStatus | "unsupported" }> {
  validateAnimationCoverage();
  const moves = new Map(
    tiers.flatMap(([, data]) => data.moves).map((move) => [move.move, move]),
  );
  const statusByMove = new Map(coverage.entries.map((entry) => [entry.move, entry.status]));
  return coverage.queue.map((label) => ({
    ...moves.get(label)!,
    status: statusByMove.get(label) ?? "unsupported",
  }));
}

export function openLevelVariantAudit(): {
  readonly monSets: number;
  readonly species: number;
  readonly auditedSpecies: number;
  readonly overlappingMoves: number;
} {
  const audit = inventory.variantAudits.openLevelExclusiveMons;
  return {
    monSets: audit.monIndices.count,
    species: audit.speciesCount,
    auditedSpecies: coverage.variantAudits.openLevelSpecies.length,
    overlappingMoves: audit.moveCount,
  };
}
