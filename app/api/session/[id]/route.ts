import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/lib/api';
import { getCamera, getCommand, saveCamera, saveCommand, saveSessionRecord } from '@/lib/local-store';
import { CameraStatus, CaptureCommand, isCameraView, safeToken, SessionSnapshot, VIEWS } from '@/lib/session';

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
    if (status.takeId && status.takeId !== auth.record.config.takeId) return NextResponse.json({ error: 'This phone is switching to the newly prepared recording.' }, { status: 409 });
    const existing = await getCamera(id, status.view);
    if (existing && existing.deviceId !== status.deviceId && Date.now() - existing.updatedAt < 15_000) return NextResponse.json({ error: `${status.view} is already assigned to another phone.` }, { status: 409 });
    const next: CameraStatus = { ...status, view: status.view, deviceId: status.deviceId, state: status.state as CameraStatus['state'], ready: Boolean(status.ready), updatedAt: Date.now() };
    await saveCamera(id, next);
    if (next.state === 'complete') {
      const statuses = await Promise.all(VIEWS.map((view) => getCamera(id, view)));
      if (statuses.every((camera) => camera?.state === 'complete' && camera.takeId === auth.record.config.takeId)) {
        await saveCommand(id, { id: crypto.randomUUID(), type: 'stop', issuedAt: Date.now(), takeId: auth.record.config.takeId });
      }
    }
    return NextResponse.json({ ok: true, serverTime: Date.now() });
  }
  if (action === 'prepare') {
    const currentCommand = await getCommand(id);
    if (currentCommand?.type === 'start') return NextResponse.json({ error: 'Stop the current recording before preparing the next one.' }, { status: 409 });
    const sign = safeToken(typeof body.sign === 'string' ? body.sign : '', 'sign');
    const take = safeToken(typeof body.take === 'string' ? body.take : '', 'T001');
    const category = safeToken(typeof body.category === 'string' ? body.category : '', 'uncategorized');
    const takeId = crypto.randomUUID();
    const config = { ...auth.record.config, category, sign, take, takeId };
    const command: CaptureCommand = { id: crypto.randomUUID(), type: 'idle', issuedAt: Date.now(), takeId };
    await Promise.all([saveSessionRecord(id, { ...auth.record, config }), saveCommand(id, command)]);
    await Promise.all(VIEWS.map(async (view) => {
      const status = await getCamera(id, view);
      if (status) await saveCamera(id, { view, deviceId: status.deviceId, takeId, state: 'connected', ready: false, updatedAt: Date.now() });
    }));
    return NextResponse.json({ config, command });
  }
  if (action === 'start') {
    const statuses = await Promise.all(VIEWS.map((view) => getCamera(id, view)));
    const allReady = statuses.every((status) => status?.ready && Date.now() - status.updatedAt < 15_000);
    if (!allReady) return NextResponse.json({ error: 'All three current camera views must be ready.' }, { status: 409 });
    const requestedDuration = typeof body.durationSeconds === 'number' ? body.durationSeconds : Number(body.durationSeconds);
    if (!Number.isFinite(requestedDuration) || requestedDuration < 1 || requestedDuration > 300) return NextResponse.json({ error: 'Recording duration must be between 1 and 300 seconds.' }, { status: 400 });
    const durationSeconds = Math.round(requestedDuration * 10) / 10;
    const now = Date.now();
    const startAt = now + 5000;
    const command: CaptureCommand = { id: crypto.randomUUID(), type: 'start', issuedAt: now, startAt, stopAt: startAt + durationSeconds * 1000, takeId: auth.record.config.takeId };
    await saveCommand(id, command);
    return NextResponse.json(command);
  }
  if (action === 'stop') {
    const now = Date.now();
    const command: CaptureCommand = { id: crypto.randomUUID(), type: 'stop', issuedAt: now, stopAt: now + 1500, takeId: auth.record.config.takeId };
    await saveCommand(id, command);
    return NextResponse.json(command);
  }
  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
}
