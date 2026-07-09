import type { NextFunction, Request, Response, Router } from "express";

type ExpressLayer = {
  handle?: unknown;
  route?: {
    stack?: ExpressLayer[];
  };
};

type Handler = (req: Request, res: Response, next: NextFunction) => unknown;

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return Boolean(value && typeof (value as Promise<unknown>).then === "function");
}

function wrapHandler(handler: Handler): Handler {
  if (handler.length >= 4 || (handler as { __asyncWrapped?: boolean }).__asyncWrapped) return handler;
  const wrapped: Handler = (req, res, next) => {
    try {
      const result = handler(req, res, next);
      if (isPromiseLike(result)) result.catch(next);
      return result;
    } catch (err) {
      next(err);
      return undefined;
    }
  };
  (wrapped as { __asyncWrapped?: boolean }).__asyncWrapped = true;
  return wrapped;
}

function wrapLayer(layer: ExpressLayer) {
  if (typeof layer.handle === "function") {
    layer.handle = wrapHandler(layer.handle as Handler);
  }
  for (const routeLayer of layer.route?.stack || []) {
    wrapLayer(routeLayer);
  }
}

export function wrapAsyncRouter(router: Router) {
  for (const layer of ((router as unknown as { stack?: ExpressLayer[] }).stack || [])) {
    wrapLayer(layer);
  }
  return router;
}
