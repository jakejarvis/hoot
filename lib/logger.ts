// Unified logger for Node (Pino), Edge (Middleware/Edge runtime), and Browser.
// - Node runtime: dynamic imports Pino and emits structured JSON to stdout.
// - Edge/Browser: console-based shim with same API.
// - Supports child bindings via logger.with({ ... }).

type Level = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

export type Logger = {
  debug: (msg: string, fields?: LogFields) => void;
  info: (msg: string, fields?: LogFields) => void;
  warn: (msg: string, fields?: LogFields) => void;
  error: (msg: string, fields?: LogFields) => void;
  with: (bindings: LogFields) => Logger;
};

const RUNTIME: "node" | "edge" | "browser" =
  typeof window !== "undefined"
    ? "browser"
    : (globalThis as Record<string, unknown>).EdgeRuntime
      ? "edge"
      : "node";

// Safe env access for Edge compatibility
const env = globalThis?.process?.env ?? {};
const isProd = env.NODE_ENV === "production";
const defaultLevel =
  (env.LOG_LEVEL as Level | undefined) ?? (isProd ? "info" : "debug");

// ---------- console-based fallback (Edge/Browser) ----------
function makeConsoleLogger(base: LogFields = {}): Logger {
  const emit = (level: Level, msg: string, fields?: LogFields) => {
    const line = { level, msg, ...base, ...(fields ?? {}) };
    const fn =
      (console[level] as typeof console.log | undefined) ?? console.log;
    fn(line);
  };
  return {
    debug: (m, f) => emit("debug", m, f),
    info: (m, f) => emit("info", m, f),
    warn: (m, f) => emit("warn", m, f),
    error: (m, f) => emit("error", m, f),
    with: (bindings) => makeConsoleLogger({ ...base, ...bindings }),
  };
}

// ---------- Pino (Node runtime) ----------
type PinoLogger = {
  child: (bindings: LogFields) => PinoLogger;
  debug: (obj: LogFields, msg: string) => void;
  info: (obj: LogFields, msg: string) => void;
  warn: (obj: LogFields, msg: string) => void;
  error: (obj: LogFields, msg: string) => void;
};

let nodeRoot: PinoLogger | null = null;

async function getPinoRoot(): Promise<PinoLogger> {
  if (nodeRoot) return nodeRoot;

  const pino = await import("pino");
  const transport =
    !isProd && env.LOG_PRETTY !== "0"
      ? {
          target: "pino-pretty",
          options: { colorize: true, singleLine: true },
        }
      : undefined;

  nodeRoot = pino.default({
    level: defaultLevel,
    base: {
      app: "domainstack",
      env: env.NODE_ENV,
      commit: env.VERCEL_GIT_COMMIT_SHA,
      region: env.VERCEL_REGION,
    },
    messageKey: "msg",
    timestamp: pino.default.stdTimeFunctions.isoTime,
    transport,
    serializers: {
      err: pino.default.stdSerializers.err,
    },
  });

  return nodeRoot;
}

function makeNodeLogger(base: LogFields = {}): Logger {
  const emit = async (level: Level, msg: string, fields?: LogFields) => {
    const root = await getPinoRoot();
    const child = Object.keys(base).length ? root.child(base) : root;
    child[level]({ ...(fields ?? {}) }, msg);
  };
  // Sync facade; logs flush after first dynamic import resolves.
  return {
    debug: (m, f) => {
      void emit("debug", m, f);
    },
    info: (m, f) => {
      void emit("info", m, f);
    },
    warn: (m, f) => {
      void emit("warn", m, f);
    },
    error: (m, f) => {
      void emit("error", m, f);
    },
    with: (bindings) => makeNodeLogger({ ...base, ...bindings }),
  };
}

// ---------- public API ----------
export function logger(bindings?: LogFields): Logger {
  return RUNTIME === "node"
    ? makeNodeLogger(bindings)
    : makeConsoleLogger(bindings);
}

export function createRequestLogger(opts: {
  method?: string;
  path?: string;
  ip?: string;
  requestId?: string;
  userId?: string;
  vercelId?: string | null;
}) {
  return logger({
    method: opts.method,
    path: opts.path,
    ip: opts.ip,
    requestId: opts.requestId,
    userId: opts.userId,
    vercelId: opts.vercelId ?? undefined,
  });
}
