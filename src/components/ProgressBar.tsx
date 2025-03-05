
interface ProgressBarProps {
  progress: number;
  warning?: boolean;
}

const ProgressBar = ({ progress, warning = false }: ProgressBarProps) => {
  const progressClass = warning ? 'bg-amber-500' : 'bg-github-purple';
  
  return (
    <div className="w-full h-1.5 bg-github-subtle rounded-full overflow-hidden">
      <div 
        className={`h-full transition-all duration-300 ease-out ${progressClass}`}
        style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
      />
    </div>
  );
};

export default ProgressBar;
