import "dotenv/config";

import app from "./app.js";

const port = Number(process.env.PORT || 3030);
const publicBaseUrl = (process.env.MCP_PUBLIC_BASE_URL || `http://localhost:${port}`).replace(/\/$/, "");

app.listen(port, (error?: Error) => {
  if (error) {
    console.error("Failed to start Fluxa MCP server.", error);
    process.exit(1);
  }

  console.log(`Fluxa MCP server listening on ${publicBaseUrl}`);
});
