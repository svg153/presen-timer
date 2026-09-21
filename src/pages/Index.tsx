
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import TimerSection from '@/components/TimerSection';
import SectionInput from '@/components/SectionInput';
import SectionsList from '@/components/SectionsList';
import KeyboardShortcutsDialog from '@/components/KeyboardShortcutsDialog';
import PresenterView from '@/components/PresenterView';
import StatsDialog from '@/components/StatsDialog';
import useTimer from '@/hooks/useTimer';
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts';
import { useMcpBridge } from '@/mcp/useMcpBridge';
import McpBridgeStatus from '@/components/McpBridgeStatus';
import { calculateProgress, loadFromLocalStorage } from '@/utils/timerUtils';
import { Toaster } from '@/components/ui/sonner';

const Index = () => {
  const timer = useTimer();
  const {
    sections,
    currentSectionIndex,
    timeRemaining,
    isRunning,
    isWarning,
    isOvertime,
    isFullscreen,
    isSidebarOpen,
    autoAdvance,
    stats,
    presentationEnded,
    setSections,
    toggleTimer,
    resetSection,
    nextSection,
    prevSection,
    jumpToSection,
    addExtraTime,
    toggleFullscreen,
    toggleSidebar,
    setAutoAdvance,
    endPresentation,
    updateSection,
    deleteSection,
    moveSection,
    addSection
  } = timer;

  // Exposes the timer to a local MCP server so an agent can drive it remotely.
  const bridge = useMcpBridge(timer);

  const { isHelpOpen, setIsHelpOpen } = useKeyboardShortcuts({
    onToggleTimer: toggleTimer,
    onNextSection: nextSection,
    onPrevSection: prevSection,
    onResetSection: resetSection,
    onToggleFullscreen: toggleFullscreen,
    onAddExtraTime: addExtraTime,
    enabled: sections.length > 0
  });

  const [statsDialogOpen, setStatsDialogOpen] = useState(false);

  // Auto-open stats when the presentation ends
  useEffect(() => {
    if (presentationEnded) {
      setStatsDialogOpen(true);
    }
  }, [presentationEnded]);

  // Load saved sections from localStorage on mount
  useEffect(() => {
    const savedSections = loadFromLocalStorage();
    if (savedSections.length > 0) {
      setSections(savedSections);
    }
  }, [setSections]);

  // Calculate progress percentage
  const progress = calculateProgress(
    sections,
    currentSectionIndex,
    timeRemaining
  );

  // Check if current section is last
  const isLastSection = currentSectionIndex === sections.length - 1;
  
  // Calculate if we can navigate back or forward
  const canGoBack = currentSectionIndex > 0;
  const canGoForward = currentSectionIndex < sections.length - 1;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar toggleSidebar={toggleSidebar} onOpenHelp={() => setIsHelpOpen(true)} />
      
      <SectionsList
        sections={sections}
        currentSectionIndex={currentSectionIndex}
        jumpToSection={jumpToSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        moveSection={moveSection}
        addSection={addSection}
        onSetSections={setSections}
        isOpen={isSidebarOpen}
      />
      
      <main className={`flex-1 mt-16 mb-12 py-8 px-4 transition-all duration-300 ${
        isSidebarOpen ? 'md:ml-72' : 'ml-0'
      }`}>
        <div className="container mx-auto max-w-4xl">
          {sections.length === 0 ? (
            <div className="py-12">
              <h1 className="text-3xl font-bold text-center mb-8 text-github-light">
                Presentation <span className="text-github-purple">Timer</span>
              </h1>
              
              <SectionInput
                onSetSections={setSections}
                autoAdvance={autoAdvance}
                onSetAutoAdvance={setAutoAdvance}
              />
            </div>
          ) : (
            <div className="py-4">
              <TimerSection
                name={sections[currentSectionIndex].name}
                timeRemaining={timeRemaining}
                isWarning={isWarning}
                isOvertime={isOvertime}
                isRunning={isRunning}
                isLastSection={isLastSection}
                progress={progress}
                toggleTimer={toggleTimer}
                resetSection={resetSection}
                nextSection={nextSection}
                prevSection={prevSection}
                addExtraTime={addExtraTime}
                toggleFullscreen={toggleFullscreen}
                endPresentation={endPresentation}
                autoAdvance={autoAdvance}
                setAutoAdvance={setAutoAdvance}
                canGoBack={canGoBack}
                canGoForward={canGoForward}
                onOpenStats={() => setStatsDialogOpen(true)}
              />
            </div>
          )}
        </div>
      </main>
      
      <Footer />
      <KeyboardShortcutsDialog open={isHelpOpen} onOpenChange={setIsHelpOpen} />
      <StatsDialog
        open={statsDialogOpen}
        onOpenChange={setStatsDialogOpen}
        stats={stats}
      />
      {isFullscreen && sections.length > 0 && (
        <PresenterView
          name={sections[currentSectionIndex].name}
          timeRemaining={timeRemaining}
          isOvertime={isOvertime}
          progress={progress}
          onExit={toggleFullscreen}
        />
      )}
      <McpBridgeStatus bridge={bridge} />
      <Toaster position="bottom-right" />
    </div>
  );
};

export default Index;
