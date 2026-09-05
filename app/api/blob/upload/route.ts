import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { getRedis, sessionKey } from '@/lib/redis';
import { captureStem, hashToken, isCameraView, SessionRecord } from '@/lib/session';

export async function POST(request: NextRequest) {
  const body = await request.json() as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = JSON.parse(clientPayload || '{}') as Record<string, unknown>;
        const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId : '';
        const phoneToken = typeof payload.phoneToken === 'string' ? payload.phoneToken : '';
        const view = payload.view;
        const record = await getRedis().get<SessionRecord>(sessionKey(sessionId));
        if (!record || !phoneToken || await hashToken(phoneToken) !== record.phoneTokenHash || !isCameraView(view)) throw new Error('Invalid phone upload token.');
        const expectedBase = `captures/${record.config.participant}/${record.config.sessionLabel}/${record.config.sign}/${record.config.take}/${captureStem(record.config, view)}`;
        if (![`${expectedBase}.webm`, `${expectedBase}.mp4`, `${expectedBase}_landmarks.json`].includes(pathname)) throw new Error('Invalid capture pathname.');
        return { allowedContentTypes: ['video/webm', 'video/mp4', 'application/json'], addRandomSuffix: false, allowOverwrite: true, maximumSizeInBytes: 2_000_000_000, tokenPayload: JSON.stringify({ sessionId, view }) };
      },
      onUploadCompleted: async () => undefined,
    });
    return NextResponse.json(result);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload authorization failed.' }, { status: 400 }); }
}
