import type { PlanEntry } from '../state/store';

export function PlanList({ plan }: { plan: PlanEntry[] }) {
  const completed = plan.filter((p) => p.status === 'completed').length;
  const total = plan.length;
  const pct = total ? (completed / total) * 100 : 0;
  return (
    <div className="plan">
      <div className="plan-header">
        <strong>📋 Plano</strong>
        <span className="muted">{completed}/{total}</span>
      </div>
      <div className="plan-progress">
        <div className="plan-fill" style={{ width: pct + '%' }} />
      </div>
      <ol>
        {plan.map((e, i) => (
          <li key={i} className={`prio-${e.priority} status-${e.status}`}>
            <span className="check">
              {e.status === 'completed' ? '✓' : e.status === 'in_progress' ? '⟳' : '○'}
            </span>
            <span className="content">{e.content}</span>
            <span className="badge">{e.priority}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
