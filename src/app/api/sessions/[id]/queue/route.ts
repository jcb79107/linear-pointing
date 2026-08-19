import { z } from "zod";

import { requireCurrentUser } from "@/lib/auth";
import { apiError, assertSameOrigin } from "@/lib/http";
import {
  addQueueItems,
  clearQueue,
  removeQueueItem,
  reorderQueue,
} from "@/lib/sessions";

const addSchema = z.object({
  issueIds: z.array(z.string().min(1)).min(1).max(1000),
  stateTypes: z
    .array(z.enum(["backlog", "unstarted", "started"]))
    .min(1)
    .max(3),
  estimateScope: z.enum(["unestimated", "estimated", "any"]),
});
const reorderSchema = z.object({
  orderedItemIds: z.array(z.string().uuid()).max(1000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const [user, { id }] = await Promise.all([
      requireCurrentUser(),
      params,
    ]);
    const input = addSchema.parse(await request.json());
    await addQueueItems({
      sessionId: id,
      userId: user.id,
      issueIds: input.issueIds,
      policy: {
        stateTypes: input.stateTypes,
        estimateScope: input.estimateScope,
      },
    });
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const [user, { id }] = await Promise.all([
      requireCurrentUser(),
      params,
    ]);
    const input = reorderSchema.parse(await request.json());
    await reorderQueue({
      sessionId: id,
      userId: user.id,
      orderedItemIds: input.orderedItemIds,
    });
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const [user, { id }] = await Promise.all([
      requireCurrentUser(),
      params,
    ]);
    const searchParams = new URL(request.url).searchParams;
    if (searchParams.get("all") === "true") {
      const removed = await clearQueue({
        sessionId: id,
        userId: user.id,
      });
      return Response.json({ success: true, removed });
    }
    const queueItemId = z
      .string()
      .uuid()
      .parse(searchParams.get("itemId"));
    await removeQueueItem({
      sessionId: id,
      userId: user.id,
      queueItemId,
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
