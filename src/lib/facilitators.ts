function configuredFacilitatorEmails(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isDefaultFacilitatorEmail(
  email: string | null | undefined,
  configuredEmails = process.env.FACILITATOR_EMAILS,
): boolean {
  return configuredFacilitatorEmails(configuredEmails).has(
    email?.trim().toLowerCase() ?? "",
  );
}
