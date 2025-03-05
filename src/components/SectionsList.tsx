
import { formatTime } from '@/utils/timerUtils';
import { TimerSection } from '@/hooks/useTimer';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, List } from 'lucide-react';

interface SectionsListProps {
  sections: TimerSection[];
  currentSectionIndex: number;
  jumpToSection: (index: number) => void;
  isOpen: boolean;
}

const SectionsList = ({ 
  sections, 
  currentSectionIndex, 
  jumpToSection,
  isOpen 
}: SectionsListProps) => {
  if (!isOpen) return null;
  
  return (
    <aside className="fixed left-0 top-16 bottom-12 w-72 bg-github-darker border-r border-github-subtle z-40 animate-slide-in-left">
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-github-subtle">
          <div className="flex items-center gap-2">
            <List className="h-5 w-5 text-github-purple" />
            <h2 className="text-lg font-medium text-github-light">Sections</h2>
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
                
                return (
                  <Button
                    key={`${section.name}-${index}`}
                    variant="ghost"
                    className={`w-full justify-start px-3 py-2 h-auto ${
                      isActive 
                        ? 'bg-github-purple/20 text-github-light' 
                        : 'text-github-muted hover:bg-github-subtle hover:text-github-light'
                    }`}
                    onClick={() => jumpToSection(index)}
                  >
                    <div className="flex items-center w-full">
                      <div className="mr-3 flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-github-subtle">
                        {index + 1}
                      </div>
                      <div className="flex-1 text-left truncate">
                        {section.name}
                      </div>
                      <div className="flex items-center text-xs opacity-70">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTime(section.duration)}
                      </div>
                    </div>
                  </Button>
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
      </div>
    </aside>
  );
};

export default SectionsList;
