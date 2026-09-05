'use client';

import { Camera, CheckCircle2, LoaderCircle, RefreshCw, Smartphone, UploadCloud } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import { CameraStatus, CameraView, CaptureCommand, SessionConfig, VIEWS } from '@/lib/session';

type FrameLandmarks = { timestamp: number; elapsedMs: number; hands: unknown; pose: unknown; face: unknown };
const viewLabel: Record<CameraView, string> = { front: 'Front', left: 'Left', right: 'Right' };

function supportedMimeType() {
  return ['video/mp4;codecs=h264', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

export default function CameraPage() {
  const params = useSearchParams();
  const sessionId = params.get('session') || '';
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const landmarksRef = useRef<FrameLandmarks[]>([]);
  const modelsRef = useRef<{ hands: HandLandmarker; pose: PoseLandmarker; face: FaceLandmarker } | null>(null);
  const frameRequestRef = useRef(0);
  const recordingStartRef = useRef(0);
  const commandRef = useRef('');
  const configRef = useRef<SessionConfig | null>(null);
  const deviceIdRef = useRef('');
  const [view, setView] = useState<CameraView | ''>('');
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [state, setState] = useState<'setup' | 'loading' | 'ready' | 'countdown' | 'recording' | 'uploading' | 'complete' | 'error'>('setup');
  const [message, setMessage] = useState('Choose this phone’s camera position.');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [landmarkCount, setLandmarkCount] = useState(0);

  useEffect(() => {
    deviceIdRef.current = sessionStorage.getItem('tricapture-device') || crypto.randomUUID();
    sessionStorage.setItem('tricapture-device', deviceIdRef.current);
    return () => { streamRef.current?.getTracks().forEach((track) => track.stop()); cancelAnimationFrame(frameRequestRef.current); };
  }, []);

  const sendStatus = useCallback(async (nextState: CameraStatus['state'], ready: boolean, extra: Partial<CameraStatus> = {}) => {
    if (!view) return;
    const response = await fetch(`/api/session/${encodeURIComponent(sessionId)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status', status: { view, deviceId: deviceIdRef.current, state: nextState, ready, updatedAt: Date.now(), ...extra } }) });
    if (response.status === 409) throw new Error(`${viewLabel[view]} is already being used by another phone.`);
  }, [sessionId, view]);

  const processFrames = useCallback(() => {
    const video = videoRef.current;
    const models = modelsRef.current;
    if (!video || !models || state !== 'recording') return;
    const now = performance.now();
    try {
      const hands = models.hands.detectForVideo(video, now);
      const pose = models.pose.detectForVideo(video, now);
      const face = models.face.detectForVideo(video, now);
      landmarksRef.current.push({ timestamp: Date.now(), elapsedMs: performance.now() - recordingStartRef.current, hands: hands.landmarks, pose: pose.landmarks, face: face.faceLandmarks });
      if (landmarksRef.current.length % 10 === 0) setLandmarkCount(landmarksRef.current.length);
    } catch { /* A dropped inference frame does not invalidate the recording. */ }
    frameRequestRef.current = requestAnimationFrame(processFrames);
  }, [state]);

  useEffect(() => {
    if (state === 'recording') frameRequestRef.current = requestAnimationFrame(processFrames);
    return () => cancelAnimationFrame(frameRequestRef.current);
  }, [processFrames, state]);

  const prepare = async () => {
    if (!view || !sessionId) return;
    setState('loading'); setMessage('Opening camera and loading MediaPipe…');
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      if (!modelsRef.current) {
        const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm');
        const common = { runningMode: 'VIDEO' as const, numFaces: 1 };
        const [hands, pose, face] = await Promise.all([
          HandLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 2 }),
          PoseLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task', delegate: 'GPU' }, runningMode: 'VIDEO', numPoses: 1 }),
          FaceLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task', delegate: 'GPU' }, ...common }),
        ]);
        modelsRef.current = { hands, pose, face };
      }
      await sendStatus('ready', true);
      setState('ready'); setMessage(`${viewLabel[view]} camera ready. Keep this page open.`);
    } catch (error) { setState('error'); setMessage(error instanceof Error ? error.message : 'Camera or MediaPipe setup failed.'); }
  };

  const startRecording = useCallback((command: CaptureCommand) => {
    if (!streamRef.current || recorderRef.current?.state === 'recording') return;
    const delay = Math.max(0, (command.startAt ?? Date.now()) - Date.now());
    setState('countdown');
    const countdownTimer = window.setInterval(() => setCountdown(Math.max(1, Math.ceil(((command.startAt ?? Date.now()) - Date.now()) / 1000))), 150);
    window.setTimeout(() => {
      clearInterval(countdownTimer); setCountdown(null); chunksRef.current = []; landmarksRef.current = []; setLandmarkCount(0);
      const mimeType = supportedMimeType();
      const recorder = new MediaRecorder(streamRef.current!, mimeType ? { mimeType, videoBitsPerSecond: 5_000_000 } : undefined);
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorderRef.current = recorder; recordingStartRef.current = performance.now(); recorder.start(1000);
      setState('recording'); setMessage('Recording from this view…'); void sendStatus('recording', true);
    }, delay);
  }, [sendStatus]);

  const stopAndUpload = useCallback(async () => {
    const recorder = recorderRef.current;
    const config = configRef.current;
    if (!recorder || recorder.state === 'inactive' || !config || !view) return;
    setState('uploading'); setMessage('Finalizing and uploading both files…'); await sendStatus('uploading', false);
    await new Promise<void>((resolve) => { recorder.onstop = () => resolve(); recorder.stop(); });
    cancelAnimationFrame(frameRequestRef.current);
    const type = recorder.mimeType || 'video/webm';
    const videoBlob = new Blob(chunksRef.current, { type });
    const metadata = { schemaVersion: 1, session: config, view, deviceId: deviceIdRef.current, actualStartTime: Date.now() - Math.round(performance.now() - recordingStartRef.current), durationMs: Math.round(performance.now() - recordingStartRef.current), frameCount: landmarksRef.current.length, frames: landmarksRef.current };
    const form = new FormData();
    form.set('sessionId', config.sessionId); form.set('participant', config.participant); form.set('sign', config.sign); form.set('take', config.take); form.set('view', view);
    form.set('video', videoBlob, `capture.${type.includes('mp4') ? 'mp4' : 'webm'}`); form.set('landmarks', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'landmarks.json');
    try {
      const response = await fetch('/api/upload', { method: 'POST', body: form });
      if (!response.ok) throw new Error((await response.json()).error || 'Upload failed');
      const result = await response.json(); setState('complete'); setMessage(`Saved ${result.filename}`); await sendStatus('complete', false, { filename: result.filename });
    } catch (error) { setState('error'); setMessage(error instanceof Error ? error.message : 'Upload failed.'); await sendStatus('error', false, { error: String(error) }); }
  }, [sendStatus, view]);

  useEffect(() => {
    if (!sessionId || !view || !['ready', 'countdown', 'recording', 'complete'].includes(state)) return;
    const poll = async () => {
      try {
        const response = await fetch(`/api/session/${encodeURIComponent(sessionId)}`, { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json(); configRef.current = data.config;
        const command = data.command as CaptureCommand;
        if (command.id !== commandRef.current) {
          commandRef.current = command.id;
          if (command.type === 'start' && state === 'ready') startRecording(command);
          if (command.type === 'stop' && state === 'recording') void stopAndUpload();
        }
        if (state === 'ready') await sendStatus('ready', true);
      } catch { /* reconnect on the next polling interval */ }
    };
    void poll(); const timer = window.setInterval(poll, 600); return () => clearInterval(timer);
  }, [sessionId, sendStatus, startRecording, state, stopAndUpload, view]);

  const busy = ['loading', 'countdown', 'recording', 'uploading'].includes(state);
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-5">
      <header className="flex items-center justify-between border-b border-white/10 pb-4"><div className="flex items-center gap-3"><Camera className="text-cyan-300"/><div><p className="font-semibold">TriCapture phone</p><p className="text-xs text-slate-500">Session {sessionId}</p></div></div><span className="status-chip"><span className={state === 'recording' ? 'h-2 w-2 animate-pulse rounded-full bg-rose-400' : 'status-dot'}/>{state}</span></header>
      <section className="flex flex-1 flex-col pt-5">
        <div className="camera-card relative aspect-[3/4] sm:aspect-video" data-facing={facing}>
          <video ref={videoRef} playsInline muted className={streamRef.current ? '' : 'opacity-30'} />
          {!streamRef.current && <div className="absolute inset-0 grid place-items-center text-center text-slate-500"><div><Smartphone className="mx-auto mb-3" size={42}/><p>Camera preview appears here</p></div></div>}
          {countdown && <div className="absolute inset-0 grid place-items-center bg-slate-950/60 text-8xl font-bold text-cyan-300">{countdown}</div>}
          {state === 'recording' && <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-rose-500 px-3 py-1 text-xs font-bold text-white"><span className="h-2 w-2 animate-pulse rounded-full bg-white"/> REC</div>}
        </div>
        <div className="panel mt-4 p-5">
          <p className="text-sm leading-6 text-slate-300">{message}</p>
          {state === 'recording' && <p className="mt-2 text-xs text-slate-500">MediaPipe frames processed: {landmarkCount}</p>}
          {state === 'setup' && <div className="mt-5 grid grid-cols-3 gap-2">{VIEWS.map((item) => <button key={item} onClick={() => setView(item)} className={`secondary-button ${view === item ? '!border-cyan-300 !bg-cyan-300/10 !text-cyan-200' : ''}`}>{viewLabel[item]}</button>)}</div>}
          {state === 'setup' && <label className="mt-4">Physical camera<select value={facing} onChange={(e) => setFacing(e.target.value as typeof facing)}><option value="user">Front / selfie camera</option><option value="environment">Back camera</option></select></label>}
          <div className="mt-5">
            {state === 'setup' && <button className="primary-button w-full" disabled={!view || !sessionId} onClick={prepare}><Camera size={18}/> Open camera & become ready</button>}
            {state === 'loading' && <div className="flex items-center justify-center gap-2 py-3 text-sm text-cyan-200"><LoaderCircle className="animate-spin"/> Loading models…</div>}
            {state === 'ready' && <div className="flex items-center justify-center gap-2 py-3 text-sm text-emerald-300"><CheckCircle2/> Ready — waiting for controller</div>}
            {state === 'uploading' && <div className="flex items-center justify-center gap-2 py-3 text-sm text-cyan-200"><UploadCloud className="animate-pulse"/> Uploading…</div>}
            {(state === 'complete' || state === 'error') && <button className="secondary-button w-full" onClick={() => { setState('setup'); setMessage('Choose this phone’s camera position.'); }}><RefreshCw size={17}/> Prepare another take</button>}
          </div>
          {busy && <p className="mt-4 text-center text-xs text-slate-500">Do not lock the phone or leave this page.</p>}
        </div>
      </section>
    </main>
  );
}
