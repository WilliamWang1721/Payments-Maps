import {
  buildSessionResponse,
  createUpstreamHeaders,
  decodeSessionToken,
  extractSetCookieHeaders,
  fetchCaptchaImageDataUrl,
  getCaptchaRefreshUrl,
  mergeCookieHeaders,
  parseJsonBody,
  sendJson
} from "./_shared.js";

interface RefreshBridgeSessionRequest {
  sessionToken?: string;
}

interface CaptchaRefreshResponse {
  status?: number;
  message?: string;
  data?: {
    sid?: string;
    token?: string;
    url?: string;
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }

  try {
    const body = await parseJsonBody<RefreshBridgeSessionRequest>(req);
    if (!body.sessionToken) {
      sendJson(res, 400, { error: "Missing Mastercard NUCC bridge session token." });
      return;
    }

    const session = decodeSessionToken(body.sessionToken);
    const refreshResponse = await fetch(getCaptchaRefreshUrl(), {
      headers: createUpstreamHeaders(session.cookieHeader)
    });
    const refreshPayload = (await refreshResponse.json()) as CaptchaRefreshResponse;

    if (!refreshResponse.ok || refreshPayload.status !== 1 || !refreshPayload.data?.sid || !refreshPayload.data?.token || !refreshPayload.data?.url) {
      throw new Error("Unable to refresh the Mastercard NUCC captcha.");
    }

    const cookieHeader = mergeCookieHeaders(session.cookieHeader, extractSetCookieHeaders(refreshResponse.headers));
    const nextSession = {
      ...session,
      cookieHeader,
      captchaSid: refreshPayload.data.sid,
      captchaToken: refreshPayload.data.token,
      captchaImagePath: refreshPayload.data.url,
      issuedAt: new Date().toISOString()
    };
    const captchaImageDataUrl = await fetchCaptchaImageDataUrl(nextSession.captchaImagePath, nextSession.cookieHeader);

    sendJson(res, 200, {
      session: buildSessionResponse(nextSession, captchaImageDataUrl)
    });
  } catch (error) {
    sendJson(res, 502, {
      error: error instanceof Error && error.message
        ? error.message
        : "Unable to refresh the Mastercard NUCC captcha."
    });
  }
}
