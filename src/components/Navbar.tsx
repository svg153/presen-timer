
import { Menu, Keyboard, Sun, Moon, Volume2, VolumeX } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useI18n, Lang } from '@/i18n';

interface NavbarProps {
  toggleSidebar: () => void;
  onOpenHelp: () => void;
  muted: boolean;
  volume: number;
  onToggleMuted: () => void;
  onVolumeChange: (volume: number) => void;
  onTestSound: () => void;
}

const Navbar = ({
  toggleSidebar,
  onOpenHelp,
  muted,
  volume,
  onToggleMuted,
  onVolumeChange,
  onTestSound
}: NavbarProps) => {
  const { t, lang, setLang } = useI18n();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-github-darker/90 backdrop-blur-md z-50 border-b border-github-subtle flex items-center px-4">
      <div className="flex justify-between items-center w-full max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-github-subtle transition-colors"
            aria-label={t('nav.toggleSidebar')}
          >
            <Menu className="h-5 w-5 text-github-text" />
          </button>

          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-github-light">
              Presen<span className="text-github-purple">Timer</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-github-muted hidden md:inline-block">
            {t('nav.tagline')}
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="p-2 rounded-md hover:bg-github-subtle transition-colors"
                aria-label={t('nav.sound.title')}
                title={t('nav.sound.title')}
              >
                {muted ? (
                  <VolumeX className="h-5 w-5 text-github-muted" />
                ) : (
                  <Volume2 className="h-5 w-5 text-github-text" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-4">
              <h2 className="text-sm font-medium text-github-light">{t('nav.sound.title')}</h2>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="sound-enabled" className="text-sm text-github-text cursor-pointer">
                  {t('nav.sound.enable')}
                </Label>
                <Switch
                  id="sound-enabled"
                  checked={!muted}
                  onCheckedChange={() => onToggleMuted()}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-github-text">{t('nav.sound.volume')}</Label>
                <Slider
                  value={[Math.round(volume * 100)]}
                  onValueChange={([value]) => onVolumeChange(value / 100)}
                  max={100}
                  step={5}
                  disabled={muted}
                  aria-label={t('nav.sound.volume')}
                />
              </div>
              {/* Preview ignores mute on purpose: it is the "am I audible?" check. */}
              <Button variant="outline" size="sm" onClick={onTestSound} className="w-full">
                {t('nav.sound.test')}
              </Button>
            </PopoverContent>
          </Popover>
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-md hover:bg-github-subtle transition-colors"
            aria-label={t('nav.theme')}
            title={t('nav.theme')}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-5 w-5 text-github-text" />
            ) : (
              <Moon className="h-5 w-5 text-github-text" />
            )}
          </button>
          <Select value={lang} onValueChange={(value) => setLang(value as Lang)}>
            <SelectTrigger className="h-9 w-[92px] text-sm" aria-label={t('nav.language')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={onOpenHelp}
            className="p-2 rounded-md hover:bg-github-subtle transition-colors"
            aria-label={t('nav.shortcuts')}
            title={t('nav.shortcutsTitle')}
          >
            <Keyboard className="h-5 w-5 text-github-text" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
