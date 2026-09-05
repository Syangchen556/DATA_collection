'use client';

import { ArrowLeft, Check, CircleStop, Clock3, Copy, Play, QrCode, RotateCcw, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CameraView, captureStem, SessionConfig, SessionSnapshot, VIEWS } from '@/lib/session';

const labels: Record<CameraView, string> = { front: 'Front view', left: 'Left view', right: 'Right view' };

export default function ControllerPage() {
  const params = useSearchParams();
  const sessionId = params.get('session') || 'P001-S001';
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [origin, setOrigin] = useState('');
  const [notice, setNotice] = useState('Preparing session…');
  const config = useMemo<SessionConfig>(() => ({ sessionId, participant: params.get('participant') || 'P001', sign: params.get('sign') || 'hello', take: params.get('take') || 'T001', createdAt: Date.now() }), [params, sessionId]);
  const phoneUrl = `${origin}/camera?session=${encodeURIComponent(sessionId)}`;
  const fetchSnapshot = useCallback(async () => {
    const response = await fetch(`/api/session/${encodeURIComponent(sessionId)}`, { cache: 'no-store' });
    if (response.ok) setSnapshot(await response.json());
  }, [sessionId]);

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch(`/api/session/${encodeURIComponent(sessionId)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', config }) }).then(() => { setNotice('Scan this code with all three phones.'); fetchSnapshot(); }).catch(() => setNotice('Could not initialize this session.'));
    const timer = window.setInterval(fetchSnapshot, 1000);
    return () => clearInterval(timer);
  }, [config, fetchSnapshot, sessionId]);

  const cameras = snapshot?.cameras ?? {};
  const allReady = VIEWS.every((view) => cameras[view]?.ready && Date.now() - (cameras[view]?.updatedAt ?? 0) < 12_000);
  const recording = snapshot?.command.type === 'start';
  const issue = async (action: 'start' | 'stop' | 'reset') => {
    if (action === 'start') setNotice('Starting all cameras in 3 seconds…');
    const response = await fetch(`/api/session/${encodeURIComponent(sessionId)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, startAt: Date.now() + 3000 }) });
    if (!response.ok) setNotice('The command failed. Please try again.');
    await fetchSnapshot();
  };

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'read_capture_session',
      title: 'Read capture session',
      description: 'Read the current front, left, and right camera readiness and recording state for the visible TriCapture session.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      async execute() {
        const response = await fetch(`/api/session/${encodeURIComponent(sessionId)}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Could not read the session.');
        return response.json();
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    void Promise.resolve(context.registerTool({
      name: 'start_ready_capture',
      title: 'Start ready capture',
      description: 'Start synchronized recording after a three-second countdown, only when all three visible camera positions are ready.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute() {
        const response = await fetch(`/api/session/${encodeURIComponent(sessionId)}`, { cache: 'no-store' });
        const current = await response.json() as SessionSnapshot;
        const ready = VIEWS.every((cameraView) => current.cameras[cameraView]?.ready && Date.now() - (current.cameras[cameraView]?.updatedAt ?? 0) < 12_000);
        if (!ready) throw new Error('All three camera positions must be ready.');
        await issue('start');
        return { sessionId, state: 'countdown', startsInMs: 3000 };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [sessionId]);

  return (
    <main className="min-h-screen px-4 py-5 sm:px-8">
      <header className="mx-auto flex max-w-7xl items-center justify-between border-b border-white/10 pb-5">
        <Link href="/" className="flex items-center gap-2 text-sm text-slate-300 hover:text-white"><ArrowLeft size={17}/> New session</Link>
        <div className="text-right"><p className="font-semibold">{config.participant} · {config.sign}</p><p className="text-xs text-slate-400">{sessionId} / {config.take}</p></div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 pt-7 lg:grid-cols-[340px_1fr]">
        <aside className="panel p-5">
          <div className="flex items-center gap-2"><QrCode size={19} className="text-cyan-300"/><p className="eyebrow">Connect phones</p></div>
          <h1 className="mt-3 text-2xl font-semibold">One code. Three cameras.</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Scan on each phone, choose a unique view, allow camera access, then tap Ready.</p>
          <div className="mx-auto my-6 grid aspect-square w-full max-w-[250px] place-items-center rounded-2xl bg-white p-4">
            {phoneUrl && <QRCodeSVG value={phoneUrl} size={218} level="M" includeMargin={false}/>} 
          </div>
          <button className="secondary-button w-full" onClick={() => { navigator.clipboard.writeText(phoneUrl); setNotice('Phone link copied.'); }}><Copy size={16}/> Copy phone link</button>
          <p className="mt-4 break-all rounded-xl bg-black/20 p-3 text-xs leading-5 text-slate-500">{phoneUrl}</p>
        </aside>

        <div className="space-y-6">
          <div className="panel p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Live readiness</p><h2 className="mt-2 text-2xl font-semibold">Camera positions</h2></div><span className="status-chip"><span className={allReady ? 'status-dot' : 'h-2 w-2 rounded-full bg-amber-300'}/>{VIEWS.filter((v) => cameras[v]?.ready).length}/3 ready</span></div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {VIEWS.map((view) => {
                const camera = cameras[view];
                const online = camera && Date.now() - camera.updatedAt < 12_000;
                const base = `captures/${config.participant}/${sessionId}/${config.sign}/${config.take}`;
                const stem = captureStem(config, view);
                const videoKey = `${base}/${camera?.filename || `${stem}.webm`}`;
                return <article key={view} className="camera-card p-4"><div className="flex items-center justify-between"><Smartphone className={online ? 'text-cyan-300' : 'text-slate-600'} size={22}/>{camera?.ready && online ? <Check size={18} className="text-emerald-300"/> : <Clock3 size={17} className="text-slate-600"/>}</div><h3 className="mt-8 font-semibold">{labels[view]}</h3><p className="mt-1 text-xs capitalize text-slate-500">{online ? camera.state : 'Waiting for phone'}</p>{camera?.filename && <div className="mt-3 flex gap-3 text-[11px]"><a className="text-cyan-300 hover:underline" href={`/api/file?key=${encodeURIComponent(videoKey)}`}>Video</a><a className="text-cyan-300 hover:underline" href={`/api/file?key=${encodeURIComponent(`${base}/${stem}_landmarks.json`)}`}>Landmarks</a></div>}</article>;
              })}
            </div>
          </div>

          <div className="panel flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div><p className="eyebrow">Capture controls</p><p className="mt-2 text-sm text-slate-300">{notice}</p></div>
            <div className="flex flex-wrap gap-3">
              <button className="secondary-button" onClick={() => issue('reset')} disabled={recording}><RotateCcw size={17}/> Reset</button>
              {!recording ? <button className="primary-button" onClick={() => issue('start')} disabled={!allReady}><Play size={17} fill="currentColor"/> Start all</button> : <button className="danger-button" onClick={() => issue('stop')}><CircleStop size={18}/> Stop & upload</button>}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[.025] p-4 text-xs leading-6 text-slate-500">Tip: for frame-level alignment, clap once after the countdown begins. Each landmark record also contains the phone timestamp and elapsed capture time.</div>
        </div>
      </section>
    </main>
  );
}
