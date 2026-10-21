import { execFileSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
const tsx = join(
  repositoryRoot,
  "packages",
  "data-pipeline",
  "node_modules",
  ".bin",
  "tsx",
);
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("operational report CLI", () => {
  it("writes all three deterministic reports from repository data", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "filtermatch-reports-"));
    temporaryDirectories.push(outputDirectory);
    const cases = [
      ["report-missing-evidence", "missing-evidence.json"],
      ["report-alias-collisions", "alias-collisions.json"],
      ["report-devices-without-consumables", "devices-without-consumables.json"],
    ] as const;

    for (const [script, filename] of cases) {
      execFileSync(
        tsx,
        [
          join(repositoryRoot, "scripts", script, "src", "index.ts"),
          "--root",
          repositoryRoot,
          "--output",
          join(outputDirectory, filename),
          "--at",
          "2026-07-17T00:00:00.000Z",
        ],
        { cwd: repositoryRoot, stdio: "pipe" },
      );
    }

    const evidence = JSON.parse(
      await readFile(join(outputDirectory, "missing-evidence.json"), "utf8"),
    ) as { schemaVersion: number; dataRevision: string; summary: { blockingRelations: number } };
    const aliases = JSON.parse(
      await readFile(join(outputDirectory, "alias-collisions.json"), "utf8"),
    ) as { dataRevision: string; summary: { collisionGroups: number } };
    const coverage = JSON.parse(
      await readFile(join(outputDirectory, "devices-without-consumables.json"), "utf8"),
    ) as { dataRevision: string; devices: Array<{ deviceId: string }> };

    expect(evidence.schemaVersion).toBe(2);
    expect(evidence.summary.blockingRelations).toBe(0);
    expect(aliases.summary.collisionGroups).toBe(0);
    expect(coverage.devices.map(({ deviceId }) => deviceId)).toEqual(["airpure-ap101-pl"]);
    expect(new Set([evidence.dataRevision, aliases.dataRevision, coverage.dataRevision]).size).toBe(1);
  });

  it("rejects an invalid report timestamp without writing an artifact", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "filtermatch-reports-invalid-"));
    temporaryDirectories.push(outputDirectory);
    const output = join(outputDirectory, "invalid.json");

    expect(() =>
      execFileSync(
        tsx,
        [
          join(repositoryRoot, "scripts", "report-missing-evidence", "src", "index.ts"),
          "--root",
          repositoryRoot,
          "--output",
          output,
          "--at",
          "not-a-date",
        ],
        { cwd: repositoryRoot, stdio: "pipe" },
      ),
    ).toThrow();
    await expect(readFile(output, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("proves the declared demo catalog matrix is complete", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "filtermatch-catalog-coverage-"));
    temporaryDirectories.push(outputDirectory);
    const output = join(outputDirectory, "catalog-coverage.json");
    execFileSync(
      tsx,
      [
        join(repositoryRoot, "scripts", "report-catalog-coverage", "src", "index.ts"),
        "--root",
        repositoryRoot,
        "--matrix",
        join(repositoryRoot, "data", "fixtures", "demo-catalog-v1.json"),
        "--output",
        output,
        "--at",
        "2026-07-17T00:00:00.000Z",
      ],
      { cwd: repositoryRoot, stdio: "pipe" },
    );
    const coverage = JSON.parse(await readFile(output, "utf8")) as {
      scopeId: string;
      summary: { complete: boolean; expectedPublicEdges: number; issues: number };
    };
    expect(coverage.scopeId).toBe("demo-catalog-v1");
    expect(coverage.summary).toMatchObject({ complete: true, expectedPublicEdges: 10, issues: 0 });
  });

  it("writes the source-link report without requesting synthetic fixture URLs", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "filtermatch-source-links-"));
    temporaryDirectories.push(outputDirectory);
    const output = join(outputDirectory, "source-links.json");
    const fixtureOnlyRoot = await mkdtemp(join(tmpdir(), "filtermatch-source-links-fixtures-"));
    temporaryDirectories.push(fixtureOnlyRoot);
    await cp(join(repositoryRoot, "data"), join(fixtureOnlyRoot, "data"), { recursive: true });
    await rm(join(fixtureOnlyRoot, "data", "candidates", "catalogs"), { recursive: true, force: true });

    execFileSync(
      tsx,
      [
        join(repositoryRoot, "scripts", "check-source-links", "src", "index.ts"),
        "--root",
        fixtureOnlyRoot,
        "--output",
        output,
        "--at",
        "2026-07-17T00:00:00.000Z",
        "--timeout-ms",
        "1000",
        "--max-redirects",
        "3",
        "--min-host-delay-ms",
        "0",
      ],
      { cwd: repositoryRoot, stdio: "pipe" },
    );

    const report = JSON.parse(await readFile(output, "utf8")) as {
      policy: { responseBodyRead: boolean; syntheticEvidenceSkipped: boolean };
      summary: { checkedUrls: number; skippedSyntheticUrls: number; documentOnlySources: number };
      results: unknown[];
    };
    expect(report.policy).toMatchObject({ responseBodyRead: false, syntheticEvidenceSkipped: true });
    expect(report.summary).toMatchObject({
      checkedUrls: 0,
      skippedSyntheticUrls: 12,
      documentOnlySources: 4,
    });
    expect(report.results).toEqual([]);
  });

  it("prepares and applies an explicit non-public human review decision", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "filtermatch-review-workflow-"));
    temporaryDirectories.push(temporaryRoot);
    await cp(join(repositoryRoot, "data"), join(temporaryRoot, "data"), { recursive: true });
    const packetPath = join(temporaryRoot, "review-packet.json");
    const decisionPath = join(temporaryRoot, "decision.json");
    const reportPath = join(temporaryRoot, "review-report.json");

    execFileSync(
      tsx,
      [
        join(repositoryRoot, "scripts", "prepare-compatibility-review", "src", "index.ts"),
        "--root",
        temporaryRoot,
        "--edge-id",
        "compat-ap100-hb100-candidate",
        "--output",
        packetPath,
        "--at",
        "2026-07-17T00:00:00.000Z",
      ],
      { cwd: repositoryRoot, stdio: "pipe" },
    );
    const packet = JSON.parse(await readFile(packetPath, "utf8")) as {
      policy: string;
      edge: { verificationStatus: string };
    };
    expect(packet).toMatchObject({
      policy: "explicit_authorized_human_decision_only",
      edge: { verificationStatus: "candidate" },
    });

    await writeFile(
      decisionPath,
      `${JSON.stringify({
        id: "review-cli-candidate-rejection",
        edgeId: "compat-ap100-hb100-candidate",
        previousStatus: "candidate",
        decision: "rejected",
        evidenceIds: ["evidence-candidate-mention"],
        reviewer: "fixture-human-reviewer",
        decisionAuthority: "authorized_human_reviewer",
        decidedAt: "2026-07-16T10:00:00.000Z",
        rationale: "Synthetic CLI test explicitly rejects the candidate without publishing it.",
        synthetic: true,
        notForProduction: true,
      }, null, 2)}\n`,
      "utf8",
    );
    execFileSync(
      tsx,
      [
        join(repositoryRoot, "scripts", "apply-compatibility-review", "src", "index.ts"),
        "--root",
        temporaryRoot,
        "--decision",
        decisionPath,
        "--report",
        reportPath,
        "--at",
        "2026-07-17T00:00:00.000Z",
        "--confirm-authorized-human-review",
        "YES",
      ],
      { cwd: repositoryRoot, stdio: "pipe" },
    );

    const candidates = JSON.parse(
      await readFile(join(temporaryRoot, "data", "candidates", "compatibility-edges.json"), "utf8"),
    ) as { schemaVersion: number; records: Array<{ id: string; verificationStatus: string }> };
    const decisions = JSON.parse(
      await readFile(join(temporaryRoot, "data", "verified", "review-decisions.json"), "utf8"),
    ) as { records: Array<{ id: string }> };
    const report = JSON.parse(await readFile(reportPath, "utf8")) as {
      automaticApproval: boolean;
      publicationAfter: { publish: boolean };
    };
    expect(candidates.schemaVersion).toBe(2);
    expect(candidates.records.find(({ id }) => id === "compat-ap100-hb100-candidate"))
      .toMatchObject({ verificationStatus: "rejected" });
    expect(decisions.records.some(({ id }) => id === "review-cli-candidate-rejection")).toBe(true);
    expect(report).toMatchObject({ automaticApproval: false, publicationAfter: { publish: false } });
  });

  it("migrates a legacy collection through the real CLI", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "filtermatch-migration-cli-"));
    temporaryDirectories.push(outputDirectory);
    const output = join(outputDirectory, "devices-v2.json");
    execFileSync(
      tsx,
      [
        join(repositoryRoot, "scripts", "migrate-schema-v1-to-v2", "src", "index.ts"),
        "--input",
        join(repositoryRoot, "data", "fixtures", "migrations", "v1", "devices.json"),
        "--output",
        output,
        "--kind",
        "devices",
      ],
      { cwd: repositoryRoot, stdio: "pipe" },
    );
    const [actual, expected] = await Promise.all([
      readFile(output, "utf8"),
      readFile(
        join(repositoryRoot, "data", "fixtures", "migrations", "v2", "devices.json"),
        "utf8",
      ),
    ]);
    expect(JSON.parse(actual)).toEqual(JSON.parse(expected));
  });

  it("refuses to overwrite an unversioned existing import target", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "filtermatch-import-legacy-target-"));
    temporaryDirectories.push(outputDirectory);
    const input = join(repositoryRoot, "data", "fixtures", "migrations", "v1", "devices.json");
    const output = join(outputDirectory, "devices.json");
    const report = join(outputDirectory, "report.json");
    await writeFile(output, "[]\n", "utf8");

    expect(() =>
      execFileSync(
        tsx,
        [
          join(repositoryRoot, "scripts", "import-devices", "src", "index.ts"),
          "--input",
          input,
          "--output",
          output,
          "--report",
          report,
        ],
        { cwd: repositoryRoot, stdio: "pipe" },
      ),
    ).toThrow();
    expect(await readFile(output, "utf8")).toBe("[]\n");
  });
});
