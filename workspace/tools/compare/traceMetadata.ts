export type AppTraceMetadata = Readonly<{
  appRoute?: "generated-orchestrator" | "canonical-recorded";
  battleScene?: "on" | "off";
  appStage?: unknown;
  appRngRebase?: unknown;
  oracleBattleLab?: unknown;
  /** App-only presentation Random2 seed/policy (docs/presentation-rng.md). */
  presentationRng?: unknown;
}>;

/** Remove app-only routing/staging fields before a trace crosses to the ROM. */
export function stripAppTraceMetadata<T extends AppTraceMetadata>(
  trace: T,
): Omit<T, keyof AppTraceMetadata> {
  const {
    appRoute: _appRoute,
    battleScene: _battleScene,
    appStage: _appStage,
    appRngRebase: _appRngRebase,
    oracleBattleLab: _oracleBattleLab,
    presentationRng: _presentationRng,
    ...oracleTrace
  } = trace;
  return oracleTrace;
}
