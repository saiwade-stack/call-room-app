export default function RsvpBadge({ status }) {
  const config = {
    accepted: { label: 'Accepted', className: 'text-green-400' },
    tentative: { label: 'Tentative', className: 'text-amber-400' },
    awaiting:  { label: 'Awaiting',  className: 'text-muted-foreground' },
  };
  const c = config[status] || config.awaiting;
  return <span className={`text-xs font-medium ${c.className}`}>{c.label}</span>;
}