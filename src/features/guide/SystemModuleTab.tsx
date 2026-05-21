import React from 'react';
import { BookOpen } from 'lucide-react';

interface SystemModuleTabProps {
  title: string;
  description: string;
  modules: Array<{
    id: string;
    title: string;
    content: string;
  }>;
}

export const SystemModuleTab: React.FC<SystemModuleTabProps> = ({ title, description, modules }) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-12 max-w-4xl">
        <div className="max-w-2xl">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">{title}</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            {description}
          </p>
        </div>

        <div className="space-y-6">
          {modules.map((mod, i) => (
            <div key={mod.id} className="border border-zinc-800 bg-zinc-900/30 rounded-2xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors"></div>
              
              <div className="relative z-10 flex gap-6">
                <div className="hidden sm:block text-zinc-700 font-mono text-sm group-hover:text-amber-600/50 transition-colors pt-2">
                  {(i + 1).toString().padStart(2, '0')}
                </div>
                <div>
                  <h3 className="text-xl font-display font-medium text-zinc-100 uppercase tracking-tight mb-4">{mod.title}</h3>
                  <p className="text-sm font-sans text-zinc-400 leading-relaxed max-w-3xl">
                    {mod.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {modules.length === 0 && (
             <div className="flex flex-col items-center justify-center p-12 border border-zinc-800/50 border-dashed rounded-2xl h-[30vh]">
                <BookOpen size={24} className="text-zinc-700 mb-4" />
                <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">SIA Calibration in Progress</p>
                <p className="text-zinc-600 text-[10px] mt-2">Section structure pending.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
