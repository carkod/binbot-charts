import { type FC, useEffect, useState } from "react";
import { useImmer } from "use-immer";
import { Immutable } from "immer";
import "./App.css";
import TVChartContainer, { OrderLine } from "./main";
import { ResolutionString } from "./charting_library/charting_library";
import { ITimescaleMarks } from "./charting-library-interfaces";
import { roundTime } from "./helpers";
import { Exchange } from "./exchanges";

type TimeMarks = Immutable<ITimescaleMarks>;

export const App: FC<{}> = (): JSX.Element => {
  const [currentPrice, setCurrentPrice] = useState(null);
  const [orderLines, setOrderLines] = useImmer<OrderLine[]>([]);
  const [symbolState, setSymbolState] = useState("SUPER-USDT");
  const [exchangeState, setExchangeState] = useState<Exchange>(Exchange.KUCOIN);
  const [testTimeMarks, setTestTimeMarks] = useState<Array<TimeMarks>>([]);

  useEffect(() => {
    if (currentPrice) {
      updateOrderLines();
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
        return draft;
      });
      setOrderLines((draft) => {
        draft.push({
          id: "take_profit",
          text: "Take profit",
          tooltip: ["Inactive"],
          quantity: `XX USDT`,
          price: parseFloat((currentPrice * 1.03).toFixed(6)),
          color: "#1f77d0",
        });
        return draft;
      });
    }
  };

  const handleTick = (ohlc) => {
    setCurrentPrice(ohlc.close);
  };
  const getLatestBar = (bar) => {
    const purchaseTs = new Date(2023, 0, 14, 13, 0).getTime();
    setCurrentPrice(bar[3]);
    setTestTimeMarks([
      {
        id: "tsm4",
        time: roundTime(purchaseTs),
        color: "blue",
        label: "B",
        tooltip: ["Safety Order 4"],
      },
    ]);
  };
  const handleChange = (e) => {
    if (e.target.name === "symbol") {
      setSymbolState(e.target.value);
    } else if (e.target.name === "exchange") {
      setExchangeState(e.target.value as Exchange);
    }
  };
  return (
    <>
      <h1 style={{ textAlign: "center" }}>Test chart</h1>
      <div style={{ padding: "10px", textAlign: "center" }}>
        <label htmlFor="exchange" style={{ marginRight: "10px" }}>Exchange:</label>
        <select name="exchange" onChange={handleChange} value={exchangeState} style={{ marginRight: "20px" }}>
          <option value={Exchange.BINANCE}>Binance</option>
          <option value={Exchange.KUCOIN}>KuCoin</option>
        </select>
        <label htmlFor="symbol" style={{ marginRight: "10px" }}>Type symbol:</label>
        <input name="symbol" type="text" onChange={handleChange} value={symbolState} />
      </div>
      <TVChartContainer
        symbol={symbolState}
        interval={"1h" as ResolutionString}
        timescaleMarks={testTimeMarks}
        orderLines={orderLines}
        onTick={handleTick}
        getLatestBar={getLatestBar}
        exchange={exchangeState}
        supportedExchanges={[Exchange.BINANCE, Exchange.KUCOIN]}
      />
    </>
  );
};

export default App;
