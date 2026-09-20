import type { RenderContext } from "../../types.js";
import {
  getContextPercent,
  getBufferedPercent,
} from "../../stdin.js";
import { coloredBar, label, getContextColor, dim, green, yellow, red, RESET } from "../colors.js";
import { getAdaptiveBarWidth } from "../../utils/terminal.js";
import { t } from "../../i18n/index.js";
import {
  progressLabel,
  type ProgressLabelInput,
} from "./label-align.js";
import { formatTokens, formatContextValue } from "../../utils/format.js";
import { createDebug } from "../../debug.js";

const debug = createDebug("context");

export function renderIdentityLine(
  ctx: RenderContext,
  labelOptions: ProgressLabelInput = {},
): string {
  const autoCompactWindow = ctx.config?.display?.autoCompactWindow ?? null;
  const rawPercent = getContextPercent(ctx.stdin, autoCompactWindow);
  const bufferedPercent = getBufferedPercent(ctx.stdin, autoCompactWindow);
  const autocompactMode = ctx.config?.display?.autocompactBuffer ?? "enabled";
  const percent = autocompactMode === "disabled" ? rawPercent : bufferedPercent;
  const colors = ctx.config?.colors;

  if (autocompactMode === "disabled") {
    debug(
      `autocompactBuffer=disabled, showing raw ${rawPercent}% (buffered would be ${bufferedPercent}%)`,
    );
  }

  const display = ctx.config?.display;
  const contextThresholds = {
    warning: display?.contextWarningThreshold,
    critical: display?.contextCriticalThreshold,
  };
  const contextValueMode = display?.contextValue ?? "percent";
  const contextValue = formatContextValue(ctx, percent, contextValueMode);
  const contextValueDisplay = `${getContextColor(percent, colors, contextThresholds)}${contextValue}${RESET}`;

  let line =
    display?.showContextBar !== false
      ? `${progressLabel("label.context", colors, labelOptions)} ${coloredBar(percent, getAdaptiveBarWidth(), colors, contextThresholds)} ${contextValueDisplay}`
      : `${progressLabel("label.context", colors, labelOptions)} ${contextValueDisplay}`;

  if (display?.showTokenBreakdown !== false && percent >= (display?.contextCriticalThreshold ?? 85)) {
    const usage = ctx.stdin.context_window?.current_usage;
    if (usage) {
      const input = formatTokens(usage.input_tokens ?? 0);
      const cache = formatTokens(
        (usage.cache_creation_input_tokens ?? 0) +
          (usage.cache_read_input_tokens ?? 0),
      );
      line += label(
        ` (${t("format.in")}: ${input}, ${t("format.cache")}: ${cache})`,
        colors,
      );
    }
  }

  // Append cache hit rate: cache_read / total input. Shown by default; set
  // display.showCacheHit === false to hide. Only shown when there has been any
  // cache activity (cache_read or cache_creation > 0) — a cold/no-cache turn
  // would otherwise display a misleading "0%".
  if (display?.showCacheHit !== false) {
    const usage = ctx.stdin.context_window?.current_usage;
    const input = usage?.input_tokens ?? 0;
    const cacheCreation = usage?.cache_creation_input_tokens ?? 0;
    const cacheRead = usage?.cache_read_input_tokens ?? 0;
    const totalInput = input + cacheCreation + cacheRead;
    if (totalInput > 0 && (cacheRead > 0 || cacheCreation > 0)) {
      const hitRatio = cacheRead / totalInput; // 0..1
      const hitPercent = hitRatio * 100; // for threshold + display
      const hitColor =
        hitPercent >= 90 ? green : hitPercent >= 70 ? yellow : red;
      line += ` ${dim("Ch:")} ${hitColor(`${hitPercent.toFixed(3)}%`)}`;
    }
  }

  return line;
}
