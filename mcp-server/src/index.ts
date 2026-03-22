import "dotenv/config";

import app from "./app.js";

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3030);
const publicBaseUrl = (process.env.MCP_PUBLIC_BASE_URL || `http://${host}:${port}`).replace(/\/$/, "");

app.listen(port, host, (error?: Error) => {
  if (error) {
    console.error("Failed to start Fluxa MCP server.", error);
    process.exit(1);
  }

  console.log(`Fluxa MCP server listening on ${publicBaseUrl}`);
});
