# Backend stress and fixes — 2026-11-02

The repository's backend is the local Node static server and the Photography /
Travel editing APIs. The public production package is static. Tests run on
isolated localhost servers, not against the public website or real editor data.

## Reproduced failures and implementation

| Failure | Fix |
| --- | --- |
| Compression ignored q=0 and relative gzip/Brotli preferences | Parse client encoding qualities, retain identity where permitted, return 406 if no available representation is acceptable |
| Stale If-Range still returned a partial file; weak/list validators missed 304 | Check range validators before partial delivery and handle weak/list/wildcard If-None-Match; preserve full mtime precision in representation-specific tags |
| Static files accepted unsupported methods | GET/HEAD-only delivery with 405 and Allow; redirect handled after the method guard |
| UTF-8 names corrupted when bytes split between TCP chunks | Shared bounded byte reader decodes once after collection, rather than decoding arbitrary chunks separately |
| Concurrent location saves exposed truncated JSON to readers | Publish a complete temporary file by atomic rename, reusing the existing Windows-aware writer |
| Location writes accepted a forged Host/Origin | Apply local-host and same-origin JSON checks before mutation |
| Oversized/disconnected bodies could lose the response or break later requests | Byte limits, 413 without destroying the response stream, and interrupted-request handling shared by both editors |
| Media state could partly commit if its companion module could not be written | Publish the derived module before authoritative state, with rollback on a failed state publication; keep serialized edits |
| I/O failures were classified as invalid client photos | Preserve client validation errors and report unavailable/corrupt persistence as 500, with retry wording |
| Production preview treated the two disabled editor routes differently | Both editor routes return 404 before static handling when SERVE_DIST=1 |
| An encoded null byte in a URL could throw synchronously in the filesystem call and terminate the server | Reject null-byte paths with 400 before filesystem access; malformed URL requests leave the server healthy |

Static streams release their file reader after a client disconnect. Delayed
asynchronous responses check whether the client has already closed. Existing
loopback binding, private-file exclusions, image/type/pixel limits, immutable
asset URLs and a 24-entry compressed cache remain.

## Evidence

`checks/backend-stress.cjs` passed all 15 groups in the final backend recheck,
including unreadable-location and malformed-path recovery. Evidence is at
`output/regressions/final-browser-backend-recheck/backend-stress/results.json`.

- 240 static requests at concurrency 16 and 64 intentionally aborted downloads.
- 48 complete location saves interleaved with 120 reads: every observed response
  parsed, and the final document matched one complete submitted save.
- Byte-by-byte Hindi/accented names round-tripped without replacement characters.
- 50 concurrent/queued media operations preserved all edits, including recovery
  after invalid mutations. JSON and generated module revisions matched at rest.
- 144 cache-fill requests retained at most 24 entries. Collected heap growth in
  this run was 1,531,320 bytes, below the 20 MiB regression threshold.
- Synthetic crop enhancement produced the expected 3840px output; synthetic
  upload, delete and restore worked.
- Deliberate malformed state and unwritable destinations returned errors,
  preserved authoritative data and recovered on a later valid request.
- Production preview refused editor reads and writes; protected real user state
  files remained byte-for-byte unchanged.

The negative control ran these tests against the previous backend revision
`2b6022d1513d53115ee078745b2832ecc29a4a03`. Nine groups failed there for actual
behavioral reasons. The reproduction check requires six specific original
failures, so a test harness/import error cannot count as proof. See
`output/regressions/2026-11-02T12-38-41-702Z/historic-reproductions/results.json`.

These are bounded regression and recovery tests, not a maximum-capacity result.
They do not simulate machine power loss between two file publications or prove
crash-atomic multi-file transactions. No production load test, hosting change
or real photo edit was performed. Publishing follows the combined verification.

Reproduce with `npm run test:backend`; see `checks/README.md` for the full suite.
