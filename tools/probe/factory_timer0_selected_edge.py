"""Pure source-order selector for Issue #55's selected Timer 0 runtime edge.

The emulator probe imports this small state machine so selecting one natural
runtime window does not require CalculateMonStats evidence or the all-row
instruction classifier.  It deliberately knows source PCs and a source-order
ordinal, never a frame, tick, cycle, party pointer, or observed duration.
"""

from __future__ import annotations

from dataclasses import dataclass


CALCULATE_STATS_ENTRY_PC = 0x08068D0E
CALCULATE_STATS_RESUME_PC = 0x080686EC
GET_BOX_MON_DATA2_ENTRY_PC = 0x0806A51A
DIRECT_GET_BOX_RETURN_PCS = frozenset({
    0x08068D22, 0x08068D2E, 0x08068D3A, 0x08068D46, 0x08068D52,
    0x08068D5E, 0x08068D6A, 0x08068D76, 0x08068D82, 0x08068D8E,
    0x08068D9A, 0x08068DA6, 0x08068DB2, 0x08068DBE, 0x08068DCA,
})


@dataclass(frozen=True)
class SelectedEdgeSpec:
    case: str
    component: str
    ordinal: int
    return_pc: int
    instruction_pc: int
    instruction_occurrence: int
    next_instruction_pc: int
    crossed_event_names: tuple[str, ...]
    deadline_order: tuple[str, ...]
    audio_timer_deadline_delta: int


LILIANA_AUDIO_EDGE = SelectedEdgeSpec(
    case="liliana",
    component="encrypted-accessor",
    ordinal=23,
    return_pc=0x08068DB2,
    instruction_pc=0x082E7C3E,
    instruction_occurrence=27,
    next_instruction_pc=0x082E7C40,
    crossed_event_names=("GBA Timer 0", "GBA Audio Sample"),
    deadline_order=("GBA Timer 0", "GBA Audio Sample"),
    audio_timer_deadline_delta=1,
)


class SelectedEncryptedAccessorEdge:
    """Count direct encrypted accessors only in the outer stats call."""

    def __init__(self, spec: SelectedEdgeSpec) -> None:
        self.spec = spec
        self.in_outer_calculate_stats = False
        self.encrypted_accessor_ordinal = -1
        self.selected_accessor_active = False
        self.selected_instruction_occurrence = -1
        self.armed = False

    def observe(
        self,
        pc: int,
        *,
        lr: int = 0,
        field: int | None = None,
        outer_stats_entry: bool = False,
    ) -> bool:
        """Return true exactly once at the selected instruction boundary."""
        if pc == CALCULATE_STATS_ENTRY_PC and outer_stats_entry:
            self.in_outer_calculate_stats = True
            self.selected_accessor_active = False
            self.selected_instruction_occurrence = -1
        elif pc == CALCULATE_STATS_RESUME_PC:
            self.in_outer_calculate_stats = False
            self.selected_accessor_active = False
            self.selected_instruction_occurrence = -1

        return_pc = lr & ~1
        if (
            pc == GET_BOX_MON_DATA2_ENTRY_PC
            and self.in_outer_calculate_stats
            and return_pc in DIRECT_GET_BOX_RETURN_PCS
        ):
            if field is None:
                raise ValueError("direct GetBoxMonData2 entry requires a field")
            # MON_DATA_STATUS and MON_DATA_HP are unencrypted direct fields and
            # were excluded by the canonical classifier's ordinal semantics.
            if field not in {57, 58}:
                self.encrypted_accessor_ordinal += 1
                self.selected_accessor_active = (
                    self.encrypted_accessor_ordinal == self.spec.ordinal
                    and return_pc == self.spec.return_pc
                )
                self.selected_instruction_occurrence = -1
            else:
                self.selected_accessor_active = False

        if pc == self.spec.instruction_pc and self.selected_accessor_active:
            self.selected_instruction_occurrence += 1
            if (
                self.selected_instruction_occurrence
                == self.spec.instruction_occurrence
                and not self.armed
            ):
                self.armed = True
                return True
        return False

    def summary(self) -> dict[str, object]:
        return {
            "case": self.spec.case,
            "component": self.spec.component,
            "ordinal": self.spec.ordinal,
            "returnClass": (
                f"0x{GET_BOX_MON_DATA2_ENTRY_PC:08x}->0x{self.spec.return_pc:08x}"
            ),
            "edge": (
                f"0x{self.spec.instruction_pc:08x}->"
                f"0x{self.spec.next_instruction_pc:08x}"
            ),
            "instructionOccurrence": self.spec.instruction_occurrence,
            "crossedEventNames": list(self.spec.crossed_event_names),
            "deadlineOrder": list(self.spec.deadline_order),
            "audioTimerDeadlineDelta": self.spec.audio_timer_deadline_delta,
        }
