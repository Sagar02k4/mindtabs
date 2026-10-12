import { Search, X } from 'lucide-react';
import useTabStore from '../../store/tabStore';

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = useTabStore();

  return (
    <div className="relative">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500" />
      <input
        type="text"
        placeholder="Search tabs by title or URL..."
        aria-label="Search saved tabs"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="input-field pl-10 pr-10"
      />
      {searchQuery && (
        <button
          type="button"
          onClick={() => setSearchQuery('')}
          aria-label="Clear tab search"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded
                    hover:bg-surface-700/50 text-surface-500 hover:text-surface-300 transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
