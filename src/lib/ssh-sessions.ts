import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { randomUUID } from 'crypto';
import { homedir, tmpdir } from 'os';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

export type SessionStatus = 'connecting' | 'connected' | 'disconnected';

export interface SSHSession {
  id: string;
  process: ChildProcessWithoutNullStreams;
  status: SessionStatus;
  outputListeners: Map<string, (data: Buffer) => void>;
  closeListeners: Map<string, () => void>;
  outputBuffer: Buffer[];
  createdAt: number;
}

// Survive Next.js HMR by storing sessions in a global
declare global {
  // eslint-disable-next-line no-var
  var __sshSessions: Map<string, SSHSession> | undefined;
}
const sessions: Map<string, SSHSession> =
  global.__sshSessions ?? (global.__sshSessions = new Map());

// Cleanup stale sessions (> 2 h)
const timer = setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.createdAt > 2 * 60 * 60 * 1000) {
      try { s.process.kill(); } catch { /* ignore */ }
      sessions.delete(id);
    }
  }
}, 5 * 60 * 1000);
if (typeof (timer as unknown as NodeJS.Timeout).unref === 'function') {
  (timer as unknown as NodeJS.Timeout).unref();
}

export interface ConnectArgs {
  host: string;
  port: string;
  user: string;
  keyFile?: string;     // caminho para arquivo existente no servidor
  keyContent?: string;  // conteúdo PEM enviado pelo browser
  jumpHost?: string;
}

function resolveHome(p: string): string {
  if (!p) return p;
  return p.startsWith('~/') || p === '~' ? p.replace('~', homedir()) : p;
}

export function createSession(args: ConnectArgs): SSHSession {
  const id = randomUUID();

  // Write PEM content to a temp file if provided
  let tempKeyPath: string | undefined;
  if (args.keyContent && args.keyContent.trim()) {
    tempKeyPath = join(tmpdir(), `ssh-key-${id}.pem`);
    writeFileSync(tempKeyPath, args.keyContent.trim() + '\n', { mode: 0o600 });
  }

  const keyPath = tempKeyPath ?? (args.keyFile ? resolveHome(args.keyFile) : undefined);

  const sshArgs: string[] = ['-tt'];
  if (keyPath) sshArgs.push('-i', keyPath);
  if (args.jumpHost) sshArgs.push('-J', args.jumpHost);
  if (args.port && args.port !== '22') sshArgs.push('-p', args.port);
  sshArgs.push(
    '-o', 'StrictHostKeyChecking=accept-new',
    '-o', 'ConnectTimeout=15',
    '-o', 'ServerAliveInterval=30',
    `${args.user}@${args.host}`,
  );

  const proc = spawn('ssh', sshArgs, {
    stdio: 'pipe',
    env: { ...process.env, TERM: 'xterm-256color' },
  }) as ChildProcessWithoutNullStreams;

  const session: SSHSession = {
    id,
    process: proc,
    status: 'connecting',
    outputListeners: new Map(),
    closeListeners: new Map(),
    outputBuffer: [],
    createdAt: Date.now(),
  };

  const onData = (raw: Buffer) => {
    session.outputBuffer.push(raw);
    if (session.outputBuffer.length > 500) session.outputBuffer.shift();
    if (session.status === 'connecting') session.status = 'connected';
    for (const fn of session.outputListeners.values()) fn(raw);
  };

  proc.stdout.on('data', onData);
  proc.stderr.on('data', onData);

  const cleanupTempKey = () => {
    if (tempKeyPath) { try { unlinkSync(tempKeyPath); } catch { /* ignore */ } tempKeyPath = undefined; }
  };

  proc.on('close', (code) => {
    cleanupTempKey();
    session.status = 'disconnected';
    const msg = Buffer.from(`\r\n[Sessão encerrada — código ${code ?? '?'}]\r\n`);
    session.outputBuffer.push(msg);
    for (const fn of session.outputListeners.values()) fn(msg);
    for (const fn of session.closeListeners.values()) fn();
  });

  proc.on('error', (err: Error) => {
    cleanupTempKey();
    session.status = 'disconnected';
    const msg = Buffer.from(`\r\n[Erro: ${err.message}]\r\n`);
    for (const fn of session.outputListeners.values()) fn(msg);
    for (const fn of session.closeListeners.values()) fn();
  });

  sessions.set(id, session);
  return session;
}

export function getSession(id: string): SSHSession | undefined {
  return sessions.get(id);
}

export function sendInput(id: string, data: string): boolean {
  const session = sessions.get(id);
  if (!session || session.status === 'disconnected') return false;
  try {
    session.process.stdin.write(data);
    return true;
  } catch { return false; }
}

export function closeSession(id: string): void {
  const session = sessions.get(id);
  if (!session) return;
  try { session.process.kill('SIGTERM'); } catch { /* ignore */ }
  sessions.delete(id);
}
