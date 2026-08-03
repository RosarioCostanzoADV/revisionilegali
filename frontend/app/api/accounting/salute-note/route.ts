import { NextRequest } from "next/server";
import { proxyTo } from "../../_proxy";

async function handler(req: NextRequest) {
  return proxyTo(req, `/api/accounting/salute-note${req.nextUrl.search}`);
}

export const GET = handler;
export const PUT = handler;
