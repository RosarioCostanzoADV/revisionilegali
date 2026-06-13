import { NextRequest } from "next/server";
import { proxyTo } from "../../_proxy";

export async function POST(req: NextRequest) {
  return proxyTo(req, "/api/documents/copy");
}
