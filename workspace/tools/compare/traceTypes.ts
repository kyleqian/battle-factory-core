// Trace shapes shared by the oracle client, the app replay, and the app-vs-app
// differential. Kept free of runtime imports (notably pngjs) so type-only
// consumers do not drag the HTTP/PNG client into their module graph.

import type { OracleProfile } from "./oracleProfiles.ts";

export interface TraceSegment {
  frames: number;
  buttons?: string[];
}

export interface Trace {
  segments: TraceSegment[];
  captureFrames?: number[];
  /** App-only battle owner selection; never sent to the ROM oracle. */
  appRoute?: "generated-orchestrator" | "canonical-recorded";
  battleScene?: "on" | "off";
  /**
   * App-only presentation Random2 session seed/policy (docs/presentation-rng.md), as exported by
   * SessionTrace; absent = the documented default. Never sent to the ROM oracle.
   */
  presentationRng?: { seed: string; policy: string };
  /**
   * Existing traces predate profiles and therefore default to Battle Scene ON.
   * New main/round-loop traces must opt into battle-scene-off explicitly.
   */
  oracleProfile?: OracleProfile;
  /**
   * App-only: after the tick that yields `frame`, set the app's RNG cursor to `rngValue` (the ROM's cursor at that
   * frame). Lab-staged routes leave the app and ROM cursors on one orbit but far apart; this aligns them so
   * cursor-dependent screens (the lbr-e draft deal) compare equal. Never sent to the ROM oracle.
   */
  appRngRebase?: {
    readonly frame: number;
    readonly rngValue: number;
  };
  /** Dev-only named state injection consumed by appTrace and stripped here. */
  appStage?: {
    readonly id: string;
    readonly frame: number;
    /** The lab's `trainerId` (ROM opponent) when the stage's own orchestrator draw differs; drives the post-battle room sprite. */
    readonly opponentTrainerId?: number;
  };
  /**
   * Dev-only honest ROM staging fixture consumed by compare/run.ts.
   * The referenced battle-lab scenario supplies complete pre-battle parties;
   * this trace's controls and captures replace the scenario's nested trace.
   */
  oracleBattleLab?: {
    readonly scenario: string;
    /**
     * Consume the scenario's `preCheckpointCaptures` (absolute pre-checkpoint
     * numbering — frame 0 immediately after `new_session()`, per
     * `../../oracle/BATTLE_LAB.md` "Pre-checkpoint captures") instead of the
     * ordinary post-checkpoint `captures`. `oracleCapture.frame` in the
     * result is rebased to app-relative (absolute frame minus this offset)
     * so it lines up with this trace's own app frame numbers; only frames
     * also present in `captureFrames` are returned, so the comparison window
     * is explicit rather than the fixture's whole internal route. The
     * mapping is fixture-specific — see
     * docs/trainer-pic-off-window-scout.md §C/§D.
     */
    readonly preCheckpointFrameOffset?: number;
  };
}

