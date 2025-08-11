import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// 暂时移除StrictMode以解决地图初始化问题
createRoot(document.getElementById("root")!).render(
  <App />
);
