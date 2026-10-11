import React from 'react';
import { Layers, BookOpen, Briefcase, ShoppingBag, FlaskConical, Tv, AlertTriangle, Tag, ArrowDownAZ, ArrowUpAZ, Clock, SortAsc, Archive } from 'lucide-react';
import useTabStore from '../../store/tabStore';
import { TAG_OPTIONS, SORT_OPTIONS } from '../../utils/constants';

const tagIcons = {
  'read-later': BookOpen,
  'work': Briefcase,
  'shopping': ShoppingBag,
  'research': FlaskConical,
  'entertainment': Tv,
  'important': AlertTriangle,
};

export default function FilterSidebar() {
  const { activeTag, setActiveTag, sortBy, setSortBy, getStats } = useTabStore();
  const stats = getStats();

  return (
    <div className="w-full lg:w-64 flex-shrink-0 space-y-6">
      {/* Tags Filter */}
      <div className="glass rounded-xl p-4">
        <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Tag size={12} />
          Filter by Tag
        </h3>
        <div className="space-y-1">
          <button
            onClick={() => setActiveTag('all')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm
                      transition-all duration-200
                      ${activeTag === 'all' 
                        ? 'bg-primary-500/20 text-primary-300 font-medium' 
                        : 'hover:bg-surface-800/50 text-surface-300'}`}
          >
            <span className="flex items-center gap-2.5">
              <Layers size={15} />
              All Tabs
            </span>
            <span className="text-xs text-surface-500">{stats.totalTabs}</span>
          </button>

          {TAG_OPTIONS.map((tag) => {
            const Icon = tagIcons[tag.id] || Tag;
            const count = stats.tagBreakdown[tag.id] || 0;
            return (
              <button
                key={tag.id}
                onClick={() => setActiveTag(tag.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm
                          transition-all duration-200
                          ${activeTag === tag.id 
                            ? 'bg-primary-500/20 text-primary-300 font-medium' 
                            : 'hover:bg-surface-800/50 text-surface-300'}`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={15} />
                  {tag.label}
                </span>
                {count > 0 && (
                  <span className="text-xs text-surface-500">{count}</span>
                )}
              </button>
            );
          })}

          <button
            onClick={() => setActiveTag('untagged')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm
                      transition-all duration-200
                      ${activeTag === 'untagged' 
                        ? 'bg-primary-500/20 text-primary-300 font-medium' 
                        : 'hover:bg-surface-800/50 text-surface-300'}`}
          >
            <span className="flex items-center gap-2.5">
              <Tag size={15} className="opacity-40" />
              Untagged
            </span>
            <span className="text-xs text-surface-500">{stats.tagBreakdown['untagged'] || 0}</span>
          </button>

          <div className="pt-2 mt-2 border-t border-surface-700/50">
            <button
              onClick={() => setActiveTag('archived')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm
                        transition-all duration-200
                        ${activeTag === 'archived' 
                          ? 'bg-primary-500/20 text-primary-300 font-medium' 
                          : 'hover:bg-surface-800/50 text-surface-300'}`}
            >
              <span className="flex items-center gap-2.5">
                <Archive size={15} className="text-surface-400" />
                Archived
              </span>
              <span className="text-xs text-surface-500">{stats.archivedTabs || 0}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sort */}
      <div className="glass rounded-xl p-4">
        <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <SortAsc size={12} />
          Sort By
        </h3>
        <div className="space-y-1">
          {SORT_OPTIONS.map((option) => {
            const icons = { newest: Clock, oldest: Clock, title: ArrowDownAZ };
            const Icon = icons[option.id] || SortAsc;
            return (
              <button
                key={option.id}
                onClick={() => setSortBy(option.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm
                          transition-all duration-200
                          ${sortBy === option.id 
                            ? 'bg-primary-500/20 text-primary-300 font-medium' 
                            : 'hover:bg-surface-800/50 text-surface-300'}`}
              >
                <Icon size={15} />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
