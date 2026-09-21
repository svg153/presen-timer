import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUTS: Array<{ keys: string[]; action: string }> = [
  { keys: ['Space'], action: 'Play / Pause' },
  { keys: ['→'], action: 'Next section' },
  { keys: ['←'], action: 'Previous section' },
  { keys: ['R'], action: 'Reset current section' },
  { keys: ['F'], action: 'Toggle fullscreen' },
  { keys: ['+'], action: 'Add 1 minute' },
  { keys: ['?'], action: 'Show / hide this help' }
];

const KeyboardShortcutsDialog = ({ open, onOpenChange }: KeyboardShortcutsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Control the timer without leaving the keyboard.
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
