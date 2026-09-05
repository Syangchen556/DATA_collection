import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { captureStem, CameraView, safeToken, VIEWS } from '@/lib/session';

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const video = form.get('video');
  const landmarks = form.get('landmarks');
  const sessionId = safeToken(String(form.get('sessionId') ?? ''), 'session');
  const participant = safeToken(String(form.get('participant') ?? ''), 'participant');
  const sign = safeToken(String(form.get('sign') ?? ''), 'sign');
  const take = safeToken(String(form.get('take') ?? ''), 'T001');
  const view = safeToken(String(form.get('view') ?? ''), 'front') as CameraView;
  if (!(video instanceof File) || !(landmarks instanceof File) || !VIEWS.includes(view)) return NextResponse.json({ error: 'Missing or invalid upload fields.' }, { status: 400 });
  const stem = captureStem({ sessionId, participant, sign, take, createdAt: Date.now() }, view);
  const base = `captures/${participant}/${sessionId}/${sign}/${take}`;
  const ext = video.type.includes('mp4') ? 'mp4' : 'webm';
  await Promise.all([
    env.FILES.put(`${base}/${stem}.${ext}`, video.stream(), { httpMetadata: { contentType: video.type || 'video/webm' } }),
    env.FILES.put(`${base}/${stem}_landmarks.json`, landmarks.stream(), { httpMetadata: { contentType: 'application/json' } }),
  ]);
  return NextResponse.json({ ok: true, filename: `${stem}.${ext}`, landmarkFile: `${stem}_landmarks.json` });
}
