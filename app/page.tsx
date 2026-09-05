'use client';

import Link from 'next/link';
import { ArrowRight, Camera, CheckCircle2, Radio, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Home() {
  const [participant, setParticipant] = useState('P001');
  const [sign, setSign] = useState('hello');
  const [session, setSession] = useState('S001');
  const [take, setTake] = useState('T001');
  const [origin, setOrigin] = useState('');

  useEffect(() => setOrigin(window.location.origin), []);
  const clean = (value: string, fallback: string) => value.trim().replace(/[^a-zA-Z0-9_-]+/g, '_') || fallback;
  const sessionId = `${clean(participant, 'P001')}-${clean(session, 'S001')}`;
  const href = `/controller?session=${encodeURIComponent(sessionId)}&participant=${encodeURIComponent(clean(participant, 'P001'))}&sign=${encodeURIComponent(clean(sign, 'sign'))}&take=${encodeURIComponent(clean(take, 'T001'))}`;

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-12">
      <header className="mx-auto flex max-w-6xl items-center justify-between border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300 text-slate-950"><Camera size={21} /></div>
          <div><p className="font-semibold tracking-tight">TriCapture</p><p className="text-xs text-slate-400">BSL dataset recorder</p></div>
        </div>
        <span className="status-chip"><span className="status-dot" /> Local-first</span>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 pb-12 pt-12 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        <div>
          <p className="eyebrow">Three angles · one take</p>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-.045em] sm:text-6xl">Capture sign language from every side.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">Create a session, scan one QR code on three phones, and record synchronized front, left, and right videos with MediaPipe landmarks.</p>
          <div className="mt-9 grid max-w-xl grid-cols-3 gap-3">
            {['Front', 'Left', 'Right'].map((view, index) => <div className="view-tile" key={view}><Smartphone size={20}/><strong>{view}</strong><span>Phone {index + 1}</span></div>)}
          </div>
        </div>

        <form className="panel p-6 sm:p-8" onSubmit={(event) => event.preventDefault()}>
          <div className="mb-6 flex items-start justify-between"><div><p className="eyebrow">New collection</p><h2 className="mt-2 text-2xl font-semibold">Session details</h2></div><Radio className="text-cyan-300" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>Participant ID<input value={participant} onChange={(e) => setParticipant(e.target.value)} /></label>
            <label>Session ID<input value={session} onChange={(e) => setSession(e.target.value)} /></label>
            <label>Sign / gloss<input value={sign} onChange={(e) => setSign(e.target.value)} /></label>
            <label>Take<input value={take} onChange={(e) => setTake(e.target.value)} /></label>
          </div>
          <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">Files: <code>{participant}_{session}_{sign}_{take}_[view].webm</code></div>
          <Link className="primary-button mt-6" href={href}>Open control room <ArrowRight size={18}/></Link>
          {origin && <p className="mt-4 flex items-center gap-2 text-xs text-slate-500"><CheckCircle2 size={14}/> A single phone link will be generated next.</p>}
        </form>
      </section>
    </main>
  );
}
