import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { parseSections } from '@/utils/timerUtils';
import { sectionsToText } from '@/utils/presetUtils';
import { TimerSection } from '@/hooks/useTimer';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import PresetControls from '@/components/PresetControls';

interface SectionInputProps {
  onSetSections: (sections: TimerSection[]) => void;
  autoAdvance: boolean;
  onSetAutoAdvance: (enabled: boolean) => void;
}

const SectionInput = ({ onSetSections, autoAdvance, onSetAutoAdvance }: SectionInputProps) => {
  const [inputText, setInputText] = useState(
    `Introducción: 3m\nExplicación: 5m\nDemo: 10m\nPreguntas: 2m`
  );

  const parsedSections = useMemo(() => parseSections(inputText), [inputText]);

  const handleCreateSections = () => {
    if (parsedSections.length > 0) {
      onSetSections(parsedSections);
    }
  };

  const handleLoadPreset = (presetSections: { name: string; duration: number }[]) => {
    setInputText(sectionsToText(presetSections));
    onSetSections(presetSections);
  };

  return (
    <Card className="glass-card p-4 w-full max-w-2xl mx-auto mb-6 animate-fade-in">
      <h2 className="text-lg font-medium mb-2 text-github-light">Define Sections</h2>
      <p className="text-sm text-github-muted mb-4">
        Enter one section per line in the format: "Section Name: duration" (e.g., "Intro: 5m" or "Q&A: 2h")
      </p>
      
      <PresetControls sections={parsedSections} onLoad={handleLoadPreset} />

      <Textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        rows={6}
        className="mb-4 bg-github-dark border-github-subtle text-github-text"
        placeholder="Intro: 5m&#10;Main content: 15m&#10;Demo: 10m&#10;Q&A: 5m"
      />
      
      <div className="flex items-center justify-between mb-4">
        <label htmlFor="auto-advance" className="text-sm text-github-muted cursor-pointer">
          Auto-advance to next section when time runs out
        </label>
        <Switch
          id="auto-advance"
          checked={autoAdvance}
          onCheckedChange={onSetAutoAdvance}
        />
      </div>
      
      <Button 
        onClick={handleCreateSections}
        className="w-full bg-github-purple hover:bg-github-purple/90 text-white"
      >
        Create Timer
      </Button>
    </Card>
  );
};

export default SectionInput;
