import { createHash } from "node:crypto";

type JsonValue = null | boolean | number | string | JsonValue[] | {
  readonly [key: string]: JsonValue;
};

type JsonObject = { readonly [key: string]: JsonValue };

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * BattleLab probe payloads originate in Python's json.dumps(payload) + "\\n".
 * Keep that byte form when a comparator narrows a receipt's semantic schema:
 * it preserves parsed property order, uses Python's default spaces, and escapes
 * non-ASCII code units as Python's default ensure_ascii encoder does.
 */
function pythonJsonString(value: string): string {
  let serialized = "\"";
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    switch (code) {
      case 0x08: serialized += "\\b"; break;
      case 0x09: serialized += "\\t"; break;
      case 0x0a: serialized += "\\n"; break;
      case 0x0c: serialized += "\\f"; break;
      case 0x0d: serialized += "\\r"; break;
      case 0x22: serialized += "\\\""; break;
      case 0x5c: serialized += "\\\\"; break;
      default:
        if (code < 0x20 || code > 0x7e) {
          serialized += `\\u${code.toString(16).padStart(4, "0")}`;
        } else {
          serialized += String.fromCharCode(code);
        }
    }
  }
  return `${serialized}\"`;
}

function pythonJson(value: JsonValue, compact = false): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return pythonJsonString(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("semantic receipt has non-finite number");
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => pythonJson(item, compact)).join(compact ? "," : ", ")}]`;
  }
  return `{${Object.entries(value).map(([key, item]) =>
    `${pythonJsonString(key)}${compact ? ":" : ": "}${pythonJson(item, compact)}`)
    .join(compact ? "," : ", ")}}`;
}

function semanticReceiptSha256WithFormat(probe: unknown, compact: boolean): string {
  if (!isJsonObject(probe) || !isJsonObject(probe.setup)) {
    throw new Error("semantic receipt missing setup object");
  }
  const { setup } = probe;
  const captures = setup.preCheckpointCaptures;
  if (!Array.isArray(captures) || captures.length !== 0) {
    throw new Error("semantic receipt setup.preCheckpointCaptures must be []");
  }
  const { preCheckpointCaptures: _, ...semanticSetup } = setup;
  const semanticProbe: JsonObject = { ...probe, setup: semanticSetup };
  const bytes = Buffer.from(`${pythonJson(semanticProbe, compact)}\n`);
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Assert and remove only BattleLab's asserted-empty transport capture list
 * before hashing a portable semantic receipt. Raw framebuffer receipts retain
 * their independent byte-for-byte policy.
 */
export function semanticReceiptSha256(probe: unknown): string {
  return semanticReceiptSha256WithFormat(probe, false);
}

/**
 * The older Sweet Kiss and Attract probes explicitly used Python's compact
 * json.dumps separators. Keep that historic byte form after narrowing only
 * the asserted-empty BattleLab transport capture list.
 */
export function compactSemanticReceiptSha256(probe: unknown): string {
  return semanticReceiptSha256WithFormat(probe, true);
}
