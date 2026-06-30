import { describe, expect, it } from "vitest";
import { normalizeReadingQueueInput, readingQueueModelFromRow } from "./reading-queue-utils.js";

describe("reading queue compatibility", () => {
  it("preserves legacy important rows even when migrated reading_state defaults to unread", () => {
    const model = readingQueueModelFromRow({ status: "important", readingState: "unread", important: 0, useCasesJson: null });
    expect(model.readingState).toBe("reading");
    expect(model.important).toBe(true);
    expect(model.flags).toEqual(["important"]);
  });

  it("preserves legacy use_for_project rows", () => {
    const model = readingQueueModelFromRow({ status: "use_for_project", readingState: "unread", important: 0, useCasesJson: null });
    expect(model.readingState).toBe("reading");
    expect(model.useCases).toEqual(["project"]);
  });

  it("merges new input with legacy use cases without clearing flags", () => {
    const next = normalizeReadingQueueInput(
      { readingStatus: "review_later", useCases: ["application"], flags: ["important"] },
      { status: "use_for_project", readingState: "unread", important: 0, useCasesJson: null },
    );
    expect(next).toEqual({ readingState: "review_later", important: true, useCases: ["application"] });
  });
});
