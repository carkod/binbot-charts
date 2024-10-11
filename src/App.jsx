import React, { useEffect, useState } from "react";
import { useImmer } from "use-immer";
import { Immutable } from "immer";
import "./App.css";
import TVChartContainer from "./components/TVChartContainer";


type OrderLines = Immutable<{
  id: string; // ["base_order", "take_profit" ...]
  text: string;
  tooltip: [string],
  quantity: string,
  price: string,
  color: string, // hex color
}>

type TimeMarks = Immutable<{
  id: string,
  time: number,
  color: string,
  label: string, // one letter
  tooltip: [string],
}>

function roundTime(ts: number): number {
  /**
   * @param ts a JavaScript new Date().getTime() timestamp
   */
  let time = new Date(ts);
  time.setMinutes(0);
  time.setSeconds(0)
  time.setMilliseconds(0);
  const roundFloor = time.getTime();
  return roundFloor / 1000
}

export default function App(): React.ReactElement<{}> {
  const [currentPrice, setCurrentPrice] = useState(null);
  const [orderLines , setOrderLines] = useImmer<Array<OrderLines>>([]);
  const [symbolState, setSymbolState] = useState("BTCUSDT")
  const [testTimeMarks, setTestTimeMarks] = useState<Array<TimeMarks>>([])

  useEffect(() => {
    if (currentPrice) {
      updateOrderLines()
    }

  }, [currentPrice]);

  const updateOrderLines = () => {
    if (currentPrice) {
      setOrderLines((draft) => {
        draft.push({
          id: "base_order",
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
          id: "take_profit",
          text: "Take profit",
          tooltip: ["Inactive"],
          quantity: `XX USDT`,
          price: (currentPrice * 1.03).toFixed(6),
          color: "#1f77d0",
        });
        return draft
      });
    }
    
  }

  const handleTick = (ohlc) => {
    setCurrentPrice(ohlc.close);
  };
  const getLatestBar = (bar) => {
    const purchaseTs = new Date(2023, 0, 14, 13, 0).getTime()
    setCurrentPrice(bar[3]);
      setTestTimeMarks([{
        id: "tsm4",
        time: roundTime(purchaseTs),
        color: "blue",
        label: "B",
        tooltip: ["Safety Order 4"],
    }])
  };
  const handleChange = (e) => {
    if (e.target.name === "symbol") {
      setSymbolState(e.target.value);
    }
  }
  return (
    <>
      <h1 style={{ textAlign: "center" }}>Test chart</h1>
      <label htmlFor="symbol">Type symbol</label>
      <input name="symbol" type="text" onChange={handleChange} />
      <TVChartContainer
        symbol={symbolState}
        interval="1h"
        timescaleMarks={testTimeMarks}
        orderLines={orderLines}
        onTick={handleTick}
        getLatestBar={getLatestBar}
      />
    </>
  );
}
