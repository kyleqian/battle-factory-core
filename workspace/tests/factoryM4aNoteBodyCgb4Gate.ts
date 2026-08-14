import { describe } from "vitest";

// Opt-in gate for the Issue #55 CGB4 grind-evidence family
// (tests/factoryM4aNoteBodyCgb4V*.test.ts, 44 files). Issue #55 is PARKED at
// CGB4 v44 (2026-08-13 decision); each file's evidence chains back through
// every prior version via execFileSync + makeEvidence(), so the family's
// cost grows with N and dominated a default `npm test` run (measured:
// V44 alone ~137s solo, V1 ~0.3s). Set POKEBENCH_CGB4_EVIDENCE=1 (or run
// `npm run test:cgb4`) to run the full 44-file family; the default suite
// instead pins the family's checked-in evidence/report digests cheaply via
// tests/factoryM4aNoteBodyCgb4Digest.test.ts, so silent corruption of that
// checked-in evidence still fails `npm test`.
export const CGB4_EVIDENCE_ENV = "POKEBENCH_CGB4_EVIDENCE";
export const cgb4EvidenceEnabled = process.env[CGB4_EVIDENCE_ENV] === "1";

// Using describe.skip (rather than skipping inside beforeAll/it) means the
// heavy beforeAll/it callback bodies never execute when the flag is off —
// only the cheap describe-factory registration runs.
export const describeCgb4Evidence: typeof describe.skip = cgb4EvidenceEnabled ? describe : describe.skip;
