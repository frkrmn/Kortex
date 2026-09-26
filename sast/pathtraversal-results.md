# Path Traversal Analysis Results: Recallly

## Executive Summary

- File access groups analyzed: 4
- Vulnerable: 0
- Likely Vulnerable: 0
- Not Vulnerable: 4
- Needs Manual Review: 0

## Findings

### [NOT VULNERABLE] Local development store
- **File**: `server/store.ts` (lines 33-34, 409-416, 598)
- **Reason**: Directory and filename are fixed constants under `process.cwd()`. No request value controls them.

### [NOT VULNERABLE] Private benchmark environment and output
- **File**: `server/benchmarks/run-gemini-benchmark.ts` (lines 11-14, 136, 166)
- **Reason**: The private CLI uses fixed `.env.local`, fixed output directory, and fixed filenames. Arguments control limits, not paths.

### [NOT VULNERABLE] Migration test fixture reads
- **Files**: `server/economics/migration-validation.test.mjs`; `server/ai/gemini-migration.test.mjs`
- **Reason**: Test-only code reads hardcoded repository paths.

No request-controlled filesystem path was found.
