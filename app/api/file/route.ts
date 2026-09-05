import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key') || '';
  if (!key.startsWith('captures/') || key.includes('..')) return NextResponse.json({ error: 'Invalid file key.' }, { status: 400 });
  const object = await env.FILES.get(key);
  if (!object) return NextResponse.json({ error: 'File not found.' }, { status: 404 });
  const filename = key.split('/').at(-1) || 'capture';
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
  headers.set('ETag', object.httpEtag);
  return new NextResponse(object.body, { headers });
}
