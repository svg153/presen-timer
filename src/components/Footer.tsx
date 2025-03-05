
const Footer = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-12 bg-github-darker/90 backdrop-blur-md z-50 border-t border-github-subtle flex items-center px-4">
      <div className="flex justify-between items-center w-full max-w-screen-2xl mx-auto">
        <div className="text-sm text-github-muted">
          © {new Date().getFullYear()} PresenTimer
        </div>
        
        <div className="text-sm">
          <a 
            href="https://ghspain.github.io" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-github-purple hover:text-github-light transition-colors"
          >
            ghspain.github.io
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
