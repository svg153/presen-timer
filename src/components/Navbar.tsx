
import { Menu, Keyboard, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n, Lang } from '@/i18n';

interface NavbarProps {
  toggleSidebar: () => void;
  onOpenHelp: () => void;
}

const Navbar = ({ toggleSidebar, onOpenHelp }: NavbarProps) => {
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
