import { NextRequest } from "next/server";
import { proxyTo } from "../../../_proxy";

type Ctx = { params: Promise<{ quarterId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { quarterId } = await ctx.params;
  return proxyTo(req, `/api/accounting/review/${quarterId}`);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { quarterId } = await ctx.params;
  return proxyTo(req, `/api/accounting/review/${quarterId}`);
}
