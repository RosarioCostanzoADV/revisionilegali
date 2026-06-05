import { NextRequest } from "next/server";
import { proxyTo } from "../../_proxy";

type Ctx = { params: Promise<{ docId: string }> };

/** GET /api/documents/:docId — restituisce { url } per il download. */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { docId } = await ctx.params;
  const url = `/api/documents/${docId}/download`;
  return Response.json({ url });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { docId } = await ctx.params;
  return proxyTo(req, `/api/documents/${docId}`);
}
