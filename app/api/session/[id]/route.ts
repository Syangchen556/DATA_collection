import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { CameraStatus, CaptureCommand, SessionConfig, SessionSnapshot, VIEWS, safeToken } from '@/lib/session';

const jsonKey = (id: string, name: string) => `sessions/${safeToken(id, 'session')}/${name}.json`;

async function readJson<T>(key: string): Promise<T | null> {
  const object = await env.FILES.get(key);
  return object ? (await object.json<T>()) : null;
}

async function writeJson(key: string, value: unknown) {
  await env.FILES.put(key, JSON.stringify(value), { httpMetadata: { contentType: 'application/json' } });
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const [config, command, ...statuses] = await Promise.all([
    readJson<SessionConfig>(jsonKey(id, 'config')),
    readJson<CaptureCommand>(jsonKey(id, 'command')),
    ...VIEWS.map((view) => readJson<CameraStatus>(jsonKey(id, `camera-${view}`))),
  ]);
  const cameras: SessionSnapshot['cameras'] = {};
  VIEWS.forEach((view, index) => { if (statuses[index]) cameras[view] = statuses[index]!; });
  return NextResponse.json({ config, command: command ?? { id: 'initial', type: 'idle', issuedAt: 0 }, cameras } satisfies SessionSnapshot, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json() as { action: string; config?: SessionConfig; status?: CameraStatus; startAt?: number };

  if (body.action === 'create' && body.config) {
    await writeJson(jsonKey(id, 'config'), { ...body.config, sessionId: safeToken(id, 'session') });
    const existing = await readJson<CaptureCommand>(jsonKey(id, 'command'));
    if (!existing) await writeJson(jsonKey(id, 'command'), { id: crypto.randomUUID(), type: 'idle', issuedAt: Date.now() });
    return NextResponse.json({ ok: true });
  }
  if (body.action === 'status' && body.status && VIEWS.includes(body.status.view)) {
    const key = jsonKey(id, `camera-${body.status.view}`);
    const existing = await readJson<CameraStatus>(key);
    if (existing && existing.deviceId !== body.status.deviceId && Date.now() - existing.updatedAt < 12_000) {
      return NextResponse.json({ error: `${body.status.view} is already assigned to another phone.` }, { status: 409 });
    }
    await writeJson(key, { ...body.status, updatedAt: Date.now() });
    return NextResponse.json({ ok: true });
  }
  if (body.action === 'start') {
    const config = await readJson<SessionConfig>(jsonKey(id, 'config'));
    const command: CaptureCommand = { id: crypto.randomUUID(), type: 'start', issuedAt: Date.now(), startAt: Math.max(body.startAt ?? 0, Date.now() + 2500), config: config ?? undefined };
    await writeJson(jsonKey(id, 'command'), command);
    return NextResponse.json(command);
  }
  if (body.action === 'stop') {
    const command: CaptureCommand = { id: crypto.randomUUID(), type: 'stop', issuedAt: Date.now() };
    await writeJson(jsonKey(id, 'command'), command);
    return NextResponse.json(command);
  }
  if (body.action === 'reset') {
    await writeJson(jsonKey(id, 'command'), { id: crypto.randomUUID(), type: 'idle', issuedAt: Date.now() });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
