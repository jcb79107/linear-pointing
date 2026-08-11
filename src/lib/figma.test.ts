import { describe, expect, it } from "vitest";

import {
  extractFigmaUrls,
  figmaPreviewTitle,
  isFigmaUrl,
} from "@/lib/figma";

describe("Figma links", () => {
  it("accepts shareable Figma file URLs and rejects unrelated links", () => {
    expect(
      isFigmaUrl("https://www.figma.com/design/abc123/Checkout-flow"),
    ).toBe(true);
    expect(isFigmaUrl("https://example.com/design/abc123")).toBe(false);
    expect(isFigmaUrl("http://figma.com/design/abc123/Test")).toBe(false);
  });

  it("extracts and deduplicates Figma links from ticket markdown", () => {
    const url = "https://www.figma.com/design/abc123/Checkout-flow?node-id=1-2";
    expect(
      extractFigmaUrls(`Design: [open](${url}).\nDuplicate: ${url}`),
    ).toEqual([url]);
  });

  it("uses the Figma file slug as the preview title", () => {
    expect(
      figmaPreviewTitle(
        "https://www.figma.com/design/abc123/Checkout-flow?node-id=1-2",
      ),
    ).toBe("Checkout flow");
  });
});
