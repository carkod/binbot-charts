import { FC, useEffect, useRef, useState } from "react";
import { useImmer } from "use-immer";
import { type IOrderLine } from "./charting-library-interfaces";
import {
  ResolutionString,
  widget,
} from "./charting_library/";
import Datafeed from "./datafeed";
import { ExchangeConfig, SUPPORTED_EXCHANGES } from "./exchanges";

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
  height?: string;
  onTick?: (event: any) => void;
  getLatestBar?: (data: any) => void;
  exchange?: string; // Exchange name: 'binance' or 'kucoin'
  supportedExchanges?: string[]; // List of supported exchanges
}

const TVChartContainer: FC<TVChartContainerProps> = ({
  symbol = "SUPER-USDT",
  interval = "1h" as ResolutionString,
  libraryPath = "/charting_library/",
  timescaleMarks = [],
  orderLines = [],
  height = "calc(100vh - 80px)",
  onTick,
  getLatestBar,
  exchange = "kucoin",
  supportedExchanges = ["kucoin", "binance"],
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [chartOrderLines, setChartOrderLines] = useImmer<any[]>([]);
  const [widgetState, setWidgetState] = useImmer<any>(null);
  const [symbolState, setSymbolState] = useState<string | null>(symbol);
  const [transformedSymbol, setTransformedSymbol] = useState<string | null>(null);
  const [isLoadingSymbol, setIsLoadingSymbol] = useState<boolean>(false);
  const prevTimescaleMarks = useRef<any[]>(timescaleMarks);
  const prevExchange = useRef<string>(exchange);

  // Fetch symbol metadata and transform based on exchange
  useEffect(() => {
    const fetchSymbolMetadata = async () => {
      if (!symbol) return;
      
      setIsLoadingSymbol(true);
      try {
        // Remove any dashes or formatting from input symbol
        const cleanSymbol = symbol.replace(/-/g, '');
        const response = await fetch(`https://api.terminal.binbot.in/symbol/${cleanSymbol}`);
        
        if (!response.ok) {
          console.warn(`Failed to fetch symbol metadata for ${cleanSymbol}, using original symbol`);
          setTransformedSymbol(symbol);
          return;
        }
        
        const result = await response.json();
        if (result.data?.base_asset && result.data?.quote_asset) {
          const { base_asset, quote_asset } = result.data;
          // KuCoin uses dash separator, Binance uses no separator
          const formatted = exchange.toLowerCase() === 'kucoin'
            ? `${base_asset}-${quote_asset}`
            : `${base_asset}${quote_asset}`;
          setTransformedSymbol(formatted);
        } else {
          console.warn('Invalid symbol metadata response, using original symbol');
          setTransformedSymbol(symbol);
        }
      } catch (error) {
        console.error('Error fetching symbol metadata:', error);
        setTransformedSymbol(symbol);
      } finally {
        setIsLoadingSymbol(false);
      }
    };
    
    fetchSymbolMetadata();
  }, [symbol, exchange]);

  useEffect(() => {
    // Don't initialize until symbol is transformed
    if (isLoadingSymbol || !transformedSymbol) {
      return;
    }
    
    if (!widgetState) {
      initializeChart(interval);
      prevExchange.current = exchange;
      setSymbolState(transformedSymbol);
      return;
    }

    // Reinitialize chart if exchange changes
    if (widgetState && exchange !== prevExchange.current) {
      widgetState.remove();
      setWidgetState(null);
      prevExchange.current = exchange;
      // Will reinitialize on next render
      return;
    }

    if (orderLines && orderLines.length > 0) {
      updateOrderLines(orderLines);
    }

    if (widgetState && transformedSymbol !== symbolState) {
      try {
        widgetState.setSymbol(transformedSymbol, interval);
        setSymbolState(transformedSymbol);
      } catch (error) {
        console.error("Failed to set symbol:", error);
      }
    }

    if (
      widgetState &&
      prevTimescaleMarks.current &&
      timescaleMarks !== prevTimescaleMarks.current
    ) {
      widgetState._options.datafeed.timescaleMarks = timescaleMarks;
      prevTimescaleMarks.current = timescaleMarks;
    }
  }, [orderLines, timescaleMarks, exchange]);

  const initializeChart = (interval: ResolutionString) => {
    // Get exchange configuration
    const exchangeConfig = SUPPORTED_EXCHANGES[exchange.toLowerCase()];
    if (!exchangeConfig) {
      console.error(`Exchange ${exchange} not supported`);
      return;
    }
    
    // Get list of supported exchange configs
    const supportedExchangeConfigs = supportedExchanges
      .map(ex => SUPPORTED_EXCHANGES[ex.toLowerCase()])
      .filter(Boolean);
    
    const widgetOptions: any = {
      symbol: transformedSymbol || symbol,
      datafeed: new Datafeed(
        timescaleMarks, 
        interval, 
        exchangeConfig,
        supportedExchangeConfigs
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
          const last = data?.data && data.data.length > 0 ? data.data[data.data.length - 1] : null;
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

  const updateOrderLines = (orderLines: OrderLine[]) => {
    if (chartOrderLines && chartOrderLines.length > 0) {
      chartOrderLines.forEach((item) => {
        orderLines.forEach((order) => {
          if (item.id == order.id) {
            item
              .setText(order.text)
              .setTooltip(order.tooltip)
              .setQuantity(order.quantity)
              .setPrice(order.price);
          }
        });
      });
    } else {
      if (widgetState && orderLines && orderLines.length > 0) {
        orderLines.forEach((order) => {
          const lineStyle = order.lineStyle || 0;
          let chartOrderLine = widgetState
            .chart()
            .createOrderLine()
            .setText(order.text)
            .setTooltip(order.tooltip)
            .setQuantity(order.quantity)
            .setQuantityFont("inherit 14px Arial")
            .setQuantityBackgroundColor(order.color)
            .setQuantityBorderColor(order.color)
            .setLineStyle(lineStyle)
            .setLineLength(25)
            .setLineColor(order.color)
            .setBodyFont("inherit 14px Arial")
            .setBodyBorderColor(order.color)
            .setBodyTextColor(order.color)
            .setPrice(order.price);

          // set custom id easier search
          chartOrderLine.id = order.id;

          setChartOrderLines((draft) => {
            draft.push(chartOrderLine);
            return draft;
          });
        });
      }
    }
  };

  return <div ref={containerRef} style={{ height: height }} />;
};

export { SUPPORTED_EXCHANGES, Exchange } from "./exchanges";
export type { ExchangeConfig } from "./exchanges";
export default TVChartContainer;