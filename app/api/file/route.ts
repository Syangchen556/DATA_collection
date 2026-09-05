import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/lib/api';
import { capturePath } from '@/lib/local-store';

export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session') || ''; const relative = request.nextUrl.searchParams.get('path') || '';
  const auth = await authorize(request, sessionId, 'controller'); if ('error' in auth) return auth.error;
  try { const file = capturePath(...relative.split('/')); const bytes = await readFile(file); const filename = path.basename(file); return new NextResponse(bytes, { headers: { 'Content-Type': filename.endsWith('.json') ? 'application/json' : filename.endsWith('.mp4') ? 'video/mp4' : 'video/webm', 'Content-Disposition': `attachment; filename="${filename}"` } }); }
  catch { return NextResponse.json({ error: 'File not found.' }, { status: 404 }); }
}
