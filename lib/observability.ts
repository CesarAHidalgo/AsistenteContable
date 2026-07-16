type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return {
    message: typeof error === "string" ? error : "Unknown error"
  };
}

function emit(level: LogLevel, event: string, context: LogContext = {}) {
  const payload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...context
  };

  if (level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }

  if (level === "warn") {
    console.warn(JSON.stringify(payload));
    return;
  }

  console.log(JSON.stringify(payload));
}

export function logInfo(event: string, context: LogContext = {}) {
  emit("info", event, context);
}

export function logWarn(event: string, context: LogContext = {}) {
  emit("warn", event, context);
}

export function logError(event: string, error: unknown, context: LogContext = {}) {
  const serialized = serializeError(error);
  emit("error", event, {
    ...context,
    error: serialized
  });
}
