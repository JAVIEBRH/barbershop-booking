/**
 * Next's standalone server (`.next/standalone/server.js`) always calls
 * `process.chdir(__dirname)` on boot, regardless of the cwd it was launched
 * from (e.g. PM2's `cwd`). A relative `file:` DATABASE_URL like
 * `file:./dev.db` therefore resolves against `.next/standalone/`, not the
 * project root the build ran migrations against — silently opening (or
 * creating) an unrelated, empty database at runtime. Fail fast instead.
 */
export function assertAbsoluteFileUrlInProduction(databaseUrl: string, nodeEnv: string): void {
  if (nodeEnv !== "production") return;
  if (!databaseUrl.startsWith("file:")) return;

  const filePath = databaseUrl.slice("file:".length);
  if (filePath.startsWith("./") || filePath.startsWith("../")) {
    throw new Error(
      `DATABASE_URL must be an absolute path in production (got "${databaseUrl}"). ` +
        "Next's standalone server chdir()s into .next/standalone at runtime, so a relative " +
        "file: path opens a different, empty database there instead of the one migrations " +
        'ran against at build time. Use e.g. "file:/opt/barbershop-booking/data/prod.db".'
    );
  }
}
