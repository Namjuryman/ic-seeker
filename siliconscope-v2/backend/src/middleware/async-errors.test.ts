import { describe, expect, it, vi } from "vitest";
import type { Router } from "express";
import { wrapAsyncRouter } from "./async-errors.js";

describe("wrapAsyncRouter", () => {
  it("forwards rejected async route handlers to next", async () => {
    const failure = new Error("boom");
    const handler = vi.fn(async () => {
      throw failure;
    });
    const router = {
      stack: [
        {
          route: {
            stack: [{ handle: handler }],
          },
        },
      ],
    } as unknown as Router;

    wrapAsyncRouter(router);
    const wrapped = (router as unknown as { stack: Array<{ route: { stack: Array<{ handle: Function }> } }> }).stack[0].route.stack[0].handle;
    const next = vi.fn();

    wrapped({}, {}, next);
    await new Promise((resolve) => setImmediate(resolve));

    expect(next).toHaveBeenCalledWith(failure);
  });
});
