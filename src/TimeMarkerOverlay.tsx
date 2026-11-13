import { useEffect, useRef, useState, type RefObject } from "react";
import type { IChartingLibraryWidget } from "./charting_library";
import { intervalSeconds, timeScaleMapping } from "./time-scale";

export interface TimeMarker {
  id: string;
  /** Unix timestamp in seconds. */
  time: number;
  text: string;
  color?: string;
}

interface Props {
  widget: IChartingLibraryWidget;
  container: RefObject<HTMLDivElement>;
  marker: TimeMarker;
  onMove?: (id: string, time: number) => void;
  onCancel?: () => void;
}

type Layout = {
  left: number;
  top: number;
  width: number;
  height: number;
  mapping: NonNullable<ReturnType<typeof timeScaleMapping>>;
};

export function TimeMarkerOverlay({
  widget,
  container,
  marker,
  onMove,
  onCancel,
}: Props) {
  const [layout, setLayout] = useState<Layout | null>(null);
  const drag = useRef<{
    pointerId: number;
    left: number;
    mapping: Layout["mapping"];
    offset: number;
  } | null>(null);

  useEffect(() => {
    const chart = widget.activeChart();
    const scale = chart.getTimeScale();
    let frame = 0;
    const refresh = () => {
      const seconds = intervalSeconds(chart.resolution());
      const mapping = seconds == null ? null : timeScaleMapping(scale, seconds);
      const host = container.current;
      const iframe = host?.querySelector("iframe");
      // The public chart API exposes pane sizes, but not their DOM offset.
      // Measure the matching canvas in the bundled, same-origin chart iframe.
      const canvas = Array.from(
        iframe?.contentDocument?.querySelectorAll("canvas") ?? [],
      ).find((element) => {
        const box = element.getBoundingClientRect();
        return (
          Math.abs(box.width - scale.width()) < 2 &&
          Math.abs(box.height - chart.getPanes()[0].getHeight()) < 2
        );
      });
      if (!host || !iframe || !canvas || !mapping) {
        setLayout(null);
        return;
      }
      const hostBox = host.getBoundingClientRect();
      const frameBox = iframe.getBoundingClientRect();
      const plotBox = canvas.getBoundingClientRect();
      setLayout({
        left: frameBox.left - hostBox.left + plotBox.left,
        top: frameBox.top - hostBox.top + plotBox.top,
        width: plotBox.width,
        height: plotBox.height,
        mapping,
      });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(refresh);
    };
    const subscriptions = [
      chart.onVisibleRangeChanged(),
      chart.onDataLoaded(),
      chart.onIntervalChanged(),
      scale.barSpacingChanged(),
      scale.rightOffsetChanged(),
    ];
    subscriptions.forEach((subscription) =>
      subscription.subscribe(null, schedule),
    );
    const observer = new ResizeObserver(schedule);
    if (container.current) observer.observe(container.current);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      subscriptions.forEach((subscription) =>
        subscription.unsubscribe(null, schedule),
      );
    };
  }, [widget, container]);

  if (!layout || !Number.isFinite(marker.time)) return null;
  const x = layout.mapping.coordinateAt(marker.time);
  if (x < 0 || x > layout.width) return null;
  const color = marker.color ?? "#e056b5";

  return (
    <div
      role="slider"
      aria-label={marker.text}
      aria-valuenow={marker.time}
      aria-valuetext={new Date(marker.time * 1000).toLocaleString()}
      aria-orientation="horizontal"
      tabIndex={0}
      title={`${marker.text}: ${new Date(marker.time * 1000).toLocaleString()}. Drag left or right.`}
      style={{
        position: "absolute",
        zIndex: 2,
        left: layout.left + x - 7,
        top: layout.top,
        width: 14,
        height: layout.height + 24,
        cursor: "ew-resize",
        touchAction: "none",
        userSelect: "none",
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        const left =
          container.current.getBoundingClientRect().left + layout.left;
        drag.current = {
          pointerId: event.pointerId,
          left,
          mapping: layout.mapping,
          offset: event.clientX - left - x,
        };
      }}
      onPointerMove={(event) => {
        const active = drag.current;
        if (!active || active.pointerId !== event.pointerId) return;
        const coordinate = Math.max(
          7,
          Math.min(
            layout.width - 7,
            event.clientX - active.left - active.offset,
          ),
        );
        const time = Math.round(active.mapping.timeAt(coordinate) / 60) * 60;
        if (Number.isFinite(time) && time > 0 && time !== marker.time)
          onMove?.(marker.id, time);
      }}
      onPointerUp={(event) => {
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          drag.current = null;
          onCancel?.();
        } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          onMove?.(
            marker.id,
            marker.time +
              (event.key === "ArrowRight" ? 1 : -1) *
                (event.shiftKey ? 3600 : 60),
          );
        }
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 6,
          top: 0,
          bottom: 24,
          borderLeft: `2px dashed ${color}`,
        }}
      />
      <span
        style={{
          position: "absolute",
          top: 8,
          left: x > layout.width / 2 ? undefined : 14,
          right: x > layout.width / 2 ? 14 : undefined,
          whiteSpace: "nowrap",
          color,
          background: "white",
          padding: "3px 6px",
          fontSize: 12,
        }}
      >
        {marker.text}
      </span>
      <span
        style={{
          position: "absolute",
          bottom: 0,
          left: -3,
          width: 20,
          height: 22,
          borderRadius: 4,
          background: color,
          color: "white",
          textAlign: "center",
          lineHeight: "22px",
        }}
      >
        X
      </span>
    </div>
  );
}
