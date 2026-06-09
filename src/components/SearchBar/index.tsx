import { Search, X, Sliders, ChevronRight } from 'lucide-react';

interface SearchBarProps {
 value: string;
 onChange: (val: string) => void;
 onClear: () => void;
 results: { id: string; name: string }[];
 onResultClick: (id: string) => void;
 activeFiltersCount: number;
 onFilterClick: () => void;
}

export function SearchBar({ 
 value, 
 onChange, 
 onClear, 
 results, 
 onResultClick,
 activeFiltersCount,
 onFilterClick
}: SearchBarProps) {
 const isFilteringActive = value !== '' || activeFiltersCount > 0;

 return (
 <div className="flex flex-col w-full space-y-6">
 {/* 1. SEARCH INPUT */}
 <div className="relative group">
 <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
 value ? 'text-glacier-bright' : 'text-silver-bright drop-shadow-md/40 group-focus-within:text-glacier-bright'
 }`} />
 <input
 type="text"
 value={value}
 onChange={(e) => onChange(e.target.value)}
 placeholder="Chercher une archive..."
 className="w-full bg-[#0D0D0F]/80 border border-silver-DEFAULT/30 rounded-2xl py-4 pl-12 pr-10 text-sm text-glacier-bright focus:outline-none focus:border-silver-DEFAULT/50 focus:ring-1 focus:ring-gold-DEFAULT/20 transition-all placeholder:text-silver-bright drop-shadow-md/20 italic font-inter"
 />
 {value && (
 <button
 onClick={onClear}
 className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/5 rounded-md text-silver-bright drop-shadow-md hover:text-glacier-bright transition-colors"
 >
 <X className="w-3.5 h-3.5" />
 </button>
 )}
 </div>

 {/* 2. FILTER BUTTON (PILL) */}
 <div className="flex justify-start">
 <button
 onClick={onFilterClick}
 className={`
 group flex items-center gap-2.5 px-6 py-2 rounded-full border transition-all duration-300
 ${isFilteringActive 
 ? 'border-silver-DEFAULT text-glacier-bright bg-glacier-DEFAULT/10 shadow-[0_0_15px_rgba(79,164,184,0.2)] font-bold' 
 : 'border-slate-400/30 text-slate-400 opacity-70 hover:opacity-100 hover:border-slate-400/60'
 }
 `}
 >
 <Sliders className={`w-3.5 h-3.5 transition-transform duration-500 ${isFilteringActive ? 'rotate-90 text-glacier-bright' : 'text-slate-400 group-hover:rotate-12'}`} />
 <span className="text-xs font-quantico tracking-[0.2em] uppercase">
 {isFilteringActive ? `Filtres (${activeFiltersCount + (value ? 1 : 0)})` : 'Filtres'}
 </span>
 {isFilteringActive && (
 <div className="w-1.5 h-1.5 rounded-full bg-glacier-bright animate-pulse" />
 )}
 </button>
 </div>

 {/* 3. QUICK RESULTS LIST */}
 {results.length > 0 && (
 <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-500">
 <h3 className="text-[11px] font-black text-glacier-muted/50 tracking-[0.2em] uppercase mb-4 px-1">Résultats Rapides</h3>
 <ul className="space-y-1">
 {results.slice(0, 10).map((res) => (
 <li key={res.id}>
 <button
 onClick={() => onResultClick(res.id)}
 className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-glacier-DEFAULT/5 text-silver-bright drop-shadow-md/70 hover:text-glacier-bright transition-all group border border-transparent hover:border-silver-DEFAULT/30"
 >
 <span className="text-[11px] font-inter italic truncate pr-4">{res.name}</span>
 <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all translate-x-[-4px] group-hover:translate-x-0" />
 </button>
 </li>
 ))}
 </ul>
 </div>
 )}
 </div>
 );
}
