import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { loadPresets, savePresets } from '@/utils/presetUtils';
import { mergePresets, parseImportedPresets } from '@/utils/importExportUtils';
import {
  GithubErrorKind,
  GithubRepoEntry,
  buildRequestHeaders,
  classifyGithubStatus,
  contentsApiUrl,
  loadRepoEntries,
  normalizeRepoPath,
  parseContentsResponse,
  parseRepoInput,
  repoKey,
  saveRepoEntries,
  shouldRefresh,
} from '@/utils/githubUtils';
import { useI18n } from '@/i18n';

export interface RepoOpResult {
  ok: boolean;
  // True when the remote file changed (or was downloaded for the first time)
  changed: boolean;
  error?: GithubErrorKind;
}

export interface GitHubReposState {
  entries: GithubRepoEntry[];
  busy: Record<string, boolean>;
  // Personal Access Token for private repos. Held in memory only (never
  // persisted): a static web app must not store secrets in localStorage.
  token: string | null;
  setToken: (token: string | null) => void;
  addRepo: (input: string, pathInput: string) => Promise<RepoOpResult>;
  refreshRepo: (key: string, options?: { force?: boolean }) => Promise<RepoOpResult>;
  removeRepo: (key: string) => void;
}

interface FetchOutcome {
  result: RepoOpResult;
  entry: GithubRepoEntry;
}

// Owns the list of GitHub repos the user follows and keeps their cached
// presets in sync with the remote file. Mount it once (Index.tsx) and pass
// the returned object down, so background refresh runs app-wide.
export const useGitHubRepos = (): GitHubReposState => {
  const { t } = useI18n();
  const [entries, setEntries] = useState<GithubRepoEntry[]>(loadRepoEntries);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [token, setTokenState] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const entriesRef = useRef(entries);
  const inFlightRef = useRef<Record<string, Promise<RepoOpResult>>>({});

  const setToken = useCallback((next: string | null) => {
    const trimmed = next?.trim() || null;
    tokenRef.current = trimmed;
    setTokenState(trimmed);
  }, []);

  useEffect(() => {
    entriesRef.current = entries;
    saveRepoEntries(entries);
  }, [entries]);

  const applyEntry = useCallback((updated: GithubRepoEntry) => {
    setEntries(prev => {
      const key = repoKey(updated);
      const idx = prev.findIndex(e => repoKey(e) === key);
      if (idx === -1) return [...prev, updated];
      const next = [...prev];
      next[idx] = updated;
      return next;
    });
  }, []);

  const fetchOnce = useCallback(async (entry: GithubRepoEntry): Promise<FetchOutcome> => {
    const headers = buildRequestHeaders(tokenRef.current, entry.etag);

    let response: Response;
    try {
      response = await fetch(contentsApiUrl(entry.owner, entry.repo, entry.path), { headers });
    } catch {
      // Offline or DNS failure: keep fetchedAt untouched so the next
      // app open / tab focus retries sooner than the throttle window.
      return { result: { ok: false, changed: false, error: 'network' }, entry };
    }

    if (response.status === 304) {
      // Not modified: free check, only the timestamp moves.
      return {
        result: { ok: true, changed: false },
        entry: { ...entry, fetchedAt: Date.now() },
      };
    }

    if (!response.ok) {
      return {
        result: { ok: false, changed: false, error: classifyGithubStatus(response.status) },
        entry: { ...entry, fetchedAt: Date.now() },
      };
    }

    try {
      const { sha, raw } = parseContentsResponse(await response.json());
      const presets = parseImportedPresets(raw);
      if (presets.length === 0) throw new Error('No valid presets found in the file.');
      const changed = entry.sha !== sha;
      const updated: GithubRepoEntry = {
        ...entry,
        etag: response.headers.get('ETag') ?? entry.etag,
        sha,
        fetchedAt: Date.now(),
        presets,
      };
      if (changed) {
        const { merged } = mergePresets(presets, loadPresets());
        savePresets(merged);
      }
      return { result: { ok: true, changed }, entry: updated };
    } catch {
      return {
        result: { ok: false, changed: false, error: 'invalidFormat' },
        entry: { ...entry, fetchedAt: Date.now() },
      };
    }
  }, []);

  // Single-flight per repo key: mount + visibilitychange firing together
  // must not double-hit the API.
  const runFetch = useCallback(
    (entry: GithubRepoEntry): Promise<RepoOpResult> => {
      const key = repoKey(entry);
      const existing = inFlightRef.current[key];
      if (existing) return existing;
      setBusy(prev => ({ ...prev, [key]: true }));
      const promise = fetchOnce(entry)
        .then(({ result, entry: updated }) => {
          applyEntry(updated);
          return result;
        })
        .finally(() => {
          delete inFlightRef.current[key];
          setBusy(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        });
      inFlightRef.current[key] = promise;
      return promise;
    },
    [fetchOnce, applyEntry]
  );

  const addRepo = useCallback(
    async (input: string, pathInput: string): Promise<RepoOpResult> => {
      const parsed = parseRepoInput(input);
      const path = normalizeRepoPath(pathInput);
      if (!parsed || !path) return { ok: false, changed: false, error: 'invalidInput' };
      const entry: GithubRepoEntry =
        entriesRef.current.find(e => repoKey(e) === repoKey({ ...parsed, path })) ?? {
          ...parsed,
          path,
          etag: null,
          sha: null,
          fetchedAt: null,
          presets: [],
        };
      if (!entriesRef.current.includes(entry)) applyEntry(entry);
      // Explicit user action: always fetch, bypassing the throttle.
      return runFetch(entry);
    },
    [applyEntry, runFetch]
  );

  const refreshRepo = useCallback(
    async (key: string, options?: { force?: boolean }): Promise<RepoOpResult> => {
      const entry = entriesRef.current.find(e => repoKey(e) === key);
      if (!entry) return { ok: false, changed: false, error: 'error' };
      if (!options?.force && !shouldRefresh(entry, Date.now())) {
        return { ok: true, changed: false };
      }
      return runFetch(entry);
    },
    [runFetch]
  );

  const removeRepo = useCallback((key: string) => {
    setEntries(prev => prev.filter(e => repoKey(e) !== key));
  }, []);

  // Auto-refresh: on app open and when the tab becomes visible again,
  // check repos whose last check is older than the throttle window.
  useEffect(() => {
    const autoRefresh = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      entriesRef.current
        .filter(e => shouldRefresh(e, now))
        .forEach(e => {
          void runFetch(e).then(result => {
            if (result.ok && result.changed) {
              toast.info(t('github.updatedToast', { repo: `${e.owner}/${e.repo}` }));
            }
          });
        });
    };
    autoRefresh();
    document.addEventListener('visibilitychange', autoRefresh);
    return () => document.removeEventListener('visibilitychange', autoRefresh);
  }, [runFetch, t]);

  return { entries, busy, token, setToken, addRepo, refreshRepo, removeRepo };
};
