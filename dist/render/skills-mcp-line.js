import { cyan, dim, green, label, bold, yellow } from './colors.js';
import { sanitizeDisplayText } from '../utils/sanitize.js';
const MAX_ITEMS_SHOWN = 4;
const ACTIVITY_NAME_MAX_LEN = 64;
export function renderSkillsLine(ctx) {
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
    const sessionNames = skills.map((s) => s.name);
    const recentNames = skills.filter((s) => s.recent).map((s) => s.name);
    const sessionPart = renderSkillNames(sessionNames, ctx.config?.colors);
    if (!sessionPart) {
        return null;
    }
    // Session tier uses a dim label; recent tier uses a bold+yellow label so the
    // "current question" skills stand out from the session-total line.
    const parts = [`${dim('会话')} ${sessionPart}`];
    const recentPart = renderSkillNames(recentNames, ctx.config?.colors);
    if (recentPart) {
        parts.push(`${bold(yellow('本次'))} ${recentPart}`);
    }
    return parts.join(' | ');
}
/** Render a list of skill names as `✓ Skills (N): name1, name2, +X more`. */
function renderSkillNames(names, colors) {
    const safeNames = names.map(safeActivityName).filter((name) => Boolean(name));
    if (safeNames.length === 0) {
        return null;
    }
    const visibleNames = safeNames.slice(0, MAX_ITEMS_SHOWN).map((name) => cyan(name));
    const hiddenCount = safeNames.length - visibleNames.length;
    if (hiddenCount > 0) {
        visibleNames.push(label(`+${hiddenCount} more`, colors));
    }
    return `${green('✓')} Skills ${label(`(${safeNames.length})`, colors)}: ${visibleNames.join(', ')}`;
}
export function renderMcpLine(ctx) {
    if (ctx.config?.display?.showMcp !== true) {
        return null;
    }
    return renderNameListLine('MCPs', ctx.transcript.mcpServers ?? [], ctx.config?.colors);
}
function renderNameListLine(title, names, colors) {
    const safeNames = names.map(safeActivityName).filter((name) => Boolean(name));
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
function safeActivityName(value) {
    const sanitized = sanitizeDisplayText(value).trim();
    if (!sanitized) {
        return null;
    }
    if (sanitized.length <= ACTIVITY_NAME_MAX_LEN) {
        return sanitized;
    }
    return `${sanitized.slice(0, ACTIVITY_NAME_MAX_LEN - 1)}…`;
}
//# sourceMappingURL=skills-mcp-line.js.map