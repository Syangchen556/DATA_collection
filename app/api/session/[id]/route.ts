import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/lib/api';
import { getCamera, getCommand, saveCamera, saveCommand } from '@/lib/local-store';
import { CameraStatus, CaptureCommand, isCameraView, SessionSnapshot, VIEWS } from '@/lib/session';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await authorize(request, id, request.nextUrl.searchParams.get('role') === 'controller' ? 'controller' : 'phone');
  if ('error' in auth) return auth.error;
  const [command, ...statuses] = await Promise.all([getCommand(id), ...VIEWS.map((view) => getCamera(id, view))]);
  const cameras: SessionSnapshot['cameras'] = {};
  VIEWS.forEach((view, index) => { const status = statuses[index]; if (status) cameras[view] = status; });
  const fallback: CaptureCommand = { id: crypto.randomUUID(), type: 'idle', issuedAt: Date.now(), takeId: auth.record.config.takeId };
  return NextResponse.json({ config: auth.record.config, command: command ?? fallback, cameras, serverTime: Date.now() } satisfies SessionSnapshot, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json() as Record<string, unknown>;
  const action = typeof body.action === 'string' ? body.action : '';
  const role = action === 'status' ? 'phone' : 'controller';
  const auth = await authorize(request, id, role);
  if ('error' in auth) return auth.error;

  if (action === 'status') {
    const status = body.status as Partial<CameraStatus> | undefined;
    if (!status || !isCameraView(status.view) || typeof status.deviceId !== 'string' || typeof status.state !== 'string') return NextResponse.json({ error: 'Invalid camera status.' }, { status: 400 });
    const existing = await getCamera(id, status.view);
    if (existing && existing.deviceId !== status.deviceId && Date.now() - existing.updatedAt < 15_000) return NextResponse.json({ error: `${status.view} is already assigned to another phone.` }, { status: 409 });
    const next: CameraStatus = { ...status, view: status.view, deviceId: status.deviceId, state: status.state as CameraStatus['state'], ready: Boolean(status.ready), updatedAt: Date.now() };
    await saveCamera(id, next);
    return NextResponse.json({ ok: true, serverTime: Date.now() });
  }
  if (action === 'start') {
    const statuses = await Promise.all(VIEWS.map((view) => getCamera(id, view)));
    const allReady = statuses.every((status) => status?.ready && Date.now() - status.updatedAt < 15_000);
    if (!allReady) return NextResponse.json({ error: 'All three current camera views must be ready.' }, { status: 409 });
    const now = Date.now();
    const command: CaptureCommand = { id: crypto.randomUUID(), type: 'start', issuedAt: now, startAt: now + 5000, takeId: auth.record.config.takeId };
    await saveCommand(id, command);
    return NextResponse.json(command);
  }
  if (action === 'stop') {
    const command: CaptureCommand = { id: crypto.randomUUID(), type: 'stop', issuedAt: Date.now(), takeId: auth.record.config.takeId };
    await saveCommand(id, command);
    return NextResponse.json(command);
  }
  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
}
