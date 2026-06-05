import { NextRequest } from "next/server";
import { proxyDownloadTo } from "../../../_proxy";

type Ctx = { params: Promise<{ docId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { docId } = await ctx.params;
  return proxyDownloadTo(req, `/api/documents/${docId}/download`);
}
