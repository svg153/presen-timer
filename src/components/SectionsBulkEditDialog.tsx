import { useEffect, useState } from 'react';
import { TimerSection } from '@/hooks/useTimer';
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
import { parseSectionsJson, sectionsToJson } from '@/utils/sectionsEditUtils';
import { useI18n } from '@/i18n';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';

interface SectionsBulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: TimerSection[];
  onApply: (sections: TimerSection[]) => void;
}

const SectionsBulkEditDialog = ({
  open,
  onOpenChange,
  sections,
  onApply
}: SectionsBulkEditDialogProps) => {
  const { t } = useI18n();
  const [text, setText] = useState('');

  // Preload the current sections every time the dialog opens
  useEffect(() => {
    if (open) setText(sectionsToJson(sections));
  }, [open, sections]);

  const handleApply = () => {
    try {
      const parsed = parseSectionsJson(text);
      onApply(parsed);
      toast.success(t('sections.bulkApplied', { count: parsed.length }));
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('sections.bulkInvalid'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-github-dark border-github-subtle">
        <DialogHeader>
          <DialogTitle className="text-github-light flex items-center gap-2">
            <Pencil className="h-4 w-4 text-github-purple" />
            {t('sections.bulkTitle')}
          </DialogTitle>
          <DialogDescription className="text-github-muted">
            {t('sections.bulkHint')}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={14}
          spellCheck={false}
          className="bg-github-darker border-github-subtle text-github-text font-mono text-xs"
          aria-label={t('sections.bulkTitle')}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('sections.bulkCancel')}
          </Button>
          <Button
            className="bg-github-purple hover:bg-github-purple/90 text-white"
            onClick={handleApply}
          >
            {t('sections.bulkApply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SectionsBulkEditDialog;
