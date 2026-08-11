import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SELECTOR = "tools/probe/factory_timer0_selected_edge.py";
const FIFO_RECEIPT = "tests/fixtures/factory-construction-timer0-fifo-v1/liliana.json";
const AUDIO_AUDIT = "tests/fixtures/issue55-audio-sample-callback-audit-v1.json";

describe("Issue #55 selected adjacent-deadline edge selector", () => {
  it("uses the canonical LILIANA row without a frame, cycle, or identity key", () => {
    const selectorSource = readFileSync(SELECTOR, "utf8");
    expect(selectorSource).not.toMatch(
      /\b(?:frame|tick|master_cycles|global_cycles|party_pointer|personality)\s*=/,
    );
    const fifo = JSON.parse(readFileSync(FIFO_RECEIPT, "utf8"));
    const row = fifo.crossings.find((candidate: any) => (
      candidate.component === "encrypted-accessor" && candidate.ordinal === 23
      && candidate.instructionPc === "0x082e7c3e"
    ));
    expect(row).toMatchObject({
      returnClass: "0x0806a51a->0x08068db2",
      instructionPc: "0x082e7c3e",
      nextInstructionPc: "0x082e7c40",
      crossedEventNames: ["GBA Timer 0", "GBA Audio Sample"],
      coDueEventNames: ["GBA Audio Sample"],
    });
    expect(row.before.queue.find((event: any) => event.name === "GBA Timer 0").whenDelta).toBe(-1);
    expect(row.before.queue.find((event: any) => event.name === "GBA Audio Sample").whenDelta).toBe(0);

    const audit = JSON.parse(readFileSync(AUDIO_AUDIT, "utf8"));
    const auditedRow = audit.naturalAudioCoDueRows.find((candidate: any) => (
      candidate.case === "liliana" && candidate.component === "encrypted-accessor"
      && candidate.ordinal === 23
    ));
    expect(auditedRow).toMatchObject({
      audioTimerDeadlineDelta: 1,
      dueOrderByDeadlineThenPriority: ["GBA Timer 0", "GBA Audio Sample"],
    });
  });

  it("counts encrypted accessors zero-based only inside outer CalculateMonStats and arms once", () => {
    const program = String.raw`
import json, sys
sys.path.insert(0, "tools/probe")
import factory_timer0_selected_edge as module
s = module.SelectedEncryptedAccessorEdge(module.LILIANA_AUDIO_EDGE)
armed = []
armed.append(s.observe(0x08068D0E, outer_stats_entry=False))
armed.append(s.observe(0x082E7C3E))
armed.append(s.observe(0x08068D0E, outer_stats_entry=True))
for field in (58, 57):
    armed.append(s.observe(0x0806A51A, lr=0x08068D23, field=field))
armed.append(s.observe(0x0806A51A, lr=0x08069063, field=39))
for ordinal in range(24):
    return_pc = 0x08068DB3 if ordinal == 23 else 0x08068D3B
    armed.append(s.observe(0x0806A51A, lr=return_pc, field=39))
    visits = 28 if ordinal == 23 else 1
    for _ in range(visits):
        armed.append(s.observe(0x082E7C3E))
armed.append(s.observe(0x082E7C3E))
print(json.dumps({"armed": [i for i, value in enumerate(armed) if value], "summary": s.summary(), "ordinal": s.encrypted_accessor_ordinal}))
`;
    const value = JSON.parse(execFileSync("python3", ["-c", program], { encoding: "utf8" }));
    expect(value.armed).toEqual([80]);
    expect(value.ordinal).toBe(23);
    expect(value.summary).toEqual({
      case: "liliana",
      component: "encrypted-accessor",
      ordinal: 23,
      returnClass: "0x0806a51a->0x08068db2",
      edge: "0x082e7c3e->0x082e7c40",
      instructionOccurrence: 27,
      crossedEventNames: ["GBA Timer 0", "GBA Audio Sample"],
      deadlineOrder: ["GBA Timer 0", "GBA Audio Sample"],
      audioTimerDeadlineDelta: 1,
    });
  });
});
