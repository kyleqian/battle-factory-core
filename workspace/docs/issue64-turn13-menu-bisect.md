# Issue #64: `turn13-menu.json` regression bisect

## Result

The first bad commit is `59a3fa7d1a07beecd3505bd772d3312dfeda2355`
(`feat(#39 rank-5 slice 3): flip turns 11-12
AERIAL_ACE/ROCK_SLIDE/FEATHER_DANCE to Scene-OFF-owned presentation`). Its
direct parent is `7091faa49f38649c1109fbccafec67112d2945ae`.

This is classification **(b)**: an intentional, adopted Scene-OFF retirement
changed the still-running turn-12 dispatcher, while the legacy Scene-ON
`turn13-menu.json` result remained recorded as 57/57 without being rerun. It
is not an oracle/profile-selection artifact: the historical comparisons below
explicitly used the Scene-ON service, and the ON oracle's frame-15374 raw-RGB
SHA remains the dossier-pinned `5646ba2c6ca9...`.

## Reproduction and endpoints

The current branch was first confirmed with:

```sh
npm run compare -- tools/compare/traces/turn13-menu.json --summary
```

Historical compare code predates profile-aware trace routing and reads only
`POKEBENCH_ORACLE_URL`. Each detached worktree was therefore run from inside
that worktree with `POKEBENCH_ORACLE_URL=http://127.0.0.1:8012`, preserving
this legacy trace's Scene-ON contract despite the side lane's normal OFF
default.

| Commit | Relation | Result |
| --- | --- | --- |
| current side base | red endpoint | 56/57; frame 15374 differs by 769 px, bbox 44,49-99,110 |
| `8caad013` | suggested newer historical endpoint | 56/57; identical single-frame diff |
| `59a3fa7d` | first bad | 56/57; identical single-frame diff |
| `7091faa4` | direct parent of first bad | 57/57 |
| `289fe2c7` | suggested older historical endpoint | 57/57 |

The direct parent/child pair establishes the boundary without ambiguity.

## Mechanism

Before the flip, the turn-12 ROCK_SLIDE dispatcher used the Scene-ON synthetic
press anchor `TURN12_ROCKSLIDE_PRESS_TICK = 14237`, and the settled-menu bounce
was derived from that anchor. The flip intentionally added
`TURN12_OFF_ROCKSLIDE_PRESS_TICK = 14218`
(`59a3fa7d:src/engine/battleScene.ts:13328`) and changed the live turn-12
dispatcher to select it (`:13396-13398`). At the redraw branch it now passes
that OFF anchor into `drawTurn12TurnEndSettledMenu` (`:13399-13400`).

That helper feeds the selected anchor into
`turn12RockSlideResettledBounceTick` (`:13370-13372`) and draws Onix at the
resulting `bounce.onixY2` (`:13377`). At render 15374, the anchor change moves
the local bounce tick from

```text
15374 - (14237 + 551) + 1748 = 2334  -> onixY2 0
15374 - (14218 + 551) + 1748 = 2353  -> onixY2 1
```

The one-pixel vertical displacement changes 769 sprite/background pixels in
the reported box. It does not remove the sprite; visual inspection of the
parent and child app captures shows the child drawing Onix one pixel lower,
which explains why a sampled oracle sprite pixel becomes background white in
the app.

Only frame 15374 is affected because it is the A-press boundary still rendered
through the turn-12 dispatcher. The following render has entered the turn-13
submenu path, whose pre-open branches call `drawTurn12TurnEndSettledMenu`
without an explicit anchor (`:13514-13522`, `:13525-13537`); the helper's
default deliberately remains the old ON anchor (`:13370`). Thus frames
15375 onward reconverge.

The commit's intent is explicit: its change notes say turn 12 is being moved
to an OFF-fit `14218` anchor while the ON-fit value remains for turn-13 reuse.
The supporting Scene-OFF dossier also records the turn-13 settle moving about
19 ticks earlier (`docs/rank5-off-ground-truth.md:343-350`) and says the
turn-9/11/12 menu ON traces were not banked under OFF because of real
idle-bounce phase differences (`:416-425`, `:717-725`). The missed detail was
that frame 15374 of the legacy turn-13 trace still belongs to the now-OFF
turn-12 dispatch before the turn-13 state handoff.

## Recommended next action

Reclassify #64 as an accepted legacy Scene-ON insurance drift caused by the
adopted rank-5 Scene-OFF policy, and correct the historical 57/57 ledger entry
to name the retained 56/57 result. Keep the capture list intact.

If Scene-ON exactness for this retired canonical route is still a requirement,
the fix must be profile-aware at the presentation/state seam: retain the ON
bounce anchor for the pre-handoff redraw when replaying a Scene-ON route, while
keeping `14218` for the OFF-owned turn-12 dispatcher. It should not be an
absolute-frame or trace-specific exception.
