export type AppTraceMetadata = Readonly<{
  appRoute?: "generated-orchestrator" | "canonical-recorded";
  appStage?: unknown;
  oracleBattleLab?: unknown;
}>;

/** Remove app-only routing/staging fields before a trace crosses to the ROM. */
export function stripAppTraceMetadata<T extends AppTraceMetadata>(
  trace: T,
): Omit<T, keyof AppTraceMetadata> {
  const {
    appRoute: _appRoute,
    appStage: _appStage,
    oracleBattleLab: _oracleBattleLab,
    ...oracleTrace
  } = trace;
  return oracleTrace;
}
