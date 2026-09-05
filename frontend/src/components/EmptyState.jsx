export default function EmptyState({ title, description, action }) {
  return (
    <div className="pb-card px-6 py-14 text-center">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="mx-auto mt-2 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
