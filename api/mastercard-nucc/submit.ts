import {
  buildSessionResponse,
  cleanHtmlText,
  createUpstreamHeaders,
  decodeSessionToken,
  extractAjaxErrorMessage,
  extractSetCookieHeaders,
  extractUpdatedSessionFromAjaxHtml,
  fetchCaptchaImageDataUrl,
  getContactFormUrl,
  mergeCookieHeaders,
  parseJsonBody,
  sendJson
} from "./_shared.js";

interface SubmitBridgeRequest {
  sessionToken?: string;
  phone?: string;
  businessName?: string;
  merchantCity?: string;
  businessAddress?: string;
  date?: string;
  time?: string;
  cardNumber?: string;
  problemDescription?: string;
  captchaResponse?: string;
  privacyAccepted?: boolean;
}

interface DrupalAjaxCommand {
  command?: string;
  data?: string;
  new?: string;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }

  try {
    const body = await parseJsonBody<SubmitBridgeRequest>(req);

    if (!body.sessionToken) {
      sendJson(res, 400, { error: "Missing Mastercard NUCC bridge session token." });
      return;
    }

    if (!body.businessName?.trim() || !body.merchantCity?.trim() || !body.businessAddress?.trim() || !body.problemDescription?.trim()) {
      sendJson(res, 400, { error: "Merchant name, city, address, and problem description are required for Mastercard NUCC submission." });
      return;
    }

    if (!body.captchaResponse?.trim()) {
      sendJson(res, 400, { error: "Please enter the captcha code before submitting to Mastercard NUCC." });
      return;
    }

    if (!body.privacyAccepted) {
      sendJson(res, 400, { error: "Please accept the privacy policy before submitting to Mastercard NUCC." });
      return;
    }

    const session = decodeSessionToken(body.sessionToken);
    const formData = new FormData();
    formData.set("type", "card");
    formData.set("phone", body.phone?.trim() || "");
    formData.set("business_name", body.businessName.trim());
    formData.set("merchant_city", body.merchantCity.trim());
    formData.set("business_address", body.businessAddress.trim());
    formData.set("date", body.date?.trim() || "");
    formData.set("time", body.time?.trim() || "");
    formData.set("card_usage_time_show", "");
    formData.set("card_number", body.cardNumber?.trim() || "");
    formData.set("problem_description", body.problemDescription.trim());
    formData.set("captcha_sid", session.captchaSid);
    formData.set("captcha_token", session.captchaToken);
    formData.set("captcha_response", body.captchaResponse.trim());
    formData.set("privacy_policy", "1");
    formData.set("op", "提交");
    formData.set("form_build_id", session.formBuildId);
    formData.set("form_id", session.formId);

    const submitResponse = await fetch(`${getContactFormUrl()}?ajax_form=1`, {
      method: "POST",
      headers: createUpstreamHeaders(session.cookieHeader),
      body: formData
    });
    const commands = (await submitResponse.json()) as DrupalAjaxCommand[];

    if (!submitResponse.ok || !Array.isArray(commands)) {
      throw new Error("Mastercard NUCC submission failed.");
    }

    const insertedHtml = commands.find((command) => command.command === "insert" && typeof command.data === "string")?.data || "";
    const nextFormBuildId = commands.find((command) => command.command === "update_build_id" && typeof command.new === "string")?.new;
    const mergedCookieHeader = mergeCookieHeaders(session.cookieHeader, extractSetCookieHeaders(submitResponse.headers));
    const errorMessage = insertedHtml ? extractAjaxErrorMessage(insertedHtml) : null;

    if (errorMessage) {
      const nextSessionPayload = {
        ...extractUpdatedSessionFromAjaxHtml(insertedHtml, session, nextFormBuildId),
        cookieHeader: mergedCookieHeader
      };
      const captchaImageDataUrl = await fetchCaptchaImageDataUrl(nextSessionPayload.captchaImagePath, nextSessionPayload.cookieHeader);

      sendJson(res, 400, {
        error: errorMessage,
        session: buildSessionResponse(nextSessionPayload, captchaImageDataUrl)
      });
      return;
    }

    const successText = insertedHtml ? cleanHtmlText(insertedHtml) : "";
    sendJson(res, 200, {
      message: successText || "Mastercard NUCC submission completed successfully."
    });
  } catch (error) {
    sendJson(res, 502, {
      error: error instanceof Error && error.message
        ? error.message
        : "Unable to submit the Mastercard NUCC feedback right now."
    });
  }
}
