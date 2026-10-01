import { ROOM_ACCESS_DENIED } from "./access-errors";

/** Only confirmed room-access loss clears the cached room; outages and role errors do not. */
export function shouldClearRoom(status: number, data: unknown): boolean {
  if (status === 401) return true;
  return status === 403 && typeof data === "object" && data !== null &&
    "code" in data && data.code === ROOM_ACCESS_DENIED;
}
