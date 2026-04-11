import React, { useState } from 'react';
import { UI_MAP_DATA, UIElement } from '../data/uiMapManifest';
import { Card } from './UI';
import { FileCode, Layers, ChevronRight, ChevronDown, Search, Copy, Check, X } from 'lucide-react';

const TAG_COLORS: Record<string, string> = {
  view: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  section: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  card: 'bg-zinc-800/50 text-zinc-300 border-zinc-700/50',
  btn: 'bg-amber-500/20 text-amber-400 border-amber-500/30', // Amber
  input: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  overlay: 'bg-purple-500/20 text-purple-400 border-red-500/50', // Red/Purple
  comp: 'bg-blue-500/20 text-blue-400 border-blue-500/30', // Blue
};

const countElements = (elements: UIElement[]): number => {
  return elements.reduce((acc, el) => acc + 1 + (el.children ? countElements(el.children) : 0), 0);
};

const MapNode = ({ element, surgicalMode, tier, activeView, depth = 0, searchQuery, onSelect }: { element: UIElement, surgicalMode: boolean, tier: 'Basic' | 'Pro', activeView: string, depth?: number, searchQuery: string, onSelect: (el: UIElement) => void }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPreviewed, setIsPreviewed] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasChildren = element.children && element.children.length > 0;
  const isConditional = /Visible only in|Shown when|Hidden unless|Basic tier shows/i.test(element.description || '');
  
  // Basic tier lock check (simplified logic for demo)
  const isLocked = tier === 'Basic' && /Basic tier shows|Unlock with Enhanced or Pro/i.test(element.description || '');

  // Handle Daily Row grouping
  const displayElement = element.id === 'ins-daily-row' ? { ...element, name: 'Daily Row (x30)' } : element;

  const matchesSearch = searchQuery && (element.name.toLowerCase().includes(searchQuery.toLowerCase()) || element.id.toLowerCase().includes(searchQuery.toLowerCase()));

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2" style={{ marginLeft: depth * 16 }}>
      <div 
        title={element.description}
        onClick={() => onSelect(element)}
        className={`p-3 border rounded-xl cursor-pointer ${element.tag === 'card' ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-950 border-zinc-900'} 
          ${isConditional ? 'border-dashed border-rose-500/50' : ''}
          ${isLocked ? 'opacity-30 grayscale' : 'opacity-100'}
          ${activeView === 'Insights' && element.id.startsWith('ins-') ? 'ring-1 ring-indigo-500/50' : ''}
          ${matchesSearch ? 'ring-2 ring-amber-500' : ''}
          ${isPreviewed ? 'ring-2 ring-purple-500' : ''}
          hover:border-indigo-500/50 transition-all
        `}
      >
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-2">
            {hasChildren && (
              <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="text-zinc-500 hover:text-white">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}
            <h3 className={`font-bold text-xs ${element.tag === 'card' ? 'text-zinc-200' : 'text-zinc-400'}`}>{displayElement.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            {element.tag === 'overlay' && (
              <button onClick={(e) => { e.stopPropagation(); setIsPreviewed(!isPreviewed); }} className={`text-[9px] px-2 py-0.5 rounded border ${isPreviewed ? 'bg-purple-500 text-white' : 'border-purple-500 text-purple-400'}`}>
                {isPreviewed ? 'Previewing' : 'Preview'}
              </button>
            )}
            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${TAG_COLORS[element.tag] || TAG_COLORS.comp}`}>
              {element.tag}
            </span>
          </div>
        </div>
        
        <p className="text-[10px] text-zinc-500 mt-1 truncate">{element.description}</p>
        
        {element.id === 'comp-locked-card' && (
          <div className="mt-2 text-[9px] text-amber-500 font-mono bg-amber-950/30 p-1 rounded">
            Imported in: Dashboard, Insights, Account
          </div>
        )}
        
        {surgicalMode && (
          <div className="mt-2 pt-2 border-t border-zinc-800 flex flex-col gap-1 text-[9px] text-indigo-400 font-mono">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1"><Layers size={10} /> ID: {element.id}</div>
              <button onClick={(e) => { e.stopPropagation(); copyToClipboard(element.id); }} className="hover:text-white">
                {copied ? <Check size={10} /> : <Copy size={10} />}
              </button>
            </div>
            <div className="flex items-center gap-1"><FileCode size={10} /> {element.path}</div>
          </div>
        )}
      </div>
      
      {isExpanded && hasChildren && (
        <div className={`space-y-2 ${element.id === 'log-factors' ? 'grid grid-cols-2 gap-2' : ''}`}>
          {element.children!.map(child => (
            <MapNode key={child.id} element={child} surgicalMode={surgicalMode} tier={tier} activeView={activeView} searchQuery={searchQuery} depth={element.id === 'log-factors' ? 0 : depth + 1} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function DevElementMap() {
  const [activeView, setActiveView] = useState('All');
  const [surgicalMode, setSurgicalMode] = useState(false);
  const [mobileView, setMobileView] = useState(false);
  const [tier, setTier] = useState<'Basic' | 'Pro'>('Basic');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedElement, setSelectedElement] = useState<UIElement | null>(null);

  const views = ['All', ...Object.keys(UI_MAP_DATA)];
  const filteredData = activeView === 'All' 
    ? Object.values(UI_MAP_DATA).flat()
    : UI_MAP_DATA[activeView] || [];

  return (
    <div className="p-8 bg-zinc-950 min-h-screen text-zinc-100">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* ... (Header and Search remain same) ... */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black tracking-tight">SIA Element Map</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setTier(tier === 'Basic' ? 'Pro' : 'Basic')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                tier === 'Pro' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              Tier: {tier}
            </button>
            <button
              onClick={() => setSurgicalMode(!surgicalMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                surgicalMode ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              <FileCode size={14} />
              Surgical Mode {surgicalMode ? 'ON' : 'OFF'}
            </button>
            {activeView === 'NAVBAR' && (
              <button
                onClick={() => setMobileView(!mobileView)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                  mobileView ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                Mobile View {mobileView ? 'ON' : 'OFF'}
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input
            type="text"
            placeholder="Search elements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap gap-2 border-b border-zinc-800">
          {views.map((view) => {
            const count = view === 'All' ? countElements(Object.values(UI_MAP_DATA).flat()) : view === 'VOCABULARY' ? UI_MAP_DATA.VOCABULARY_GUIDE?.length || 0 : view === 'NAVBAR' ? UI_MAP_DATA.Navbar?.length || 0 : countElements(UI_MAP_DATA[view]);
            return (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`px-4 py-2 font-bold text-xs uppercase tracking-widest transition-all ${
                  activeView === view ? 'text-white border-b-2 border-indigo-500' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {view} [{count}]
              </button>
            );
          })}
        </div>

        {activeView === 'VOCABULARY' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {UI_MAP_DATA.VOCABULARY_GUIDE?.map((term) => (
              <div key={term.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-blue-400">{term.name}</h3>
                  <button 
                    onClick={() => navigator.clipboard.writeText(term.name)}
                    className="text-zinc-500 hover:text-white"
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <p className="text-xs text-zinc-300">{term.description}</p>
                {/Never use/i.test(term.description) && (
                  <p className="text-[10px] text-amber-500 font-bold">{term.description.split('Never use')[1]}</p>
                )}
              </div>
            ))}
          </div>
        ) : activeView === 'NAVBAR' ? (
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="font-bold text-sm">Navbar Layout Preview</h2>
              <div className="text-[10px] text-zinc-500 font-mono">/src/components/Navbar.tsx</div>
            </div>
            <div className="flex items-center gap-4">
              {/* Logo Group */}
              {UI_MAP_DATA.Navbar?.find(el => el.id === 'nav-logo-link') && (
                <MapNode element={UI_MAP_DATA.Navbar.find(el => el.id === 'nav-logo-link')!} surgicalMode={surgicalMode} tier={tier} activeView={activeView} searchQuery={searchQuery} onSelect={setSelectedElement} />
              )}
              
              {/* Conditional Nav Links */}
              <div className="flex-1 flex justify-end items-center gap-2">
                {mobileView ? (
                  <>
                    {UI_MAP_DATA.Navbar?.find(el => el.id === 'nav-mobile')?.children?.map(child => (
                      <MapNode key={child.id} element={child} surgicalMode={surgicalMode} tier={tier} activeView={activeView} searchQuery={searchQuery} onSelect={setSelectedElement} />
                    ))}
                  </>
                ) : (
                  <>
                    {UI_MAP_DATA.Navbar?.find(el => el.id === 'nav-desktop-links')?.children?.map(child => (
                      <MapNode key={child.id} element={child} surgicalMode={surgicalMode} tier={tier} activeView={activeView} searchQuery={searchQuery} onSelect={setSelectedElement} />
                    ))}
                    {UI_MAP_DATA.Navbar?.find(el => el.id === 'nav-user-actions')?.children?.map(child => (
                      <MapNode key={child.id} element={child} surgicalMode={surgicalMode} tier={tier} activeView={activeView} searchQuery={searchQuery} onSelect={setSelectedElement} />
                    ))}
                  </>
                )}
              </div>
            </div>
            {/* Global FAB */}
            {UI_MAP_DATA.Navbar?.find(el => el.id === 'nav-fab-log') && (
              <div className="fixed bottom-8 right-8">
                <MapNode element={UI_MAP_DATA.Navbar.find(el => el.id === 'nav-fab-log')!} surgicalMode={surgicalMode} tier={tier} activeView={activeView} searchQuery={searchQuery} onSelect={setSelectedElement} />
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              {Object.entries(TAG_COLORS).map(([tag, color]) => (
                <div key={tag} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${color.split(' ')[0].replace('bg-', 'bg-')}`} />
                  {tag}
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {filteredData.map((el) => (
                <div key={el.id} className="space-y-2">
                  <div className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-1 rounded inline-block">
                    {el.path}
                  </div>
                  <MapNode element={el} surgicalMode={surgicalMode} tier={tier} activeView={activeView} searchQuery={searchQuery} onSelect={setSelectedElement} />
                </div>
              ))}
            </div>
          </>
        )}

        {selectedElement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedElement(null)}>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-bold">Element Details</h3>
              <button onClick={() => setSelectedElement(null)}><X size={16} /></button>
            </div>
            <div className="text-xs space-y-2">
              <p><span className="text-zinc-500">ID:</span> {selectedElement.id}</p>
              <p><span className="text-zinc-500">Path:</span> {selectedElement.path}</p>
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(`SIA, targeting ID ${selectedElement.id} in ${selectedElement.path}: `);
                setSelectedElement(null);
              }}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
            >
              Copy Prompt Header
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
