import { FormEvent, useState } from 'react';
import { Github, KeyRound, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { GitHubReposState, RepoOpResult } from '@/hooks/useGitHubRepos';
import { DEFAULT_REPO_PATH, repoKey } from '@/utils/githubUtils';
import { useI18n } from '@/i18n';

interface GitHubImportProps {
  repos: GitHubReposState;
}

const GitHubImport = ({ repos }: GitHubImportProps) => {
  const { t } = useI18n();
  const { entries, busy, token, setToken, addRepo, refreshRepo, removeRepo } = repos;
  const [repoInput, setRepoInput] = useState('');
  const [pathInput, setPathInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [removeKey, setRemoveKey] = useState<string | null>(null);

  const errorToast = (result: RepoOpResult) => {
    switch (result.error) {
      case 'invalidInput':
        toast.error(t('github.invalidInput'));
        break;
      case 'notFound':
        toast.error(t('github.notFoundToast'));
        break;
      case 'unauthorized':
        toast.error(t('github.unauthorizedToast'));
        break;
      case 'rateLimited':
        toast.error(t('github.rateLimitedToast'));
        break;
      case 'invalidFormat':
        toast.error(t('github.invalidFormatToast'));
        break;
      case 'network':
        toast.warning(t('github.networkToast'));
        break;
      default:
        toast.error(t('github.errorToast'));
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting || !repoInput.trim()) return;
    setSubmitting(true);
    const result = await addRepo(repoInput, pathInput);
    setSubmitting(false);
    if (result.ok) {
      setRepoInput('');
      setPathInput('');
      toast.success(result.changed ? t('github.loadedToast') : t('github.upToDateToast'));
    } else {
      errorToast(result);
    }
  };

  const handleRefresh = async (key: string) => {
    const entry = entries.find(e => repoKey(e) === key);
    if (!entry) return;
    const repo = `${entry.owner}/${entry.repo}`;
    const result = await refreshRepo(key, { force: true });
    if (result.ok && result.changed) {
      toast.success(t('github.updatedToast', { repo }));
    } else if (result.ok) {
      toast.info(t('github.upToDateToast'));
    } else {
      errorToast(result);
    }
  };

  const handleApplyToken = () => {
    if (!tokenInput.trim()) return;
    setToken(tokenInput);
    setTokenInput('');
    toast.success(t('github.tokenSetToast'));
  };

  const handleClearToken = () => {
    setToken(null);
    toast.info(t('github.tokenClearedToast'));
  };

  const confirmRemove = () => {
    if (!removeKey) return;
    const entry = entries.find(e => repoKey(e) === removeKey);
    removeRepo(removeKey);
    if (entry) toast.success(t('github.removedToast', { repo: `${entry.owner}/${entry.repo}` }));
    setRemoveKey(null);
  };

  const removing = entries.find(e => repoKey(e) === removeKey);

  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium text-github-light mb-1">{t('github.title')}</h3>
      <p className="text-xs text-github-muted mb-2">{t('github.hint')}</p>
      <form onSubmit={handleSubmit} className="flex items-center gap-2 mb-2">
        <Input
          value={repoInput}
          onChange={e => setRepoInput(e.target.value)}
          placeholder={t('github.repoPlaceholder')}
          disabled={submitting}
          className="flex-1 min-w-0 bg-github-dark border-github-subtle text-github-text"
        />
        <Input
          value={pathInput}
          onChange={e => setPathInput(e.target.value)}
          placeholder={t('github.pathPlaceholder')}
          disabled={submitting}
          className="w-44 shrink-0 bg-github-dark border-github-subtle text-github-text"
        />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={submitting || !repoInput.trim()}
        >
          {submitting ? (
            <RefreshCw className="h-4 w-4 mr-1 animate-spin" aria-hidden />
          ) : (
            <Github className="h-4 w-4 mr-1" aria-hidden />
          )}
          {submitting ? t('github.loading') : t('github.load')}
        </Button>
      </form>
      <div className="flex items-center gap-2 mb-2">
        <Input
          type="password"
          value={tokenInput}
          onChange={e => setTokenInput(e.target.value)}
          placeholder={t('github.tokenPlaceholder')}
          autoComplete="off"
          className="flex-1 min-w-0 bg-github-dark border-github-subtle text-github-text"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!tokenInput.trim()}
          onClick={handleApplyToken}
        >
          <KeyRound className="h-4 w-4 mr-1" aria-hidden />
          {t('github.tokenApply')}
        </Button>
        {token && (
          <Button type="button" variant="ghost" size="sm" onClick={handleClearToken}>
            {t('github.tokenClear')}
          </Button>
        )}
      </div>
      {token && (
        <p className="text-xs text-github-muted mb-2">{t('github.tokenActiveHint')}</p>
      )}
      {entries.length > 0 && (
        <ul className="space-y-1">
          {entries.map(entry => {
            const key = repoKey(entry);
            const isBusy = !!busy[key];
            return (
              <li key={key} className="flex items-center gap-2 text-xs text-github-muted">
                <Github className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="text-github-light truncate" title={`${entry.owner}/${entry.repo}/${entry.path}`}>
                  {entry.owner}/{entry.repo}
                </span>
                {entry.path !== DEFAULT_REPO_PATH && (
                  <span className="truncate opacity-80">{entry.path}</span>
                )}
                <span className="shrink-0">
                  · {t('github.presetsCount', { count: entry.presets.length })}
                </span>
                <span className="truncate">
                  ·{' '}
                  {entry.fetchedAt === null
                    ? t('github.lastCheckNever')
                    : t('github.lastCheck', { time: new Date(entry.fetchedAt).toLocaleString() })}
                </span>
                <span className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-github-muted"
                  aria-label={t('github.refresh')}
                  title={t('github.refresh')}
                  disabled={isBusy}
                  onClick={() => void handleRefresh(key)}
                >
                  <RefreshCw className={isBusy ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-github-muted hover:text-red-400"
                  aria-label={t('github.remove')}
                  title={t('github.remove')}
                  onClick={() => setRemoveKey(key)}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={!!removeKey} onOpenChange={open => !open && setRemoveKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('github.removeTitle', { repo: removing ? `${removing.owner}/${removing.repo}` : '' })}
            </AlertDialogTitle>
            <AlertDialogDescription>{t('github.removeBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('github.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove}>{t('github.removeAction')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GitHubImport;
