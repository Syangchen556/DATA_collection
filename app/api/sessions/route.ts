import { NextRequest, NextResponse } from 'next/server';
import { saveSession } from '@/lib/local-store';
import { createToken, hashToken, safeToken, SessionConfig, SessionRecord } from '@/lib/session';

export async function POST(request: NextRequest) {
 try {
  const input = await request.json() as Record<string, unknown>;
  const participant = safeToken(typeof input.participant === 'string' ? input.participant : '', 'P001');
  const sessionLabel = safeToken(typeof input.sessionLabel === 'string' ? input.sessionLabel : '', 'S001');
  const sign = safeToken(typeof input.sign === 'string' ? input.sign : '', 'sign');
  const take = safeToken(typeof input.take === 'string' ? input.take : '', 'T001');
  const sessionId = crypto.randomUUID();
  const controllerToken = createToken();
  const phoneToken = createToken();
  const config: SessionConfig = { sessionId, participant, sessionLabel, sign, take, takeId: crypto.randomUUID(), createdAt: Date.now() };
  const record: SessionRecord = { config, controllerTokenHash: await hashToken(controllerToken), phoneTokenHash: await hashToken(phoneToken) };
  await saveSession(sessionId, record, { id: crypto.randomUUID(), type: 'idle', issuedAt: Date.now(), takeId: config.takeId });
  return NextResponse.json({ sessionId, controllerToken, phoneToken, config });
 } catch (error) {
  return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not create the session.' }, { status: 503 });
 }
}
