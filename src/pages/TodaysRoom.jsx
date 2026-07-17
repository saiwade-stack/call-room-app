import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { format, isToday, parseISO } from 'date-fns';
import { RefreshCw, Settings, Bot } from 'lucide-react';
import CountdownTimer from '@/components/callroom/CountdownTimer';
import CallCardRow from '@/components/callroom/CallCardRow';
import SkeletonCard from '@/components/callroom/SkeletonCard';

const ACTIVE_STATUSES = ['Upcoming', 'Live', 'Completed'];

export default function TodaysRoom() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [internalDomain, setInternalDomain] = useState('');

  const loadCards = useCallback(async () => {
    try {
      const [all, settingsList] = await Promise.all([
        base44.entities.CallCard.list('-start_time', 200),
        base44.entities.AppSettings.list()
      ]);
      const myDomain = settingsList[0]?.internal_domain || '';
      if (myDomain) setInternalDomain(myDomain);
      const today = all.filter(c => {
        if (!c.start_time || !isToday(parseISO(c.start_time))) return false;
        if (!ACTIVE_STATUSES.includes(c.status)) return false;
        if (myDomain && c.company_domain && c.company_domain.toLowerCase() === myDomain.toLowerCase()) return false;
        return true;
      }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      setCards(today);
      const pending = today.filter(c => c.research_status === 'Pending');
      pending.forEach(c => { base44.functions.invoke('researchCall', { card_id: c.id }).catch(() => {}); });
      base44.functions.invoke('refreshLiveStatus', {})
        .then(() => base44.entities.CallCard.list('-start_time', 200))
        .then(updated => {
          const domain = myDomain;
          const todayUpdated = updated.filter(c => {
            if (!c.start_time || !isToday(parseISO(c.start_time))) return false;
            if (!ACTIVE_STATUSES.includes(c.status)) return false;
            if (domain && c.company_domain && c.company_domain.toLowerCase() === domain.toLowerCase()) return false;
            return true;
          }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
          setCards(todayUpdated);
        }).catch(() => {});
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    await base44.functions.invoke('syncCalendar', {}).catch(() => {});
    await loadCards();
    setSyncing(false);
  };

  useEffect(() => {
    handleSync();
    const interval = setInterval(handleSync, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const now = new Date();
  const liveCall = cards.find(c => c.status === 'Live');
  const nextCall = !liveCall ? cards.find(c => new Date(c.start_time) > now && c.status === 'Upcoming') : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/20 px-6 py-4 flex items-center justify-between sticky top-0 bg-[#1a1d23] z-10">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-white tracking-tight">📞 Call Room</span>
          <span className="text-sm text-white/50 hidden sm:block">{format(new Date(), 'EEEE, MMMM d')}</span>
          {!loading && (<span className="text-xs font-semibold bg-white/10 text-white/70 px-2.5 py-1 rounded-full">{cards.length} {cards.length === 1 ? 'call' : 'calls'} today</span>)}
        </div>
        <div className="flex items-center gap-4">
          <button onClick={handleSync} disabled={syncing} className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors disabled:opacity-40">
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
          <Link to="/pipeline" className="text-sm text-white/60 hover:text-white transition-colors">Pipeline</Link>
          <Link to="/agent" className="text-white/60 hover:text-white transition-colors" title="Call Room Assistant"><Bot className="w-4 h-4" /></Link>
          <Link to="/settings" className="text-white/60 hover:text-white transition-colors"><Settings className="w-4 h-4" /></Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {(liveCall || nextCall) && <CountdownTimer call={liveCall || nextCall} isLive={!!liveCall} />}
        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
        ) : cards.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">☀️</p>
            <p className="text-xl font-semibold text-foreground">No calls today.</p>
            <p className="text-muted-foreground mt-1">Enjoy it.</p>
            <button onClick={handleSync} disabled={syncing} className="mt-8 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border/50 px-4 py-2 rounded-lg">
              {syncing ? 'Syncing...' : 'Sync calendar to check'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">{cards.map(card => <CallCardRow key={card.id} card={card} />)}</div>
        )}
      </main>
    </div>
  );
}