import { requireCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { getLinearAccessToken } from "@/lib/linear";

const MAX_MEDIA_BYTES = 15 * 1024 * 1024;

function isAllowedLinearMediaUrl(url: URL): boolean {
  return (
    url.protocol === "https:" &&
    (url.hostname === "uploads.linear.app" ||
      url.hostname.endsWith(".linear.app"))
  );
}

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser();
    const source = new URL(request.url).searchParams.get("url");
    if (!source) return new Response("Missing media URL", { status: 400 });

    const sourceUrl = new URL(source);
    if (!isAllowedLinearMediaUrl(sourceUrl)) {
      return new Response("Media host is not allowed", { status: 400 });
    }

    const { accessToken } = await getLinearAccessToken(user.id);
    const upstream = await fetch(sourceUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      redirect: "manual",
      cache: "no-store",
    });
    if (!upstream.ok) {
      return new Response("Linear media could not be loaded", {
        status: upstream.status || 502,
      });
    }
    const contentType = upstream.headers.get("content-type") ?? "";
    const contentLength = Number(upstream.headers.get("content-length") ?? 0);
    if (
      !contentType.startsWith("image/") ||
      contentLength > MAX_MEDIA_BYTES
    ) {
      return new Response("Unsupported Linear media", { status: 415 });
    }
    const body = await upstream.arrayBuffer();
    if (body.byteLength > MAX_MEDIA_BYTES) {
      return new Response("Linear media is too large", { status: 413 });
    }

    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
