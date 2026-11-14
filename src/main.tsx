import { FC, useEffect, useLayoutEffect, useRef, useState } from "react";
import { type IOrderLine } from "./charting-library-interfaces";
import { EntityId, ResolutionString, widget } from "./charting_library/";
import Datafeed from "./datafeed";
import { SUPPORTED_EXCHANGES } from "./exchanges";
import { TimeMarkerOverlay, type TimeMarker } from "./TimeMarkerOverlay";
export type { TimeMarker } from "./TimeMarkerOverlay";

export interface OrderLine extends IOrderLine {
  id: string;
  lineStyle?: number;
  editable?: boolean;
}

interface TVChartContainerProps {
  symbol?: string;
  interval?: ResolutionString;
  libraryPath?: string;
  timescaleMarks?: any[];
  orderLines?: OrderLine[];
  onTick?: (event: any) => void;
  getLatestBar?: (data: any) => void;
  onOrderLineMove?: (id: string, price: number) => void;
  onOrderLineEditCancel?: () => void;
  timeMarker?: TimeMarker;
  onTimeMarkerMove?: (id: string, time: number) => void;
  exchange?: string; // Exchange name: 'binance' or 'kucoin'
  style?: React.CSSProperties;
}

const supportedExchanges = ["kucoin", "binance"];

const TVChartContainer: FC<TVChartContainerProps> = ({
  symbol = "SUPER-USDT",
  interval = "1h" as ResolutionString,
  libraryPath = "/charting_library/",
  timescaleMarks = [],
  orderLines = [],
  onTick,
  getLatestBar,
  onOrderLineMove,
  onOrderLineEditCancel,
  timeMarker,
  onTimeMarkerMove,
  exchange = "kucoin",
  style = { height: "100%" },
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const latest = useRef({
    orderLines,
    onOrderLineMove,
    onOrderLineEditCancel,
    onTick,
    getLatestBar,
  });
  latest.current = {
    orderLines,
    onOrderLineMove,
    onOrderLineEditCancel,
    onTick,
    getLatestBar,
  };
  const entityLines = useRef(new Map<EntityId, string>());
  const pointerDown = useRef(false);
  const movedEntity = useRef<EntityId | null>(null);
  const orderLineIds = useRef(new Map<string, Promise<EntityId>>());
  const [widgetState, setWidgetState] = useState<any>(null);
  const widgetRef = useRef<any>(null);
  useEffect(() => {
    if (!widgetState || widgetRef.current !== widgetState) return;
    updateOrderLines(orderLines);
  }, [orderLines, widgetState]);

  useEffect(() => {
    if (!widgetState || widgetRef.current !== widgetState) return;
    widgetState._options.datafeed.timescaleMarks = timescaleMarks;
    widgetState.activeChart().refreshMarks();
  }, [timescaleMarks, widgetState]);

  // Unsubscribe while the iframe is attached; passive cleanup runs after
  // React removes its DOM and TradingView loses the inner window API.
  useLayoutEffect(() => {
    if (!widgetState || widgetRef.current !== widgetState) return;
    let frame = 0;
    const finishMove = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        pointerDown.current = false;
        const entityId = movedEntity.current;
        movedEntity.current = null;
        if (entityId == null) return;
        const id = entityLines.current.get(entityId);
        const line = latest.current.orderLines.find((line) => line.id === id);
        if (!line) return;
        const shape = widgetState.activeChart().getShapeById(entityId);
        const price = shape.getPoints()[0]?.price;
        // Restore the controlled price. The consumer may accept the drop and
        // send a new price, or reject it without leaving a misleading line.
        shape.setPoints([
          { time: Math.floor(Date.now() / 1000), price: line.price },
        ]);
        if (
          line.editable &&
          Number.isFinite(price) &&
          price > 0 &&
          price !== line.price
        ) {
          latest.current.onOrderLineMove?.(line.id, price);
        }
      });
    };
    const down = () => {
      pointerDown.current = true;
    };
    const up = () => {
      finishMove();
    };
    const drawing = (entityId: EntityId, event: string) => {
      if (!pointerDown.current || !["move", "points_changed"].includes(event))
        return;
      const id = entityLines.current.get(entityId);
      if (
        latest.current.orderLines.some(
          (line) => line.id === id && line.editable,
        )
      ) {
        movedEntity.current = entityId;
      }
    };
    widgetState.subscribe("mouse_down", down);
    widgetState.subscribe("mouse_up", up);
    widgetState.subscribe("drawing_event", drawing);
    widgetState.onShortcut(27, () => {
      pointerDown.current = false;
      movedEntity.current = null;
      cancelAnimationFrame(frame);
      latest.current.onOrderLineEditCancel?.();
    });
    return () => {
      cancelAnimationFrame(frame);
      pointerDown.current = false;
      movedEntity.current = null;
      if (widgetRef.current === widgetState) {
        widgetState.unsubscribe("mouse_down", down);
        widgetState.unsubscribe("mouse_up", up);
        widgetState.unsubscribe("drawing_event", drawing);
      }
    };
  }, [widgetState]);

  useEffect(() => {
    setWidgetState(null);
    orderLineIds.current.clear();
    entityLines.current.clear();
    if (!symbol) return;
    let disposed = false;
    let priceTimer: ReturnType<typeof setTimeout>;
    // Get exchange configuration
    const exchangeConfig = SUPPORTED_EXCHANGES[exchange.toLowerCase()];
    if (!exchangeConfig) {
      console.error(`Exchange ${exchange} not supported`);
      return;
    }

    // Get list of supported exchange configs
    const supportedExchangeConfigs = supportedExchanges
      .map((ex) => SUPPORTED_EXCHANGES[ex.toLowerCase()])
      .filter(Boolean);

    const widgetOptions: any = {
      symbol: symbol,
      datafeed: new Datafeed(
        timescaleMarks,
        interval,
        exchangeConfig,
        supportedExchangeConfigs,
      ),
      interval: interval,
      container: containerRef.current,
      library_path: libraryPath,
      locale: "en",
      fullscreen: false,
      autosize: true,
      studies_overrides: {},
      symbol_search_request_delay: 1000,
      overrides: {
        volumePaneSize: "small",
        "mainSeriesProperties.barStyle.dontDrawOpen": false,
      },
    };
    const tvWidget = new widget(widgetOptions);
    widgetRef.current = tvWidget;

    tvWidget.onChartReady(() => {
      if (disposed) return;
      tvWidget.subscribe("onTick", (event: any) =>
        latest.current.onTick?.(event),
      );
      setWidgetState(tvWidget);

      // get latest bar for last price, guard against null/empty
      const prices = async () => {
        try {
          const chart = tvWidget.activeChart?.();
          if (!chart) return;
          const data = await chart.exportData({
            includeTime: false,
            includeSeries: true,
            includedStudies: [],
          });
          const last =
            data?.data && data.data.length > 0
              ? data.data[data.data.length - 1]
              : null;
          if (!disposed && last) {
            latest.current.getLatestBar?.(last);
          }
        } catch {
          // exportData may throw if series not ready yet; ignore
        }
      };
      // slight defer to let series attach
      priceTimer = setTimeout(prices, 300);
    });
    return () => {
      disposed = true;
      clearTimeout(priceTimer);
      widgetRef.current = null;
      tvWidget.remove();
    };
  }, [symbol, exchange, interval, libraryPath]);

  // createOrderLine is Trading Platform only, so order lines are drawn as
  // horizontal_line shapes on the Charting Library.
  const updateOrderLines = (orderLines: OrderLine[]) => {
    if (!widgetState || widgetRef.current !== widgetState) return;
    const chart = widgetState.activeChart();
    const nextOrderLineIds = new Set(orderLines.map((order) => order.id));
    orderLineIds.current.forEach((entityId, id) => {
      if (!nextOrderLineIds.has(id)) {
        orderLineIds.current.delete(id);
        entityId.then((resolvedId) => {
          if (widgetRef.current !== widgetState) return;
          entityLines.current.delete(resolvedId);
          chart.removeEntity(resolvedId);
        });
      }
    });
    orderLines.forEach((order) => {
      const label = order.quantity
        ? `${order.text} ${order.quantity}`
        : order.text;
      const properties = {
        text: label,
        linecolor: order.color,
        textcolor: order.color,
        linestyle: order.lineStyle || 0,
      };
      const existing = orderLineIds.current.get(order.id);
      if (existing) {
        existing.then((entityId) => {
          if (
            widgetRef.current !== widgetState ||
            orderLineIds.current.get(order.id) !== existing
          )
            return;
          const shape = chart.getShapeById(entityId);
          if (!pointerDown.current || !order.editable) {
            shape.setPoints([
              {
                time: Math.floor(Date.now() / 1000),
                price: Number(order.price),
              },
            ]);
          }
          shape.setUserEditEnabled(Boolean(order.editable));
          shape.setSelectionEnabled(Boolean(order.editable));
          shape.setProperties(properties);
        });
        return;
      }
      orderLineIds.current.set(
        order.id,
        chart
          .createShape(
            { time: Math.floor(Date.now() / 1000), price: Number(order.price) },
            {
              shape: "horizontal_line",
              lock: !order.editable,
              disableSelection: !order.editable,
              disableSave: true,
              disableUndo: true,
              text: label,
              overrides: {
                ...properties,
                linewidth: 2,
                showLabel: true,
                horzLabelsAlign: "right",
                vertLabelsAlign: "top",
              },
            },
          )
          .then((entityId: EntityId) => {
            if (widgetRef.current !== widgetState) return entityId;
            entityLines.current.set(entityId, order.id);
            return entityId;
          }),
      );
    });
  };

  return (
    <div style={{ ...style, position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {widgetState && widgetRef.current === widgetState && timeMarker && (
        <TimeMarkerOverlay
          widget={widgetState}
          container={containerRef}
          marker={timeMarker}
          onMove={onTimeMarkerMove}
          onCancel={onOrderLineEditCancel}
        />
      )}
    </div>
  );
};

export { SUPPORTED_EXCHANGES, Exchange } from "./exchanges";
export type { ExchangeConfig } from "./exchanges";
export default TVChartContainer;
