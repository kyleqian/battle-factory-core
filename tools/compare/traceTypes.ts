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
  /**
   * Existing traces predate profiles and therefore default to Battle Scene ON.
   * New main/round-loop traces must opt into battle-scene-off explicitly.
   */
  oracleProfile?: OracleProfile;
  /** Dev-only named state injection consumed by appTrace and stripped here. */
  appStage?: {
    readonly id: string;
    readonly frame: number;
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

