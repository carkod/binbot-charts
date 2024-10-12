import React, { useEffect, useRef, useState } from "react";
import {
  ChartingLibraryWidgetOptions,
  IDatafeedQuotesApi,
  ResolutionString,
  widget,
} from "./charting_library";
import Datafeed from "./datafeed";
import { useImmer } from "use-immer";
import { type IOrderLine } from "./charting-library-interfaces";

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
}

export default function TVChartContainer({
  symbol = "BTCUSDT",
  interval = "1h" as ResolutionString,
  libraryPath = "/charting_library/",
  timescaleMarks = [],
  orderLines = [],
  height = "calc(100vh - 80px)",
  onTick,
  getLatestBar,
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [chartOrderLines, setChartOrderLines] = useImmer<any[]>([]);
  const [widgetState, setWidgetState] = useImmer<any>(null);
  const [symbolState] = useState<string | null>(null);
  const prevTimescaleMarks = useRef<any[]>(timescaleMarks);

  useEffect(() => {
    if (!widgetState) {
      initializeChart(interval);
    }

    if (orderLines && orderLines.length > 0) {
      updateOrderLines(orderLines);
    }

    if (widgetState && symbol !== symbolState) {
      widgetState.setSymbol(symbol, interval);
    }

    if (
      widgetState &&
      prevTimescaleMarks.current &&
      timescaleMarks !== prevTimescaleMarks.current
    ) {
      widgetState._options.datafeed.timescaleMarks = timescaleMarks;
      prevTimescaleMarks.current = timescaleMarks;
    }
  }, [orderLines, timescaleMarks]);

  const initializeChart = (interval: ResolutionString) => {
    const widgetOptions: any = {
      symbol: symbol,
      datafeed: new Datafeed(timescaleMarks, interval),
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

      // get latest bar for last price
      const prices = async () => {
        const data = await tvWidget.activeChart().exportData({
          includeTime: false,
          includeSeries: true,
          includedStudies: [],
        });
        getLatestBar && getLatestBar(data.data[data.data.length - 1]);
      };
      prices();
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
