import React, { Component } from "react";
import "./App.css";
import TVChartContainer from "./components/TVChartContainer";

const testTimeMarks = [{
  id: "tsm4",
  time: 1662301800,
  color: "red",
  label: "B", 
  tooltip: ["Safety Order 4"],
}]

const testOrderLines = [{
  text: "Take profit 10%",
  tooltip: ["Additional position information"],
  quantity: "200 USDT",
  price: 4.85,
  color: "green",
}]

export default function App() {
  const handleTick = (ohlc) => {
    console.log("Kline ticked: ", ohlc)
  }
  return (
    <>
      <h1 style={{textAlign: "center"}}>Test chart</h1>
      <TVChartContainer
        symbol="APEUSDT"
        interval="1h"
        timescaleMarks={testTimeMarks}
        orderLines={testOrderLines}
        ohlcTick={handleTick}
      />
    </>
  );
}

