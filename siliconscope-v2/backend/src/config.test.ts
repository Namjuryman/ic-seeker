import { describe, expect, it, vi } from "vitest";
import { assertProductionSafety, evaluateProductionSafety } from "./config.js";

const safeConfig = {
  deploymentMode: "production",
  nodeEnv: "production",
  jwtSecret: "this-is-a-long-production-grade-secret-value",
  adminPassword: "not-the-default-admin-password",
  authEnabled: true,
  frontendOrigins: ["https://app.siliconscope.example"],
  trustProxy: true,
};

describe("production safety checks", () => {
  it("blocks default JWT secrets", () => {
    const report = evaluateProductionSafety({ ...safeConfig, jwtSecret: "change-me-in-production" });
    expect(report.blockingIssues.join("\n")).toContain("JWT_SECRET");
  });

  it("blocks weak JWT secrets", () => {
    const report = evaluateProductionSafety({ ...safeConfig, jwtSecret: "short-secret" });
    expect(report.blockingIssues.join("\n")).toContain("JWT_SECRET");
  });

  it("blocks default admin passwords", () => {
    const report = evaluateProductionSafety({ ...safeConfig, adminPassword: "change-me-now" });
    expect(report.blockingIssues.join("\n")).toContain("ADMIN_PASSWORD");
  });

  it("blocks disabled production auth and unsafe local origins", () => {
    const report = evaluateProductionSafety({
      ...safeConfig,
      authEnabled: false,
      frontendOrigins: ["http://localhost:5173", "*"],
    });
    expect(report.blockingIssues.join("\n")).toContain("Authentication");
    expect(report.blockingIssues.join("\n")).toContain("FRONTEND_ORIGINS");
  });

  it("allows compliant production config", () => {
    const report = evaluateProductionSafety(safeConfig);
    expect(report.blockingIssues).toEqual([]);
    expect(report.warnings).toEqual([]);
  });

  it("warns but does not throw in development mode", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(() => assertProductionSafety({
      ...safeConfig,
      deploymentMode: "local",
      nodeEnv: "development",
      jwtSecret: "change-me-in-production",
      adminPassword: "change-me-now",
      authEnabled: false,
      frontendOrigins: ["http://localhost:5173"],
      trustProxy: false,
    }, { exitOnFailure: false })).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
