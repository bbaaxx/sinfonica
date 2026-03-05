import { describe, expect, it } from "vitest";

import { OPENCODE_SURFACE_SKELETON } from "../src/index.ts";

describe("opencode surface skeleton", () => {
  it("exports skeleton marker", () => {
    expect(OPENCODE_SURFACE_SKELETON).toBe("surfaces/opencode");
  });
});
