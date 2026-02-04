import { describe, test, expect } from "bun:test";

describe("bun test infrastructure", () => {
  test("example test works", () => {
    expect(true).toBe(true);
  });

  test("can import types", () => {
    const value: string = "test";
    expect(value).toBe("test");
  });
});
