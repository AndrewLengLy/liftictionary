// ExerciseDB V1 (open source, hosted). No API key needed.
// Docs: https://docs.ascendapi.com/products/edb-v1/overview
export const API_BASE = 'https://oss.exercisedb.dev/api/v1';
export const PAGE_SIZE = 24;

export const FALLBACK_BODY_PARTS = [
  'back',
  'cardio',
  'chest',
  'lower arms',
  'lower legs',
  'neck',
  'shoulders',
  'upper arms',
  'upper legs',
  'waist',
];

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const cache = new Map();

async function get(path, params = {}, signal) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  const url = `${API_BASE}${path}${qs ? `?${qs}` : ''}`;
  if (cache.has(url)) return cache.get(url);

  let res;
  try {
    res = await fetch(url, { signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError("Couldn't reach ExerciseDB. Check your connection and try again.", 0);
  }

  if (res.status === 429) {
    throw new ApiError('ExerciseDB is rate limiting requests. Wait a few seconds and try again.', 429);
  }
  if (res.status === 404) throw new ApiError('That exercise could not be found.', 404);
  if (!res.ok) throw new ApiError(`ExerciseDB returned an error (${res.status}).`, res.status);

  const json = await res.json();
  if (json && json.success === false) throw new ApiError('ExerciseDB returned an error.', res.status);
  cache.set(url, json);
  return json;
}

const STEP_PREFIX = /^step\s*:?\s*\d+\s*[:.)-]?\s*/i;

export function normalizeExercise(raw) {
  if (!raw) return null;
  const gifs = raw.gifUrls || {};
  return {
    id: raw.exerciseId || raw.id,
    name: raw.name || 'Untitled exercise',
    gifUrl: raw.gifUrl || gifs['360p'] || gifs['480p'] || raw.imageUrl || '',
    bodyParts: raw.bodyParts || (raw.bodyPart ? [raw.bodyPart] : []),
    equipments: raw.equipments || (raw.equipment ? [raw.equipment] : []),
    targetMuscles: raw.targetMuscles || (raw.target ? [raw.target] : []),
    secondaryMuscles: raw.secondaryMuscles || [],
    instructions: (raw.instructions || []).map((s) => String(s).replace(STEP_PREFIX, '').trim()).filter(Boolean),
  };
}

function normalizeList(json, offset) {
  const items = (Array.isArray(json) ? json : json?.data || []).map(normalizeExercise).filter((e) => e && e.id);
  const meta = json?.metadata || json?.meta || {};
  const total = meta.totalExercises ?? meta.total ?? null;
  const hasMore = Boolean(meta.nextPage || meta.hasNextPage || (total != null && offset + items.length < total));
  return { items, total, hasMore };
}

export async function listExercises({ query = '', bodyPart = '', offset = 0, signal } = {}) {
  const q = query.trim();
  const page = { offset, limit: PAGE_SIZE };
  let json;
  if (q && bodyPart) {
    json = await get('/exercises/filter', { ...page, search: q, bodyParts: bodyPart, sortBy: 'name', sortOrder: 'asc' }, signal);
  } else if (q) {
    json = await get('/exercises/search', { ...page, q, threshold: 0.3 }, signal);
  } else if (bodyPart) {
    json = await get(`/bodyparts/${encodeURIComponent(bodyPart)}/exercises`, page, signal);
  } else {
    json = await get('/exercises', { ...page, sortBy: 'name', sortOrder: 'asc' }, signal);
  }
  return normalizeList(json, offset);
}

export async function getExercise(id, signal) {
  const json = await get(`/exercises/${encodeURIComponent(id)}`, {}, signal);
  return normalizeExercise(json?.data ?? json);
}

export async function getRelated(exercise, signal) {
  const muscle = exercise.targetMuscles[0];
  if (!muscle) return [];
  const json = await get('/exercises/filter', { muscles: muscle, offset: 0, limit: 9, sortBy: 'name', sortOrder: 'asc' }, signal);
  return normalizeList(json, 0).items.filter((e) => e.id !== exercise.id).slice(0, 8);
}

export async function getBodyParts(signal) {
  try {
    const json = await get('/bodyparts', {}, signal);
    const names = (json?.data || []).map((b) => b.name).filter(Boolean);
    return names.length ? names.sort() : FALLBACK_BODY_PARTS;
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    return FALLBACK_BODY_PARTS;
  }
}

export function clearCache() {
  cache.clear();
}
