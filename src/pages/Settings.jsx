import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, RefreshCw } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({ sync_enabled: true, research_depth: 'quick', last_sync: null });
  const [settingsId, setSettingsId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  useEffect(() => {
    base44.entities.AppSettings.list().then(all => { if (all.length > 0) { setSettings(all[0]); setSettingsId(all[0].id); } });
  }, []);

  const update = async (changes) => {
    const merged = { ...settings, ...changes }; setSettings(merged);
    if (settingsId) { await base44.entities.AppSettings.update(settingsId, changes); }
    else { const created = await base44.entities.AppSettings.create(merged); setSettingsId(created.id); }
  };

  const handleSync = async () => {
    setSyncing(true); setSyncResult(null);
    try {
      const res = await base44.functions.invoke('syncCalendar', {}); setSyncResult(res.data);
      const all = await base44.entities.AppSettings.list();
      if (all.length > 0) { setSettings(all[0]); setSettingsId(all[0].id); }
    } catch (e) { setSyncResult({ error: e.message }); }
    setSyncing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 px-6 py-4 flex items-center gap-3 sticky top-0 bg-background/95 backdrop-blur z-10">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-4 h-4" /></Link>
        <h1 className="font-semibold text-foreground">Settings</h1>
      </header>
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        <div className="bg-card rounded-xl p-6 border border-border/50">
          <h2 className="font-semibold text-foreground mb-1">Google Calendar Sync</h2>
          <p className="text-xs text-muted-foreground mb-5">{settings.last_sync ? `Last synced ${format(parseISO(settings.last_sync), 'MMM d · h:mm a')}` : 'Never synced'}</p>
          <div className="flex items-center justify-between mb-5">
            <div><p className="text-sm text-foreground/80 font-medium">Auto-sync</p><p className="text-xs text-muted-foreground">Pull new calendar events automatically</p></div>
            <button onClick={() => update({ sync_enabled: !settings.sync_enabled })} className={`relative w-11 h-6 rounded-full transition-colors ${settings.sync_enabled ? 'bg-blue-600' : 'bg-accent'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.sync_enabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <button onClick={handleSync} disabled={syncing} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />{syncing ? 'Syncing...' : 'Sync Now'}
          </button>
          {syncResult && !syncResult.error && <p className="text-xs text-green-400 mt-3">✓ Synced — {syncResult.created} new card{syncResult.created !== 1 ? 's' : ''} created, {syncResult.skipped} skipped</p>}
          {syncResult?.error && <p className="text-xs text-red-400 mt-3">Error: {syncResult.error}</p>}
        </div>
        <div className="bg-card rounded-xl p-6 border border-border/50">
          <h2 className="font-semibold text-foreground mb-1">Research Depth</h2>
          <p className="text-xs text-muted-foreground mb-5">Deep research uses live web context and costs more AI credits.</p>
          <div className="flex gap-3">
            {[{ value: 'quick', label: 'Quick', desc: 'HubSpot + AI analysis' },{ value: 'deep', label: 'Deep', desc: 'HubSpot + Gmail + Web research' }].map(opt => (
              <button key={opt.value} onClick={() => update({ research_depth: opt.value })} className={`flex-1 text-left p-4 rounded-xl border transition-colors ${settings.research_depth === opt.value ? 'border-blue-500/60 bg-blue-500/10' : 'border-border/50 hover:border-foreground/20'}`}>
                <p className="font-medium text-sm text-foreground">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}