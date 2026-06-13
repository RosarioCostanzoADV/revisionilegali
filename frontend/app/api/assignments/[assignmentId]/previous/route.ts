import { NextRequest } from "next/server";
import { proxyTo } from "../../../_proxy";

type Ctx = { params: Promise<{ assignmentId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { assignmentId } = await ctx.params;
  return proxyTo(req, `/api/assignments/${assignmentId}/previous`);
}
