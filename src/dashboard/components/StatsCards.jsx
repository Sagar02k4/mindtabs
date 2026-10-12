import { Layers, CalendarPlus, Bell, TrendingUp, Globe2 } from 'lucide-react';
import useTabStore from '../../store/tabStore';

export default function StatsCards() {
  const { getStats } = useTabStore();
  const stats = getStats();

  const cards = [
    {
      label: 'Total Tabs',
      value: stats.totalTabs,
      icon: Layers,
      gradient: 'from-primary-500/20 to-primary-600/20',
      iconColor: 'text-primary-400',
      borderColor: 'border-primary-500/20',
    },
    {
      label: 'Added Today',
      value: stats.tabsToday,
      icon: CalendarPlus,
      gradient: 'from-cyan-500/20 to-cyan-600/20',
      iconColor: 'text-cyan-400',
      borderColor: 'border-cyan-500/20',
    },
    {
      label: 'This Week',
      value: stats.tabsThisWeek,
      icon: CalendarPlus,
      gradient: 'from-sky-500/20 to-sky-600/20',
      iconColor: 'text-sky-400',
      borderColor: 'border-sky-500/20',
    },
    {
      label: 'Active Reminders',
      value: stats.activeReminders,
      icon: Bell,
      gradient: 'from-amber-500/20 to-amber-600/20',
      iconColor: 'text-amber-400',
      borderColor: 'border-amber-500/20',
    },
    {
      label: 'Tags Used',
      value: Object.keys(stats.tagBreakdown).filter(k => k !== 'untagged').length,
      icon: TrendingUp,
      gradient: 'from-emerald-500/20 to-emerald-600/20',
      iconColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/20',
    },
    {
      label: 'Domains',
      value: stats.uniqueDomains,
      icon: Globe2,
      gradient: 'from-indigo-500/20 to-indigo-600/20',
      iconColor: 'text-indigo-400',
      borderColor: 'border-indigo-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div 
          key={card.label}
          className={`glass rounded-xl p-4 border ${card.borderColor}
                    bg-gradient-to-br ${card.gradient} 
                    animate-fade-in`}
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-lg bg-surface-900/50 flex items-center justify-center ${card.iconColor}`}>
              <card.icon size={20} />
            </div>
          </div>
          <p className="text-2xl font-bold text-surface-100">{card.value}</p>
          <p className="text-xs text-surface-400 mt-1">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
