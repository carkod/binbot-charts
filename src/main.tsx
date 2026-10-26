import { FC, useEffect, useRef } from "react";
import { useImmer } from "use-immer";
import { type IOrderLine } from "./charting-library-interfaces";
import { EntityId, ResolutionString, widget } from "./charting_library/";
import Datafeed from "./datafeed";
import { SUPPORTED_EXCHANGES } from "./exchanges";

export interface OrderLine extends IOrderLine {
  id: string;
  lineStyle?: number;
}

interface TVChartContainerProps {
  symbol?: string;
  interval?: ResolutionString;
  libraryPath?: string;
  timescaleMarks?: any[];
  orderLines?: OrderLine[];
  onTick?: (event: any) => void;
  getLatestBar?: (data: any) => void;
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
  exchange = "kucoin",
  style = { height: "100%" },
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const orderLineIds = useRef(new Map<string, Promise<EntityId>>());
  const [widgetState, setWidgetState] = useImmer<any>(null);
  const prevTimescaleMarks = useRef<any[]>(timescaleMarks);
  const prevExchange = useRef<string>(exchange);
  const prevSymbol = useRef<string>(symbol);

  useEffect(() => {
    if (!symbol) return;

    // If widget exists and symbol or exchange changed, tear down and reinitialize
    if (
      widgetState &&
      (symbol !== prevSymbol.current || exchange !== prevExchange.current)
    ) {
      widgetState.remove();
      orderLineIds.current.clear();
      setWidgetState(null);
      prevSymbol.current = symbol;
      prevExchange.current = exchange;
      return; // Will reinitialize on next render with widgetState === null
    }

    if (!widgetState) {
      initializeChart(interval);
      prevSymbol.current = symbol;
      prevExchange.current = exchange;
      return;
    }

    if (orderLines && orderLines.length > 0) {
      updateOrderLines(orderLines);
    }

    if (
      widgetState &&
      prevTimescaleMarks.current &&
      timescaleMarks !== prevTimescaleMarks.current
    ) {
      widgetState._options.datafeed.timescaleMarks = timescaleMarks;
      prevTimescaleMarks.current = timescaleMarks;
    }
  }, [symbol, orderLines, timescaleMarks, exchange, widgetState, interval]);

  const initializeChart = (interval: ResolutionString) => {
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
      height: "600px",
      overrides: {
        volumePaneSize: "small",
        "mainSeriesProperties.barStyle.dontDrawOpen": false,
      },
    };
    const tvWidget = new widget(widgetOptions);

    tvWidget.onChartReady(() => {
      tvWidget.subscribe("onTick", (event: any) => onTick && onTick(event));
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
          if (last && getLatestBar) {
            getLatestBar(last);
          }
        } catch (e) {
          // exportData may throw if series not ready yet; ignore
        }
      };
      // slight defer to let series attach
      setTimeout(prices, 300);
    });
  };

  // createOrderLine is Trading Platform only, so order lines are drawn as
  // horizontal_line shapes on the Charting Library.
  const updateOrderLines = (orderLines: OrderLine[]) => {
    if (!widgetState) return;
    const chart = widgetState.activeChart();
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
          const shape = chart.getShapeById(entityId);
          shape.setPoints([
            { time: Math.floor(Date.now() / 1000), price: Number(order.price) },
          ]);
          shape.setProperties(properties);
        });
        return;
      }
      orderLineIds.current.set(
        order.id,
        chart.createShape(
          { time: Math.floor(Date.now() / 1000), price: Number(order.price) },
          {
            shape: "horizontal_line",
            lock: true,
            disableSelection: true,
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
        ),
      );
    });
  };

  return <div ref={containerRef} style={style} />;
};

export { SUPPORTED_EXCHANGES, Exchange } from "./exchanges";
export type { ExchangeConfig } from "./exchanges";
export default TVChartContainer;
