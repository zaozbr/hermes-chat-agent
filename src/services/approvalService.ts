import * as vscode from 'vscode';

interface PermOption {
  optionId: string;
  name: string;
  kind: 'allow_once' | 'allow_always' | 'reject_once' | 'reject_always';
}
interface PermRequest {
  sessionId: string;
  toolCall: {
    toolCallId: string;
    title?: string;
    content?: Array<{ type: string; content?: { type?: string; text?: string } }>;
  };
  options: PermOption[];
}

class ApprovalService {
  async request(req: PermRequest): Promise<{ outcome: any }> {
    const tc = req.toolCall;
    const title = tc.title || 'Permission request';
    const desc = (tc.content ?? [])
      .filter((c) => c.type === 'content')
      .map((c) => (c.content && 'text' in c.content ? c.content.text : '') || '')
      .join('\n')
      .slice(0, 400);

    const picks: vscode.QuickPickItem[] = req.options.map((opt) => ({
      label: opt.name,
      description: opt.kind.replace(/_/g, ' '),
    }));

    const selected = await vscode.window.showQuickPick(picks, {
      title: `Hermes: ${title}`,
      placeHolder: desc || 'Allow this action?',
      ignoreFocusOut: true,
    });

    if (!selected) {
      return { outcome: { outcome: 'cancelled' } };
    }

    const idx = picks.indexOf(selected);
    const optionId = req.options[idx]?.optionId;
    return { outcome: { outcome: 'selected', optionId } };
  }
}

export const approvalService = new ApprovalService();
