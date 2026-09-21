import { useState } from 'react';
import { formatTime } from '@/utils/timerUtils';
import { TimerSection } from '@/hooks/useTimer';
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
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, List, Pencil, Plus, Trash2, X, Check, ChevronUp, ChevronDown } from 'lucide-react';

interface SectionsListProps {
  sections: TimerSection[];
  currentSectionIndex: number;
  jumpToSection: (index: number) => void;
  updateSection: (index: number, patch: Partial<TimerSection>) => void;
  deleteSection: (index: number) => void;
  moveSection: (index: number, direction: -1 | 1) => void;
  addSection: () => void;
  isOpen: boolean;
}

const SectionsList = ({
  sections,
  currentSectionIndex,
  jumpToSection,
  updateSection,
  deleteSection,
  moveSection,
  addSection,
  isOpen
}: SectionsListProps) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editMinutes, setEditMinutes] = useState('');
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditName(sections[index].name);
    setEditMinutes(String(Math.round(sections[index].duration / 60)));
  };

  const confirmEdit = () => {
    if (editingIndex === null) return;
    const minutes = parseFloat(editMinutes);
    const duration = Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes * 60) : sections[editingIndex].duration;
    updateSection(editingIndex, {
      name: editName.trim() || sections[editingIndex].name,
      duration
    });
    setEditingIndex(null);
  };

  const confirmDelete = () => {
    if (deleteIndex !== null) deleteSection(deleteIndex);
    setDeleteIndex(null);
  };

  return (
    <aside className="fixed left-0 top-16 bottom-12 w-72 bg-github-darker border-r border-github-subtle z-40 animate-slide-in-left">
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-github-subtle">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <List className="h-5 w-5 text-github-purple" />
              <h2 className="text-lg font-medium text-github-light">Sections</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-github-muted hover:text-github-light"
              onClick={addSection}
              title="Add section at the end"
              aria-label="Add section"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 p-2">
          {sections.length === 0 ? (
            <div className="p-4 text-github-muted text-center">
              No sections defined
            </div>
          ) : (
            <div className="space-y-2">
              {sections.map((section, index) => {
                const isActive = index === currentSectionIndex;
                const isEditing = editingIndex === index;

                if (isEditing) {
                  return (
                    <div
                      key={`edit-${index}`}
                      className="rounded-md border border-github-purple/40 bg-github-subtle/30 p-2 space-y-2"
                    >
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="Section name"
                        className="h-8 text-sm bg-github-darker"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') confirmEdit();
                          if (e.key === 'Escape') setEditingIndex(null);
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={editMinutes}
                          onChange={e => setEditMinutes(e.target.value)}
                          className="h-8 text-sm bg-github-darker"
                          aria-label="Duration in minutes"
                        />
                        <span className="text-xs text-github-muted whitespace-nowrap">min</span>
                      </div>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-github-muted hover:text-github-light"
                          onClick={() => setEditingIndex(null)}
                          aria-label="Cancel edit"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-github-purple hover:text-github-light"
                          onClick={confirmEdit}
                          aria-label="Save section"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={`${section.name}-${index}`}
                    className={`group rounded-md px-1 py-1 ${
                      isActive ? 'bg-github-purple/20' : 'hover:bg-github-subtle'
                    }`}
                  >
                    <div className="flex items-center w-full">
                      <button
                        type="button"
                        className={`flex items-center flex-1 min-w-0 px-2 py-2 text-left rounded ${
                          isActive
                            ? 'text-github-light'
                            : 'text-github-muted hover:text-github-light'
                        }`}
                        onClick={() => jumpToSection(index)}
                      >
                        <div className="mr-3 flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-github-subtle text-xs">
                          {index + 1}
                        </div>
                        <div className="flex-1 text-left truncate text-sm">
                          {section.name}
                        </div>
                        <div className="flex items-center text-xs opacity-70 ml-2">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTime(section.duration)}
                        </div>
                      </button>
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-github-muted hover:text-github-light"
                          onClick={() => moveSection(index, -1)}
                          disabled={index === 0}
                          title="Move up"
                          aria-label={`Move ${section.name} up`}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-github-muted hover:text-github-light"
                          onClick={() => moveSection(index, 1)}
                          disabled={index === sections.length - 1}
                          title="Move down"
                          aria-label={`Move ${section.name} down`}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-github-muted hover:text-github-light"
                          onClick={() => startEdit(index)}
                          title="Edit section"
                          aria-label={`Edit ${section.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-github-muted hover:text-red-400"
                          onClick={() => setDeleteIndex(index)}
                          title="Delete section"
                          aria-label={`Delete ${section.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t border-github-subtle">
          <div className="text-xs text-github-muted">
            Total time: {formatTime(sections.reduce((acc, section) => acc + section.duration, 0))}
          </div>
        </div>

        <AlertDialog open={deleteIndex !== null} onOpenChange={open => !open && setDeleteIndex(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete section?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteIndex !== null && (
                  <>
                    This will delete &quot;{sections[deleteIndex]?.name}&quot;
                    {deleteIndex === currentSectionIndex && ' (the current section)'} and cannot be undone.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={confirmDelete}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </aside>
  );
};

export default SectionsList;
