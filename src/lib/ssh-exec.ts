import { spawn } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';

export interface ExecArgs {
  host: string;
  port?: string;
  user: string;
  keyContent?: string;
  keyFile?: string;
  jumpHost?: string;
  cmd: string;
  timeoutMs?: number;
}

function writeTempKey(content: string, id: string): string {
  const path = join(tmpdir(), `ssh-exec-${id}.pem`);
  writeFileSync(path, content.trim() + '\n', { mode: 0o600 });
  return path;
}

function buildArgs(args: ExecArgs, keyPath: string | undefined): string[] {
  const a: string[] = [
    '-o', 'BatchMode=yes',
    '-o', 'StrictHostKeyChecking=accept-new',
    '-o', `ConnectTimeout=${Math.floor((args.timeoutMs ?? 15000) / 1000)}`,
  ];
  if (keyPath)     a.push('-i', keyPath);
  if (args.jumpHost) a.push('-J', args.jumpHost);
  if (args.port && args.port !== '22') a.push('-p', args.port);
  a.push(`${args.user}@${args.host}`, args.cmd);
  return a;
}

export function sshExec(args: ExecArgs): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise(resolve => {
    const id = randomUUID();
    let tempKeyPath: string | undefined;
    if (args.keyContent?.trim()) tempKeyPath = writeTempKey(args.keyContent, id);
    const keyPath = tempKeyPath ?? args.keyFile;

    const proc = spawn('ssh', buildArgs(args, keyPath), { stdio: 'pipe' });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    const cleanup = () => {
      if (tempKeyPath) { try { unlinkSync(tempKeyPath); } catch { /* ignore */ } tempKeyPath = undefined; }
    };

    const timer = setTimeout(() => {
      proc.kill();
      cleanup();
      resolve({ stdout, stderr: stderr + '\n[Timeout]', code: -1 });
    }, args.timeoutMs ?? 15000);

    proc.on('close', code => { clearTimeout(timer); cleanup(); resolve({ stdout, stderr, code: code ?? 0 }); });
    proc.on('error', err  => { clearTimeout(timer); cleanup(); resolve({ stdout: '', stderr: err.message, code: -1 }); });
  });
}

/** Stream output chunk by chunk. Returns a cancel function. */
export function sshExecStream(
  args: ExecArgs,
  onData: (chunk: string) => void,
  onClose: (code: number) => void,
): () => void {
  const id = randomUUID();
  let tempKeyPath: string | undefined;
  if (args.keyContent?.trim()) tempKeyPath = writeTempKey(args.keyContent, id);
  const keyPath = tempKeyPath ?? args.keyFile;

  const proc = spawn('ssh', buildArgs({ ...args, timeoutMs: args.timeoutMs ?? 120_000 }, keyPath), { stdio: 'pipe' });

  const cleanup = () => {
    if (tempKeyPath) { try { unlinkSync(tempKeyPath); } catch { /* ignore */ } tempKeyPath = undefined; }
  };

  proc.stdout.on('data', (d: Buffer) => onData(d.toString()));
  proc.stderr.on('data', (d: Buffer) => onData(d.toString()));
  proc.on('close', code => { cleanup(); onClose(code ?? 0); });
  proc.on('error', err  => { cleanup(); onData(`[Erro: ${err.message}]\n`); onClose(-1); });

  return () => { try { proc.kill(); } catch { /* ignore */ } cleanup(); };
}
