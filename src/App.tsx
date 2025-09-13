import { type FC, useEffect, useState } from "react";
import { useImmer } from "use-immer";
import { Immutable } from "immer";
import "./App.css";
import TVChartContainer, { OrderLine } from "./main";
import { ResolutionString } from "./charting_library/charting_library";
import { ITimescaleMarks } from "./charting-library-interfaces";
import { roundTime } from "./helpers";

type TimeMarks = Immutable<ITimescaleMarks>;

export const App: FC<{}> = (): JSX.Element => {
  const [currentPrice, setCurrentPrice] = useState(null);
  const [orderLines, setOrderLines] = useImmer<OrderLine[]>([]);
  const [symbolState, setSymbolState] = useState("QTUMBTC");
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
    }
  };
  return (
    <>
      <h1 style={{ textAlign: "center" }}>Test chart</h1>
      <label htmlFor="symbol">Type symbol</label>
      <input name="symbol" type="text" onChange={handleChange} />
      <TVChartContainer
        symbol={symbolState}
        interval={"1h" as ResolutionString}
        timescaleMarks={testTimeMarks}
        orderLines={orderLines}
        onTick={handleTick}
        getLatestBar={getLatestBar}
      />
    </>
  );
};

export default App;
