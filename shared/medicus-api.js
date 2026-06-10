// Medicus REST client. Read-only; rides the user's logged-in Medicus session
// (credentials: 'include'), the same proven pattern as the Medicus Suite.
// Practice code: 4–8 hex chars forming the API subdomain.

export function isValidPracticeCode(code) {
  return /^[0-9a-f]{4,8}$/i.test(String(code || '').trim());
}

export function apiBase(practiceCode) {
  return `https://${String(practiceCode).trim().toLowerCase()}.api.england.medicus.health`;
}

// Appointment book for one date: per-clinician sessions with slot/appointment
// entries. The source of truth for who is actually consulting.
export async function fetchOverview(practiceCode, dateISO) {
  const url = `${apiBase(practiceCode)}/scheduling/data/appointment-book/embedded-overview` +
    `?date=${encodeURIComponent(dateISO)}&filterByUsualLocation=false`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`Medicus HTTP ${res.status} for ${dateISO}`);
  return res.json();
}

// Fetch several dates concurrently; one failed day must not sink the rest.
export async function fetchOverviewRange(practiceCode, dates) {
  const results = await Promise.allSettled(dates.map((d) => fetchOverview(practiceCode, d)));
  const byDate = {};
  const errors = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') byDate[dates[i]] = r.value;
    else errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
  });
  return { byDate, errors };
}
