export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface DoctorCheck {
  id: string;
  name: string;
  category: string;
  status: CheckStatus;
  message: string;
  details?: string;
  remedy?: string;
  latencyMs?: number;
}

export interface DoctorCategoryReport {
  name: string;
  title: string;
  checks: DoctorCheck[];
  status: CheckStatus;
}

export interface DoctorReport {
  timestamp: string;
  durationMs: number;
  isHealthy: boolean;
  totalChecks: number;
  passed: number;
  warnings: number;
  failures: number;
  categories: DoctorCategoryReport[];
  system: {
    nodeVersion: string;
    wordpressUrl: string;
    siteUrl: string;
  };
}

export interface DoctorRunnerOptions {
  wordpressUrl?: string;
  siteUrl?: string;
  previewSecret?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}
