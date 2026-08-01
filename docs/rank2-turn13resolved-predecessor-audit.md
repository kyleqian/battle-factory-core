# Rank-2 `turn13Resolved` predecessor audit

This is a bounded Battle Scene OFF evidence checkpoint. It changes no
production controller or renderer behavior and does not extend the retired
canonical Battle-2 turn march.

## Mirror census

`turn13Resolved` has one producer: `core.ts` sets it on the input edge that
reopens FIGHT after the staged DRAGON_BREATH → PIDGEOTTO faint → MURKROW
switch-in lifecycle. That same edge currently installs the immutable FLY
charge owner.

The mirror still has three distinct consumer roles:

1. `core.ts` uses it as the predecessor guard for the following reopen.
2. `battleScene.ts` threads it through the FIGHT dispatcher and rejects a
   resolved handoff that lacks the simultaneously installed FLY owner.
3. `battleMenu.ts` reconstructs DRAGON_BREATH PP as 18/20 for the turn-14
   submenu.

The first two roles can eventually be expressed by a typed handoff/owner.
The third cannot use the existing FLY owner: that owner is constructed from
an already-completed turn-14 charge resolution, whose player PP is 17/20.
`turn13ResolutionAdapterEquivalence.test.ts` pins the required predecessor
18/20 versus that owner's 17/20, so replacing the flag with owner presence
would move a future receipt backward across the command boundary.

The existing adapter already names this exact omission as
`TURN13_TURN14_HANDOFF_NOT_STAGED`; its switch-in result owns replacement
species, slot, level, HP, and sent-out text, but it does not publish a typed
next-command handoff containing redraw/input readiness, persisted move slot,
and post-turn-13 PP.

## Immediately adjacent lifecycle

`opponentFaintDismissElapsed` is not dead. Its one-shot input writer is gated
by the staged faint text's settled-cursor boundary, while the renderer reads
the captured edge to freeze the cursor and drive the switch-in continuation.
The delayed-dismiss historical route is specifically why an eligibility-time
substitute is invalid. No smaller adjacent field is independently removable.

## Verdict

Keep `turn13Resolved` until the turn-13 adapter publishes a typed completed
resolution/next-command handoff with all three predecessor facts above. Keep
`opponentFaintDismissElapsed` until that same lifecycle owns its variable
dismiss edge. Because no runtime state changed, there are no directly affected
app traces to differential-replay against `f69ae4f1`; the existing trace and
capture lists remain untouched.
