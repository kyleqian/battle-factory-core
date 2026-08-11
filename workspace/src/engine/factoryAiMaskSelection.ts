import policyData from "../data/gen/factory-ai-policy.json" with { type: "json" };

export const FACTORY_LEVEL_MODE_50 = 0 as const;
export const FACTORY_LEVEL_MODE_OPEN = 1 as const;
export const FACTORY_LEVEL_MODE_TENT = 2 as const;
export const FACTORY_BATTLE_MODE_SINGLES = 0 as const;
export const FACTORY_BATTLE_MODE_DOUBLES = 1 as const;
export const TRAINER_FRONTIER_BRAIN = 1022 as const;

export type FactoryLevelMode =
  | typeof FACTORY_LEVEL_MODE_50
  | typeof FACTORY_LEVEL_MODE_OPEN
  | typeof FACTORY_LEVEL_MODE_TENT;
export type FactoryBattleMode =
  | typeof FACTORY_BATTLE_MODE_SINGLES
  | typeof FACTORY_BATTLE_MODE_DOUBLES;
export type FactoryAiMask = 0 | 1 | 7;
export type FactoryAiPolicyBranchId =
  | "tent"
  | "frontierBrain"
  | "challengeBelow2"
  | "challengeBelow4"
  | "challengeAtLeast4";

export type FactoryAiMaskSelectionInput = Readonly<{
  levelMode: FactoryLevelMode;
  battleMode: FactoryBattleMode;
  factoryWinStreak: number;
  trainerOpponentId: number;
}>;

export type FactoryAiMaskSelectionReceipt = Readonly<{
  schema: "factory-ai-mask-selection/v1";
  inputs: Readonly<{
    levelMode: FactoryLevelMode;
    battleMode: FactoryBattleMode;
    factoryWinStreak: number;
    trainerOpponentId: number;
    isFrontierBrain: boolean;
  }>;
  frontierStagesPerChallenge: number;
  challengeNumber: number | null;
  evaluations: readonly Readonly<{
    order: number;
    id: FactoryAiPolicyBranchId;
    matched: boolean;
  }>[];
  branch: Readonly<{
    order: number;
    id: FactoryAiPolicyBranchId;
    condition: string;
    flags: readonly string[];
    mask: FactoryAiMask;
  }>;
}>;

export type FactoryAiMaskSelection = Readonly<{
  mask: FactoryAiMask;
  receipt: FactoryAiMaskSelectionReceipt;
}>;

type GeneratedPolicy = Readonly<{
  schema: string;
  constants: Readonly<{ frontierStagesPerChallenge: number }>;
  branches: readonly Readonly<{
    order: number;
    id: string;
    condition: string;
    flags: readonly string[];
    mask: number;
  }>[];
}>;

const POLICY = policyData as GeneratedPolicy;
const SOURCE_BRANCH_IDS = Object.freeze([
  "tent",
  "frontierBrain",
  "challengeBelow2",
  "challengeBelow4",
  "challengeAtLeast4",
] as const);
const SOURCE_MASKS = Object.freeze([0, 1, 7] as const);

function failPolicy(message: string): never {
  throw new Error(`invalid generated Factory AI policy: ${message}`);
}

function isBranchId(value: string): value is FactoryAiPolicyBranchId {
  return SOURCE_BRANCH_IDS.some((id) => id === value);
}

function isFactoryMask(value: number): value is FactoryAiMask {
  return SOURCE_MASKS.some((mask) => mask === value);
}

if (POLICY.schema !== "factory-ai-policy/v1") failPolicy(`unexpected schema ${POLICY.schema}`);
if (!Number.isSafeInteger(POLICY.constants.frontierStagesPerChallenge)
  || POLICY.constants.frontierStagesPerChallenge <= 0) {
  failPolicy("frontierStagesPerChallenge must be a positive safe integer");
}
if (POLICY.branches.length !== SOURCE_BRANCH_IDS.length) {
  failPolicy(`expected ${SOURCE_BRANCH_IDS.length} branches`);
}

const POLICY_BRANCHES = Object.freeze(POLICY.branches.map((branch, order) => {
  if (branch.order !== order || branch.id !== SOURCE_BRANCH_IDS[order]) {
    failPolicy(`branch ${order} must be ${SOURCE_BRANCH_IDS[order]}`);
  }
  if (!isBranchId(branch.id)) failPolicy(`unknown branch ${branch.id}`);
  if (!isFactoryMask(branch.mask)) failPolicy(`unsupported mask ${branch.mask}`);
  return Object.freeze({
    order: branch.order,
    id: branch.id,
    condition: branch.condition,
    flags: Object.freeze([...branch.flags]),
    mask: branch.mask,
  });
}));

function requireIntegerInRange(name: string, value: number, minimum: number, maximum: number): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer from ${minimum} through ${maximum}`);
  }
}

function branchMatches(
  id: FactoryAiPolicyBranchId,
  input: FactoryAiMaskSelectionInput,
  challengeNumber: number | null,
): boolean {
  switch (id) {
    case "tent":
      return input.levelMode === FACTORY_LEVEL_MODE_TENT;
    case "frontierBrain":
      return input.trainerOpponentId === TRAINER_FRONTIER_BRAIN;
    case "challengeBelow2":
      return challengeNumber !== null && challengeNumber < 2;
    case "challengeBelow4":
      return challengeNumber !== null && challengeNumber < 4;
    case "challengeAtLeast4":
      return challengeNumber !== null;
  }
}

/**
 * Pure port of battle_factory.c:GetAiScriptsInBattleFactory.
 *
 * The numeric domains mirror the source storage/indexes: level modes 0/1 plus
 * the Tent sentinel 2, battle-mode indexes 0/1, and u16 streak/trainer values.
 */
export function selectFactoryAiMask(input: FactoryAiMaskSelectionInput): FactoryAiMaskSelection {
  requireIntegerInRange("levelMode", input.levelMode, FACTORY_LEVEL_MODE_50, FACTORY_LEVEL_MODE_TENT);
  requireIntegerInRange("battleMode", input.battleMode, FACTORY_BATTLE_MODE_SINGLES, FACTORY_BATTLE_MODE_DOUBLES);
  requireIntegerInRange("factoryWinStreak", input.factoryWinStreak, 0, 0xffff);
  requireIntegerInRange("trainerOpponentId", input.trainerOpponentId, 0, 0xffff);

  // The source returns before reading the indexed streak in Tent mode.
  const challengeNumber = input.levelMode === FACTORY_LEVEL_MODE_TENT
    ? null
    : Math.floor(input.factoryWinStreak / POLICY.constants.frontierStagesPerChallenge);
  const evaluations: { order: number; id: FactoryAiPolicyBranchId; matched: boolean }[] = [];
  let selected: (typeof POLICY_BRANCHES)[number] | undefined;
  for (const branch of POLICY_BRANCHES) {
    const matched = branchMatches(branch.id, input, challengeNumber);
    evaluations.push(Object.freeze({ order: branch.order, id: branch.id, matched }));
    if (matched) {
      selected = branch;
      break;
    }
  }
  if (!selected) failPolicy("source branch sequence did not select a mask");

  const receipt = Object.freeze({
    schema: "factory-ai-mask-selection/v1" as const,
    inputs: Object.freeze({
      levelMode: input.levelMode,
      battleMode: input.battleMode,
      factoryWinStreak: input.factoryWinStreak,
      trainerOpponentId: input.trainerOpponentId,
      isFrontierBrain: input.trainerOpponentId === TRAINER_FRONTIER_BRAIN,
    }),
    frontierStagesPerChallenge: POLICY.constants.frontierStagesPerChallenge,
    challengeNumber,
    evaluations: Object.freeze(evaluations),
    branch: selected,
  });
  return Object.freeze({ mask: selected.mask, receipt });
}
