# Website implementation rules

- Apply these rules to all website frontend, backend, tooling, build and test work.
- Prefer the smallest clear, correct implementation. If equivalent work can be
  done in 200 lines instead of 1,000, use the smaller implementation. These
  numbers are examples, not a line-count target.
- Reuse existing helpers and consolidate genuine duplication before adding new
  abstractions, dependencies or boilerplate. Do not compress formatting to make
  the line count appear smaller.
- Preserve required behavior, design, animations, media quality, accessibility,
  error recovery and meaningful regression coverage. Keep necessary safeguards;
  do not remove them merely to shorten code.
- For bug fixes, add or reuse a test that exercises the actual failure trigger,
  run the affected checks, and distinguish browser emulation from physical-device
  evidence. Never make a failing test pass by hiding a real failure.
- Treat frontend and backend crash prevention and recovery as release requirements.
  Verify affected failure paths, stalled requests, invalid input and lifecycle
  cleanup; report unresolved or unverified behavior before claiming completion.
