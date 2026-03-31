type MetricCardProps = {
  label: string;
  value: string;
  accent?: "primary" | "danger";
};

export function MetricCard({ label, value, accent }: MetricCardProps) {
  const className = accent ? `metric-card ${accent}` : "metric-card";

  return (
    <article className={className}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
