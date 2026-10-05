import { describe, it, expect } from "vitest";
import { signSessionValue, verifySessionValue } from "./session";

describe("session token signing", () => {
  it("verifies a token it just signed", () => {
    const token = signSessionValue("admin", "test-secret-0123456789012345678901");
    expect(verifySessionValue(token, "test-secret-0123456789012345678901")).toBe(true);
  });

  it("rejects a token signed with a different secret", () => {
    const token = signSessionValue("admin", "secret-a-0123456789012345678901234");
    expect(verifySessionValue(token, "secret-b-0123456789012345678901234")).toBe(false);
  });

  it("rejects a tampered token", () => {
    const token = signSessionValue("admin", "test-secret-0123456789012345678901");
    const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
    expect(verifySessionValue(tampered, "test-secret-0123456789012345678901")).toBe(false);
  });
});
