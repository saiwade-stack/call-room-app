import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import SignalBadge from './SignalBadge';
import RsvpBadge from './RsvpBadge';

function initials(name) { if (!name) return '?'; return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(); }

export default function CallCardRow({ card }) {
  const isLive = card.status === 'Live'; const isCompleted = card.status === 'Completed';
  return (
    <div className={`bg-card rounded-xl p-5 border transition-all ${isLive ? 'border-blue-500/50 ring-1 ring-blue-500/15' : 'border-border/50'} ${isCompleted ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-base font-bold text-foreground flex-shrink-0">{initials(card.attendee_name)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="font-semibold text-foreground">{card.attendee_name || 'Unknown'}</span>
            <RsvpBadge status={card.rsvp_status} /><SignalBadge signal={card.enterprise_signal} />
            {isLive && <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">LIVE</span>}
          </div>
          <p className="text-sm text-muted-foreground">{[card.attendee_title, card.company_name].filter(Boolean).join(' · ')}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">{card.title} · {format(parseISO(card.start_time), 'h:mm a')}</p>
          {card.research_status === 'Researching' && <p className="text-xs text-blue-400/60 mt-1.5 flex items-center gap-1"><span className="animate-spin inline-block">⟳</span> Researching...</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
          {card.meet_link ? (
            <a href={card.meet_link} target="_blank" rel="noopener noreferrer" className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1.5">Join <ExternalLink className="w-3 h-3" /></a>
          ) : (<span className="text-xs text-muted-foreground/40 px-4 py-2">No link</span>)}
          <Link to={`/brief/${card.id}`} className="border border-border/70 hover:border-foreground/30 text-muted-foreground hover:text-foreground text-sm px-4 py-2 rounded-lg transition-colors">Brief</Link>
        </div>
      </div>
    </div>
  );
}