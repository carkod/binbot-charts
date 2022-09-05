import React, { useEffect, useRef } from "react";
import { widget } from "../charting_library";
import Datafeed from "./datafeed";

export default function TVChartContainer ({
  apiKey,
  symbol= "Binance:APE/USDT",
  interval= "1D",
  libraryPath= "/charting_library/",
  timescaleMarks=[],
  orderLines=[],
  height="calc(100vh - 80px)"
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const widgetOptions = {
      symbol: symbol,
      datafeed: new Datafeed(apiKey, timescaleMarks),
      interval: interval,
      container: containerRef.current,
      library_path: libraryPath,
      locale: "en",
      fullscreen: false,
      autosize: true,
      studies_overrides: {},
    }
    const tvWidget = new widget(widgetOptions);

    tvWidget.onChartReady(() => {
      orderLines.forEach(element => {
        tvWidget.chart().createPositionLine()
        .setText(element.text)
        .setTooltip(element.tooltip)
        .setQuantity(element.quantity)
        .setQuantityBackgroundColor(element.color)
        .setQuantityBorderColor(element.color)
        .setLineStyle(0)
        .setLineLength(25)
        .setLineColor(element.color)
        .setBodyBorderColor(element.color)
        .setBodyTextColor(element.color)
        .setPrice(element.price)
      });
    });
  
    // returned function will be called on component unmount 
    return () => {
      if (this.tvWidget !== null) {
        this.tvWidget.remove();
        this.tvWidget = null;
      }
    }
  }, [])

  return <div ref={containerRef} style={{ height: height }} />;
}
