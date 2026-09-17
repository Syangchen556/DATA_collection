import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CameraStatus, CaptureCommand, CameraView, SessionRecord } from '@/lib/session';

const dataRoot = path.join(process.cwd(), 'data');
const sessionsRoot = path.join(dataRoot, 'sessions');
export const capturesRoot = path.join(dataRoot, 'captures');
const writeQueues = new Map<string, Promise<void>>();

function safeId(value: string) { return value.replace(/[^a-zA-Z0-9-]/g, ''); }
function sessionDir(id: string) { return path.join(sessionsRoot, safeId(id)); }
async function readJson<T>(file: string): Promise<T | null> { try { return JSON.parse(await readFile(file, 'utf8')) as T; } catch { return null; } }
async function writeJson(file: string, value: unknown) {
  const previous = writeQueues.get(file) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(async () => {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(value), 'utf8');
  });
  writeQueues.set(file, next);
  try { await next; } finally { if (writeQueues.get(file) === next) writeQueues.delete(file); }
}

export async function saveSession(id: string, record: SessionRecord, command: CaptureCommand) { await Promise.all([writeJson(path.join(sessionDir(id), 'session.json'), record), writeJson(path.join(sessionDir(id), 'command.json'), command)]); }
export async function getSession(id: string) { return readJson<SessionRecord>(path.join(sessionDir(id), 'session.json')); }
export async function saveSessionRecord(id: string, record: SessionRecord) { await writeJson(path.join(sessionDir(id), 'session.json'), record); }
export async function getCommand(id: string) { return readJson<CaptureCommand>(path.join(sessionDir(id), 'command.json')); }
export async function saveCommand(id: string, command: CaptureCommand) { await writeJson(path.join(sessionDir(id), 'command.json'), command); }
export async function getCamera(id: string, view: CameraView) { return readJson<CameraStatus>(path.join(sessionDir(id), `camera-${view}.json`)); }
export async function saveCamera(id: string, status: CameraStatus) { await writeJson(path.join(sessionDir(id), `camera-${status.view}.json`), status); }
export function capturePath(...parts: string[]) { const result = path.resolve(capturesRoot, ...parts); if (!result.startsWith(path.resolve(capturesRoot) + path.sep)) throw new Error('Invalid capture path.'); return result; }
