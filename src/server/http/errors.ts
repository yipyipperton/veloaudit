import { NextResponse } from "next/server";
import { logger } from "../logger";

export function jsonError(status: number, code: string, message: string, headers?: Record<string, string>): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status, headers });
}

/** Wrap a handler so unexpected errors become a safe JSON 500 (no stack traces leak). */
export function safe<A extends unknown[]>(name: string, fn: (...a: A) => Promise<Response>) {
  return async (...a: A): Promise<Response> => {
    try {
      return await fn(...a);
    } catch (err) {
      logger.error("api.unhandled", { route: name, err: err instanceof Error ? err.message : String(err) });
      return jsonError(500, "INTERNAL", "Internal server error");
    }
  };
}
