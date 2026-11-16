// Saves the PWA's beneficiary records to the Next Steps backend (/api/pwa/records).
// Same origin by default (nginx serves the app at /app/ and proxies /api); VITE_API_BASE overrides it.
const RECORDS_URL = ((import.meta as any).env?.VITE_API_BASE || '').replace(/\/+$/, '') + '/api/pwa/records';

/** All saved records, or null when the backend cannot be reached. */
export async function loadRecords(): Promise<any[] | null> {
  try {
    const res = await fetch(RECORDS_URL);
    if (!res.ok) return null;
    const body = await res.json();
    return Array.isArray(body.records) ? body.records : null;
  } catch {
    return null;
  }
}

/** Insert or replace the given records. Resolves false when the save did not reach the backend. */
export async function saveRecords(records: any[]): Promise<boolean> {
  try {
    const res = await fetch(RECORDS_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
