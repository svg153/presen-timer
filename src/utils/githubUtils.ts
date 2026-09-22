import { Preset, isValidPreset } from './presetUtils';

// Pure helpers for the "load presets from a GitHub repo" feature (P2-13).
// No React, no fetch here - everything is testable in isolation.

export interface GithubRepoEntry {
  owner: string;
  repo: string;
  path: string;
  // ETag from the last successful conditional request (null until first fetch)
  etag: string | null;
  // Blob sha reported by the Contents API; changes when the file changes
  sha: string | null;
  // Epoch ms of the last check against GitHub (not of the last change)
  fetchedAt: number | null;
  presets: Preset[];
}

export type GithubErrorKind =
  | 'invalidInput'
  | 'notFound'
  | 'unauthorized'
  | 'rateLimited'
  | 'invalidFormat'
  | 'network'
  | 'error';

export const REPOS_STORAGE_KEY = 'presentation-timer-github-repos';
export const DEFAULT_REPO_PATH = 'presen-timer.json';
// Background refreshes hit the API at most once per repo per interval.
// Conditional (304) responses don't count against the 60 req/h
// unauthenticated quota, but we stay conservative anyway.
export const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

const OWNER_REPO_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,38}[A-Za-z0-9])?\/[A-Za-z0-9](?:[A-Za-z0-9._-]{0,99}[A-Za-z0-9])?$/;

// Accepts "owner/repo" or a full GitHub URL (https://github.com/owner/repo,
// optional .git suffix, query/hash and trailing slashes are dropped).
// Returns null for anything else. Names are lowercased: GitHub resolves
// owner/repo case-insensitively and this keeps dedup predictable.
export const parseRepoInput = (input: string): { owner: string; repo: string } | null => {
  const cleaned = input
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/^github\.com\//i, '')
    .split(/[?#]/)[0]
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '')
    .toLowerCase();
  if (!OWNER_REPO_RE.test(cleaned)) return null;
  const [owner, repo] = cleaned.split('/');
  return { owner, repo };
};

// Validates and normalizes the file path inside the repo. Rejects path
// traversal and control characters; empty input falls back to the default.
// Returns null when the path is unusable.
export const normalizeRepoPath = (path: string): string | null => {
  const trimmed = path.trim().replace(/^\/+/, '');
  if (!trimmed) return DEFAULT_REPO_PATH;
  if (trimmed.length > 200) return null;
  if (Array.from(trimmed).some(c => {
    const code = c.codePointAt(0) ?? 0;
    return code < 0x20 || code === 0x7f;
  })) return null;
  if (trimmed.split('/').some(seg => seg === '' || seg === '.' || seg === '..')) return null;
  return trimmed;
};

export const contentsApiUrl = (owner: string, repo: string, path: string): string =>
  `https://api.github.com/repos/${owner}/${repo}/contents/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;

export const repoKey = (entry: Pick<GithubRepoEntry, 'owner' | 'repo' | 'path'>): string =>
  `${entry.owner}/${entry.repo}#${entry.path}`;

export const isValidRepoEntry = (value: unknown): value is GithubRepoEntry => {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as GithubRepoEntry;
  if (typeof e.owner !== 'string' || typeof e.repo !== 'string' || typeof e.path !== 'string') return false;
  if (!Array.isArray(e.presets) || !e.presets.every(isValidPreset)) return false;
  if (e.etag !== null && typeof e.etag !== 'string') return false;
  if (e.sha !== null && typeof e.sha !== 'string') return false;
  return e.fetchedAt === null || typeof e.fetchedAt === 'number';
};

export const loadRepoEntries = (): GithubRepoEntry[] => {
  try {
    const data = localStorage.getItem(REPOS_STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed.filter(isValidRepoEntry) : [];
  } catch (error) {
    console.error('Failed to load GitHub repos from localStorage:', error);
    return [];
  }
};

export const saveRepoEntries = (entries: GithubRepoEntry[]): void => {
  try {
    localStorage.setItem(REPOS_STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('Failed to save GitHub repos to localStorage:', error);
  }
};

// True when this entry is due for a background refresh check.
export const shouldRefresh = (
  entry: GithubRepoEntry,
  now: number,
  intervalMs: number = REFRESH_INTERVAL_MS
): boolean => entry.fetchedAt === null || now - entry.fetchedAt >= intervalMs;

// Maps an HTTP status to a user-facing error kind.
export const classifyGithubStatus = (status: number): GithubErrorKind => {
  if (status === 401) return 'unauthorized';
  if (status === 404 || status === 451) return 'notFound';
  if (status === 403 || status === 429) return 'rateLimited';
  return 'error';
};

// Builds the request headers for a Contents API call. A non-empty token is
// sent as a Bearer credential (enables private repos and raises the rate
// limit); the ETag enables conditional 304 responses.
export const buildRequestHeaders = (
  token: string | null,
  etag: string | null
): Record<string, string> => {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const trimmed = token?.trim();
  if (trimmed) headers.Authorization = `Bearer ${trimmed}`;
  if (etag) headers['If-None-Match'] = etag;
  return headers;
};

// Decodes the base64 `content` field of a Contents API response (UTF-8).
export const decodeBase64Utf8 = (base64: string): string => {
  const binary = atob(base64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

interface ContentsResponse {
  encoding?: string;
  content?: string;
  sha?: string;
}

// Extracts { sha, raw } from a Contents API JSON body. Throws when the
// shape is unexpected (e.g. a directory listing instead of a file).
export const parseContentsResponse = (json: unknown): { sha: string; raw: string } => {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    throw new Error('Unexpected response shape (expected a file, not a directory).');
  }
  const body = json as ContentsResponse;
  if (typeof body.sha !== 'string' || body.encoding !== 'base64' || typeof body.content !== 'string') {
    throw new Error('Unexpected response shape (missing base64 file content).');
  }
  return { sha: body.sha, raw: decodeBase64Utf8(body.content) };
};
