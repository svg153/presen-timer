import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
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

  useEffect(() => {
    setPresets(loadPresets());
  }, []);

  const activePreset = presets.find(p => isSameSections(p.sections, sections));
  const canSave = sections.length > 0;

  const handleSave = () => {
    const name = presetName.trim();
    if (!name) return;
    const next = savePreset(name, sections);
    setPresets(next);
    setSelected(name);
    setSaveOpen(false);
    setPresetName('');
    toast.success(`Preset "${name}" saved`);
  };

  const handleLoad = (name: string) => {
    setSelected(name);
    const preset = presets.find(p => p.name === name);
    if (preset) {
      onLoad(preset.sections.map(s => ({ ...s })));
      toast.info(`Preset "${name}" loaded`);
    }
  };

  const confirmDelete = () => {
    if (!deleteName) return;
    setPresets(deletePreset(deleteName));
    if (selected === deleteName) setSelected('');
    toast.success(`Preset "${deleteName}" deleted`);
    setDeleteName(null);
  };

  const handleExport = () => {
    if (presets.length === 0) return;
    downloadPresetsFile(presets);
    toast.success(`Exported ${presets.length} preset${presets.length === 1 ? '' : 's'}`);
  };

  const handleImportFile = async (file: File) => {
    try {
      const imported = parseImportedPresets(await file.text());
      const { merged, overwritten } = mergePresets(imported, loadPresets());
      savePresets(merged);
      setPresets(merged);
      const newCount = imported.length - overwritten.length;
      if (overwritten.length > 0) {
        toast.info(`Imported ${newCount} new, overwrote ${overwritten.length}`);
      } else {
        toast.success(`Imported ${imported.length} preset${imported.length === 1 ? '' : 's'}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid preset file.');
    }
  };

  return (
    <div className={compact ? 'mt-4 pt-3 border-t border-github-subtle' : 'mb-4'}>
      {!compact && (
        <p className="text-sm text-github-muted mb-2">
          Presets: save the current list or load a saved one
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
            <SelectValue placeholder="Load preset…" />
          </SelectTrigger>
          <SelectContent>
            {presets.map(p => (
              <SelectItem key={p.name} value={p.name}>
                {p.name}
                {isSameSections(p.sections, sections) ? ' ✓' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          disabled={!canSave}
          onClick={() => setSaveOpen(true)}
        >
          Save
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!selected}
          onClick={() => setDeleteName(selected)}
        >
          Delete
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
          Export all
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-github-muted"
          onClick={() => fileInputRef.current?.click()}
        >
          Import
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
      {compact && activePreset && (
        <p className="text-xs text-github-muted mt-1">
          Active preset: {activePreset.name} ({formatPresetSummary(activePreset.sections)})
        </p>
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save preset</DialogTitle>
          </DialogHeader>
          <Input
            value={presetName}
            onChange={e => setPresetName(e.target.value)}
            placeholder="Preset name"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave();
            }}
          />
          {presetName.trim() && presets.some(p => p.name === presetName.trim()) && (
            <p className="text-xs text-yellow-500">
              A preset with this name exists and will be overwritten.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!presetName.trim()} onClick={handleSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteName} onOpenChange={open => !open && setDeleteName(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete preset "{deleteName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This only removes the saved preset; the current sections are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PresetControls;
