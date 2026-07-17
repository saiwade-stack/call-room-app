import { useState, useEffect } from 'react';
import { parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

export default function CountdownTimer({ call, isLive }) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    if (isLive) return;
    const update = () => {
      const diff = parseISO(call.start_time) - new Date();
      if (diff <= 0) { setTimeLeft('Now'); return; }
      const h = Math.floor(diff / 3600000); const m = Math.floor((diff % 3600000) / 60000); const s = Math.floor((diff % 60000) / 1000);
      if (h > 0) setTimeLeft(`${h}h ${m}m`); else if (m > 0) setTimeLeft(`${m}m ${s}s`); else setTimeLeft(`${s}s`);
    };
    update(); const timer = setInterval(update, 1000); return () => clearInterval(timer);
  }, [call.start_time, isLive]);

  if (isLive) {
    return (
      <div className="bg-blue-600/20 border border-blue-500/40 rounded-xl p-4 mb-6 flex items-center justify-between">
        <div><span className="text-xs font-bold uppercase tracking-widest text-blue-400">● Live Now</span><p className="font-semibold text-foreground mt-0.5">{call.attendee_name || call.title}</p></div>
        <div className="flex gap-2">
          {call.meet_link && (<a href={call.meet_link} target="_blank" rel="noopener noreferrer" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">Join Call <ExternalLink className="w-3.5 h-3.5" /></a>)}
          <Link to={`/brief/${call.id}`} className="border border-blue-500/40 text-blue-300 hover:bg-blue-500/10 px-4 py-2 rounded-lg text-sm transition-colors">Open Brief</Link>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 mb-6 flex items-center justify-between">
      <div><span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Next Call</span><p className="font-semibold text-foreground mt-0.5">{call.attendee_name || call.title}</p></div>
      <div className="flex items-center gap-4">
        <span className="text-2xl font-bold text-foreground tabular-nums">{timeLeft}</span>
        {call.meet_link && (<a href={call.meet_link} target="_blank" rel="noopener noreferrer" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Join Call</a>)}
      </div>
    </div>
  );
}