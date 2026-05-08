import * as http from 'http';
import * as https from 'https';
import { randomUUID } from 'crypto';
import { URL } from 'url';

export interface Monitor {
  id: string;
  name: string;
  url: string;
  method: string;
  expectedStatus: number;
  timeout: number;
  createdAt: number;
}

export interface CheckResult {
  id: string;
  monitorId: string;
  ok: boolean;
  status?: number;
  latencyMs?: number;
  error?: string;
  checkedAt: number;
}

declare global {
  var __monitors: Map<string, Monitor> | undefined;
  var __checkResults: CheckResult[] | undefined;
}

export const monitorStore: Map<string, Monitor> =
  global.__monitors ?? (global.__monitors = new Map());

export const checkResults: CheckResult[] =
  global.__checkResults ?? (global.__checkResults = []);

export function runCheck(monitor: Monitor): Promise<CheckResult> {
  return new Promise(resolve => {
    const start = Date.now();
    let url: URL;
    try { url = new URL(monitor.url); }
    catch {
      const r: CheckResult = { id: randomUUID(), monitorId: monitor.id, ok: false, error: 'URL inválida', checkedAt: Date.now() };
      checkResults.unshift(r);
      if (checkResults.length > 500) checkResults.pop();
      return resolve(r);
    }

    const mod = url.protocol === 'https:' ? https : http;
    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: (url.pathname || '/') + url.search,
      method: monitor.method,
      timeout: monitor.timeout,
      rejectUnauthorized: false,
    } as http.RequestOptions;

    const req = mod.request(options, res => {
      res.resume();
      res.on('end', () => {
        const r: CheckResult = {
          id: randomUUID(), monitorId: monitor.id,
          ok: res.statusCode === monitor.expectedStatus,
          status: res.statusCode, latencyMs: Date.now() - start, checkedAt: Date.now(),
        };
        checkResults.unshift(r);
        if (checkResults.length > 500) checkResults.pop();
        resolve(r);
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const r: CheckResult = { id: randomUUID(), monitorId: monitor.id, ok: false, error: `Timeout (${monitor.timeout}ms)`, latencyMs: Date.now() - start, checkedAt: Date.now() };
      checkResults.unshift(r);
      if (checkResults.length > 500) checkResults.pop();
      resolve(r);
    });

    req.on('error', err => {
      const r: CheckResult = { id: randomUUID(), monitorId: monitor.id, ok: false, error: err.message, latencyMs: Date.now() - start, checkedAt: Date.now() };
      checkResults.unshift(r);
      if (checkResults.length > 500) checkResults.pop();
      resolve(r);
    });

    req.end();
  });
}

export function latestResult(monitorId: string): CheckResult | undefined {
  return checkResults.find(r => r.monitorId === monitorId);
}
