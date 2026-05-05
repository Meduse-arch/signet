import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onClear: () => void;
}

export function SearchBar({ value, onChange, onClear }: SearchBarProps) {
  return (
    <div className="relative flex items-center w-64">
      <Search className="absolute left-3 w-4 h-4 text-gold-dim pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Rechercher une session..."
        className="w-full bg-surface-card border border-border-dark rounded-lg py-1.5 pl-9 pr-8 text-sm text-[#e8d5a0] placeholder:text-gold-dim focus:outline-none focus:ring-1 focus:ring-gold-DEFAULT focus:border-gold-DEFAULT transition-all"
      />
      {value && (
        <button
          onClick={onClear}
          className="absolute right-2 p-1 hover:bg-white/5 rounded-md text-gold-dim hover:text-gold-bright transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}