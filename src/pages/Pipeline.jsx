import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { format, parseISO, addDays, isToday } from 'date-fns';
import { ArrowLeft, X, Clock } from 'lucide-react';
import SignalBadge from '@/components/callroom/SignalBadge';
import RsvpBadge from '@/components/callroom/RsvpBadge';

const ACTIVE_STATUSES = ['Upcoming', 'Live'];
const SIGNAL_FILTERS = [{ value: 'all', label: 'All' },{ value: 'Strong', label: '🟢 Strong' },{ value: 'Warm', label: '🟡 Warm' },{ value: 'Weak', label: '🔴 Weak' },{ value: 'Unknown', label: '❓ Unknown' }];
function initials(name) { if (!name) return '?'; return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(); }

export default function Pipeline() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signalFilter, setSignalFilter] = useState('all');
  const [view, setView] = useState('week');

  const loadCards = async () => {
    const all = await base44.entities.CallCard.list('-start_time', 200);
    const now = new Date(); const weekEnd = addDays(now, 7);
    const upcoming = all.filter(c => { if (!c.start_time) return false; const d = parseISO(c.start_time); return d >= now && d <= weekEnd && ACTIVE_STATUSES.includes(c.status); }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    setCards(upcoming); setLoading(false);
  };

  useEffect(() => { const unsub = base44.entities.CallCard.subscribe(() => { loadCards(); }); return unsub; }, []);
  useEffect(() => { loadCards(); }, []);

  const handleNoShow = async (card) => { await base44.entities.CallCard.update(card.id, { status: 'No-Show' }); setCards(prev => prev.filter(c => c.id !== card.id)); };
  const handleCancel = async (card) => { await base44.entities.CallCard.update(card.id, { status: 'Cancelled' }); setCards(prev => prev.filter(c => c.id !== card.id)); };
  const handleReschedule = async (card) => { await base44.entities.CallCard.update(card.id, { status: 'Rescheduled' }); setCards(prev => prev.filter(c => c.id !== card.id)); };

  const viewFiltered = view === 'day' ? cards.filter(c => isToday(parseISO(c.start_time))) : cards;
  const filtered = signalFilter === 'all' ? viewFiltered : viewFiltered.filter(c => c.enterprise_signal === signalFilter);
  const days = filtered.reduce((acc, card) => {
    const dayKey = format(parseISO(card.start_time), 'yyyy-MM-dd'); const dayLabel = format(parseISO(card.start_time), 'EEEE, MMMM d');
    const existing = acc.find(d => d.key === dayKey);
    if (existing) existing.cards.push(card); else acc.push({ key: dayKey, label: dayLabel, cards: [card] });
    return acc;
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 px-6 py-4 flex items-center gap-4 sticky top-0 bg-background/95 backdrop-blur z-10">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-4 h-4" /></Link>
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-foreground">Pipeline — {view === 'day' ? format(new Date(), 'MMMM d') : 'Next 7 Days'}</h1>
          {!loading && (<div className="flex items-center gap-1.5"><span className="text-xs font-semibold bg-secondary text-foreground px-2.5 py-1 rounded-full">{viewFiltered.length} this {view}</span>{view === 'week' && (<span className="text-xs font-semibold bg-secondary/60 text-muted-foreground px-2.5 py-1 rounded-full">{cards.filter(c => isToday(parseISO(c.start_time))).length} today</span>)}</div>)}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center bg-secondary rounded-lg p-0.5 gap-0.5">
            {['day','week'].map(v => (<button key={v} onClick={() => setView(v)} className={`text-xs px-3 py-1 rounded-md transition-colors font-medium capitalize ${view === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{v}</button>))}
          </div>
          <div className="flex items-center gap-1">
            {SIGNAL_FILTERS.map(f => (<button key={f.value} onClick={() => setSignalFilter(f.value)} className={`text-xs px-3 py-1.5 rounded-full transition-colors ${signalFilter === f.value ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}>{f.label}</button>))}
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (<div className="text-center py-20 text-muted-foreground">Loading...</div>)
        : days.length === 0 ? (<div className="text-center py-24"><p className="text-lg font-semibold text-foreground">Pipeline is clear.</p><p className="text-muted-foreground mt-1">No upcoming calls in the next 7 days.</p></div>)
        : (<div className="space-y-8">{days.map(day => (<div key={day.key}><h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">{day.label}</h2><div className="space-y-2.5">{day.cards.map(card => (<div key={card.id} className="bg-card rounded-xl p-4 border border-border/50 flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-foreground flex-shrink-0">{initials(card.attendee_name)}</div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="font-medium text-sm text-foreground">{card.attendee_name || 'Unknown'}</span><RsvpBadge status={card.rsvp_status} /><SignalBadge signal={card.enterprise_signal} /></div><p className="text-xs text-muted-foreground mt-0.5">{[card.company_name, format(parseISO(card.start_time), 'h:mm a')].filter(Boolean).join(' · ')}</p></div><div className="flex items-center gap-1.5 flex-shrink-0"><Link to={`/brief/${card.id}`} className="text-xs border border-border hover:border-foreground/30 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors">Brief</Link><button onClick={() => handleReschedule(card)} title="Rescheduled" className="text-xs text-muted-foreground/50 hover:text-amber-400 transition-colors px-1.5 py-1.5 rounded hover:bg-amber-400/10"><Clock className="w-3.5 h-3.5" /></button><button onClick={() => handleCancel(card)} title="Cancel" className="text-xs text-muted-foreground/50 hover:text-destructive transition-colors px-1.5 py-1.5 rounded hover:bg-destructive/10"><X className="w-3.5 h-3.5" /></button><button onClick={() => handleNoShow(card)} className="text-xs text-muted-foreground/50 hover:text-destructive transition-colors px-1">No-show</button></div></div>))}</div></div>))}</div>)}
      </main>
    </div>
  );
}