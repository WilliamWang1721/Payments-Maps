import {
  createBridgeSession,
  sendJson
} from "./_shared.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }

  try {
    const session = await createBridgeSession();
    sendJson(res, 200, { session });
  } catch (error) {
    sendJson(res, 502, {
      error: error instanceof Error && error.message
        ? error.message
        : "Unable to initialize the Mastercard NUCC bridge session."
    });
  }
}
