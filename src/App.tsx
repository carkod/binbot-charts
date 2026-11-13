import { type FC, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import TVChartContainer, { type OrderLine } from "./main";
import { type ResolutionString } from "./charting_library/charting_library";
import { Exchange } from "./exchanges";

type EditableField =
  | "entry_price"
  | "entry_expires_at"
  | "stop_loss"
  | "trailing_profit"
  | "trailing_deviation";
enum EntryMode {
  IMMEDIATE = "immediate",
  CONDITIONAL_LIMIT = "conditional_limit",
}

const fields = [
  { id: "fiat_order_size", label: "fiat_order_size (USDT)", color: "#1f77d0" },
  { id: "entry_price", label: "entry_price", color: "#e056b5" },
  {
    id: "entry_expires_at",
    label: "entry_expires_at (local time)",
    color: "#e056b5",
  },
  { id: "stop_loss", label: "stop_loss (%)", color: "red" },
  { id: "trailing_profit", label: "trailing_profit (%)", color: "#9368e9" },
  {
    id: "trailing_deviation",
    label: "trailing_deviation (%)",
    color: "#87cb16",
  },
] as const;

function localDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return new Date(timestamp - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export const App: FC = (): JSX.Element => {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [entryMode, setEntryMode] = useState(EntryMode.IMMEDIATE);
  const conditionalEntry = entryMode === EntryMode.CONDITIONAL_LIMIT;
  const [values, setValues] = useState(() => {
    return {
      fiat_order_size: "100",
      entry_price: "",
      entry_expires_at: localDateTime(Date.now() + 6 * 60 * 60 * 1000),
      stop_loss: "2",
      trailing_profit: "3",
      trailing_deviation: "1",
    };
  });
  const [focusedField, setFocusedField] = useState<EditableField | null>(null);
  const focusQuote = useRef<number | null>(null);
  const [position, setPosition] = useState<"short" | "long">("short");
  const [symbolState, setSymbolState] = useState("SUPERUSDTM");
  const [exchangeState, setExchangeState] = useState<Exchange>(Exchange.KUCOIN);
  const [error, setError] = useState("");
  const [entryTime] = useState(() => Math.floor(Date.now() / 3600000) * 3600);
  const entryInitialized = useRef(false);
  const chartContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Keep the selected field when focus moves into TradingView's iframe.
    const clearOutsideChart = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (chartContainer.current?.contains(target)) return;
      if (target.dataset.orderLine) return;
      setFocusedField(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocusedField(null);
    };
    document.addEventListener("focusin", clearOutsideChart);
    document.addEventListener("pointerdown", clearOutsideChart);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("focusin", clearOutsideChart);
      document.removeEventListener("pointerdown", clearOutsideChart);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  const entryPrice = Number(values.entry_price);
  const referencePrice = conditionalEntry
    ? entryPrice
    : focusedField
      ? (focusQuote.current ?? currentPrice)
      : currentPrice;
  const stopLoss = Number(values.stop_loss);
  const profit = Number(values.trailing_profit);
  const deviation = Number(values.trailing_deviation);
  const direction = position === "long" ? 1 : -1;
  const profitPrice = referencePrice * (1 + (direction * profit) / 100);
  const validProfit =
    values.trailing_profit !== "" &&
    Number.isFinite(profit) &&
    profit >= 0 &&
    profit < 100;
  const validDeviation =
    values.trailing_deviation !== "" &&
    Number.isFinite(deviation) &&
    deviation >= 0 &&
    deviation < 100;
  const quantity = `${values.fiat_order_size || "0"} USDT margin`;
  const orderLines: OrderLine[] = [];
  if (Number.isFinite(referencePrice) && referencePrice > 0) {
    orderLines.push({
      id: conditionalEntry ? "entry_price" : "base_order",
      text: conditionalEntry ? "Conditional entry" : "Immediate entry",
      price: referencePrice,
      color: conditionalEntry ? "#e056b5" : "#1f77d0",
      quantity,
      editable: conditionalEntry && focusedField === "entry_price",
    });
    if (
      values.stop_loss !== "" &&
      Number.isFinite(stopLoss) &&
      stopLoss >= 0 &&
      stopLoss < 100
    ) {
      orderLines.push({
        id: "stop_loss",
        text: `Stop loss ${values.stop_loss}%`,
        price: referencePrice * (1 - (direction * stopLoss) / 100),
        color: "red",
        quantity,
        editable: focusedField === "stop_loss",
      });
    }
    if (validProfit) {
      orderLines.push({
        id: "trailing_profit",
        text: `Trailing profit ${values.trailing_profit}%`,
        price: profitPrice,
        color: "#9368e9",
        quantity,
        editable: focusedField === "trailing_profit",
      });
      if (validDeviation)
        orderLines.push({
          id: "trailing_stop_loss",
          text: `Trailing deviation ${values.trailing_deviation}%`,
          price: profitPrice * (1 - (direction * deviation) / 100),
          color: "#87cb16",
          quantity,
          editable: focusedField === "trailing_deviation",
        });
    }
  }
  const expiresAt = new Date(values.entry_expires_at).getTime();
  const timescaleMarks = useMemo(
    () =>
      conditionalEntry && entryPrice > 0
        ? [
            {
              id: "conditional_entry",
              time: entryTime,
              color: "#e056b5",
              label: "E",
              tooltip: [
                `Conditional entry: ${entryPrice}`,
                new Date(entryTime * 1000).toISOString(),
              ],
            },
            ...(Number.isFinite(expiresAt)
              ? [
                  {
                    id: "conditional_expiry",
                    time: Math.floor(expiresAt / 1000),
                    color: "#e056b5",
                    label: "X",
                    tooltip: [
                      "Conditional entry expires",
                      new Date(expiresAt).toISOString(),
                    ],
                  },
                ]
              : []),
          ]
        : [],
    [conditionalEntry, entryPrice, entryTime, expiresAt],
  );

  const updateQuote = (rawPrice: unknown) => {
    const price = Number(rawPrice);
    if (!Number.isFinite(price) || price <= 0) return;
    if (focusedField && focusQuote.current == null) focusQuote.current = price;
    setCurrentPrice(price);
    if (conditionalEntry && !entryInitialized.current) {
      entryInitialized.current = true;
      setValues((previous) => ({ ...previous, entry_price: String(price) }));
    }
  };
  const resetQuote = () => {
    entryInitialized.current = false;
    setCurrentPrice(null);
    setValues((previous) => ({ ...previous, entry_price: "" }));
    setFocusedField(null);
    setError("");
  };
  const handleOrderLineMove = (id: string, price: number) => {
    const field = id === "trailing_stop_loss" ? "trailing_deviation" : id;
    if (field !== focusedField || !Number.isFinite(price) || price <= 0) return;
    if (field === "entry_price" && !conditionalEntry) return;
    const value =
      field === "entry_price"
        ? price
        : 100 *
          direction *
          (field === "trailing_profit"
            ? price / referencePrice - 1
            : 1 -
              price / (field === "stop_loss" ? referencePrice : profitPrice));
    if (
      !Number.isFinite(value) ||
      value < 0 ||
      (field !== "entry_price" && value >= 100)
    ) {
      setError(
        field === "stop_loss"
          ? `Stop loss for a ${position} position must be ${position === "long" ? "at or below" : "at or above"} the reference price ${referencePrice}, with a percentage below 100%. Dropped price: ${price}.`
          : "Drop the line on the correct side of its reference price, with a percentage below 100%.",
      );
      return;
    }
    setError("");
    setValues((previous) => ({
      ...previous,
      [field]: String(
        field === "entry_price" ? value : Math.round(value * 1e8) / 1e8,
      ),
    }));
    document.getElementById(field)?.focus();
  };

  return (
    <>
      <header className="demo-controls">
        <h1>Order line playground</h1>
        <div className="market-fields">
          <label htmlFor="exchange">
            Exchange
            <select
              id="exchange"
              value={exchangeState}
              onChange={(event) => {
                setExchangeState(event.target.value as Exchange);
                resetQuote();
              }}
            >
              <option value={Exchange.BINANCE}>Binance</option>
              <option value={Exchange.KUCOIN}>KuCoin</option>
            </select>
          </label>
          <label htmlFor="symbol">
            Symbol
            <input
              id="symbol"
              value={symbolState}
              onChange={(event) => {
                setSymbolState(event.target.value);
                resetQuote();
              }}
            />
          </label>
          <label htmlFor="position">
            Position
            <select
              id="position"
              value={position}
              onChange={(event) => {
                setPosition(event.target.value as "short" | "long");
                setError("");
              }}
            >
              <option value="short">Short</option>
              <option value="long">Long</option>
            </select>
          </label>
          <label htmlFor="entry_mode">
            entry_mode
            <select
              id="entry_mode"
              value={entryMode}
              onChange={(event) => {
                setEntryMode(event.target.value as EntryMode);
                if (
                  event.target.value === EntryMode.CONDITIONAL_LIMIT &&
                  !entryInitialized.current &&
                  currentPrice > 0
                ) {
                  entryInitialized.current = true;
                  setValues((previous) => ({
                    ...previous,
                    entry_price: String(currentPrice),
                  }));
                }
                setFocusedField(null);
                setError("");
              }}
            >
              <option value={EntryMode.IMMEDIATE}>Immediate</option>
              <option value={EntryMode.CONDITIONAL_LIMIT}>
                Conditional limit
              </option>
            </select>
          </label>
          <span>Current price: {currentPrice ?? "Loading…"}</span>
        </div>
        <div className="order-fields">
          {fields
            .filter(
              ({ id }) =>
                conditionalEntry ||
                (id !== "entry_price" && id !== "entry_expires_at"),
            )
            .map(({ id, label, color }) => (
              <label key={id} htmlFor={id} style={{ borderColor: color }}>
                {label}
                <input
                  id={id}
                  type={id === "entry_expires_at" ? "datetime-local" : "number"}
                  step={id === "entry_expires_at" ? "60" : "any"}
                  min={id === "entry_expires_at" ? undefined : "0"}
                  max={
                    id.startsWith("trailing_") || id === "stop_loss"
                      ? "99.99999999"
                      : undefined
                  }
                  value={values[id]}
                  data-order-line={id === "fiat_order_size" ? undefined : id}
                  onFocus={() => {
                    // Returning focus after a drop must keep the same reference
                    // used to convert the dragged price into a percentage.
                    if (focusedField !== id) focusQuote.current = currentPrice;
                    setFocusedField(id === "fiat_order_size" ? null : id);
                    setError("");
                  }}
                  onChange={(event) => {
                    if (id === "entry_price") entryInitialized.current = true;
                    setValues((previous) => ({
                      ...previous,
                      [id]: event.target.value,
                    }));
                    setError("");
                  }}
                />
              </label>
            ))}
        </div>
        <p>
          Focus a price or percentage field, then drag its matching colored
          line. Press Escape to lock it. Fiat order size changes the margin
          labels. Trailing deviation is measured from the trailing profit price.
        </p>
        {focusedField === "entry_expires_at" && (
          <p>
            Drag the magenta expiry line left or right to update the timestamp.
            Pan the chart if the expiry is outside the visible range.
          </p>
        )}
        {focusedField === "stop_loss" && referencePrice > 0 && (
          <p>
            Stop loss for {position}: drag{" "}
            {position === "long" ? "at or below" : "at or above"}{" "}
            {referencePrice}.
          </p>
        )}
        <p role="status">
          {focusedField ? `Drag enabled: ${focusedField}` : "All lines locked"}{" "}
          · Demo only — no orders are submitted.
        </p>
        {error && <p role="alert">{error}</p>}
      </header>
      <div ref={chartContainer} className="demo-chart">
        <TVChartContainer
          symbol={symbolState}
          interval={"60" as ResolutionString}
          timescaleMarks={timescaleMarks}
          orderLines={orderLines}
          onTick={(tick) => updateQuote(tick.close)}
          getLatestBar={(bar) => updateQuote(bar[3])}
          onOrderLineMove={handleOrderLineMove}
          onOrderLineEditCancel={() => setFocusedField(null)}
          timeMarker={
            conditionalEntry &&
            focusedField === "entry_expires_at" &&
            Number.isFinite(expiresAt)
              ? {
                  id: "conditional_expiry",
                  time: expiresAt / 1000,
                  text: "Conditional entry expires",
                  color: "#e056b5",
                }
              : undefined
          }
          onTimeMarkerMove={(id, time) => {
            if (
              !conditionalEntry ||
              focusedField !== "entry_expires_at" ||
              id !== "conditional_expiry" ||
              !Number.isFinite(time)
            )
              return;
            setValues((previous) => ({
              ...previous,
              entry_expires_at: localDateTime(time * 1000),
            }));
          }}
          exchange={exchangeState}
          style={{ height: "100%" }}
        />
      </div>
    </>
  );
};

export default App;
