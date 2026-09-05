import { describe, expect, it } from 'vitest';
import { captureStem, isCameraView, isSessionSnapshot, safeToken, SessionConfig } from '../lib/session';

const config: SessionConfig = { sessionId: 'uuid', participant: 'P001', sessionLabel: 'S001', sign: 'thank you', take: 'T002', takeId: 'take-1', createdAt: 1 };

describe('dataset naming', () => {
  it('sanitizes path tokens', () => expect(safeToken('../hello world', 'sign')).toBe('_hello_world'));
  it('creates systematic view filenames', () => expect(captureStem(config, 'front')).toBe('P001_S001_thank_you_T002_front'));
  it('accepts only known camera views', () => { expect(isCameraView('left')).toBe(true); expect(isCameraView('rear')).toBe(false); });
});

describe('API validation', () => {
  it('rejects incomplete session responses', () => expect(isSessionSnapshot({ command: {} })).toBe(false));
  it('accepts a complete snapshot', () => expect(isSessionSnapshot({ config, command: { id: '1' }, cameras: {}, serverTime: 10 })).toBe(true));
});
