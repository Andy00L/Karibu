// Minimal structured logger. Every line carries a [FunctionName] prefix per the
// project standard. Never logs secrets. sourceRef: SKILL_GENERAL.md section 6.
type LogFields = Record<string, string | number | boolean | null>;

function formatFields(fields: LogFields | undefined): string {
  if (fields === undefined) {
    return "";
  }
  const parts = Object.entries(fields).map(([key, value]) => `${key}=${String(value)}`);
  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

export function logInfo(functionName: string, message: string, fields?: LogFields): void {
  console.log(`[${functionName}] ${message}${formatFields(fields)}`);
}

export function logWarn(functionName: string, message: string, fields?: LogFields): void {
  console.warn(`[${functionName}] ${message}${formatFields(fields)}`);
}

export function logError(functionName: string, message: string, fields?: LogFields): void {
  console.error(`[${functionName}] ${message}${formatFields(fields)}`);
}
