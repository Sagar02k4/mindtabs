import { FolderOpen } from 'lucide-react';

export default function EmptyState({ 
  title = 'No tabs tracked yet', 
  description = 'Start browsing and MindTabs will automatically track your tabs.',
  icon: Icon = FolderOpen,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-6
                      border border-primary-500/20">
        <Icon size={36} className="text-primary-400" />
      </div>
      <h3 className="text-lg font-semibold text-surface-200 mb-2">{title}</h3>
      <p className="text-sm text-surface-400 max-w-[280px]">{description}</p>
    </div>
  );
}
