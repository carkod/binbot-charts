import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const chart = vi.hoisted(() => ({ props: null as any }));
vi.mock("../src/main", () => ({
  default: (props: any) => {
    chart.props = props;
    return <div data-testid="chart" tabIndex={0} />;
  },
}));
import App from "../src/App";

afterEach(cleanup);

const stopLine = () =>
  chart.props.orderLines.find((line: any) => line.id === "stop_loss");

describe("demo stop-loss editing", () => {
  it.each([
    ["long", "immediate", 95, 5],
    ["short", "immediate", 105, 5],
    ["long", "conditional_limit", 190, 5],
    ["short", "conditional_limit", 210, 5],
  ])(
    "keeps a valid %s %s drop in the field and chart",
    (position, mode, price, percentage) => {
      render(<App />);
      act(() => chart.props.onTick({ close: 100 }));
      fireEvent.change(screen.getByLabelText("Position"), {
        target: { value: position },
      });
      fireEvent.change(screen.getByLabelText("entry_mode"), {
        target: { value: mode },
      });
      if (mode === "conditional_limit") {
        fireEvent.change(screen.getByLabelText("entry_price"), {
          target: { value: "200" },
        });
      }
      const input = screen.getByLabelText("stop_loss (%)") as HTMLInputElement;
      act(() => input.focus());
      expect(stopLine().editable).toBe(true);
      act(() => screen.getByTestId("chart").focus());
      act(() => chart.props.onOrderLineMove("stop_loss", price));
      expect(Number(input.value)).toBe(percentage);
      expect(stopLine().price).toBeCloseTo(price);
      expect(document.activeElement).toBe(input);
    },
  );

  it("keeps the drag reference when quotes update and focus returns from the chart", () => {
    render(<App />);
    act(() => chart.props.onTick({ close: 100 }));
    const input = screen.getByLabelText("stop_loss (%)") as HTMLInputElement;
    act(() => input.focus());
    act(() => screen.getByTestId("chart").focus());
    act(() => chart.props.onTick({ close: 110 }));
    act(() => chart.props.onOrderLineMove("stop_loss", 105));
    expect(Number(input.value)).toBe(5);
    expect(stopLine().price).toBeCloseTo(105);
  });

  it.each([
    ["long", 105, 98, "at or below"],
    ["short", 95, 102, "at or above"],
  ])(
    "explains why a %s stop on the profit side is rejected",
    (position, price, originalStop, limit) => {
      render(<App />);
      act(() => chart.props.onTick({ close: 100 }));
      fireEvent.change(screen.getByLabelText("Position"), {
        target: { value: position },
      });
      const input = screen.getByLabelText("stop_loss (%)") as HTMLInputElement;
      act(() => input.focus());
      act(() => chart.props.onOrderLineMove("stop_loss", price));
      expect(input.value).toBe("2");
      expect(stopLine().price).toBeCloseTo(originalStop);
      expect(screen.getByRole("alert").textContent).toContain(
        `${limit} the reference price 100`,
      );
      expect(screen.getByRole("alert").textContent).toContain(
        `Dropped price: ${price}`,
      );
    },
  );
});

it("shows the expiry line only while editing conditional expiry and accepts live timestamps", () => {
  render(<App />);
  act(() => chart.props.onTick({ close: 100 }));
  expect(chart.props.timeMarker).toBeUndefined();
  fireEvent.change(screen.getByLabelText("entry_mode"), {
    target: { value: "conditional_limit" },
  });
  expect(chart.props.timeMarker).toBeUndefined();
  const expiry = screen.getByLabelText(
    "entry_expires_at (local time)",
  ) as HTMLInputElement;
  act(() => expiry.focus());
  expect(chart.props.timeMarker.id).toBe("conditional_expiry");
  const nextTime = chart.props.timeMarker.time + 3600;
  act(() => screen.getByTestId("chart").focus());
  act(() => chart.props.onTimeMarkerMove("conditional_expiry", nextTime));
  expect(new Date(expiry.value).getTime() / 1000).toBe(nextTime);
  expect(chart.props.timeMarker.time).toBe(nextTime);
  expect(
    chart.props.timescaleMarks.find(
      (mark: any) => mark.id === "conditional_expiry",
    ).time,
  ).toBe(nextTime);
  act(() => screen.getByLabelText("stop_loss (%)").focus());
  expect(chart.props.timeMarker).toBeUndefined();
  act(() => expiry.focus());
  fireEvent.keyDown(expiry, { key: "Escape" });
  expect(chart.props.timeMarker).toBeUndefined();
  fireEvent.change(screen.getByLabelText("entry_mode"), {
    target: { value: "immediate" },
  });
  expect(chart.props.timeMarker).toBeUndefined();
});
