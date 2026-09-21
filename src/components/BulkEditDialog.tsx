import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { formatTime, parseSections } from '@/utils/timerUtils';
import { sectionsToText } from '@/utils/presetUtils';
import { TimerSection } from '@/hooks/useTimer';
import { useI18n } from '@/i18n';

interface BulkEditFormProps {
  sections: TimerSection[];
  onApply: (sections: { name: string; duration: number }[]) => void;
  onCancel: () => void;
}

/**
 * Lives inside `DialogContent` on purpose: Radix unmounts that subtree while the
 * dialog is closed, so the draft is re-seeded from the live sections on every
 * open and a cancelled edit can never leak into the next one.
 */
const BulkEditForm = ({ sections, onApply, onCancel }: BulkEditFormProps) => {
  const { t } = useI18n();
  const [draft, setDraft] = useState(() => sectionsToText(sections));

  const parsed = useMemo(() => parseSections(draft), [draft]);
  const total = useMemo(
    () => parsed.reduce((acc, section) => acc + section.duration, 0),
    [parsed]
  );

  return (
    <>
      <Textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        rows={10}
        autoFocus
        spellCheck={false}
        className="font-mono text-sm bg-github-dark border-github-subtle text-github-text"
        placeholder={t('bulkEdit.placeholder')}
        aria-label={t('bulkEdit.title')}
      />

      <p className="text-xs text-github-muted" aria-live="polite">
        {parsed.length > 0
          ? t('bulkEdit.preview', { count: parsed.length, total: formatTime(total) })
          : t('bulkEdit.empty')}
      </p>
      <p className="text-xs text-github-muted">{t('bulkEdit.resetWarning')}</p>

      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>
          {t('bulkEdit.cancel')}
        </Button>
        <Button
          onClick={() => onApply(parsed)}
          disabled={parsed.length === 0}
          className="bg-github-purple hover:bg-github-purple/90 text-white"
        >
          {t('bulkEdit.apply')}
        </Button>
      </DialogFooter>
    </>
  );
};

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: TimerSection[];
  onSetSections: (sections: TimerSection[]) => void;
}

const BulkEditDialog = ({ open, onOpenChange, sections, onSetSections }: BulkEditDialogProps) => {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('bulkEdit.title')}</DialogTitle>
          <DialogDescription>{t('bulkEdit.subtitle')}</DialogDescription>
        </DialogHeader>
        <BulkEditForm
          sections={sections}
          onApply={parsed => {
            onSetSections(parsed);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default BulkEditDialog;
