import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type ImportJobStatus = "queued" | "running" | "paused" | "completed" | "failed";

export type ImportJobMode = "import" | "validate";

export type ImportJobCounts = {
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
  failed: number;
};

export type ImportJobErrorItem = {
  row: number;
  error: string;
  data: Record<string, any>;
  sourceRow: Record<string, any>;
};

export type ImportJobResult = {
  ok: boolean;
  imported: number;
  updated: number;
  deleted: number;
  skipped: number;
  failed: number;
  errors: ImportJobErrorItem[];
};

export type ImportJobPayload = {
  tipo: string;
  rows: Record<string, any>[];
  sourceRows: Record<string, any>[];
  mode?: ImportJobMode;
};

export type ImportJobState = {
  id: string;
  tipo: string;
  status: ImportJobStatus;
  phase: string;
  current: number;
  total: number;
  currentLabel: string;
  message: string;
  counts: ImportJobCounts;
  createdAt: string;
  startedAt: string;
  updatedAt: string;
  finishedAt: string | null;
  error: string | null;
  result: ImportJobResult | null;
};

const JOB_TTL_MS = 6 * 60 * 60 * 1000;
const JOB_HISTORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const JOB_DIR = path.resolve(process.cwd(), ".tmp", "importacion-jobs");

type JobFiles = {
  statePath: string;
  payloadPath: string;
  errorsPath: string;
};

type GlobalJobStore = typeof globalThis & {
  __importacionJobs?: Map<string, ImportJobState>;
};

const stateCache = (() => {
  const scope = globalThis as GlobalJobStore;
  if (!scope.__importacionJobs) {
    scope.__importacionJobs = new Map<string, ImportJobState>();
  }
  return scope.__importacionJobs;
})();

function nowIso() {
  return new Date().toISOString();
}

function ensureJobDir() {
  fs.mkdirSync(JOB_DIR, { recursive: true });
}

function getJobFiles(jobId: string): JobFiles {
  const prefix = path.join(JOB_DIR, jobId);
  return {
    statePath: `${prefix}.state.json`,
    payloadPath: `${prefix}.payload.json`,
    errorsPath: `${prefix}.errors.ndjson`,
  };
}

function readJsonFile<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw.trim()) return null;
  return JSON.parse(raw) as T;
}

function writeJsonFile(filePath: string, value: any) {
  ensureJobDir();
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function appendLine(filePath: string, value: any) {
  ensureJobDir();
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

function deleteJobFiles(jobId: string) {
  const files = getJobFiles(jobId);
  for (const filePath of [files.statePath, files.payloadPath, files.errorsPath]) {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // Ignore cleanup failures.
    }
  }
}

function cleanupJobs() {
  ensureJobDir();
  const entries = fs.readdirSync(JOB_DIR, { withFileTypes: true });
  const states = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".state.json"));

  for (const entry of states) {
    const jobId = entry.name.replace(/\.state\.json$/, "");
    const files = getJobFiles(jobId);
    const state = readJsonFile<ImportJobState>(files.statePath);
    if (!state) {
      deleteJobFiles(jobId);
      stateCache.delete(jobId);
      continue;
    }

    const age = Date.now() - new Date(state.updatedAt).getTime();
    const ttl = (state.status === "completed" || state.status === "failed") ? JOB_HISTORY_TTL_MS : JOB_TTL_MS;
    if (age > ttl) {
      deleteJobFiles(jobId);
      stateCache.delete(jobId);
    }
  }
}

function persistState(state: ImportJobState) {
  ensureJobDir();
  stateCache.set(state.id, state);
  writeJsonFile(getJobFiles(state.id).statePath, state);
  return state;
}

function loadStateFromDisk(jobId: string) {
  const files = getJobFiles(jobId);
  const state = readJsonFile<ImportJobState>(files.statePath);
  if (state) {
    stateCache.set(jobId, state);
  }
  return state;
}

export function createImportJob(tipo: string, total: number, payload?: ImportJobPayload) {
  cleanupJobs();

  const id = randomUUID();
  const timestamp = nowIso();
  const state: ImportJobState = {
    id,
    tipo,
    status: "queued",
    phase: "Preparando",
    current: 0,
    total: Math.max(0, total),
    currentLabel: "",
    message: "",
    counts: {
      created: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
      failed: 0,
    },
    createdAt: timestamp,
    startedAt: timestamp,
    updatedAt: timestamp,
    finishedAt: null,
    error: null,
    result: null,
  };

  persistState(state);

  if (payload) {
    writeJsonFile(getJobFiles(id).payloadPath, payload);
    fs.writeFileSync(getJobFiles(id).errorsPath, "", "utf8");
  }

  return state;
}

export function getImportJob(jobId: string) {
  cleanupJobs();
  return stateCache.get(jobId) ?? loadStateFromDisk(jobId) ?? null;
}

export function getImportJobPayload(jobId: string): ImportJobPayload | null {
  const files = getJobFiles(jobId);
  return readJsonFile<ImportJobPayload>(files.payloadPath);
}

export function appendImportJobError(jobId: string, errorItem: ImportJobErrorItem) {
  cleanupJobs();
  appendLine(getJobFiles(jobId).errorsPath, errorItem);
}

export function readImportJobErrors(jobId: string) {
  const files = getJobFiles(jobId);
  if (!fs.existsSync(files.errorsPath)) return [] as ImportJobErrorItem[];

  const lines = fs
    .readFileSync(files.errorsPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const errors: ImportJobErrorItem[] = [];
  for (const line of lines) {
    try {
      errors.push(JSON.parse(line) as ImportJobErrorItem);
    } catch {
      // Skip malformed error lines.
    }
  }

  return errors;
}

export function updateImportJob(jobId: string, patch: Partial<ImportJobState>) {
  cleanupJobs();
  const current = getImportJob(jobId);
  if (!current) return null;

  const next: ImportJobState = {
    ...current,
    ...patch,
    counts: {
      ...current.counts,
      ...(patch.counts ?? {}),
    },
    updatedAt: nowIso(),
  };

  if (patch.status === "running" && current.status !== "running") {
    next.startedAt = current.startedAt || nowIso();
  }

  return persistState(next);
}

export function markImportJobPaused(jobId: string, message = "Importación pausada por el usuario") {
  return updateImportJob(jobId, {
    status: "paused",
    phase: "Pausado",
    message,
  });
}

export function completeImportJob(jobId: string, resultWithoutErrors: Omit<ImportJobResult, "errors">) {
  const errors = readImportJobErrors(jobId);
  const result: ImportJobResult = {
    ...resultWithoutErrors,
    errors,
  };

  return updateImportJob(jobId, {
    status: "completed",
    phase: "Completado",
    finishedAt: nowIso(),
    result,
    error: null,
  });
}

export function failImportJob(jobId: string, error: string) {
  return updateImportJob(jobId, {
    status: "failed",
    phase: "Error",
    finishedAt: nowIso(),
    error,
  });
}

export function listImportJobs(): ImportJobState[] {
  ensureJobDir();
  const entries = fs.readdirSync(JOB_DIR, { withFileTypes: true });
  return entries
    .filter(e => e.isFile() && e.name.endsWith(".state.json"))
    .map(e => {
      const jobId = e.name.replace(/\.state\.json$/, "");
      return stateCache.get(jobId) ?? loadStateFromDisk(jobId);
    })
    .filter((s): s is ImportJobState => s !== null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function serializeImportJob(job: ImportJobState) {
  const updatedAtMs = new Date(job.updatedAt).getTime();
  const stalledSeconds = Math.max(0, Math.floor((Date.now() - updatedAtMs) / 1000));
  const payload = getImportJobPayload(job.id);
  return {
    ...job,
    mode: payload?.mode ?? "import",
    errors: job.status === "completed" || job.status === "failed" || job.status === "paused" ? readImportJobErrors(job.id) : [],
    stalledSeconds,
    stalled: job.status === "running" && stalledSeconds >= 20,
    progress: job.total > 0 ? Math.min(100, Math.round((job.current / job.total) * 100)) : 0,
  };
}
