import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { parseSections } from '@/utils/timerUtils';
import { sectionsToText } from '@/utils/presetUtils';
import { TimerSection } from '@/hooks/useTimer';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import PresetControls from '@/components/PresetControls';
import { useI18n } from '@/i18n';

interface SectionInputProps {
  onSetSections: (sections: TimerSection[]) => void;
  autoAdvance: boolean;
  onSetAutoAdvance: (enabled: boolean) => void;
}

const SectionInput = ({ onSetSections, autoAdvance, onSetAutoAdvance }: SectionInputProps) => {
  const { t } = useI18n();
  // Sample content is user data: it's set once on mount and won't follow later language changes.
  const [inputText, setInputText] = useState(() => t('input.example'));

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
      <h2 className="text-lg font-medium mb-2 text-github-light">{t('input.title')}</h2>
      <p className="text-sm text-github-muted mb-4">
        {t('input.hint')}
      </p>
      
      <PresetControls sections={parsedSections} onLoad={handleLoadPreset} />

      <Textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        rows={6}
        className="mb-4 bg-github-dark border-github-subtle text-github-text"
        placeholder={t('input.placeholder')}
      />
      
      <div className="flex items-center justify-between mb-4">
        <label htmlFor="auto-advance" className="text-sm text-github-muted cursor-pointer">
          {t('input.autoAdvance')}
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
        {t('input.create')}
      </Button>
    </Card>
  );
};

export default SectionInput;
