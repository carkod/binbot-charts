import React, { useEffect, useRef } from "react";
import { widget } from "../charting_library";
import Datafeed from "./datafeed";
import PropTypes from "prop-types";
import { useImmer } from "use-immer";

export default function TVChartContainer({
  symbol = "APEUSDT",
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

  useEffect(() => {
    const widgetOptions = {
      symbol: symbol,
      datafeed: new Datafeed(timescaleMarks),
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
      if (orderLines.length > 0) {
        orderLines.forEach((order) => {
          updateOrderLines(tvWidget, order);
        });
      }

      tvWidget.subscribe("onTick", (event) => onTick(event));

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

    // returned function will be called on component unmount
    return () => {
      if (!tvWidget) {
        tvWidget.remove();
      }
    };
  }, [orderLines, timescaleMarks]);

  const updateOrderLines = (tvWidget, order) => {
    if (chartOrderLines && chartOrderLines.length > 0) {
      chartOrderLines.forEach((item) => {
        if (item._data.bodyText == order.text) {
          item.setText(order.text)
          .setTooltip(order.tooltip)
          .setQuantity(order.quantity)
          .setPrice(order.price);
        } else {
          item.remove()
        }
        
      });
    } else {
      const lineStyle = order.lineStyle || 0;
      const chartOrderLine = tvWidget
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

        setChartOrderLines((draft) => {
          draft.push(chartOrderLine);
          return draft;
        });
      }
  };

  return (
    <>
      {console.log(chartOrderLines)}
      <div ref={containerRef} style={{ height: height }} />
    </>
  );
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
