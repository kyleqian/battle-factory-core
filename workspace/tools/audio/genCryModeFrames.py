#!/usr/bin/env python3
"""cry3: generate src/data/cryModeFrames.ts -- the CRY_MODE_NORMAL and CRY_MODE_WEAK cry lengths of every Factory species (plus FAINT and cry1's task modes), derived from the ROM's m4a source.

PlayCryInternal (src/sound.c, parsed below) plays every mode as one note of the species' sample (gCryTable) with a pitch and a note length: NORMAL 15360 / 140, WEAK 15000 / 140.
SetPokemonCryPitch (src/m4a.c) splits b = pitch + 0x80 into the track's key (b >> 8) & 0x7F and tune ((b >> 1) & 0x7F) - 64; TrkVolPitSet turns them into x = tune * 4, keyM = x >> 8,
pitM = x & 0xFF; the channel's frequency is MidiKeyToFreq(wav, key + keyM, pitM) = (wav->freq * (scale(key) + ((scale(key + 1) - scale(key)) * pitM >> 8)) >> 32) in Hz
(m4a_tables.c gScaleTable / gFreqTable; key 60 / fine 0 = freq >> 10, so NORMAL reproduces the offs152 formula). The mixer advances divFreq / 2^23 sample per output sample (divFreq =
(16777216 / pcmFreq + 1) >> 1, pcmFreq = (597275 * pcmSamplesPerVBlank + 5000) / 10000, SOUND_MODE_FREQ_13379 -> 224 samples per VBlank), so the cry's length in frames is
t = size * 2^23 / (F * divFreq * pcmSamplesPerVBlank) and the table holds min(length, ceil(t)) (length = the note's ticks = frames: 140 NORMAL / WEAK, Jynx WEAK 149 -> 140); the BGM restore follows one frame later (IsCryPlaying false). Both modes are zero-residual against the
oracle: tests/fixtures/cry3-lengths.json (tools/audio/cryLengthProbe.py, every Factory species) and cry1's 149 cry-task species-modes (tests/cry3CryModeFrames.test.ts).
  python3 tools/audio/genCryModeFrames.py [out.ts]     (default: src/data/cryModeFrames.ts)"""
import json, re, struct, sys, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
ref = root / "reference/pokeemerald"
MODES = {  # mode name -> (TS const, CRY_MODE_* constant in PlayCryInternal)
    "NORMAL": "CRY_MODE_NORMAL", "WEAK": "CRY_MODE_WEAK", "FAINT": "CRY_MODE_FAINT", "ECHO_START": "CRY_MODE_ECHO_START",
    "ECHO_END": "CRY_MODE_ECHO_END", "ROAR_2": "CRY_MODE_ROAR_2", "HIGH_PITCH": "CRY_MODE_HIGH_PITCH",
}


def play_cry_internal_args():
    """mode -> (pitch, length) from the PlayCryInternal switch (defaults length = 140, pitch = 15360; a case may fall through)."""
    body = (ref / "src/sound.c").read_text().split("void PlayCryInternal(", 1)[1].split("SetPokemonCryVolume(", 1)[0]
    default = {k: int(v) for k, v in re.findall(r"^\s*(length|pitch)\s*=\s*(\d+);", body.split("switch (mode)", 1)[0], re.M)}
    cases, out = body.split("switch (mode)", 1)[1].split("case "), {}
    for chunk in cases[1:]:
        name = chunk.split(":", 1)[0].strip()
        out[name] = {**default, **{k: int(v) for k, v in re.findall(r"^\s*(length|pitch)\s*=\s*(\d+);", chunk, re.M)}}
    return {mode: (out[const]["pitch"], out[const]["length"]) for mode, const in MODES.items()}


CRY_ARGS = play_cry_internal_args()
SAMPLES_PER_VBLANK_INDEX = 4  # SOUND_MODE_FREQ_13379 = 0x00040000 -> gPcmSamplesPerVBlankTable[4 - 1]


def key_fine(pitch):
    b = pitch + 0x80
    tune = ((b >> 1) & 0x7F) - 64
    x = tune * 4
    return ((b >> 8) & 0x7F) + (x >> 8), x & 0xFF


tables = (ref / "src/m4a_tables.c").read_text()
scale = [int(x, 16) for x in re.search(r"gScaleTable\[\] =\s*\{(.*?)\};", tables, re.S).group(1).split(",") if x.strip()]
freq_table = [int(x.strip().rstrip("u")) for x in re.search(r"gFreqTable\[\] =\s*\{(.*?)\};", tables, re.S).group(1).split(",") if x.strip()]
per_vblank = int(re.search(r"gPcmSamplesPerVBlankTable\[\] =\s*\{(.*?)\};", tables, re.S).group(1).replace("\n", "").split(",")[SAMPLES_PER_VBLANK_INDEX - 1])
pcm_freq = (597275 * per_vblank + 5000) // 10000
div_freq = (16777216 // pcm_freq + 1) >> 1


def midi_key_to_freq(wav_freq, key, fine):
    fine_shifted = fine << 24
    if key > 178:
        key, fine_shifted = 178, 255 << 24
    v1 = freq_table[scale[key] & 0xF] >> (scale[key] >> 4)
    v2 = freq_table[scale[key + 1] & 0xF] >> (scale[key + 1] >> 4)
    return (wav_freq * (v1 + (((v2 - v1) * fine_shifted) >> 32))) >> 32


ids = sorted(json.load(open(root / "tools/integration/fixtures/forced-switch/factory-species-ids.json")))
names = {r["id"]: r["name"] for r in json.load(open(root / "src/data/gen/species-stats.json"))["species"]}
incbin, cur = {}, None
for line in open(ref / "sound/direct_sound_data.inc"):
    m = re.match(r"(Cry_\w+)::", line.strip())
    if m:
        cur = m.group(1)
        continue
    b = re.search(r'\.incbin "(sound/direct_sound_samples/cries/[^"]+\.bin)"', line)
    if b and cur:
        incbin[cur.lower()] = b.group(1)
        cur = None
rows = {mode: {} for mode in MODES}
for sp in ids:
    path = incbin["cry_" + names[sp].replace("SPECIES_", "").lower().replace("_", "")]
    wave_type, status, wav_freq, loop, size = struct.unpack("<HHIII", open(ref / path, "rb").read(16))
    assert (wave_type, status, loop) == (1, 0, 0), (sp, wave_type, status, loop)  # one-shot samples
    for mode, (pitch, note_length) in CRY_ARGS.items():
        f = midi_key_to_freq(wav_freq, *key_fine(pitch))
        num, den = size * 8388608, f * div_freq * per_vblank
        rows[mode][sp] = min(note_length, -(-num // den))
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / "src/data/cryModeFrames.ts"
L = [
    "// GENERATED by tools/audio/genCryModeFrames.py from reference/pokeemerald/ (src/sound.c PlayCryInternal, src/m4a.c, src/m4a_tables.c, sound/direct_sound_data.inc, the compiled cries/*.bin WaveData headers) -- do not edit.",
    "// cry3 (docs/cry1-cry-tasks.md): the cry length of every Factory species per mode, in frames from the PlayCry call to the last sample frame (the BGM restore follows one frame later).",
]
for mode in MODES:
    const = f"CRY_{mode}_FRAMES"
    L += ["", f"/** species -> CRY_MODE_{mode} cry length in frames (pitch {CRY_ARGS[mode][0]}, note length {CRY_ARGS[mode][1]}). */",
          f"export const {const}: Readonly<Record<number, number>> = Object.freeze({{"]
    items = [f"{sp}: {rows[mode][sp]}" for sp in ids]
    for i in range(0, len(items), 10):
        L.append("  " + ", ".join(items[i:i + 10]) + ",")
    L.append("});")
out.write_text("\n".join(L) + "\n")
print(f"{out}: {len(ids)} species x {len(MODES)} modes")
