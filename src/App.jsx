import React, { Component, useEffect, useState } from "react";
import { useImmer } from "use-immer";
import "./App.css";
import TVChartContainer from "./components/TVChartContainer";

const testTimeMarks = [
  {
    id: "tsm4",
    time: 1662301800,
    color: "red",
    label: "B",
    tooltip: ["Safety Order 4"],
  },
];

const testOrderLines = [
  {
    text: "Take profit 10%",
    tooltip: ["Additional position information"],
    quantity: "200 USDT",
    price: 4.85,
    color: "green",
  },
];

export default function App() {
  const [currentPrice, setCurrentPrice] = useState(null);
  const [orderLines, setOrderLines] = useImmer([]);

  useEffect(() => {
    if (currentPrice) {
      setOrderLines((draft) => {
        draft.push({
          type: "base_order",
          text: "Base",
          tooltip: ["Inactive"],
          quantity: `XX USDT`,
          price: currentPrice,
          color: "#1f77d0",
        });
        return draft
      });
      setOrderLines((draft) => {
        draft.push({
          type: "take_profit",
          text: "Take profit",
          tooltip: ["Inactive"],
          quantity: `XX USDT`,
          price: currentPrice * 1.03,
          color: "#1f77d0",
        });
        return draft
      });
    }
  }, [setOrderLines, currentPrice]);

  const handleTick = (ohlc) => {
    setCurrentPrice(ohlc.close);
  };
  const getLatestBar = (bar) => {
    setCurrentPrice(bar[3]);
  };
  return (
    <>
      <h1 style={{ textAlign: "center" }}>Test chart</h1>
      <TVChartContainer
        symbol="APEUSDT"
        interval="1h"
        timescaleMarks={testTimeMarks}
        orderLines={orderLines}
        onTick={handleTick}
        getLatestBar={getLatestBar}
      />
    </>
  );
}
