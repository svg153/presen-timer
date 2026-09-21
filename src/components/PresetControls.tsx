import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Preset,
  deletePreset,
  formatPresetSummary,
  isSameSections,
  loadPresets,
  savePresets,
  savePreset
} from '@/utils/presetUtils';
import {
  downloadPresetsFile,
  mergePresets,
  parseImportedPresets
} from '@/utils/importExportUtils';
import {
  FACTORY_TEMPLATES,
  isTemplateValue,
  templateFromValue,
  templateValue
} from '@/utils/templateUtils';
import { useI18n } from '@/i18n';

interface PresetControlsProps {
  // Sections the "Save" action will store (parsed textarea in the empty
  // state, current sections in the sidebar)
  sections: { name: string; duration: number }[];
  // Called when the user picks a preset to load
  onLoad: (sections: { name: string; duration: number }[]) => void;
  compact?: boolean;
}

const PresetControls = ({ sections, onLoad, compact }: PresetControlsProps) => {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selected, setSelected] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    setPresets(loadPresets());
  }, []);

  const activePreset = presets.find(p => isSameSections(p.sections, sections));
  const activeTemplate = FACTORY_TEMPLATES.find(tmpl => isSameSections(tmpl.sections, sections));
  const active = activePreset ?? activeTemplate;
  const canSave = sections.length > 0;
  const templateSelected = isTemplateValue(selected);

  const handleSave = () => {
    const name = presetName.trim();
    if (!name) return;
    const next = savePreset(name, sections);
    setPresets(next);
    setSelected(name);
    setSaveOpen(false);
    setPresetName('');
    toast.success(t('presets.savedToast', { name }));
  };

  const handleLoad = (value: string) => {
    setSelected(value);
    const template = templateFromValue(value);
    if (template) {
      onLoad(template.sections.map(s => ({ ...s })));
      toast.info(t('presets.templateLoadedToast', { name: template.name }));
      return;
    }
    const preset = presets.find(p => p.name === value);
    if (preset) {
      onLoad(preset.sections.map(s => ({ ...s })));
      toast.info(t('presets.presetLoadedToast', { name: value }));
    }
  };

  const confirmDelete = () => {
    if (!deleteName) return;
    setPresets(deletePreset(deleteName));
    if (selected === deleteName) setSelected('');
    toast.success(t('presets.deletedToast', { name: deleteName }));
    setDeleteName(null);
  };

  const handleExport = () => {
    if (presets.length === 0) return;
    downloadPresetsFile(presets);
    toast.success(
      presets.length === 1
        ? t('presets.exportedOneToast')
        : t('presets.exportedManyToast', { count: presets.length })
    );
  };

  const handleImportFile = async (file: File) => {
    try {
      const imported = parseImportedPresets(await file.text());
      const { merged, overwritten } = mergePresets(imported, loadPresets());
      savePresets(merged);
      setPresets(merged);
      const newCount = imported.length - overwritten.length;
      if (overwritten.length > 0) {
        toast.info(t('presets.importedNewToast', { new: newCount, overwritten: overwritten.length }));
      } else if (imported.length === 1) {
        toast.success(t('presets.importedOneToast'));
      } else {
        toast.success(t('presets.importedManyToast', { count: imported.length }));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('presets.invalidFile'));
    }
  };

  return (
    <div className={compact ? 'mt-4 pt-3 border-t border-github-subtle' : 'mb-4'}>
      {!compact && (
        <p className="text-sm text-github-muted mb-2">
          {t('presets.hint')}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Select
          value={selected}
          onValueChange={handleLoad}
          onOpenChange={open => {
            // Other PresetControls instances (or other tabs) may have
            // modified the saved presets; refresh when opening
            if (open) setPresets(loadPresets());
          }}
        >
          <SelectTrigger className="flex-1 bg-github-dark border-github-subtle text-github-text">
            <SelectValue placeholder={t('presets.loadPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {presets.length > 0 && (
              <>
                <SelectGroup>
                  <SelectLabel>{t('presets.yourPresets')}</SelectLabel>
                  {presets.map(p => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name}
                      {isSameSections(p.sections, sections) ? ' ✓' : ''}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectSeparator />
              </>
            )}
            <SelectGroup>
              <SelectLabel>{t('presets.templates')}</SelectLabel>
              {FACTORY_TEMPLATES.map(tmpl => (
                <SelectItem key={tmpl.name} value={templateValue(tmpl.name)}>
                  {tmpl.name}
                  {isSameSections(tmpl.sections, sections) ? ' ✓' : ''}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          disabled={!canSave}
          onClick={() => setSaveOpen(true)}
        >
          {t('presets.save')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!selected || templateSelected}
          onClick={() => setDeleteName(selected)}
        >
          {t('presets.delete')}
        </Button>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-github-muted"
          disabled={presets.length === 0}
          onClick={handleExport}
        >
          {t('presets.exportAll')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-github-muted"
          onClick={() => fileInputRef.current?.click()}
        >
          {t('presets.import')}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleImportFile(file);
            e.target.value = '';
          }}
        />
      </div>
      {compact && active && (
        <p className="text-xs text-github-muted mt-1">
          {activePreset
            ? t('presets.activePreset', { name: active.name, summary: formatPresetSummary(active.sections) })
            : t('presets.activeTemplate', { name: active.name, summary: formatPresetSummary(active.sections) })}
        </p>
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('presets.saveTitle')}</DialogTitle>
          </DialogHeader>
          <Input
            value={presetName}
            onChange={e => setPresetName(e.target.value)}
            placeholder={t('presets.namePlaceholder')}
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave();
            }}
          />
          {presetName.trim() && presets.some(p => p.name === presetName.trim()) && (
            <p className="text-xs text-yellow-500">
              {t('presets.overwriteWarning')}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              {t('presets.cancel')}
            </Button>
            <Button disabled={!presetName.trim()} onClick={handleSave}>
              {t('presets.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteName} onOpenChange={open => !open && setDeleteName(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('presets.deleteTitle', { name: deleteName ?? '' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('presets.deleteBody')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('presets.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>{t('presets.deleteAction')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PresetControls;
