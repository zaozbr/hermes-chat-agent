import { store } from '../state/store';
import { vscode } from '../utils/vscode';

export function PermissionDialog({ req }: { req: { toolCallId: string; title: string; options: Array<{ optionId: string; name: string; kind: string }> } }) {
  return (
    <div className="permission-dialog">
      <div className="permission-card">
        <h3>🔐 {req.title}</h3>
        <p className="muted">id: {req.toolCallId}</p>
        <div className="permission-options">
          {req.options.map((opt) => (
            <button
              key={opt.optionId}
              className={`opt ${opt.kind}`}
              onClick={() => {
                store.respondPermission(opt.optionId);
                vscode.postMessage({ type: 'permission-response', optionId: opt.optionId });
              }}
            >
              {opt.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
