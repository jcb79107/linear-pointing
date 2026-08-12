export interface JsonResponse<T> {
  data: T;
  response: Response;
}

export async function requestJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 12_000,
): Promise<JsonResponse<T>> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => ({}))) as T;
    return { data, response };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The request timed out. Check your connection and retry.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
