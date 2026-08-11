import { describe, expect, it } from "vitest";

import { isDefaultFacilitatorEmail } from "@/lib/facilitators";

describe("default facilitator emails", () => {
  const configuredEmails = "facilitator@example.com, second@example.com";

  it("matches configured facilitators without case or whitespace sensitivity", () => {
    expect(
      isDefaultFacilitatorEmail("facilitator@example.com", configuredEmails),
    ).toBe(true);
    expect(
      isDefaultFacilitatorEmail(" SECOND@EXAMPLE.COM ", configuredEmails),
    ).toBe(true);
  });

  it("does not default any other account to facilitator", () => {
    expect(
      isDefaultFacilitatorEmail("teammate@example.com", configuredEmails),
    ).toBe(false);
    expect(isDefaultFacilitatorEmail(null, configuredEmails)).toBe(false);
  });

  it("defaults to no facilitators when none are configured", () => {
    expect(isDefaultFacilitatorEmail("facilitator@example.com", "")).toBe(
      false,
    );
  });
});
