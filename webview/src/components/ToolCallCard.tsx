import type { Message } from '../state/store';
import { useStore } from '../state/store';
import { renderMarkdown } from '../utils/markdown';

const kindIcons: Record<string, string> = {
  read: '📖',
  edit: '✏️',
  delete: '🗑️',
  move: '📦',
  search: '🔍',
  execute: '⚡',
  think: '🧠',
  fetch: '🌐',
  other: '🔧',
};

const statusIcons: Record<string, string> = {
  pending: '⋯',
  in_progress: '⟳',
  completed: '✓',
  failed: '✗',
};

export function ToolCallCard({ m }: { m: Message }) {
  const s = useStore();
  const open = m.toolStatus === 'in_progress' || m.toolStatus === 'failed';
  const icon = kindIcons[m.toolKind ?? 'other'] ?? '🔧';
  const status = statusIcons[m.toolStatus ?? 'pending'] ?? '⋯';
  return (
    <details className={`tool-card tool-${m.toolStatus}`} open={open}>
      <summary>
        <span className="icon">{icon}</span>
        <span className="title">{m.toolTitle ?? 'Tool call'}</span>
        {m.toolLocations?.[0] && (
          <code
            className="path"
            onClick={(e) => {
              e.preventDefault();
              s.openFile(m.toolLocations![0].path);
            }}
          >
            {shortPath(m.toolLocations[0].path)}
            {m.toolLocations[0].line ? `:${m.toolLocations[0].line}` : ''}
          </code>
        )}
        <span className="status">{status}</span>
      </summary>
      <div className="tool-body">
        {m.toolDiff && (
          <pre className="diff">
            <code dangerouslySetInnerHTML={{ __html: renderDiff(m.toolDiff.oldText ?? '', m.toolDiff.newText) }} />
          </pre>
        )}
        {m.toolOutput && (
          <pre className="output" dangerouslySetInnerHTML={{ __html: renderMarkdown('```\n' + m.toolOutput.slice(0, 4000) + '\n```') }} />
        )}
        {m.toolDiff && (
          <button onClick={() => s.openFile(m.toolDiff!.path)}>Abrir arquivo</button>
        )}
      </div>
    </details>
  );
}

function shortPath(p: string): string {
  const parts = p.split(/[\\/]/);
  return parts.length <= 3 ? p : '…/' + parts.slice(-3).join('/');
}

function renderDiff(oldText: string, newText: string): string {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const out: string[] = [];
  for (const l of oldLines) out.push(`<span class="d-d">- ${esc(l)}</span>`);
  for (const l of newLines) out.push(`<span class="d-a">+ ${esc(l)}</span>`);
  return out.join('\n');
}
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
