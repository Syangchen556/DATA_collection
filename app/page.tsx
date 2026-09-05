'use client';

import { ArrowRight, Camera, Radio, Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SyntheticEvent, useState } from 'react';
import { errorMessage, readJsonSafely } from '@/lib/http';

export default function Home() {
  const router = useRouter();
  const [form, setForm] = useState({ participant: 'P001', sessionLabel: 'S001', sign: 'hello', take: 'T001' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const value = await readJsonSafely(response);
      if (!response.ok) throw new Error(errorMessage(value, `Could not create the collection session (HTTP ${response.status}).`));
      if (!value || typeof value !== 'object') throw new Error('The server returned an invalid session response.');
      const data = value as { sessionId?: string; controllerToken?: string; phoneToken?: string };
      if (!data.sessionId || !data.controllerToken || !data.phoneToken) throw new Error('The server returned an invalid session.');
      router.push(`/controller?session=${encodeURIComponent(data.sessionId)}&controllerToken=${encodeURIComponent(data.controllerToken)}&phoneToken=${encodeURIComponent(data.phoneToken)}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create the session.'); setBusy(false); }
  };
  return <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-12">
    <header className="mx-auto flex max-w-6xl items-center justify-between border-b border-white/10 pb-5"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300 text-slate-950"><Camera size={21}/></div><div><p className="font-semibold">Multi-View BSL Collector</p><p className="text-xs text-slate-400">MediaPipe dataset recorder</p></div></div><span className="status-chip"><span className="status-dot"/> Secure session</span></header>
    <section className="mx-auto grid max-w-6xl gap-10 pb-12 pt-12 lg:grid-cols-[1.1fr_.9fr] lg:items-center"><div><p className="eyebrow">Three angles · one take</p><h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-.045em] sm:text-6xl">Capture sign language from every side.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">Scan one QR code on three phones and record synchronized front, left, and right video with hand, pose, and face landmarks.</p><div className="mt-9 grid max-w-xl grid-cols-3 gap-3">{['Front','Left','Right'].map((label,index)=><div className="view-tile" key={label}><Smartphone size={20}/><strong>{label}</strong><span>Phone {index+1}</span></div>)}</div></div>
      <form className="panel p-6 sm:p-8" onSubmit={submit}><div className="mb-6 flex items-start justify-between"><div><p className="eyebrow">New collection</p><h2 className="mt-2 text-2xl font-semibold">Session details</h2></div><Radio className="text-cyan-300"/></div><div className="grid gap-4 sm:grid-cols-2"><label>Participant ID<input value={form.participant} onChange={(e)=>update('participant',e.target.value)} required/></label><label>Session ID<input value={form.sessionLabel} onChange={(e)=>update('sessionLabel',e.target.value)} required/></label><label>Sign / gloss<input value={form.sign} onChange={(e)=>update('sign',e.target.value)} required/></label><label>Take<input value={form.take} onChange={(e)=>update('take',e.target.value)} required/></label></div><div className="mt-5 rounded-xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">Files: <code>{form.participant}_{form.sessionLabel}_{form.sign}_{form.take}_[view]</code></div>{error&&<p className="mt-4 text-sm text-rose-300">{error}</p>}<button className="primary-button mt-6 w-full" disabled={busy}>{busy?'Creating secure session…':<>Open control room <ArrowRight size={18}/></>}</button></form>
    </section>
  </main>;
}
