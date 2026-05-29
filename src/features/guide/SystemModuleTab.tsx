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
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{title}</h2>
          <p className="text-zinc-400 font-sans text-sm leading-relaxed">
            {description}
          </p>
        </div>

        <div className="space-y-6">
          {modules.map((mod, i) => {
            // Simple heuristic to break the content into a main principle and a supplementary detail if a period exists.
            const splitContent = mod.content.split('. ');
            const mainPrinciple = splitContent[0] + (splitContent.length > 1 ? '.' : '');
            const details = splitContent.slice(1).join('. ');

            return (
              <div key={mod.id} className="border border-zinc-800/60 bg-[#0B0F17] rounded-2xl overflow-hidden relative shadow-sm group hover:border-indigo-500/30 transition-all duration-300">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none"></div>
                
                <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-zinc-800/60 relative z-10">
                  {/* Left Column: Number & Title */}
                  <div className="p-6 md:p-8 md:w-1/3 flex flex-col justify-center bg-[#111827]/30">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="text-[10px] font-black tracking-widest text-indigo-500 border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 rounded">
                        MOD {(i + 1).toString().padStart(2, '0')}
                      </div>
                    </div>
                    <h3 className="text-xl font-display font-medium text-zinc-100 uppercase tracking-tight leading-snug">{mod.title}</h3>
                  </div>

                  {/* Right Column: Compartmentalized Data */}
                  <div className="p-6 md:p-8 flex-1 flex flex-col justify-center gap-6">
                    <div>
                      <h4 className="text-[9px] font-black tracking-widest text-slate-500 uppercase mb-2">Core Principle</h4>
                      <p className="text-sm font-sans text-zinc-300 leading-relaxed">
                        {mainPrinciple}
                      </p>
                    </div>

                    {details && (
                      <div className="pt-5 border-t border-zinc-800/50">
                        <h4 className="text-[9px] font-black tracking-widest text-slate-500 uppercase mb-2">Key Detail / Impact</h4>
                        <p className="text-[11px] font-sans text-zinc-400 leading-relaxed">
                          {details}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
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
