import { get } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/lib/api';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session') || '';
  const url = request.nextUrl.searchParams.get('url') || '';
  const auth = await authorize(request, sessionId, 'controller');
  if ('error' in auth) return auth.error;
  if (!url.startsWith('https://') || !url.includes('.blob.vercel-storage.com/')) return NextResponse.json({ error: 'Invalid file URL.' }, { status: 400 });
  const result = await get(url, { access: 'private' });
  if (!result || !result.stream || result.statusCode !== 200) return NextResponse.json({ error: 'File not found.' }, { status: 404 });
  const headers = new Headers();
  result.headers.forEach((value, key) => headers.set(key, value));
  const filename = result.blob.pathname.split('/').at(-1) || 'capture';
  headers.set('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
  return new NextResponse(result.stream, { headers });
}
