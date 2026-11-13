import { vi, describe, it, expect, beforeEach } from "vitest";
vi.mock("../src/charting_library", async () => {
  // Use the mock from __mocks__
  return await import("./__mocks__/charting_library.js");
});
import { act, cleanup, render, waitFor } from "@testing-library/react";
import TVChartContainer from "../src/main";
import { chartState, emit } from "./__mocks__/charting_library.js";

// Mock ResizeObserver for jsdom
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe("TVChartContainer", () => {
  beforeEach(() => {
    cleanup();
    chartState.events.clear();
    chartState.shapes.clear();
    chartState.removed.length = 0;
    chartState.nextId = 1;
  });

  it("renders without crashing", () => {
    render(<TVChartContainer symbol="SUPERUSDT" exchange="binance" />);
    // The chart container should be in the document
    expect(document.querySelector("div")).toBeTruthy();
  });

  it("renders with KuCoin symbol", () => {
    render(<TVChartContainer symbol="SUPER-USDT" exchange="kucoin" />);
    expect(document.querySelector("div")).toBeTruthy();
  });

  it("removes order lines when they disappear from the props", async () => {
    const { rerender } = render(
      <TVChartContainer
        symbol="SUPER-USDT"
        exchange="kucoin"
        orderLines={[
          { id: "stop_loss", text: "Stop loss", price: 90, color: "red" },
        ]}
      />,
    );
    await waitFor(() => expect(chartState.shapes.size).toBe(1));

    rerender(
      <TVChartContainer
        symbol="SUPER-USDT"
        exchange="kucoin"
        orderLines={[]}
      />,
    );

    await waitFor(() => expect(chartState.shapes.size).toBe(0));
    expect(chartState.removed).toEqual([1]);
  });
});

it("unlocks the selected line, reports the final drop once, and ignores programmatic changes", async () => {
  const onMove = vi.fn();
  const lines = [
    { id: "stop_loss", text: "Stop", price: 90, editable: true },
    { id: "trailing_profit", text: "Profit", price: 110 },
  ];
  const { rerender, unmount } = render(
    <TVChartContainer orderLines={lines} onOrderLineMove={onMove} />,
  );
  await waitFor(() => expect(chartState.shapes.size).toBe(2));
  const [id, shape] = [...chartState.shapes.entries()][0];
  expect(shape.lock).toBe(false);
  expect([...chartState.shapes.values()][1].lock).toBe(true);
  act(() => {
    emit("mouse_down", {});
    shape.points = [{ time: 1000, price: 95 }];
    emit("drawing_event", id, "points_changed");
    emit("drawing_event", id, "move");
  });
  expect(onMove).not.toHaveBeenCalled();
  rerender(
    <TVChartContainer orderLines={[...lines]} onOrderLineMove={onMove} />,
  );
  expect(shape.points[0].price).toBe(95);
  act(() => {
    emit("mouse_up", {});
  });
  await waitFor(() =>
    expect(onMove).toHaveBeenCalledExactlyOnceWith("stop_loss", 95),
  );
  expect(shape.points[0].price).toBe(90); // rejected drops restore the controlled value
  rerender(
    <TVChartContainer
      orderLines={lines.map((line) => ({
        ...line,
        editable: false,
        price: 92,
      }))}
      onOrderLineMove={onMove}
    />,
  );
  await waitFor(() => expect(shape.lock).toBe(true));
  expect(onMove).toHaveBeenCalledTimes(1);
  unmount();
  expect(chartState.events.size).toBe(0);
});
