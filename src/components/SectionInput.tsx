
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { parseSections } from '@/utils/timerUtils';
import { TimerSection } from '@/hooks/useTimer';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';

interface SectionInputProps {
  onSetSections: (sections: TimerSection[]) => void;
}

const SectionInput = ({ onSetSections }: SectionInputProps) => {
  const [inputText, setInputText] = useState(
    `Introducción: 3m\nExplicación: 5m\nDemo: 10m\nPreguntas: 2m`
  );

  const handleCreateSections = () => {
    const sections = parseSections(inputText);
    if (sections.length > 0) {
      onSetSections(sections);
    }
  };

  return (
    <Card className="glass-card p-4 w-full max-w-2xl mx-auto mb-6 animate-fade-in">
      <h2 className="text-lg font-medium mb-2 text-github-light">Define Sections</h2>
      <p className="text-sm text-github-muted mb-4">
        Enter one section per line in the format: "Section Name: duration" (e.g., "Intro: 5m" or "Q&A: 2h")
      </p>
      
      <Textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        rows={6}
        className="mb-4 bg-github-dark border-github-subtle text-github-text"
        placeholder="Intro: 5m&#10;Main content: 15m&#10;Demo: 10m&#10;Q&A: 5m"
      />
      
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
