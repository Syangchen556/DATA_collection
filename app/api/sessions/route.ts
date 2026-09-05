import { NextRequest, NextResponse } from 'next/server';
import { getRedis, commandKey, SESSION_TTL_SECONDS, sessionKey } from '@/lib/redis';
import { createToken, hashToken, safeToken, SessionConfig, SessionRecord } from '@/lib/session';

export async function POST(request: NextRequest) {
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
  const redis = getRedis();
  await Promise.all([
    redis.set(sessionKey(sessionId), record, { ex: SESSION_TTL_SECONDS }),
    redis.set(commandKey(sessionId), { id: crypto.randomUUID(), type: 'idle', issuedAt: Date.now(), takeId: config.takeId }, { ex: SESSION_TTL_SECONDS }),
  ]);
  return NextResponse.json({ sessionId, controllerToken, phoneToken, config });
}
