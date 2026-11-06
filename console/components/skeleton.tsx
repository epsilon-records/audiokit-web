/** Loading placeholders that match the shape of the loaded content. */
export function SkeletonLine({ width = "100%" }: { width?: string }) {
  return <div className="skeleton skeleton-line" style={{ width }} />;
}

export function SkeletonTile() {
  return (
    <div className="stat" aria-hidden>
      <SkeletonLine width="40%" />
      <SkeletonLine width="65%" />
      <SkeletonLine width="50%" />
    </div>
  );
}

export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="stack" aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonLine key={index} width={index % 2 === 0 ? "90%" : "70%"} />
      ))}
    </div>
  );
}
