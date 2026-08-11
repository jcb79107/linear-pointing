import { describe, expect, it } from "vitest";

import { createPkceChallenge, validOAuthState } from "@/lib/oauth";

describe("Linear OAuth protections", () => {
  it("generates an RFC 7636 S256 PKCE challenge", () => {
    expect(
      createPkceChallenge(
        "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
      ),
    ).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("rejects absent, mismatched, and differently-sized CSRF states", () => {
    expect(validOAuthState("same", "same")).toBe(true);
    expect(validOAuthState("other", "same")).toBe(false);
    expect(validOAuthState("short", "much-longer")).toBe(false);
    expect(validOAuthState(null, "state")).toBe(false);
  });
});
