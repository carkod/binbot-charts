import type { ITimeScaleApi } from "./charting_library";

/** Fixed candle duration for the crypto chart's intraday, daily and weekly intervals. */
export function intervalSeconds(resolution: string): number | null {
  const match = /^(\d+)([SDW]?)$/.exec(resolution);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = { S: 1, D: 86400, W: 604800, "": 60 }[match[2]];
  return amount > 0 ? amount * unit : null;
}

/**
 * TradingView returns null for coordinates beyond the latest candle. Anchor
 * future times to a real candle's pixel center, then project using bar spacing.
 * This keeps expiry timestamps in the future instead of snapping to the last bar.
 */
export function timeScaleMapping(scale: ITimeScaleApi, seconds: number) {
  const width = scale.width();
  const spacing = scale.barSpacing();
  if (width <= 0 || spacing <= 0 || seconds <= 0) return null;
  let anchorX: number | null = null;
  let anchorTime: number | null = null;
  for (let i = 32; i >= 0; i--) {
    const x = (width * i) / 32;
    const time = scale.coordinateToTime(x);
    if (time != null && Number.isFinite(time)) {
      anchorX = x;
      anchorTime = time;
      break;
    }
  }
  if (anchorX == null || anchorTime == null) return null;

  // Find this candle's right edge to avoid a half-bar positioning error.
  let low = anchorX;
  let high = anchorX + spacing * 1.5;
  for (let i = 0; i < 24; i++) {
    const middle = (low + high) / 2;
    if (scale.coordinateToTime(middle) === anchorTime) low = middle;
    else high = middle;
  }
  const center = (low + high) / 2 - spacing / 2;
  const timeAt = (x: number) =>
    scale.coordinateToTime(x) ??
    anchorTime + ((x - center) / spacing) * seconds;

  return {
    timeAt,
    coordinateAt: (time: number) => {
      if (time >= anchorTime)
        return center + ((time - anchorTime) / seconds) * spacing;
      // Preserve actual candle positions when historical data has gaps.
      let left = 0;
      let right = width;
      if (time < timeAt(left)) return -1;
      for (let i = 0; i < 24; i++) {
        const middle = (left + right) / 2;
        if (timeAt(middle) < time) left = middle;
        else right = middle;
      }
      return (left + right) / 2 + spacing / 2;
    },
  };
}
