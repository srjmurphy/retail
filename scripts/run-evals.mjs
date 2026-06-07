const baseUrl = process.env.MAVEN_URL || "http://localhost:3000";
const live = process.env.EVAL_LIVE === "1" ? "?live=1" : "";

try {
  const response = await fetch(`${baseUrl}/api/evals${live}`);
  const report = await response.json();

  console.table(
    report.results.map((item) => ({
      result: item.skipped ? "SKIP" : item.passed ? "PASS" : "FAIL",
      evaluation: item.name,
      detail: item.detail,
    })),
  );
  console.log(`Passed: ${report.totals.passed}; failed: ${report.totals.failed}; skipped: ${report.totals.skipped}`);
  process.exitCode = report.passed ? 0 : 1;
} catch (error) {
  console.error(`Could not reach ${baseUrl}. Start the app with npm run dev, then run npm run eval.`);
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
