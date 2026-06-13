import { NextRequest } from "next/server";
import { proxyTo } from "../../_proxy";

type Ctx = { params: Promise<{ docId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { docId } = await ctx.params;
  return Response.json({ url: `/api/documents/${docId}/download` });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { docId } = await ctx.params;
  return proxyTo(req, `/api/documents/${docId}`);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { docId } = await ctx.params;
  return proxyTo(req, `/api/documents/${docId}`);
}
