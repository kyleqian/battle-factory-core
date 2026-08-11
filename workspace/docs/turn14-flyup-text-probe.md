# Turn 14 FLY-up text hard-cut probe

Scope: ISSUES #34's separate Battle Scene ON `17822-17845` residual only.
This does not revisit the unresolved `17781-17787` affine-sampler window.

## Result

The residual was not kerning or glyph metrics. `"Foe MURKROW flew\nup high!"`
uses the normal one-character-per-frame printer, but its first glyph is at
render tick 17823, not 17822. The prior renderer therefore led the oracle by
exactly one glyph on every non-space frame.

Fresh verifier `tools/probe/verify-turn14-flyup-text.ts` requests only these
24 frames from the ON oracle and compares the live engine. Before the repair,
it found no field pixels and only a single message-box glyph addition: tick
17822 was 34 pixels at `16,124-21,133`, oracle background `(107,165,165)`
versus app text colors `(107,90,115)`/`(255,255,255)`. Each following
non-space frame had the same one-glyph lead; the space ticks 17825/17833/17840
were already exact. Tick 17846 was already exact with the complete string.

The renderer now uses a local 17823 command anchor, without changing shared
font, kerning, or typewriter behavior. The canonical trace restores all 24
frames; the remaining #34 window is only the separate 7-frame affine sampler
residual at `17781-17787`.
