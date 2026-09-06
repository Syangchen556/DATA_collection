import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/lib/api';
import { capturePath } from '@/lib/local-store';
import { captureStem, isCameraView } from '@/lib/session';

export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const rawSessionId = form.get('sessionId'); const rawPhoneToken = form.get('phoneToken');
    const sessionId = typeof rawSessionId === 'string' ? rawSessionId : '';
    const phoneToken = typeof rawPhoneToken === 'string' ? rawPhoneToken : '';
    const view = form.get('view'); const video = form.get('video'); const landmarks = form.get('landmarks');
    const securedRequest = new NextRequest(`${request.nextUrl.origin}/api/upload?token=${encodeURIComponent(phoneToken)}`);
    const auth = await authorize(securedRequest, sessionId, 'phone');
    if ('error' in auth) return auth.error;
    if (!isCameraView(view) || !(video instanceof File) || !(landmarks instanceof File)) return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 });
    const config = auth.record.config; const stem = captureStem(config, view); const extension = video.type.includes('mp4') ? 'mp4' : 'webm';
    const directory = capturePath(config.participant, config.sessionLabel, config.sign, config.take); await mkdir(directory, { recursive: true });
    const videoName = `${stem}.${extension}`; const landmarksName = `${stem}_landmarks.json`;
    await Promise.all([writeFile(path.join(/* turbopackIgnore: true */ directory, videoName), Buffer.from(await video.arrayBuffer())), writeFile(path.join(/* turbopackIgnore: true */ directory, landmarksName), Buffer.from(await landmarks.arrayBuffer()))]);
    const relativeBase = [config.participant, config.sessionLabel, config.sign, config.take].join('/');
    return NextResponse.json({ videoPath: `${relativeBase}/${videoName}`, landmarksPath: `${relativeBase}/${landmarksName}`, filename: videoName });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed.' }, { status: 500 }); }
}
