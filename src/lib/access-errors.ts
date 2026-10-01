// Pure error contracts shared by server access gates and client-safe consumers.
export const ROOM_ACCESS_DENIED = "ROOM_ACCESS_DENIED";
export const LINEAR_ACCESS_UNAVAILABLE = "LINEAR_ACCESS_UNAVAILABLE";

export class RoomAccessDeniedError extends Error {
  readonly code = ROOM_ACCESS_DENIED;

  constructor() {
    super("You no longer have access to this room.");
    this.name = "RoomAccessDeniedError";
  }
}

export class LinearAccessUnavailableError extends Error {
  readonly code = LINEAR_ACCESS_UNAVAILABLE;

  constructor() {
    super("Unable to verify Linear access. Try again.");
    this.name = "LinearAccessUnavailableError";
  }
}
