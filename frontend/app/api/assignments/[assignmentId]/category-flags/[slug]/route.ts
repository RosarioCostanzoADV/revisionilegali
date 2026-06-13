import { NextRequest } from "next/server";
import { proxyTo } from "../../../../_proxy";

type Ctx = { params: Promise<{ assignmentId: string; slug: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { assignmentId, slug } = await ctx.params;
  return proxyTo(req, `/api/assignments/${assignmentId}/category-flags/${slug}`);
}
