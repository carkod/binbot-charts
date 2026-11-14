import { act, render } from "@testing-library/react";
import TVChartContainer from "../src/main";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

// Exercise the chart component and its real TradingView wrapper.
// Only the API normally loaded inside the iframe is stubbed.
async function readyChart(container: HTMLElement) {
  const iframe = container.querySelector("iframe")!;
  const frameWindow = iframe.contentWindow!;
  const unsubscribe = vi.fn(() => {
    if (!iframe.isConnected) throw new Error("Chart iframe detached");
  });
  const subscription = { subscribe: vi.fn(), unsubscribe };
  const chart = {
    refreshMarks: vi.fn(),
    onVisibleRangeChanged: () => subscription,
    onDataLoaded: () => subscription,
    onIntervalChanged: () => subscription,
    getTimeScale: () => ({
      barSpacingChanged: () => subscription,
      rightOffsetChanged: () => subscription,
    }),
  };
  Object.assign(frameWindow, {
    widgetReady: (callback: () => void) => callback(),
    initializationFinished: vi.fn(),
    doWhenApiIsReady: (callback: () => void) => callback(),
    createShortcutAction: vi.fn(),
    tradingViewApi: {
      subscribe: vi.fn(),
      unsubscribe,
      activeChart: () => chart,
    },
  });
  // Model the browser's lost iframe window after its host is detached.
  // jsdom otherwise retains contentWindow after removal.
  Object.defineProperty(iframe, "contentWindow", {
    get: () => (iframe.isConnected ? frameWindow : null),
  });
  await act(async () => {
    frameWindow.dispatchEvent(
      new CustomEvent("innerWindowLoad", { detail: {} }),
    );
  });
  return { iframe, unsubscribe };
}

beforeEach(() => {
  // Keep the iframe local; its API is supplied by readyChart.
  vi.spyOn(URL, "createObjectURL").mockReturnValue("about:blank");
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn(() => 1),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it.each([false, true])(
  "unsubscribes before navigation detaches the chart (expiry marker: %s)",
  async (withMarker) => {
    const { container, unmount } = render(
      <TVChartContainer
        symbol="BTCUSDC"
        timeMarker={
          withMarker
            ? { id: "expiry", time: 1900000000, text: "Entry expiry" }
            : undefined
        }
      />,
    );
    const { iframe, unsubscribe } = await readyChart(container);
    expect(iframe.isConnected).toBe(true);

    expect(() => unmount()).not.toThrow();

    expect(unsubscribe).toHaveBeenCalledTimes(withMarker ? 8 : 3);
    expect(iframe.isConnected).toBe(false);
  },
);

it("can navigate away before the chart API is ready", () => {
  const { unmount } = render(<TVChartContainer symbol="BTCUSDC" />);
  expect(() => unmount()).not.toThrow();
});
