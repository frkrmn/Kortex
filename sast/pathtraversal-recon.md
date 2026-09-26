# Path Traversal Recon: Recallly

## Summary

Found 4 filesystem access groups, none reached by an HTTP request path or filename.

## File Access Sites

### 1. Local development store
- **File**: `server/store.ts` (lines 33-34, 409-416, 598)
- **Operation**: read/write JSON store
- **Path source**: fixed `path.join(process.cwd(), 'data', 'kortex-store.json')`

### 2. Benchmark environment file
- **File**: `server/benchmarks/run-gemini-benchmark.ts` (line 11)
- **Operation**: dotenv load
- **Path source**: fixed `.env.local` under process working directory

### 3. Benchmark output artifacts
- **File**: `server/benchmarks/run-gemini-benchmark.ts` (lines 14, 136, 166)
- **Operation**: write benchmark JSON/Markdown
- **Path source**: fixed artifact directory and fixed filenames

### 4. Migration test fixtures
- **Files**: `server/economics/migration-validation.test.mjs`; `server/ai/gemini-migration.test.mjs`
- **Operation**: read SQL fixtures
- **Path source**: hardcoded repository migration paths; test-only
