const AMAP_UPSTREAM_URL = "https://webapi.amap.com/maps";

function createJavaScriptError(message: string): string {
  return `throw new Error(${JSON.stringify(message)});`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).send(createJavaScriptError("Method Not Allowed"));
    return;
  }

  const requestOrigin = typeof req.headers?.host === "string" ? `https://${req.headers.host}` : "http://localhost";
  const requestUrl = new URL(req.url ?? "/api/amap/js", requestOrigin);
  const upstreamUrl = new URL(AMAP_UPSTREAM_URL);

  requestUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.append(key, value);
  });

  try {
    const upstreamResponse = await fetch(upstreamUrl.toString(), {
      headers: {
        "User-Agent": "fluxa-map-amap-proxy/1.0"
      }
    });
    const body = await upstreamResponse.text();

    if (!upstreamResponse.ok) {
      res.status(upstreamResponse.status);
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      res.send(createJavaScriptError(`AMap proxy upstream failed with ${upstreamResponse.status}.`));
      return;
    }

    res.status(200);
    res.setHeader("Cache-Control", upstreamResponse.headers.get("cache-control") ?? "public, max-age=300, s-maxage=300");
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.send(body);
  } catch (error) {
    res.status(502);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.send(
      createJavaScriptError(
        `AMap proxy request failed: ${error instanceof Error ? error.message : String(error)}.`
      )
    );
  }
}
