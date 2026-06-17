import { describe, expect, it } from "vitest";
import { reconnectDelay } from "./reconnect";

describe("reconnectDelay", () => {
  it("uses the required capped exponential schedule", () => {
    expect(Array.from({ length: 8 }, (_, attempt) => reconnectDelay(attempt))).toEqual([
      500,
      1_000,
      2_000,
      4_000,
      8_000,
      10_000,
      10_000,
      10_000,
    ]);
  });
});
