import fs from 'fs';
import path from 'path';

export interface AuditEntry {
  ts: string;
  action: string;
  target?: string;
  userId?: string;
  success: boolean;
  details?: Record<string, unknown>;
}

const FILE = path.join(process.cwd(), '.audit.log');

export function append(entry: Omit<AuditEntry, 'ts'>): void {
  try {
    const full: AuditEntry = { ts: new Date().toISOString(), ...entry };
    fs.appendFileSync(FILE, JSON.stringify(full) + '\n', 'utf8');
  } catch {
    // never throw from audit
  }
}

export function list(limit = 200): AuditEntry[] {
  try {
    if (!fs.existsSync(FILE)) return [];
    const raw = fs.readFileSync(FILE, 'utf8');
    const lines = raw.split('\n').filter(Boolean);
    const tail = lines.slice(-limit);
    const out: AuditEntry[] = [];
    for (const line of tail) {
      try { out.push(JSON.parse(line) as AuditEntry); } catch { /* skip malformed */ }
    }
    return out.reverse();
  } catch {
    return [];
  }
}
