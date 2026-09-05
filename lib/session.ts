export const VIEWS = ['front', 'left', 'right'] as const;
export type CameraView = (typeof VIEWS)[number];

export type SessionConfig = {
  sessionId: string;
  participant: string;
  sign: string;
  take: string;
  createdAt: number;
};

export type CameraStatus = {
  view: CameraView;
  deviceId: string;
  ready: boolean;
  state: 'connected' | 'ready' | 'recording' | 'uploading' | 'complete' | 'error';
  updatedAt: number;
  filename?: string;
  error?: string;
};

export type CaptureCommand = {
  id: string;
  type: 'idle' | 'start' | 'stop';
  issuedAt: number;
  startAt?: number;
  config?: SessionConfig;
};

export type SessionSnapshot = {
  config: SessionConfig | null;
  command: CaptureCommand;
  cameras: Partial<Record<CameraView, CameraStatus>>;
};

export function safeToken(value: string, fallback: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 80) || fallback;
}

export function captureStem(config: SessionConfig, view: CameraView) {
  return [config.participant, config.sessionId.split('-').at(-1) || config.sessionId, config.sign, config.take, view].map((v) => safeToken(v, 'unknown')).join('_');
}
