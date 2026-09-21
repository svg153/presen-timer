
import { Menu, Keyboard } from 'lucide-react';

interface NavbarProps {
  toggleSidebar: () => void;
  onOpenHelp: () => void;
}

const Navbar = ({ toggleSidebar, onOpenHelp }: NavbarProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-github-darker/90 backdrop-blur-md z-50 border-b border-github-subtle flex items-center px-4">
      <div className="flex justify-between items-center w-full max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-github-subtle transition-colors"
            aria-label="Toggle sidebar"
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
            Present with confidence
          </span>
          <button
            onClick={onOpenHelp}
            className="p-2 rounded-md hover:bg-github-subtle transition-colors"
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="h-5 w-5 text-github-text" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
