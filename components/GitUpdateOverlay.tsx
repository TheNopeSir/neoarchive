import React, { useEffect, useState, useRef } from 'react';

interface GitUpdateOverlayProps {
  onComplete: () => void;
  theme: 'dark' | 'light';
}

const LINES = [
  "> ESTABLISHING SECURE CONNECTION TO MAINFRAME...",
  "> AUTHENTICATION: VERIFIED [ROOT_ACCESS]",
  "> EXECUTING PROTOCOL: GIT_FETCH --VERBOSE",
  "> remote: Enumerating objects: 128, done.",
  "> remote: Counting objects: 100% (128/128), done.",
  "> remote: Compressing objects: 100% (64/64), done.",
  "> Receiving objects: 100% (128/128), 1.21 MB | 4.20 MiB/s",
  "> Resolving deltas: 100% (42/42), completed with 0 errors.",
  "> UNPACKING PAYLOAD...",
  "> UPDATING FILES: 100% (15/15) done.",
  "> CHECKING DEPENDENCIES (NPM INSTALL)...",
  "> ADDED 3 PACKAGES, REMOVED 1 PACKAGE.",
  "> COMPILING ASSETS [VITE BUILD]...",
  "> OPTIMIZING NEURAL NETWORKS...",
  "> DEPLOYMENT SUCCESSFUL.",
  "> RESTARTING SYSTEM DAEMON..."
];

const GitUpdateOverlay: React.FC<GitUpdateOverlayProps> = ({ onComplete, theme }) => {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Use a ref to store the latest callback to prevent effect re-runs if the prop changes
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let currentIndex = 0;
    const timeouts: NodeJS.Timeout[] = [];

    const addLine = () => {
      if (currentIndex >= LINES.length) {
        timeouts.push(setTimeout(() => {
            if (onCompleteRef.current) onCompleteRef.current();
        }, 1000));
        return;
      }

      setDisplayedLines(prev => [...prev, LINES[currentIndex]]);
      currentIndex++;
      
      // Random delay between lines for realism
      const delay = Math.random() * 300 + 100;
      timeouts.push(setTimeout(addLine, delay));
    };

    addLine();

    return () => timeouts.forEach(clearTimeout);
  }, []); // Empty dependency array ensures run-once behavior

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedLines]);

  return (
    <div className={`fixed inset-0 z-[100] font-mono p-4 md:p-8 overflow-hidden flex flex-col justify-end ${
      theme === 'dark' ? 'bg-black text-green-500' : 'bg-gray-900 text-green-400'
    }`}>
      <div className="absolute inset-0 bg-black opacity-90" />
      
      <button 
        onClick={() => onCompleteRef.current && onCompleteRef.current()}
        className="absolute top-4 right-4 z-20 text-red-500 text-xs hover:bg-red-900/20 px-2 py-1 border border-transparent hover:border-red-500 transition-colors uppercase font-bold tracking-widest"
      >
        [ABORT CONNECTION]
      </button>

      <div className="relative z-10 w-full max-w-3xl mx-auto h-full flex flex-col">
        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2 pb-4">
            {displayedLines.map((line, i) => (
                <div key={i} className="break-words animate-in slide-in-from-left-2 fade-in duration-100 text-xs md:text-sm">
                    <span className="opacity-50 mr-2 select-none">
                        {new Date().toLocaleTimeString('en-US', { hour12: false })}
                    </span>
                    {line}
                </div>
            ))}
            <div ref={bottomRef} />
        </div>
        <div className="border-t border-green-500/30 pt-4 mt-4 animate-pulse flex items-center gap-2">
            <span className="font-bold">{">"}</span>
            <span className="bg-green-500 w-3 h-5 block"></span>
        </div>
      </div>
    </div>
  );
};

export default GitUpdateOverlay;