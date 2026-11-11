import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_KEY } from './config';

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function rest(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(body?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.code = body?.code;
    throw err;
  }
  return body;
}

// Identifiant anonyme du téléphone (pas de compte à créer)
let cachedDeviceId = null;
export async function getDeviceId() {
  if (cachedDeviceId) return cachedDeviceId;
  let id = await AsyncStorage.getItem('device_id');
  if (!id) {
    id = 'd-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
    await AsyncStorage.setItem('device_id', id);
  }
  cachedDeviceId = id;
  return id;
}

export const fetchCountries = () => rest('countries?select=*&order=sort_order');
export const fetchBeaches = () => rest('beach_status?select=*&order=country_code,zone_name,name');

export async function fetchReports(beachId) {
  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const reports = await rest(
    `reports?select=id,created_at,beach_id,sargassum_level,flag,smell,note,photo_path,beautiful,water,sea&beach_id=eq.${beachId}&created_at=gte.${since}&order=created_at.desc&limit=20`
  );
  if (!reports.length) return [];
  const ids = reports.map((r) => r.id).join(',');
  const votes = await rest(`report_vote_counts?select=*&report_id=in.(${ids})`);
  const byId = Object.fromEntries(votes.map((v) => [v.report_id, v]));
  return reports.map((r) => ({ ...r, votes: byId[r.id] || { still_true: 0, outdated: 0 } }));
}

async function uploadPhoto(uri, deviceId) {
  const ext = (uri.split('.').pop() || 'jpg').toLowerCase().replace('jpeg', 'jpg');
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const path = `${deviceId}/${Date.now()}.${ext === 'png' || ext === 'webp' ? ext : 'jpg'}`;
  const form = new FormData();
  form.append('file', { uri, name: path.split('/').pop(), type: mime });
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/report-photos/${path}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error('photo_upload_failed');
  return path;
}

export function photoUrl(path) {
  return `${SUPABASE_URL}/storage/v1/object/public/report-photos/${path}`;
}

export async function sendReport(report, photoUri) {
  const device_id = await getDeviceId();
  let photo_path = null;
  if (photoUri) {
    try {
      photo_path = await uploadPhoto(photoUri, device_id);
    } catch {
      photo_path = null; // le signalement part quand même sans la photo
    }
  }
  try {
    await rest('reports', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ ...report, device_id, photo_path }),
    });
  } catch (e) {
    if (String(e.message).includes('rate_limited_beach')) throw new Error('rateBeach');
    if (String(e.message).includes('rate_limited_day')) throw new Error('rateDay');
    throw e;
  }
}

export async function vote(reportId, stillTrue) {
  const device_id = await getDeviceId();
  try {
    await rest('report_votes', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ report_id: reportId, device_id, still_true: stillTrue }),
    });
    return true;
  } catch (e) {
    if (e.status === 409) return false; // déjà voté
    throw e;
  }
}

export async function toggleFavorite(beachId) {
  const p_device_id = await getDeviceId();
  return rest('rpc/toggle_favorite', { method: 'POST', body: JSON.stringify({ p_device_id, p_beach_id: beachId }) });
}

export async function myFavorites() {
  const p_device_id = await getDeviceId();
  const ids = await rest('rpc/my_favorites', { method: 'POST', body: JSON.stringify({ p_device_id }) });
  return (ids || []).map((x) => (typeof x === 'object' ? Object.values(x)[0] : x));
}

export function distanceKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
