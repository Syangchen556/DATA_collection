import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/local-store';
import { hashToken, SessionRecord } from '@/lib/session';

export function requestToken(request: NextRequest) { const authorization = request.headers.get('authorization'); return authorization?.startsWith('Bearer ') ? authorization.slice(7) : request.nextUrl.searchParams.get('token') || ''; }
export async function authorize(request: NextRequest, sessionId: string, role: 'controller' | 'phone') {
  const record = await getSession(sessionId);
  if (!record) return { error: NextResponse.json({ error: 'Session not found or expired.' }, { status: 404 }) };
  const token = requestToken(request);
  const expected = role === 'controller' ? record.controllerTokenHash : record.phoneTokenHash;
  if (!token || (await hashToken(token)) !== expected) return { error: NextResponse.json({ error: 'Invalid session token.' }, { status: 401 }) };
  return { record, token };
}
