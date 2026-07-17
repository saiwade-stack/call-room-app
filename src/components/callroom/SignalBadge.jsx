export default function SignalBadge({ signal }) {
  const config = {
    Strong: { label: '🟢 Strong', className: 'bg-green-500/15 text-green-400 border-green-500/25' },
    Warm:   { label: '🟡 Warm',   className: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
    Weak:   { label: '🔴 Weak',   className: 'bg-red-500/15 text-red-400 border-red-500/25' },
    Unknown:{ label: '❓ Unknown', className: 'bg-muted text-muted-foreground border-border' },
  };
  const c = config[signal] || config.Unknown;
  return (<span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium ${c.className}`}>{c.label}</span>);
}