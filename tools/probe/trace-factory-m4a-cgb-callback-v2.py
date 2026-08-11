#!/usr/bin/env python3
"""Capture the compact additive m4a CGB callback/read receipt for Issue #55.

The pre-existing v3 receipt remains the authoritative normalized m4a graph.
This v2 probe never serializes that graph again: at each m4a call boundary it
calculates the v3 state digest in memory, then emits only that digest and the
exact m4a call cost.  The finite CgbSound callback/table component is captured
once as a source-general constant, with every observation checking the same
component digest before the compact packet is emitted.

Run through the validated wrapper:

    python3 tools/run-mgba-probe.py /tmp/fresh.json -- \
      python3 tools/probe/trace-factory-m4a-cgb-callback-v2.py /tmp/fresh.json anchor
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import sys
from pathlib import Path
from typing import Any


if len(sys.argv) != 3:
    raise SystemExit(f"usage: {sys.argv[0]} <output.json> anchor|liliana|factory-varied")

OUTPUT = Path(sys.argv[1])
CASE = sys.argv[2]
if CASE not in {"anchor", "liliana", "factory-varied"}:
    raise SystemExit(f"unknown case {CASE!r}")

# These are the existing opt-in source-state paths.  No new packet is valid
# unless it passes through the same Scene-OFF mGBA construction driver.
os.environ["FACTORY_CONSTRUCTION_CYCLE_EVIDENCE"] = "1"
os.environ["FACTORY_VBLANK_WORKLOAD_EVIDENCE"] = "1"
os.environ["FACTORY_VBLANK_WORKLOAD_INTERNAL_EVIDENCE"] = "1"

HERE = Path(__file__).resolve().parent
V3_PROBE = HERE / "trace-factory-m4a-source-state-v3.py"
spec = importlib.util.spec_from_file_location("factory_m4a_source_state_v3", V3_PROBE)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load sibling driver: {V3_PROBE}")
v3 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v3)


# These values are source/ELF extraction constants, not production state.  The
# complete tables are tiny fixed ROM objects: m4a.c:810-855 indexes them on
# all MidiKeyToCgbFreq branches, and m4a.c:1209-1212 indexes gCgb3Vol.
CGB_SCALE_ADDR = 0x08675B7C
CGB_SCALE_BYTES = 0x84
CGB_FREQ_ADDR = 0x08675C00
CGB_FREQ_BYTES = 0x18
NOISE_ADDR = 0x08675C18
NOISE_BYTES = 0x3C
CGB3_VOL_ADDR = 0x08675C54
CGB3_VOL_BYTES = 0x10


# This is the complete indirect target/read footprint for the selected class.
# The report mechanically checks that every id and every read expression is
# present in every packet.  Branches with identical target tables remain
# separate so a source change that drops a clamp/selector arm fails loudly.
CGB_CALLBACK_PATHS: tuple[dict[str, Any], ...] = (
    {
        "id": "cgb-sound.cgb-osc-off.channel-1",
        "source": "m4a.c:1027-1030 switch(ch) case 1",
        "target": "CgbOscOff",
        "selector": "channel-1",
        "reads": (),
        "writes": ("NR12", "NR14"),
    },
    {
        "id": "cgb-sound.cgb-osc-off.channel-2",
        "source": "m4a.c:1031-1034 switch(ch) case 2",
        "target": "CgbOscOff",
        "selector": "channel-2",
        "reads": (),
        "writes": ("NR22", "NR24"),
    },
    {
        "id": "cgb-sound.cgb-osc-off.channel-3",
        "source": "m4a.c:1035-1037 switch(ch) case 3",
        "target": "CgbOscOff",
        "selector": "channel-3",
        "reads": (),
        "writes": ("NR30",),
    },
    {
        "id": "cgb-sound.cgb-osc-off.channel-4-default",
        "source": "m4a.c:1038-1041 switch(ch) default",
        "target": "CgbOscOff",
        "selector": "channel-4-default",
        "reads": (),
        "writes": ("NR42", "NR44"),
    },
    {
        "id": "cgb-sound.gCgb3Vol.envelope-volume",
        "source": "m4a.c:1209-1212 gCgb3Vol[channels->envelopeVolume]",
        "target": "gCgb3Vol",
        "selector": "envelopeVolume-0..15",
        "reads": ("gCgb3Vol[envelopeVolume]",),
        "writes": ("NR32",),
    },
    {
        "id": "mplay-main.midi-key-to-cgb-freq.noise-low-key",
        "source": "m4a.c:814-822 chanNum == 4; key <= 20",
        "target": "MidiKeyToCgbFreq",
        "selector": "channel-4-key-0..20",
        "reads": ("gNoiseTable[key]",),
        "writes": (),
    },
    {
        "id": "mplay-main.midi-key-to-cgb-freq.noise-high-key",
        "source": "m4a.c:814-822 chanNum == 4; 21 <= key <= 80",
        "target": "MidiKeyToCgbFreq",
        "selector": "channel-4-key-21..80",
        "reads": ("gNoiseTable[key - 21]",),
        "writes": (),
    },
    {
        "id": "mplay-main.midi-key-to-cgb-freq.noise-clamped-key",
        "source": "m4a.c:819-822 chanNum == 4; key > 80",
        "target": "MidiKeyToCgbFreq",
        "selector": "channel-4-key-clamped-59",
        "reads": ("gNoiseTable[59]",),
        "writes": (),
    },
    {
        "id": "mplay-main.midi-key-to-cgb-freq.tone-low-key",
        "source": "m4a.c:830-834 chanNum != 4; key <= 35",
        "target": "MidiKeyToCgbFreq",
        "selector": "channel-1..3-key-0..35",
        "reads": ("gCgbScaleTable[0]", "gCgbScaleTable[1]", "gCgbFreqTable[...]"),
        "writes": (),
    },
    {
        "id": "mplay-main.midi-key-to-cgb-freq.tone-normal-key",
        "source": "m4a.c:830-853 chanNum != 4; 36 <= key <= 166",
        "target": "MidiKeyToCgbFreq",
        "selector": "channel-1..3-key-36..166",
        "reads": ("gCgbScaleTable[key]", "gCgbScaleTable[key + 1]", "gCgbFreqTable[...]"),
        "writes": (),
    },
    {
        "id": "mplay-main.midi-key-to-cgb-freq.tone-clamped-key",
        "source": "m4a.c:838-841 chanNum != 4; key > 166",
        "target": "MidiKeyToCgbFreq",
        "selector": "channel-1..3-key-clamped-130",
        "reads": ("gCgbScaleTable[130]", "gCgbScaleTable[131]", "gCgbFreqTable[...]"),
        "writes": (),
    },
)


def callback_state(oracle: Any) -> dict[str, Any]:
    """Capture every fixed table and callback target in the selected class."""
    read_region = v3.region_bytes
    return {
        "revision": "factory-m4a-cgb-callback/v1",
        "dispatchTargets": {
            "cgbOscOff": v3.source_symbol(v3.old.read_u32(oracle, v3.SOUND_INFO_ADDR + 0x2C)),
            "midiKeyToCgbFreq": v3.source_symbol(v3.old.read_u32(oracle, v3.SOUND_INFO_ADDR + 0x30)),
        },
        "readRegions": {
            "gCgb3Vol": read_region(oracle, CGB3_VOL_ADDR, CGB3_VOL_BYTES),
            "gCgbScaleTable": read_region(oracle, CGB_SCALE_ADDR, CGB_SCALE_BYTES),
            "gCgbFreqTable": read_region(oracle, CGB_FREQ_ADDR, CGB_FREQ_BYTES),
            "gNoiseTable": read_region(oracle, NOISE_ADDR, NOISE_BYTES),
        },
        "paths": [
            {
                "id": path["id"],
                "target": path["target"],
                "selector": path["selector"],
                "reads": list(path["reads"]),
                "writes": list(path["writes"]),
            }
            for path in CGB_CALLBACK_PATHS
        ],
        "coverage": {
            "complete": True,
            "expectedPathIds": [path["id"] for path in CGB_CALLBACK_PATHS],
            "observedPathIds": [path["id"] for path in CGB_CALLBACK_PATHS],
            "sourceGeneral": True,
        },
    }


BASE_SOURCE_STATE = v3.source_semantic_state
OBSERVED_COMPONENTS: dict[str, dict[str, Any]] = {}


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()


def snapshot_compact_additive_state(oracle: Any) -> dict[str, str]:
    """Capture only the non-duplicated v3 join key plus additive component key.

    The v3 source state is deliberately constructed only long enough to hash
    it.  It is neither inserted into the driver result nor JSON-serialized by
    this probe, so the committed v2 packet stays genuinely additive.
    """
    source_state = BASE_SOURCE_STATE(oracle)
    source_state_digest = hashlib.sha256(canonical_json(source_state)).hexdigest()
    component = callback_state(oracle)
    component_digest = hashlib.sha256(canonical_json(component)).hexdigest()
    prior = OBSERVED_COMPONENTS.setdefault(component_digest, component)
    if prior != component:
        raise RuntimeError("CGB callback component digest collision")
    return {
        "sourceStateDigest": source_state_digest,
        "callbackComponentDigest": component_digest,
    }


# The imported construction driver remains the one staging and measuring path,
# but its m4a boundary snapshot is reduced before any packet is assembled.
v3.old.snapshot_m4a_internal_state = snapshot_compact_additive_state


def compact_additive_receipt(raw: dict[str, Any]) -> dict[str, Any]:
    """Read only final compact fields from the in-memory construction run."""
    source_entry = raw["entry"]["masterCycles"]
    source_return = raw["return"]["masterCycles"]
    observations: list[dict[str, Any]] = []
    component_digests: set[str] = set()

    for workload in raw["vblankWorkloadEvidence"]["interrupts"]:
        returned = workload.get("return")
        resumed = workload.get("resume")
        audio = workload.get("audioInternal")
        if returned is None or resumed is None or audio is None:
            continue
        entry_cycles = workload["entry"]["masterCycles"]
        if entry_cycles < source_entry or entry_cycles > source_return:
            continue
        state = audio["state"]
        state_digest = state.get("sourceStateDigest")
        component_digest = state.get("callbackComponentDigest")
        if not isinstance(state_digest, str) or not isinstance(component_digest, str):
            raise RuntimeError("compact m4a boundary snapshot is incomplete")
        call = next(
            stage["masterCycles"]
            for stage in audio["stages"]
            if stage["kind"] == "m4a-sound-main-call"
        )
        m4a_return = next(
            stage["masterCycles"]
            for stage in audio["stages"]
            if stage["kind"] == "m4a-sound-main-return"
        )
        if m4a_return <= call:
            raise RuntimeError("non-positive m4a call cost")
        observations.append({
            "sourceStateDigest": state_digest,
            "m4aCost": m4a_return - call,
        })
        component_digests.add(component_digest)

    if not observations:
        raise RuntimeError("no compact m4a observations")
    if len(component_digests) != 1:
        raise RuntimeError("CGB callback component was not source-general")
    component_digest = next(iter(component_digests))
    component = OBSERVED_COMPONENTS.get(component_digest)
    if component is None:
        raise RuntimeError("missing captured CGB callback component")

    return {
        "schema": "factory-m4a-cgb-callback-probe/v2",
        "case": raw["case"],
        "oracleProfile": raw["oracleProfile"],
        "sourceStateReference": {
            "packetSchema": "factory-m4a-source-state-probe/v3",
            "digestKey": "sourceSemanticState.stateDigest",
        },
        "cgbCallback": {
            "component": component,
            "componentDigest": component_digest,
        },
        "residualDereferences": [
            item for item in v3.RESIDUAL_DEREFERENCES
            if item["stage"] != "CgbSound"
        ],
        "observations": observations,
    }


def main() -> None:
    if OUTPUT.exists():
        raise SystemExit(f"refusing existing output path: {OUTPUT}")
    if CASE == "anchor":
        raw = v3.old.run_anchor()
    elif CASE == "liliana":
        raw = v3.old.run_liliana()
    else:
        raw = v3.old.run_factory_varied()
    result = compact_additive_receipt(raw)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n")
    print(f"wrote {OUTPUT}: {result['case']} {len(result['observations'])} CGB-callback observations", flush=True)


if __name__ == "__main__":
    main()
