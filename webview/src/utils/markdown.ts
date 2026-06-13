import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: true });

export function renderMarkdown(md: string): string {
  const html = marked.parse(md, { async: false }) as string;
  return DOMPurify.sanitize(html);
}

export function codeFence(lang: string, code: string): string {
  return '```' + lang + '\n' + code.replace(/```/g, '`\u200b``') + '\n```';
}
