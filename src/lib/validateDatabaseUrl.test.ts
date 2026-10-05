import { describe, expect, it } from "vitest";
import { assertAbsoluteFileUrlInProduction } from "./validateDatabaseUrl";

describe("assertAbsoluteFileUrlInProduction", () => {
  it("accepts a relative file: url outside production (local dev/test)", () => {
    expect(() => assertAbsoluteFileUrlInProduction("file:./dev.db", "development")).not.toThrow();
    expect(() => assertAbsoluteFileUrlInProduction("file:./dev.db", "test")).not.toThrow();
  });

  it("accepts an absolute file: url in production", () => {
    expect(() =>
      assertAbsoluteFileUrlInProduction("file:/opt/barbershop-booking/data/prod.db", "production")
    ).not.toThrow();
  });

  it("rejects a relative file: url in production, since Next's standalone server chdir()s at runtime", () => {
    expect(() => assertAbsoluteFileUrlInProduction("file:./dev.db", "production")).toThrow(
      /absolute/i
    );
  });

  it("rejects a parent-relative file: url in production", () => {
    expect(() => assertAbsoluteFileUrlInProduction("file:../dev.db", "production")).toThrow(
      /absolute/i
    );
  });

  it("ignores non-file: urls (e.g. a future postgres:// DATABASE_URL)", () => {
    expect(() =>
      assertAbsoluteFileUrlInProduction("postgres://user:pass@host/db", "production")
    ).not.toThrow();
  });
});
