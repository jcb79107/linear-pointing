import { requireCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { getSessionSnapshot } from "@/lib/sessions";
import { getLinearIssue } from "@/lib/linear";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    const snapshot = await getSessionSnapshot(id, user.id);
    const itemId = new URL(request.url).searchParams.get("itemId");
    const item = snapshot.queue.find((item) => item.id === itemId);
    if (!item)
      return Response.json(
        { error: "Ticket is not in this session" },
        { status: 404 },
      );
    const issue = await getLinearIssue(user.id, item.linearIssueId);
    if (issue.teamId !== snapshot.teamId) throw new Error("FORBIDDEN");
    return Response.json({
      item: {
        ...item,
        title: issue.title,
        description: issue.description,
        labels: issue.labels,
        projectName: issue.projectName,
        assigneeName: issue.assigneeName,
        subIssues: issue.subIssues,
        attachments: issue.attachments,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
