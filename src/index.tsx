import { createRoot } from "react-dom/client";
import App from "./App"; // Ensure App is a default export from "./App"
import "./index.css";

const rootElement = document.getElementById("root");

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
