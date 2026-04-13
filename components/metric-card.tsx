type MetricCardProps = {
  label: string;
  value: string;
  accent?: "primary" | "danger" | "neutral";
  icon?: string;
  helper?: string;
};

export function MetricCard({ label, value, accent, icon, helper }: MetricCardProps) {
  const className = accent ? `metric-card ${accent}` : "metric-card";

  return (
    <article className={className}>
      <div className="metric-card-head">
        <span>{label}</span>
        {icon ? <i aria-hidden="true">{icon}</i> : null}
      </div>
      <strong>{value}</strong>
      {helper ? <small>{helper}</small> : null}
    </article>
  );
}
