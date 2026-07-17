export default function SkeletonCard() {
  return (
    <div className="bg-card rounded-xl p-5 border border-border/50 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-accent/60 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-accent/60 rounded w-1/3" />
          <div className="h-3 bg-accent/40 rounded w-1/2" />
          <div className="h-3 bg-accent/30 rounded w-1/4" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-20 bg-accent/40 rounded-lg" />
          <div className="h-9 w-16 bg-accent/30 rounded-lg" />
        </div>
      </div>
    </div>
  );
}