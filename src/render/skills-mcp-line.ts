import type { HudColorOverrides } from '../config.js';
import type { RenderContext, SkillEntry } from '../types.js';
import { cyan, dim, green, label, bold, yellow } from './colors.js';
import { sanitizeDisplayText } from '../utils/sanitize.js';

const MAX_ITEMS_SHOWN = 4;
const ACTIVITY_NAME_MAX_LEN = 64;

export function renderSkillsLine(ctx: RenderContext): string | null {
  if (ctx.config?.display?.showSkills !== true) {
    return null;
  }

  const skills = ctx.transcript.skills ?? [];
  if (skills.length === 0) {
    return null;
  }

  // Two tiers: session-total (all) and current-question (recent only).
  // "current question" = the last user turn that triggered any skill, so a
  // later feedback message that triggers no skill does not steal the label.
  const sessionEntries = skills;
  const recentEntries = skills.filter((s) => s.recent);

  const sessionPart = renderSkillNames(sessionEntries, ctx.config?.colors);
  if (!sessionPart) {
    return null;
  }
  // Session tier uses a dim label; recent tier uses a bold+yellow label so the
  // "current question" skills stand out from the session-total line.
  const parts = [`${dim('会话')} ${sessionPart}`];
  const recentPart = renderSkillNames(recentEntries, ctx.config?.colors);
  if (recentPart) {
    parts.push(`${bold(yellow('本次'))} ${recentPart}`);
  }
  return parts.join(' | ');
}

/** Render skills as `✓ Skills (N): name1 ×2, name2, +X more`. */
function renderSkillNames(entries: SkillEntry[], colors?: Partial<HudColorOverrides>): string | null {
  const safe = entries
    .map((e) => ({ name: safeActivityName(e.name), count: e.count }))
    .filter((e): e is { name: string; count: number } => Boolean(e.name));
  if (safe.length === 0) {
    return null;
  }

  const visible = safe.slice(0, MAX_ITEMS_SHOWN).map((e) => {
    const name = cyan(e.name);
    return e.count > 1 ? `${name} ${label(`×${e.count}`, colors)}` : name;
  });
  const hiddenCount = safe.length - visible.length;
  if (hiddenCount > 0) {
    visible.push(label(`+${hiddenCount} more`, colors));
  }

  return `${green('✓')} Skills ${label(`(${safe.length})`, colors)}: ${visible.join(', ')}`;
}

export function renderMcpLine(ctx: RenderContext): string | null {
  if (ctx.config?.display?.showMcp !== true) {
    return null;
  }

  return renderNameListLine('MCPs', ctx.transcript.mcpServers ?? [], ctx.config?.colors);
}

function renderNameListLine(
  title: string,
  names: string[],
  colors?: Partial<HudColorOverrides>,
): string | null {
  const safeNames = names.map(safeActivityName).filter((name): name is string => Boolean(name));
  if (safeNames.length === 0) {
    return null;
  }

  const visibleNames = safeNames.slice(0, MAX_ITEMS_SHOWN).map((name) => cyan(name));
  const hiddenCount = safeNames.length - visibleNames.length;
  if (hiddenCount > 0) {
    visibleNames.push(label(`+${hiddenCount} more`, colors));
  }

  return `${green('✓')} ${title} ${label(`(${safeNames.length})`, colors)}: ${visibleNames.join(', ')}`;
}

function safeActivityName(value: string): string | null {
  const sanitized = sanitizeDisplayText(value).trim();

  if (!sanitized) {
    return null;
  }

  if (sanitized.length <= ACTIVITY_NAME_MAX_LEN) {
    return sanitized;
  }

  return `${sanitized.slice(0, ACTIVITY_NAME_MAX_LEN - 1)}…`;
}
