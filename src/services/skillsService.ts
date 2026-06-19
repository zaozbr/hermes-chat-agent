import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { logger } from '../utils/logger';

const exec = promisify(execFile);

export interface SkillInfo {
  name: string;
  description: string;
  source: 'local' | 'hub' | 'bundled' | 'unknown';
  enabled: boolean;
}

class SkillsService {
  async list(hermesPath: string): Promise<{ raw: string; parsed: SkillInfo[] }> {
    try {
      const { stdout } = await exec(hermesPath, ['skills', 'list'], { timeout: 15000 });
      return { raw: stdout, parsed: parseSkills(stdout) };
    } catch (e) {
      logger.warn(`skills list failed: ${(e as Error).message}`);
      return { raw: '', parsed: [] };
    }
  }
}

function parseSkills(text: string): SkillInfo[] {
  const out: SkillInfo[] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip top/middle/bottom borders.
    if (/^[┌├└]/.test(trimmed)) continue;
    // Skip summary line ("5 hub-installed, 60 builtin…")
    if (/^\d+\s+(hub|local|builtin)/i.test(trimmed)) continue;
    // Skip the centered title.
    if (trimmed === 'Installed Skills') continue;
    // Data rows begin and end with the vertical-bar character.
    if (!trimmed.startsWith('│') || !trimmed.endsWith('│')) continue;
    const fields = trimmed
      .slice(1, -1)
      .split('│')
      .map((s) => s.trim());
    if (fields.length < 2) continue;
    const [name, category, source, _trust, status] = fields;
    // Skip the header row.
    if (name === 'Name') continue;
    out.push({
      name: name ?? '',
      description: category || '',
      source: source === 'hub' ? 'hub' : source === 'local' ? 'local' : 'bundled',
      enabled: /enabled/i.test(status ?? ''),
    });
  }
  return out;
}

export const skillsService = new SkillsService();
