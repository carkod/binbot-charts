import React, { useEffect, useRef, useState } from "react";
import { widget } from "../charting_library";
import Datafeed from "./datafeed";
import PropTypes from "prop-types";
import { useImmer } from "use-immer";


export default function TVChartContainer({
  symbol = "BTCUSDT",
  interval = "1h",
  libraryPath = "/charting_library/",
  timescaleMarks = [],
  orderLines = [],
  height = "calc(100vh - 80px)",
  onTick,
  getLatestBar,
}) {
  const containerRef = useRef(null);

  const [chartOrderLines, setChartOrderLines] = useImmer([]);
  const [widgetState, setWidgetState] = useImmer(null);
  const [symbolState] = useState(null)
  const prevTimescaleMarks = useRef(timescaleMarks);

  useEffect(() => {
    if (!widgetState) {
      initializeChart("1h");
    }

    if (orderLines && orderLines.length > 0) {
      updateOrderLines(orderLines);
    }
    
    if (widgetState && symbol !== symbolState) {
      widgetState.setSymbol(symbol, interval);
    }

    if (widgetState && prevTimescaleMarks.current && timescaleMarks !== prevTimescaleMarks.current) {
      widgetState._options.datafeed.timescaleMarks = timescaleMarks
      prevTimescaleMarks.current = timescaleMarks
    }

  }, [orderLines, timescaleMarks]);

  const initializeChart = (interval) => {
    const widgetOptions = {
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

      tvWidget.subscribe("onTick", (event) => onTick(event));
      setWidgetState(tvWidget);

      // get latest bar for last price
      const prices = async () => {
        const data = await tvWidget.activeChart().exportData({
          includeTime: false,
          includeSeries: true,
          includedStudies: [],
        });
        getLatestBar(data.data[data.data.length - 1]);
      };
      prices();
    });
  };

  const updateOrderLines = (orderLines) => {
    if (chartOrderLines && chartOrderLines.length > 0) {
      chartOrderLines.forEach((item) => {
        orderLines.forEach(order => {
          if (item.id == order.id) {
            item
              .setText(order.text)
              .setTooltip(order.tooltip)
              .setQuantity(order.quantity)
              .setPrice(order.price);
          }
        })
        
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
          chartOrderLine.id = order.id

          setChartOrderLines((draft) => {
            draft.push(chartOrderLine);
            return draft;
          });
        });
      }
    }
  };

  return <div ref={containerRef} style={{ height: height }} />
}

TVChartContainer.propTypes = {
  apiKey: PropTypes.string,
  symbol: PropTypes.string,
  interval: PropTypes.string,
  libraryPath: PropTypes.string,
  timescaleMarks: PropTypes.array,
  orderLines: PropTypes.array,
  height: PropTypes.string,
  onTick: PropTypes.func,
  getLatestBar: PropTypes.func,
};
