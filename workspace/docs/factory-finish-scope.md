# Factory finish-up scope

## User authorization — 2026-10-13

The user asked "these should all be in scope now yeah?" after reviewing the
remaining animation variants, presentation corrections and battle-engine
accuracy bugs. All three groups are now part of the current finish-up mission.
This supersedes the presentation-only restriction that prevented fixing
gameplay/RNG defects during S10A. Do not ask again for permission to fix these
source-proven defects or necessary shared mechanisms within this scope.

The normal main supervisor continues on local master through
`./run-supervisor.sh`, following ROADMAP and the current progress ledger.
This scope update does not itself implement a fix or start a run.

## Required work

- **Battle-engine accuracy:** #165 Return -> Frustration for Factory parties
  (player, opponent and swap paths; verify draft/summary display separately),
  #141 the missing source RNG draws on rampage lock-in and Thief/Covet into
  Sticky Hold, #140 the overwritten chosen-move targeting branch after
  Mimic/Transform, and #139 the Focus Punch preparation pre-pass. Fix the
  source behavior, including consequent damage, AI, RNG and event-order changes.
- **Animation variants:** remaining live-adapter fallbacks including Hyper
  Beam, Astonish, later Extrasensory, Substitute cells, Castform weather keys,
  dynamic/stale power and graphics history. Struggle stays required and live;
  handle its remaining history variants as part of ordinary Factory play.
- **Presentation:** #168 hidden-battler status effects and freeze phase,
  #167 remaining pauses/messages, #153 Scene OFF Substitute playback,
  switch/send-in tails and sprite position/shadow history (#146 / #147 / #148),
  and relevant species/timing residuals in #143 / #145 / #152 / #157 / #161.
  Verify old issue entries against current code before implementing; retain
  only their actual remaining defects. Resolve staging problem #154 when
  needed for reliable proofs.

Start with #165, then the RNG corrections (#141 and #140) and #139. The
banked hidden-battler patch and independent animation/presentation work may
continue in bounded separate steps. Keep all three groups in the queue until
resolved; a rental-list count or high animation percentage does not establish
that the Factory is finished.

## Ownership and verification

1. The supervisor assigns battle-engine fixes through the main/ts lane with
   explicit files, source behavior, intentional outcome changes and acceptance
   gates. Integration/animation workers continue to own presentation only.
   Keep concurrent changes disjoint and independently verify every union.
2. Presentation-only changes preserve gameplay outcomes and gameplay RNG.
   Authorized engine corrections may intentionally change the old outcomes,
   damage, AI decisions, RNG draw counts or turn/event ordering. Scene ON/OFF
   and different presentation seeds must agree on the same corrected rules.
   Never consume gameplay RNG from rendering or weaken the D3/D4 contracts.
3. Establish each engine correction against the original source and staged
   ROM routes; add meaningful Tier-1 controls for the affected behavior and
   exact RNG draw attribution where relevant. Do not preserve a known bug
   merely to match an old trace or soak trajectory.
4. Follow `ANIMATION_VERIFICATION.md` for baseline reuse and production gates.
   Engine fixes additionally require the applicable Factory battle/AI checks
   and all five gameplay gates in `SUPERVISOR.md`, including varied-RNG winning
   and swap profiles. Attribute intentional changes before updating trajectory
   pins or differential captures; retain controls for unaffected behavior.
5. Re-run live coverage on the corrected gameplay, since move frequency and
   battle length may change. Include Struggle in the headline; report general
   animations separately. Reuse historical body proofs only where their code,
   assets and input contract remain valid. Refresh the verified local preview.
6. Record fixed issues, tested trees, changed outcomes and exact remaining work.
   Current finish-up completion requires all three groups to be resolved under
   their source/verification contracts; 99.34% live move coverage alone is not
   a completion gate.

Audio remains explicitly deferred under the existing S11 decision. This
authorization does not reopen settled exceptions such as ambient/VBlank
rental-RNG synchronization (#55), doubles, the overworld, the Open-level rule
set, the general outside-Factory animation campaign or the separate Rust port.

## lbr-b scope note — Open Level (2026-11-13)

The attendant's "Level 50 or Open Level?" menu draws OPEN LEVEL as the ROM does but A on it is a no-op: the app only plays Level 50
(deliberate divergence, like REST in the Lobby). Open Level stays out of scope; see `docs/lbrb-attendant-conversation.md`.
