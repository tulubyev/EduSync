import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import App from "./App";
import "./index.css";
import "./theme-dark.css";

createRoot(document.getElementById("root")!).render(<App />);
