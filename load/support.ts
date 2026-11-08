type Environment = Record<string, string | undefined>;

export function readConfig(env: Environment) {
  const mode = env.MODE ?? 'smoke';
  if (!['smoke', 'load', 'stress'].includes(mode)) throw new Error('MODE: smoke, load or stress');
  const baseUrl = (env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  // Keep this validation portable to k6 (no Node.js APIs or URL dependency).
  if (!/^https?:\/\/(?:[a-zA-Z0-9.-]+|\[[a-fA-F0-9:]+\])(?::\d{1,5})?$/.test(baseUrl))
    throw new Error('BASE_URL must be an HTTP(S) origin without credentials, path or query');
  const positive = (name: string, fallback: number) => {
    const value = Number(env[name] ?? fallback);
    if (!Number.isSafeInteger(value) || value < 1)
      throw new Error(`${name} must be a positive integer`);
    return value;
  };
  const preAllocatedVUs = positive('PRE_ALLOCATED_VUS', 20);
  const maxVUs = positive('MAX_VUS', 100);
  if (maxVUs < preAllocatedVUs) throw new Error('MAX_VUS must be >= PRE_ALLOCATED_VUS');
  return {
    mode,
    baseUrl,
    rate: positive('RATE', 20),
    preAllocatedVUs,
    maxVUs,
    p95: positive('P95_MS', 500),
    p99: positive('P99_MS', 1000),
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Validate the public response, including successful HTTP responses with GraphQL errors.
export function validProfileResponse(body: string): boolean {
  try {
    const result: unknown = JSON.parse(body);
    if (
      !record(result) ||
      ('errors' in result && (!Array.isArray(result.errors) || result.errors.length > 0))
    )
      return false;
    if (!record(result.data) || !record(result.data.profile)) return false;
    const profile = result.data.profile;
    if (!['id', 'name', 'description'].every((key) => typeof profile[key] === 'string'))
      return false;
    if (profile.specialization !== null && typeof profile.specialization !== 'string') return false;
    const fields = {
      links: ['id', 'label', 'url'],
      skills: ['id', 'name'],
      experience: ['id', 'company', 'position', 'startDate'],
      projects: ['id', 'name', 'description'],
    };
    return Object.entries(fields).every(([key, required]) => {
      const rows = profile[key];
      return (
        Array.isArray(rows) &&
        rows.every(
          (row: unknown) =>
            record(row) &&
            required.every((field) => typeof row[field] === 'string') &&
            (key === 'links' || Number.isInteger(row.sortOrder)),
        )
      );
    });
  } catch {
    return false;
  }
}
