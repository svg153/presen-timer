import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useI18n } from '@/i18n';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const KeyboardShortcutsDialog = ({ open, onOpenChange }: KeyboardShortcutsDialogProps) => {
  const { t } = useI18n();

  // Built inside the component so shortcut labels follow the UI language.
  const SHORTCUTS: Array<{ keys: string[]; action: string }> = [
    { keys: ['Space'], action: t('shortcuts.playPause') },
    { keys: ['→'], action: t('shortcuts.nextSection') },
    { keys: ['←'], action: t('shortcuts.prevSection') },
    { keys: ['R'], action: t('shortcuts.resetSection') },
    { keys: ['F'], action: t('shortcuts.toggleFullscreen') },
    { keys: ['+'], action: t('shortcuts.addMinute') },
    { keys: ['?'], action: t('shortcuts.toggleHelp') }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('shortcuts.title')}</DialogTitle>
          <DialogDescription>
            {t('shortcuts.subtitle')}
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {SHORTCUTS.map(({ keys, action }) => (
            <li key={action} className="flex items-center justify-between gap-4">
              <span className="text-sm text-github-text">{action}</span>
              <span className="flex gap-1">
                {keys.map(key => (
                  <kbd
                    key={key}
                    className="min-w-8 rounded border border-github-subtle bg-github-subtle/50 px-2 py-0.5 text-center text-xs font-semibold text-github-light"
                  >
                    {key}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsDialog;
