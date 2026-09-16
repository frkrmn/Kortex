import React from 'react';
import { CheckCircle2, Info, X } from 'lucide-react';
import { useDemoStore } from '../lib/store/demo-store';

export const Toast: React.FC = () => {
  const { toastMessage, clearToast } = useDemoStore();

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#171717] text-[#FAFAF8] shadow-lg border border-[#2E2E2E] text-xs max-w-md">
        <Info className="w-4 h-4 text-blue-400 shrink-0" />
        <span className="leading-snug">{toastMessage}</span>
        <button
          onClick={clearToast}
          className="p-1 -mr-1 text-[#A3A3A0] hover:text-[#FFFFFF] rounded-md transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
