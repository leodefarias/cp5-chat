import { getFirebaseAuth } from './firebase';

export function getApiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
}

async function authorizedHeaders(json: boolean): Promise<Record<string, string>> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error('SESSION_EXPIRED');
  }

  const token = await user.getIdToken();
  return json
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { Authorization: `Bearer ${token}` };
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error('API_UNAVAILABLE');
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: await authorizedHeaders(true),
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('API_UNAVAILABLE');
  }

  if (!response.ok) {
    throw new Error('API_UNAVAILABLE');
  }

  return (await response.json()) as T;
}

export async function postForm(path: string, form: FormData): Promise<{ url: string }> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error('API_UNAVAILABLE');
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: await authorizedHeaders(false),
      body: form,
    });
  } catch {
    throw new Error('API_UNAVAILABLE');
  }

  if (!response.ok) {
    throw new Error('API_UNAVAILABLE');
  }

  const payload: unknown = await response.json();
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('url' in payload) ||
    typeof payload.url !== 'string'
  ) {
    throw new Error('API_UNAVAILABLE');
  }

  return { url: payload.url };
}
