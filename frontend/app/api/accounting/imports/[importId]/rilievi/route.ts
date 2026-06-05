import { NextRequest } from "next/server";
import { proxyTo } from "../../../../_proxy";

type Ctx = { params: Promise<{ importId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { importId } = await ctx.params;
  return proxyTo(req, `/api/accounting/imports/${importId}/rilievi`);
}
