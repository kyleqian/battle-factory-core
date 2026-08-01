# Rank-2 `turn13Resolved` predecessor audit

This is the Battle Scene OFF evidence record for the bounded predecessor
handoff retirement. It does not extend the retired canonical Battle-2 turn
march.

## Mirror census

`turn13Resolved` formerly had one producer: `core.ts` set it on the input edge
that reopens FIGHT after the staged DRAGON_BREATH → PIDGEOTTO faint → MURKROW
switch-in lifecycle. That same edge installs the immutable FLY charge owner.

The retired mirror had three distinct consumer roles:

1. `core.ts` uses it as the predecessor guard for the following reopen.
2. `battleScene.ts` threads it through the FIGHT dispatcher and rejects a
   resolved handoff that lacks the simultaneously installed FLY owner.
3. `battleMenu.ts` reconstructs DRAGON_BREATH PP as 18/20 for the turn-14
   submenu.

All three now consume
`Turn13CompletedResolutionNextCommandHandoff`: its adapter lifecycle supplies
the persisted slot 2, post-turn-13 DRAGON_BREATH **18/20**, and typed
`{ redraw: "settled", input: "ready" }` facts. The FLY owner remains a
separate required companion for the dispatcher's resolved-handoff invariant.
The third role cannot use that existing FLY owner: it is constructed from
an already-completed turn-14 charge resolution, whose player PP is 17/20.
`turn13ResolutionAdapterEquivalence.test.ts` pins the required predecessor
18/20 versus that owner's 17/20, so replacing the flag with owner presence
would move a future receipt backward across the command boundary.

The handoff is derived at the adapter's completed resumed-rules context rather
than from the FLY owner, preserving the command boundary. The former
`TURN13_TURN14_HANDOFF_NOT_STAGED` omission marker is retired with the mirror.

## Immediately adjacent lifecycle

`opponentFaintDismissElapsed` is not dead. Its one-shot input writer is gated
by the staged faint text's settled-cursor boundary, while the renderer reads
the captured edge to freeze the cursor and drive the switch-in continuation.
The delayed-dismiss historical route is specifically why an eligibility-time
substitute is invalid. No smaller adjacent field is independently removable.

## Verdict

`turn13Resolved` is retired by `79885140`; Tier-1 proves the three typed facts
and the swapped consumers. Keep `opponentFaintDismissElapsed` until the
lifecycle owns its variable dismiss edge. The existing trace and capture lists
remain untouched.
