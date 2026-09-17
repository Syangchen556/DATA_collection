import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/lib/api';

const namesRoot = path.join(process.cwd(), 'collection_names');

async function directoriesAt(directory: string) {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session') || '';
  const auth = await authorize(request, sessionId, 'controller');
  if ('error' in auth) return auth.error;

  try {
    const categoryNames = await directoriesAt(namesRoot);
    const categories = Object.fromEntries(await Promise.all(categoryNames.map(async (category) => {
      const names = await directoriesAt(path.join(namesRoot, category));
      names.sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }));
      return [category, names];
    })));
    return NextResponse.json({ categories }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not read collection names.' }, { status: 500 });
  }
}
