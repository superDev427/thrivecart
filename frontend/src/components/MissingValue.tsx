export function MissingValue({ pending }: { pending: boolean }) {
  if (pending) {
    return (
      <span className="missing-value">
        <span className="skeleton skeleton--value" aria-hidden="true" />
        <span className="visually-hidden">Calculating</span>
      </span>
    );
  }

  return (
    <span className="missing-value">
      <span aria-hidden="true">—</span>
      <span className="visually-hidden">Unavailable</span>
    </span>
  );
}
