import { describe, expect, it } from "vitest";
import { escapeLike } from "./company-utils.js";

describe("company utilities", () => {
  it("escapes SQLite LIKE wildcards and backslashes", () => {
    expect(escapeLike("ACME_100%\\Lab")).toBe("ACME\\_100\\%\\\\Lab");
  });
});
