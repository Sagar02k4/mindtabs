import React, { useState } from 'react';
import { ExternalLink, Trash2, Bell, Tag, Clock, MoreVertical, X, FolderInput, Archive, XCircle } from 'lucide-react';
import useTabStore from '../../store/tabStore';
import TagBadge from '../../components/TagBadge';
import { TAG_OPTIONS, REMINDER_PRESETS } from '../../utils/constants';
import { extractDomain, timeAgo, getFaviconUrl, formatDate } from '../../utils/helpers';

export default function TabCard({ tab, index }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [customDateTime, setCustomDateTime] = useState('');
  const [repeat, setRepeat] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { updateTag, removeTab, setReminder, resetReminder, getReminderForTab, toggleArchive } = useTabStore();

  const reminder = getReminderForTab(tab.id);

  const handleOpenTab = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: tab.url });
    } else {
      window.open(tab.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCloseChromeTab = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ url: tab.url }, (tabs) => {
        if (tabs && tabs.length > 0) {
          tabs.forEach(t => chrome.tabs.remove(t.id));
        }
      });
    }
  };

  const handleTagSelect = async (tagId) => {
    await updateTag(tab.id, tagId === tab.tag ? null : tagId);
    setShowTagPicker(false);
  };

  const handleSetReminder = async (preset) => {
    if (preset.id === 'custom') return;
    await (reminder ? resetReminder(tab.id, preset.getTime()) : setReminder(tab.id, preset.getTime(), repeat || null));
    setShowReminderPicker(false);
  };

  const handleCustomReminder = async () => {
    if (!customDateTime) return;
    const time = new Date(customDateTime).getTime();
    if (time <= Date.now()) return;
    await (reminder ? resetReminder(tab.id, time) : setReminder(tab.id, time));
    setShowReminderPicker(false);
    setCustomDateTime('');
  };

  return (
    <div 
      className={`glass-card rounded-xl p-4 group animate-fade-in relative ${showTagPicker || showReminderPicker ? 'z-50' : 'z-10'}`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start gap-4">
        {/* Favicon */}
        <div className="w-10 h-10 rounded-lg bg-surface-700/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {imageFailed ? <span className="text-xs text-surface-400" aria-hidden="true">🌐</span> : <img
            src={tab.favicon || getFaviconUrl(tab.url)}
            alt=""
            className="w-6 h-6 rounded"
            onError={(e) => {
              setImageFailed(true);
            }}
          />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 
            className="text-sm font-semibold text-surface-100 truncate cursor-pointer
                      hover:text-primary-300 transition-colors"
            onClick={handleOpenTab}
            title={tab.title}
          >
            {tab.title}
          </h3>
          <p className="text-xs text-surface-400 truncate mt-0.5">{extractDomain(tab.url)}</p>
          
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {tab.tag && (
              <TagBadge 
                tag={tab.tag} 
                removable 
                onRemove={() => updateTag(tab.id, null)} 
              />
            )}
            {reminder && (
              <span className="tag-badge bg-amber-500/15 text-amber-300 border border-amber-500/25 text-[10px]">
                <Bell size={10} />
                {formatDate(reminder.remindAt)}
              </span>
            )}
            <span className="text-[10px] text-surface-500 flex items-center gap-1">
              <Clock size={10} />
              {timeAgo(tab.createdAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            onClick={() => toggleArchive(tab.id)}
            className="p-2 rounded-lg hover:bg-surface-700/50 text-surface-400 hover:text-purple-400 transition-colors"
            title={tab.isArchived ? "Unarchive" : "Archive"}
            aria-label={tab.isArchived ? "Unarchive saved page" : "Archive saved page"}
          >
            <Archive size={14} />
          </button>
          <button
            onClick={() => { setShowReminderPicker(!showReminderPicker); setShowTagPicker(false); }}
            className="p-2 rounded-lg hover:bg-surface-700/50 text-surface-400 hover:text-amber-400 transition-colors"
            title={reminder ? "Reset Reminder" : "Set Reminder"}
            aria-label={reminder ? "Reset reminder" : "Set reminder"}
          >
            <Bell size={14} />
          </button>
          <button
            onClick={handleCloseChromeTab}
            className="p-2 rounded-lg hover:bg-red-500/20 text-surface-400 hover:text-red-400 transition-colors"
            title="Close Tab in Browser"
            aria-label="Close this page in the browser"
          >
            <XCircle size={14} />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-lg hover:bg-red-500/20 text-surface-400 hover:text-red-400 transition-colors"
            title="Delete from Dashboard"
            aria-label="Delete saved page"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Reminder Picker Dropdown */}
      {showReminderPicker && (
        <div className="absolute right-4 top-14 z-50 glass rounded-xl p-2 min-w-[200px] 
                      animate-scale-in shadow-xl shadow-black/40">
          <div className="flex items-center justify-between px-2 pb-1 mb-1 border-b border-surface-700/50">
            <span className="text-xs text-surface-400 font-medium">{reminder ? 'Reset Reminder' : 'Set Reminder'}</span>
            <button onClick={() => setShowReminderPicker(false)} className="text-surface-500 hover:text-surface-300">
              <X size={12} />
            </button>
          </div>
          {REMINDER_PRESETS.filter(p => p.id !== 'custom').map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSetReminder(preset)}
              className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium
                        hover:bg-surface-700/50 text-surface-300 transition-colors
                        flex items-center gap-2"
            >
              <span>{preset.icon}</span>
              {preset.label}
            </button>
          ))}
          <div className="mt-1 pt-1 border-t border-surface-700/50 space-y-1.5 p-1">
            <input 
              type="datetime-local"
              value={customDateTime}
              onChange={(e) => setCustomDateTime(e.target.value)}
              className="input-field text-xs"
            />
            <select value={repeat} onChange={e => setRepeat(e.target.value)} className="input-field text-xs">
              <option value="">No repeat</option><option value="daily">Repeat daily</option><option value="weekly">Repeat weekly</option>
            </select>
            <button
              onClick={handleCustomReminder}
              disabled={!customDateTime}
              className="btn-primary w-full text-xs py-1.5"
            >
              Set Custom
            </button>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative glass rounded-xl p-5 max-w-sm w-full shadow-2xl">
            <h3 className="font-semibold text-surface-100">Delete this saved page?</h3>
            <p className="text-sm text-surface-400 mt-2">{reminder ? 'This tab has a reminder. Delete the tab and its reminder?' : 'This cannot be undone.'}</p>
            <div className="flex justify-end gap-2 mt-5">
              <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>No</button>
              <button className="btn-danger" onClick={() => { removeTab(tab.id); setShowDeleteConfirm(false); }}>Yes, delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
