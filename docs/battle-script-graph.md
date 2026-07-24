# Battle Script graph catalog

`src/data/gen/battle-script-graph.json` is a dev-time lexical catalog of
`asm/macros/battle_script.inc` and `data/battle_scripts_1.s`. It is not an
assembler, a typed Battle Script IR, or an interpreter. Its tokens remain the
spelling in the pinned assembly source.

## Conditional guard records

`controlFlow.conditionalGuards` is the descriptive source evidence attached to
the graph's existing conditional `jump` edges. Current pinned-source coverage
is **264** unambiguous invocations across **29** source macros; all **264**
have a lexical not-taken assembly successor. There are **87** records with a
raw `ifflag` macro operand exposed as `comparator`, and **124** with a raw
`battler` macro operand exposed as `selector`.

Each record contains:

- the source label/line and invoked macro/opcode;
- every invocation operand as `{ parameter, token }`, using the macro
  declaration parameter spelling and the raw invocation token;
- `comparator` only when that invocation has a parameter literally named
  `ifflag`, and `selector` only for a parameter literally named `battler`;
- the taken destination's raw pointer operand plus resolved source label/line;
- the existing lexical fallthrough as `notTakenSuccessor`, or `null` where no
  executable source successor exists.

This is intentionally narrower than a semantics catalog. Aliases such as
`jumpifnotmove` have fixed comparison/source values in macro bodies; those are
not reverse-expanded or presented as if they had been invocation operands.
The catalog does not evaluate a comparison, identify a runtime battler, infer
handler transfers, compute addresses, assign operand types, or guess return
targets.

The extractor admits a record only when the existing conditional edge has one
source-label destination, a pointer-named macro parameter that exactly names
that destination, and invocation arity equal to the declared macro parameters.
Any future conditional edge that fails those mechanical checks is omitted and
listed in `controlFlow.conditionalGuardExclusions` with a reason; the current
generated artifact has **0** exclusions. This makes the bounded coverage
auditable instead of silently attaching metadata to ambiguous source.

Regenerate with:

```sh
node --experimental-strip-types tools/extract/extract-battle-script-graph.ts
```

`tests/battleScriptGraph.test.ts` byte-for-byte regenerates the artifact and
pins the complete counts, exclusion count, structural join to every conditional
edge, and representative fixed-macro, raw-comparator, and raw-selector cases.
