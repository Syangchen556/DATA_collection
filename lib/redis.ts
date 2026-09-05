import { Redis } from '@upstash/redis';

export const getRedis = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Session storage is not configured. Connect Upstash Redis to this Vercel project, enable its environment variables, and redeploy.');
  return new Redis({ url, token });
};
export const SESSION_TTL_SECONDS = 60 * 60 * 24;
export const sessionKey = (id: string) => `bsl:session:${id}`;
export const commandKey = (id: string) => `bsl:session:${id}:command`;
export const cameraKey = (id: string, view: string) => `bsl:session:${id}:camera:${view}`;
