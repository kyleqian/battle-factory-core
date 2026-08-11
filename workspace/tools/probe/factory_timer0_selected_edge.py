"""Pure source-order selectors for Issue #55's adjacent Timer 0 edges.

The emulator probe imports this small state machine so selecting one natural
runtime window does not require CalculateMonStats evidence or the all-row
instruction classifier. It deliberately knows source PCs and source-order
ordinals, never a frame, tick, cycle, party pointer, or observed duration.
"""

from __future__ import annotations

from dataclasses import dataclass


CALCULATE_STATS_ENTRY_PC = 0x08068D0E
CALCULATE_STATS_RESUME_PC = 0x080686EC
GET_BOX_MON_DATA2_ENTRY_PC = 0x0806A51A
GET_NATURE_ENTRY_PC = 0x0806D072
GET_NATURE_FROM_PERSONALITY_ENTRY_PC = 0x0806D08A
DIRECT_GET_BOX_RETURN_PCS = frozenset({
    0x08068D22, 0x08068D2E, 0x08068D3A, 0x08068D46, 0x08068D52,
    0x08068D5E, 0x08068D6A, 0x08068D76, 0x08068D82, 0x08068D8E,
    0x08068D9A, 0x08068DA6, 0x08068DB2, 0x08068DBE, 0x08068DCA,
})
DIRECT_GET_NATURE_RETURN_PCS = frozenset({
    0x08068E76, 0x08068EBC, 0x08068F02, 0x08068F48, 0x08068F8E,
})


@dataclass(frozen=True)
class SelectedEdgeSpec:
    name: str
    case: str
    component: str
    ordinal: int
    entry_pc: int
    return_pc: int
    instruction_pc: int
    selector_pc: int
    instruction_occurrence: int
    next_instruction_pc: int
    crossed_event_names: tuple[str, ...]
    deadline_order: tuple[str, ...]
    audio_timer_deadline_delta: int


LILIANA_AUDIO_EDGE = SelectedEdgeSpec(
    name="liliana-encrypted-accessor-23",
    case="liliana",
    component="encrypted-accessor",
    ordinal=23,
    entry_pc=GET_BOX_MON_DATA2_ENTRY_PC,
    return_pc=0x08068DB2,
    instruction_pc=0x082E7C3E,
    # The established LILIANA wrapper arms one pipeline boundary early; the
    # immediately following instruction has no timing callback of its own.
    selector_pc=0x082E7C3E,
    instruction_occurrence=27,
    next_instruction_pc=0x082E7C40,
    crossed_event_names=("GBA Timer 0", "GBA Audio Sample"),
    deadline_order=("GBA Timer 0", "GBA Audio Sample"),
    audio_timer_deadline_delta=1,
)

# The repeated-PC occurrences below are zero-based and come from the bounded
# source-order scout. They are pinned hermetically by the selector tests.
VARIED_GET_NATURE_AUDIO_EDGE = SelectedEdgeSpec(
    name="varied-get-nature-12",
    case="factory-varied",
    component="get-nature",
    ordinal=12,
    entry_pc=GET_NATURE_ENTRY_PC,
    return_pc=0x08068F02,
    instruction_pc=0x082E7BF2,
    selector_pc=0x082E7BF4,
    instruction_occurrence=4,
    next_instruction_pc=0x082E7BF4,
    crossed_event_names=("GBA Timer 0", "GBA Audio Sample"),
    deadline_order=("GBA Timer 0", "GBA Audio Sample"),
    audio_timer_deadline_delta=1,
)

VARIED_NATURE_ATTEMPT_VIDEO_AUDIO_EDGE = SelectedEdgeSpec(
    name="varied-nature-attempt-63",
    case="factory-varied",
    component="nature-attempt",
    ordinal=63,
    entry_pc=GET_NATURE_FROM_PERSONALITY_ENTRY_PC,
    return_pc=0x0806F5CE,
    instruction_pc=0x082E7C10,
    selector_pc=0x082E7C12,
    instruction_occurrence=0,
    next_instruction_pc=0x082E7C12,
    crossed_event_names=("GBA Video", "GBA Timer 0", "GBA Audio Sample"),
    deadline_order=("GBA Video", "GBA Timer 0", "GBA Audio Sample"),
    audio_timer_deadline_delta=1,
)

SELECTED_EDGE_SPECS = {
    spec.name: spec
    for spec in (
        LILIANA_AUDIO_EDGE,
        VARIED_GET_NATURE_AUDIO_EDGE,
        VARIED_NATURE_ATTEMPT_VIDEO_AUDIO_EDGE,
    )
}


class SelectedSourceOrderedEdge:
    """Count one selected component in source order and arm one instruction."""

    def __init__(self, spec: SelectedEdgeSpec) -> None:
        self.spec = spec
        self.source_epoch_active = False
        self.in_outer_calculate_stats = False
        self.component_ordinal = -1
        self.selected_component_active = False
        self.selected_instruction_occurrence = -1
        self.armed = False

    def _start_component(self, return_pc: int) -> None:
        self.component_ordinal += 1
        self.selected_component_active = (
            self.component_ordinal == self.spec.ordinal
            and return_pc == self.spec.return_pc
        )
        self.selected_instruction_occurrence = -1

    def observe(
        self,
        pc: int,
        *,
        lr: int = 0,
        field: int | None = None,
        outer_stats_entry: bool = False,
        source_epoch_entry: bool = False,
        source_epoch_exit: bool = False,
    ) -> bool:
        """Return true exactly once at the selected instruction boundary."""
        if source_epoch_entry:
            self.source_epoch_active = True
        if source_epoch_exit:
            self.source_epoch_active = False
            self.selected_component_active = False
            self.selected_instruction_occurrence = -1

        if pc == CALCULATE_STATS_ENTRY_PC and outer_stats_entry:
            self.in_outer_calculate_stats = True
            self.selected_component_active = False
            self.selected_instruction_occurrence = -1
        elif pc == CALCULATE_STATS_RESUME_PC:
            self.in_outer_calculate_stats = False
            self.selected_component_active = False
            self.selected_instruction_occurrence = -1

        return_pc = lr & ~1
        if self.spec.component == "encrypted-accessor":
            if (
                pc == GET_BOX_MON_DATA2_ENTRY_PC
                and self.in_outer_calculate_stats
                and return_pc in DIRECT_GET_BOX_RETURN_PCS
            ):
                if field is None:
                    raise ValueError("direct GetBoxMonData2 entry requires a field")
                # MON_DATA_STATUS and MON_DATA_HP are unencrypted direct fields
                # excluded by the canonical classifier's ordinal semantics.
                if field not in {57, 58}:
                    self._start_component(return_pc)
                else:
                    self.selected_component_active = False
        elif self.spec.component == "get-nature":
            if (
                pc == GET_NATURE_ENTRY_PC
                and self.in_outer_calculate_stats
                and return_pc in DIRECT_GET_NATURE_RETURN_PCS
            ):
                self._start_component(return_pc)
        elif self.spec.component == "nature-attempt":
            if pc == GET_NATURE_FROM_PERSONALITY_ENTRY_PC and self.source_epoch_active:
                self._start_component(self.spec.return_pc)
        else:
            raise ValueError(f"unsupported selected component {self.spec.component!r}")

        if pc == self.spec.selector_pc and self.selected_component_active:
            self.selected_instruction_occurrence += 1
            if (
                self.spec.instruction_occurrence >= 0
                and self.selected_instruction_occurrence
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
                f"0x{self.spec.entry_pc:08x}->0x{self.spec.return_pc:08x}"
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
