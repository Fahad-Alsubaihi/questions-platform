export default function QueueLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-md bg-muted animate-pulse" />
        <div className="h-4 w-72 rounded-md bg-muted animate-pulse" />
      </div>
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 rounded-lg border border-border bg-card animate-pulse" />
        ))}
      </div>
    </div>
  );
}
