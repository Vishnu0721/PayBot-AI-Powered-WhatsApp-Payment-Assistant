export default function BackendStatus({ connected, loading }) {
  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-[#C4C0B6]" />
        Checking backend…
      </p>
    );
  }

  if (connected) {
    return (
      <p className="flex items-center gap-2 text-sm text-forest-mid">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
        Backend connected
      </p>
    );
  }

  return (
    <p className="flex items-center gap-2 text-sm text-[#B42318]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#B42318]" />
      Backend unavailable
    </p>
  );
}
