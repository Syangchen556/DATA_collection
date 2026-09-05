export const VIEWS = ['front', 'left', 'right'] as const;
export type CameraView = (typeof VIEWS)[number];

export type SessionConfig = { sessionId: string; participant: string; sessionLabel: string; sign: string; take: string; takeId: string; createdAt: number };
export type CameraStatus = { view: CameraView; deviceId: string; ready: boolean; state: 'connected' | 'ready' | 'countdown' | 'recording' | 'uploading' | 'complete' | 'error'; updatedAt: number; videoUrl?: string; landmarksUrl?: string; filename?: string; error?: string };
export type CaptureCommand = { id: string; type: 'idle' | 'start' | 'stop'; issuedAt: number; startAt?: number; takeId: string };
export type SessionSnapshot = { config: SessionConfig; command: CaptureCommand; cameras: Partial<Record<CameraView, CameraStatus>>; serverTime: number };
export type SessionRecord = { config: SessionConfig; controllerTokenHash: string; phoneTokenHash: string };

export function safeToken(value: string, fallback: string) { return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 80) || fallback; }
export function captureStem(config: SessionConfig, view: CameraView) { return [config.participant, config.sessionLabel, config.sign, config.take, view].map((v) => safeToken(v, 'unknown')).join('_'); }
export function isCameraView(value: unknown): value is CameraView { return typeof value === 'string' && VIEWS.includes(value as CameraView); }
export function isSessionSnapshot(value: unknown): value is SessionSnapshot { if (!value || typeof value !== 'object') return false; const item = value as Partial<SessionSnapshot>; return Boolean(item.config && item.command && item.cameras && typeof item.serverTime === 'number'); }
export async function hashToken(token: string) { const bytes = new TextEncoder().encode(token); return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (byte) => byte.toString(16).padStart(2, '0')).join(''); }
export function createToken() { const bytes = crypto.getRandomValues(new Uint8Array(24)); return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(''); }
