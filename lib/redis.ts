import { Redis } from '@upstash/redis';

export const getRedis = () => {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) throw new Error('Session storage is not configured. Connect an Upstash Redis database to this Vercel project and redeploy.');
  return Redis.fromEnv();
};
export const SESSION_TTL_SECONDS = 60 * 60 * 24;
export const sessionKey = (id: string) => `bsl:session:${id}`;
export const commandKey = (id: string) => `bsl:session:${id}:command`;
export const cameraKey = (id: string, view: string) => `bsl:session:${id}:camera:${view}`;
