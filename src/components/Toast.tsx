'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export default function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-hunter-950/95 border-2 border-hunter-blue p-3.5 rounded-lg shadow-[0_0_20px_rgba(0,217,255,0.4)] text-hunter-blue font-mono text-xs flex items-center justify-between gap-2 pointer-events-auto backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="animate-pulse text-base">⚡</span>
          <span className="font-semibold text-hunter-100">{message}</span>
        </div>
        <button
          onClick={onClose}
          className="text-hunter-gray hover:text-white text-sm px-1 py-0.5"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
