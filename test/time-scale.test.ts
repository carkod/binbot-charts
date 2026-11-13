import { describe, expect, it } from "vitest";
import { intervalSeconds, timeScaleMapping } from "../src/time-scale";
import type { ITimeScaleApi } from "../src/charting_library";

// Ten hourly candles, centered at x=0, 10, ... 90. No future candles exist.
const start = 1_700_000_000;
const scale = {
  width: () => 200,
  barSpacing: () => 10,
  coordinateToTime: (x: number) => {
    const index = Math.round(x / 10);
    return index >= 0 && index < 10 ? start + index * 3600 : null;
  },
} as ITimeScaleApi;

describe("expiry time coordinates", () => {
  it("keeps future expiry six hours beyond the last bar and round-trips its time", () => {
    const mapping = timeScaleMapping(scale, 3600);
    const expiry = start + 15 * 3600 + 30 * 60;
    const x = mapping.coordinateAt(expiry);
    expect(x).toBeCloseTo(155, 4);
    expect(mapping.timeAt(x)).toBeCloseTo(expiry, 4);
  });

  it("aligns existing timestamps with candle centers", () => {
    const mapping = timeScaleMapping(scale, 3600);
    expect(mapping.coordinateAt(start + 3 * 3600)).toBeCloseTo(30, 4);
    expect(mapping.timeAt(30)).toBe(start + 3 * 3600);
  });

  it("waits for candle data instead of inventing an expiry coordinate", () => {
    expect(
      timeScaleMapping({ ...scale, coordinateToTime: () => null }, 3600),
    ).toBeNull();
  });

  it("uses each timeframe's duration and excludes non-time or variable-length bars", () => {
    expect(intervalSeconds("60")).toBe(3600);
    expect(intervalSeconds("15S")).toBe(15);
    expect(intervalSeconds("1D")).toBe(86400);
    expect(intervalSeconds("1W")).toBe(604800);
    expect(intervalSeconds("1M")).toBeNull();
    expect(intervalSeconds("10R")).toBeNull();
  });
});
