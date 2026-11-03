# ECC website skill and agent mapping — 3 November 2026

This is a complete, repository-specific routing plan for **314 canonical skills and 71 canonical agent profiles**. It documents what each can do for this website or why it is not being invoked. Inventorying a file does not mean its workflow ran.

**DAILY** means a close match for routine work in this repository. **LIBRARY** means installed and available for selective use, without loading it by default. These are proposed documentation buckets only: no skill, agent, hook, configuration or installation was deleted, disabled or changed. All unrelated capabilities remain available.

## Stack and preservation constraints

The application combines vanilla JavaScript/Three.js/Lenis with React/TypeScript islands, Framer Motion/GSAP, Tailwind and esbuild. Local Node editor APIs manage JSON/media; production is static Vercel output. Existing Playwright browser journeys, source checks and isolated backend fixtures provide regression coverage. This is not Next.js, a native phone app, an LLM service or a database-backed SaaS.

Apply the user rule everywhere: choose the smallest clear, correct implementation; reuse existing helpers and tests. Do not chase a cosmetic line-count target, remove safeguards or redesign/reanimate the site. Preserve quality, accessibility, error recovery and required behavior.

## Planned active work and review status

- Performance: measure hosted/local long tasks, rendering, decoding and animation lifecycle; repair demonstrated causes and compare equivalent journeys. Use `benchmark-optimization-loop`, `react-performance`, `motion-foundations` and `production-audit` as needed.
- Reliability and historical bugs: extend existing failure-trigger regressions for loading/PLAY, hero drag/reload, phone Skills continuity, Hobbies/model readiness, gallery controls/media, contact, offline retention and backend recovery. Use `e2e-testing`, `ai-regression-testing`, `test-collaboration` and `tdd-workflow`.
- Accessibility and boundaries: retain keyboard/focus/touch/reduced-motion behavior and review local origin/path/upload/persistence handling. Use `accessibility`, `frontend-a11y`, `security-review` and `backend-patterns`.
- Delivery: show the validated local preview, review the intended diff, push, then verify deployed revision/resources/console/interactions. Use `verification-loop`, `git-workflow`, `deployment-patterns` and selective `canary-watch`.

**Actually used in the present audit:** three bounded role-guided reviews — `performance-optimizer`, `a11y-architect`, `security-reviewer`. “Used” records the review guidance/task, not the execution of every instruction in those profiles. All other agent jobs below are proposed future stages or explicit non-use; they are not claimed completed.

No mapping row claims new tests passed. Historical reports preserve their original revisions and evidence. Physical OnePlus evidence in prior reports is distinct from Playwright viewport/browser emulation; Chrome/Edge/Opera/Firefox/WebKit engine checks do not establish every Google app webview or every physical device/browser combination.

## Evidence key

<a id="e0"></a> **E0 — requirements:** [AGENTS.md](C:/Users/Hp/Desktop/shub_ka_website/AGENTS.md), current preservation/minimal-code instructions and this audit scope.

<a id="e1"></a> **E1 — stack/tooling:** [package.json](C:/Users/Hp/Desktop/shub_ka_website/package.json), [tsconfig.json](C:/Users/Hp/Desktop/shub_ka_website/tsconfig.json), [build-site-assets.cjs](C:/Users/Hp/Desktop/shub_ka_website/build-site-assets.cjs). Node/npm, React/TS, Three/Lenis, esbuild, Playwright and Sharp are concrete dependencies/scripts; alternative frameworks in LIBRARY are not application runtimes.

<a id="e2"></a> **E2 — frontend:** [script.js](C:/Users/Hp/Desktop/shub_ka_website/script.js), [hobby-model-runtime.js](C:/Users/Hp/Desktop/shub_ka_website/hobby-model-runtime.js), [components](C:/Users/Hp/Desktop/shub_ka_website/components), [lib/overlay-host.ts](C:/Users/Hp/Desktop/shub_ka_website/lib/overlay-host.ts), [mobile-media.js](C:/Users/Hp/Desktop/shub_ka_website/mobile-media.js). Existing animations, model scheduling and mounted gallery islands are the repair targets.

<a id="e4"></a> **E4 — backend/delivery:** [server.cjs](C:/Users/Hp/Desktop/shub_ka_website/server.cjs), [lib/media-manager.cjs](C:/Users/Hp/Desktop/shub_ka_website/lib/media-manager.cjs), [lib/read-json.cjs](C:/Users/Hp/Desktop/shub_ka_website/lib/read-json.cjs), [build-vercel.cjs](C:/Users/Hp/Desktop/shub_ka_website/build-vercel.cjs), [vercel.json](C:/Users/Hp/Desktop/shub_ka_website/vercel.json), [lib/offline-worker.js](C:/Users/Hp/Desktop/shub_ka_website/lib/offline-worker.js). Local APIs are not the hosted Vercel runtime.

<a id="e5"></a> **E5 — checks:** [checks/README.md](C:/Users/Hp/Desktop/shub_ka_website/checks/README.md), [checks/regression-manifest.cjs](C:/Users/Hp/Desktop/shub_ka_website/checks/regression-manifest.cjs), [checks/run-regressions.cjs](C:/Users/Hp/Desktop/shub_ka_website/checks/run-regressions.cjs), [checks/backend-stress.cjs](C:/Users/Hp/Desktop/shub_ka_website/checks/backend-stress.cjs), [checks/touch-skills-regression.cjs](C:/Users/Hp/Desktop/shub_ka_website/checks/touch-skills-regression.cjs), [checks/skills-image-continuity.cjs](C:/Users/Hp/Desktop/shub_ka_website/checks/skills-image-continuity.cjs), [checks/connection-retention.cjs](C:/Users/Hp/Desktop/shub_ka_website/checks/connection-retention.cjs). Extend these meaningful existing checks; do not merely assert source spelling.

<a id="e6"></a> **E6 — historical evidence:** [regression verification](C:/Users/Hp/Desktop/shub_ka_website/reports/regression-verification-2026-11-02.md), [backend stress](C:/Users/Hp/Desktop/shub_ka_website/reports/backend-stress-2026-11-02.md), [physical OnePlus/runtime audit](C:/Users/Hp/Desktop/shub_ka_website/reports/oneplus-12r-runtime-audit-2026-11-01.md), [code consolidation](C:/Users/Hp/Desktop/shub_ka_website/reports/code-consolidation-2026-11-02.md), [continuity/mobile audit](C:/Users/Hp/Desktop/shub_ka_website/reports/continuity-mobile-final-audit-2026-11-01.md). These are prior outcomes, not a claim of new coverage in this mapping task.

## Skill inventory

**314 skills: 27 DAILY, 287 LIBRARY.** Canonical source root: `C:/Users/Hp/.codex/vendor_imports/ECC/skills/`; each row identifies `<name>/SKILL.md`. Descriptions/frontmatter were read for inventory; off-scope workflows were not executed.

| Skill source directory | Bucket | Planned use or explicit reason not invoked | Evidence |
| --- | --- | --- | --- |
| `accessibility` | DAILY | Audit contrast, tap targets, focus and reduced motion without redesign. | [E2](#e2), [E5](#e5) |
| `agent-architecture-audit` | LIBRARY | Not invoked: the portfolio is not an LLM/agent service; existing browser/backend checks, not agent eval infrastructure, verify website behavior. | [E1](#e1), [E4](#e4), [E5](#e5) |
| `agent-eval` | LIBRARY | Not invoked: the portfolio is not an LLM/agent service; existing browser/backend checks, not agent eval infrastructure, verify website behavior. | [E1](#e1), [E4](#e4), [E5](#e5) |
| `agent-harness-construction` | LIBRARY | Not invoked: the portfolio is not an LLM/agent service; existing browser/backend checks, not agent eval infrastructure, verify website behavior. | [E1](#e1), [E4](#e4), [E5](#e5) |
| `agent-introspection-debugging` | LIBRARY | Not invoked: Reserve for an agent execution failure; diagnose website defects with source and browser evidence. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `agent-payment-x402` | LIBRARY | Not invoked: no payments, blockchain, trading or prediction-market feature; do not add one to optimize the portfolio. | [E1](#e1), [E4](#e4) |
| `agent-runtime-gateway-smoke-test` | LIBRARY | Not invoked: the portfolio is not an LLM/agent service; existing browser/backend checks, not agent eval infrastructure, verify website behavior. | [E1](#e1), [E4](#e4), [E5](#e5) |
| `agent-security-hardening` | LIBRARY | Not invoked: the portfolio is not an LLM/agent service; existing browser/backend checks, not agent eval infrastructure, verify website behavior. | [E1](#e1), [E4](#e4), [E5](#e5) |
| `agent-self-evaluation` | DAILY | Check final claims against saved results; state physical-device and emulation limits. | [E5](#e5), [E6](#e6) |
| `agent-sort` | LIBRARY | This report applies DAILY/LIBRARY routing to actual repo evidence; no installation changes. | [E0](#e0), [E1](#e1), [E4](#e4), [E5](#e5) |
| `agentic-engineering` | LIBRARY | Not invoked: Optional general operating reference; current scoped tests/verification already define the delivery loop. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `agentic-os` | LIBRARY | Not invoked: the portfolio is not an LLM/agent service; existing browser/backend checks, not agent eval infrastructure, verify website behavior. | [E1](#e1), [E4](#e4), [E5](#e5) |
| `ai-first-engineering` | LIBRARY | Not invoked: Team operating model is outside this single-repository defect audit. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `ai-regression-testing` | DAILY | Retain historical negative controls so optimized code cannot hide old failures. | [E5](#e5), [E6](#e6) |
| `android-clean-architecture` | LIBRARY | Not invoked: this is a responsive browser website, not a native Android/Kotlin/React Native application. Phone checks use browser journeys. | [E1](#e1), [E2](#e2), [E5](#e5) |
| `angular-developer` | LIBRARY | Not invoked: React islands plus vanilla modules are built with esbuild; no Angular/Vue/Nuxt/Next/Vite migration. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `api-connector-builder` | LIBRARY | Not invoked: no new connector, transactional-email service, MCP server or external search integration is needed for the current site repairs. | [E1](#e1), [E4](#e4) |
| `api-design` | LIBRARY | Use selectively for the two local editor endpoints, status codes and byte-limit behavior. | [E4](#e4), [E5](#e5) |
| `architecture-decision-records` | LIBRARY | Record a future substantial architecture decision only; no ADR boilerplate for small fixes. | [E0](#e0), [E1](#e1) |
| `article-writing` | LIBRARY | Not invoked: current task preserves site content/design and fixes runtime defects; no marketing campaign or competitor research requested. | [E0](#e0), [E2](#e2) |
| `automation-audit-ops` | LIBRARY | Not invoked: No recurring automation inventory or new scheduled job was requested. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `autonomous-agent-harness` | LIBRARY | Not invoked: the portfolio is not an LLM/agent service; existing browser/backend checks, not agent eval infrastructure, verify website behavior. | [E1](#e1), [E4](#e4), [E5](#e5) |
| `autonomous-loops` | LIBRARY | Not invoked: the portfolio is not an LLM/agent service; existing browser/backend checks, not agent eval infrastructure, verify website behavior. | [E1](#e1), [E4](#e4), [E5](#e5) |
| `backend-patterns` | DAILY | Review the local Node editor queue, atomic persistence and bounded static cache. | [E4](#e4) |
| `benchmark` | LIBRARY | Use for a focused repeatable frame/load baseline when the measured optimization loop needs it. | [E5](#e5), [E6](#e6) |
| `benchmark-methodology` | LIBRARY | Not invoked: current task preserves site content/design and fixes runtime defects; no marketing campaign or competitor research requested. | [E0](#e0), [E2](#e2) |
| `benchmark-optimization-loop` | DAILY | Measure hosted/local frame stalls, change one cause, rerun correctness and timing gates. | [E2](#e2), [E5](#e5), [E6](#e6) |
| `bengali-nlp` | LIBRARY | Not invoked: no Bengali processing or translation catalog in current runtime; retain current supplied website copy. | [E1](#e1), [E2](#e2) |
| `blender-motion-state-inspection` | LIBRARY | Not invoked: preserve existing geometry, imagery and animation; no Blender scene inspection, generated replacement media or video production requested. | [E0](#e0), [E1](#e1), [E2](#e2) |
| `blueprint` | LIBRARY | Not invoked: No new product construction plan is needed; improve the existing portfolio in bounded stages. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `brand-discovery` | LIBRARY | Not invoked: current task preserves site content/design and fixes runtime defects; no marketing campaign or competitor research requested. | [E0](#e0), [E2](#e2) |
| `brand-voice` | LIBRARY | Not invoked: current task preserves site content/design and fixes runtime defects; no marketing campaign or competitor research requested. | [E0](#e0), [E2](#e2) |
| `brownfield-retrospective` | LIBRARY | Reconcile earlier optimization reports with current source; do not repeat already verified work. | [E6](#e6) |
| `browser-qa` | DAILY | Exercise reload, PLAY, scroll, drag, galleries and contact in the supported browser matrix. | [E5](#e5), [E6](#e6) |
| `bun-runtime` | LIBRARY | Not invoked: current scripts and lockfile use Node/npm; changing runtimes is not a demonstrated performance fix. | [E1](#e1), [E4](#e4) |
| `canary-watch` | LIBRARY | After push, check deployed revision, resources, console and key interactions for actionable regressions. | [E4](#e4), [E5](#e5) |
| `carrier-relationship-management` | LIBRARY | Not invoked: this operational supply-chain/industrial domain is absent; no corresponding website feature or data. | [E1](#e1), [E4](#e4) |
| `change-impact` | DAILY | Trace each repair through browser source, generated UI and static deployment before editing. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `cisco-ios-patterns` | LIBRARY | Not invoked: no router/VLAN/VPN/SSH infrastructure in this repository; browser lag is not evidence of a network-device defect. | [E1](#e1), [E4](#e4), [E6](#e6) |
| `ck` | LIBRARY | Not invoked: Do not install a second persistent memory system; existing AGENTS and reports retain project context. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `claude-devfleet` | LIBRARY | Not invoked: No DevFleet service or tool integration is configured; use only the current authorized review tools. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `click-path-audit` | DAILY | Trace navbar, PLAY, close, travel selection and contact actions to actual destinations. | [E2](#e2), [E5](#e5) |
| `clickhouse-io` | LIBRARY | Not invoked: editor persistence is bounded JSON plus derived modules; no database, ORM or Redis to tune or migrate. | [E4](#e4), [E5](#e5) |
| `code-tour` | LIBRARY | Optional contributor orientation for island/vanilla/build boundaries; not a runtime optimization. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `codebase-onboarding` | LIBRARY | Optional initial orientation; this audit already inventories actual runtime/build surfaces. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `codehealth-mcp` | LIBRARY | Not invoked: No CodeScene MCP dependency is required; review actual duplication and tests locally. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `coding-standards` | DAILY | Prefer the smallest clear repair and reuse existing helpers; retain safeguards. | [E0](#e0), [E1](#e1) |
| `competitive-platform-analysis` | LIBRARY | Not invoked: current task preserves site content/design and fixes runtime defects; no marketing campaign or competitor research requested. | [E0](#e0), [E2](#e2) |
| `competitive-report-structure` | LIBRARY | Not invoked: current task preserves site content/design and fixes runtime defects; no marketing campaign or competitor research requested. | [E0](#e0), [E2](#e2) |
| `compose-multiplatform-patterns` | LIBRARY | Not invoked: this is a responsive browser website, not a native Android/Kotlin/React Native application. Phone checks use browser journeys. | [E1](#e1), [E2](#e2), [E5](#e5) |
| `config-gc` | LIBRARY | Not invoked: No deletion or garbage collection of the imported skill/config library is requested. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `configure-ecc` | LIBRARY | Not invoked: Installed catalog is retained; this report does not reinstall or reconfigure ECC. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `connections-optimizer` | LIBRARY | Not invoked: website repair does not authorize social/network/mail/document actions; no corresponding app integration in runtime. | [E0](#e0), [E1](#e1) |
| `content-engine` | LIBRARY | Not invoked: current task preserves site content/design and fixes runtime defects; no marketing campaign or competitor research requested. | [E0](#e0), [E2](#e2) |
| `content-hash-cache-pattern` | LIBRARY | Reference existing media content hashes; change caching only for a demonstrated stale/recompute bug. | [E4](#e4) |
| `context-and-decisions` | LIBRARY | Preserve agreed design, media-quality and minimal-code constraints in existing project guidance. | [E0](#e0), [E6](#e6) |
| `context-budget` | LIBRARY | Use only for long-session context management; no website feature or dependency. | [E0](#e0), [E6](#e6) |
| `continuous-agent-loop` | LIBRARY | Not invoked: the portfolio is not an LLM/agent service; existing browser/backend checks, not agent eval infrastructure, verify website behavior. | [E1](#e1), [E4](#e4), [E5](#e5) |
| `continuous-learning` | LIBRARY | Not invoked: Deprecated legacy learning hooks are not installed or enabled by this audit. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `continuous-learning-v2` | LIBRARY | Not invoked: Do not add observation/learning hooks; keep concrete verified lessons in existing reports. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `contract-first` | LIBRARY | Use if an editor API shape changes; preserve current JSON/module compatibility first. | [E2](#e2), [E4](#e4), [E5](#e5) |
| `conventional-commit-review` | LIBRARY | Review the verified final diff and write an accurate concise commit message. | [E0](#e0), [E4](#e4), [E6](#e6) |
| `cost-aware-llm-pipeline` | LIBRARY | Not invoked: the portfolio is not an LLM/agent service; existing browser/backend checks, not agent eval infrastructure, verify website behavior. | [E1](#e1), [E4](#e4), [E5](#e5) |
| `cost-tracking` | LIBRARY | Not invoked: No Claude billing integration or token dashboard is required for website runtime improvement. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `council` | LIBRARY | Not invoked: Reserve for a genuinely ambiguous tradeoff; current bug triggers and preservation constraints guide decisions. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `council-multi-model` | LIBRARY | Not invoked: No external model critique or extra provider setup is needed for this scoped audit. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `counterparty-channel-discipline` | LIBRARY | Not invoked: No counterparty channel or messaging agent exists in this repository. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `cpp-coding-standards` | LIBRARY | Not invoked: this framework/language has no application runtime in the current JS/TS/Node portfolio; no parallel implementation. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `cpp-testing` | LIBRARY | Not invoked: this framework/language has no application runtime in the current JS/TS/Node portfolio; no parallel implementation. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `crosspost` | LIBRARY | Not invoked: website repair does not authorize social/network/mail/document actions; no corresponding app integration in runtime. | [E0](#e0), [E1](#e1) |
| `csharp-testing` | LIBRARY | Not invoked: this framework/language has no application runtime in the current JS/TS/Node portfolio; no parallel implementation. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `customer-billing-ops` | LIBRARY | Not invoked: current audit has no billing, fundraising, contracts, signature or document-processing workflow. | [E1](#e1), [E4](#e4) |
| `customs-trade-compliance` | LIBRARY | Not invoked: this operational supply-chain/industrial domain is absent; no corresponding website feature or data. | [E1](#e1), [E4](#e4) |
| `dart-flutter-patterns` | LIBRARY | Not invoked: this framework/language has no application runtime in the current JS/TS/Node portfolio; no parallel implementation. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `dashboard-builder` | LIBRARY | Not invoked: No monitoring dashboard feature is requested; existing check artifacts already expose results. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `data-scraper-agent` | LIBRARY | Not invoked: no scraping, model training, serving, recommendations or bulk-data platform; local offline photo tooling is not a visitor ML service. | [E1](#e1), [E4](#e4) |
| `data-throughput-accelerator` | LIBRARY | Not invoked: no scraping, model training, serving, recommendations or bulk-data platform; local offline photo tooling is not a visitor ML service. | [E1](#e1), [E4](#e4) |
| `database-migrations` | LIBRARY | Not invoked: editor persistence is bounded JSON plus derived modules; no database, ORM or Redis to tune or migrate. | [E4](#e4), [E5](#e5) |
| `deep-research` | LIBRARY | Not invoked: Reserve for a substantial research question; targeted primary documentation is sufficient for code details. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `deepseek-harness-setup` | LIBRARY | Not invoked: No DeepSeek harness installation or model-provider switch is requested. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `defi-amm-security` | LIBRARY | Not invoked: no payments, blockchain, trading or prediction-market feature; do not add one to optimize the portfolio. | [E1](#e1), [E4](#e4) |
| `delivery-gate` | LIBRARY | Reference final verification criteria; do not install a stop hook or add approval friction. | [E0](#e0), [E5](#e5) |
| `deployment-patterns` | DAILY | Verify generated assets, hashed chunks and static Vercel delivery before/after push. | [E1](#e1), [E4](#e4) |
| `design-system` | LIBRARY | Optional inventory of current typography/colors; do not generate a replacement design. | [E0](#e0), [E2](#e2) |
| `dev-team` | LIBRARY | Not invoked: No simulated-team framework is installed; three bounded role-guided reviews are already identified below. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `django-celery` | LIBRARY | Not invoked: local endpoints are plain Node and production is static Vercel; this server framework is absent. | [E1](#e1), [E4](#e4) |
| `django-patterns` | LIBRARY | Not invoked: local endpoints are plain Node and production is static Vercel; this server framework is absent. | [E1](#e1), [E4](#e4) |
| `django-security` | LIBRARY | Not invoked: local endpoints are plain Node and production is static Vercel; this server framework is absent. | [E1](#e1), [E4](#e4) |
| `django-tdd` | LIBRARY | Not invoked: local endpoints are plain Node and production is static Vercel; this server framework is absent. | [E1](#e1), [E4](#e4) |
| `django-verification` | LIBRARY | Not invoked: local endpoints are plain Node and production is static Vercel; this server framework is absent. | [E1](#e1), [E4](#e4) |
| `dmux-workflows` | LIBRARY | Not invoked: No tmux/dmux control plane on the current Windows/PowerShell workflow. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `docker-patterns` | LIBRARY | Not invoked: current Node/npm and static Vercel delivery do not use this container/cluster/environment platform. | [E1](#e1), [E4](#e4) |
| `docs-governance` | LIBRARY | Keep this mapping and existing evidence reports consistent; no new documentation framework. | [E0](#e0), [E6](#e6) |
| `documentation-lookup` | LIBRARY | Consult primary library docs only when a specific Three/Motion/browser API detail is uncertain. | [E1](#e1), [E2](#e2) |
| `dotnet-patterns` | LIBRARY | Not invoked: this framework/language has no application runtime in the current JS/TS/Node portfolio; no parallel implementation. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `dynamic-workflow-mode` | LIBRARY | Not invoked: Do not add a task-local harness when existing npm checks and bounded stages suffice. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `e2e-testing` | DAILY | Extend existing Playwright journeys with actual historical failure triggers across viewports. | [E5](#e5), [E6](#e6) |
| `ecc-guide` | LIBRARY | Use for questions about the imported ECC catalog; not shipped to website visitors. | [E0](#e0) |
| `ecc-recipes` | LIBRARY | Optional routing reference for future tasks; this report already narrows the current scope. | [E0](#e0) |
| `ecc-tools-cost-audit` | LIBRARY | Not invoked: No ECC service billing investigation is part of the portfolio audit. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `email-ops` | LIBRARY | Not invoked: website repair does not authorize social/network/mail/document actions; no corresponding app integration in runtime. | [E0](#e0), [E1](#e1) |
| `energy-procurement` | LIBRARY | Not invoked: this operational supply-chain/industrial domain is absent; no corresponding website feature or data. | [E1](#e1), [E4](#e4) |
| `enterprise-agent-ops` | LIBRARY | Not invoked: the portfolio is not an LLM/agent service; existing browser/backend checks, not agent eval infrastructure, verify website behavior. | [E1](#e1), [E4](#e4), [E5](#e5) |
| `error-handling` | DAILY | Check retry, aborted loads, failed decoding and persistence errors stay recoverable. | [E2](#e2), [E4](#e4), [E5](#e5) |
| `esign-field-placement` | LIBRARY | Not invoked: current audit has no billing, fundraising, contracts, signature or document-processing workflow. | [E1](#e1), [E4](#e4) |
| `eval-harness` | LIBRARY | Not invoked: the portfolio is not an LLM/agent service; existing browser/backend checks, not agent eval infrastructure, verify website behavior. | [E1](#e1), [E4](#e4), [E5](#e5) |
| `evm-token-decimals` | LIBRARY | Not invoked: no payments, blockchain, trading or prediction-market feature; do not add one to optimize the portfolio. | [E1](#e1), [E4](#e4) |
| `exa-search` | LIBRARY | Not invoked: no new connector, transactional-email service, MCP server or external search integration is needed for the current site repairs. | [E1](#e1), [E4](#e4) |
| `fal-ai-media` | LIBRARY | Not invoked: preserve existing geometry, imagery and animation; no Blender scene inspection, generated replacement media or video production requested. | [E0](#e0), [E1](#e1), [E2](#e2) |
| `fastapi-patterns` | LIBRARY | Not invoked: local endpoints are plain Node and production is static Vercel; this server framework is absent. | [E1](#e1), [E4](#e4) |
| `finance-billing-ops` | LIBRARY | Not invoked: current audit has no billing, fundraising, contracts, signature or document-processing workflow. | [E1](#e1), [E4](#e4) |
| `flox-environments` | LIBRARY | Not invoked: current Node/npm and static Vercel delivery do not use this container/cluster/environment platform. | [E1](#e1), [E4](#e4) |
| `flutter-dart-code-review` | LIBRARY | Not invoked: this framework/language has no application runtime in the current JS/TS/Node portfolio; no parallel implementation. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `foundation-models-on-device` | LIBRARY | Not invoked: no native Apple app or on-device model runtime; test iOS/WebKit behavior without adding a native UI stack. | [E1](#e1), [E2](#e2), [E5](#e5) |
| `frontend-a11y` | DAILY | Check React dialogs and controls preserve accessible names, keyboard/focus behavior. | [E2](#e2), [E5](#e5) |
| `frontend-design-direction` | LIBRARY | Reference only if the user later requests design changes; current scope preserves appearance. | [E0](#e0), [E2](#e2) |
| `frontend-patterns` | DAILY | Review React islands and vanilla-JS boundaries, lifecycle cleanup and shared helpers. | [E1](#e1), [E2](#e2) |
| `frontend-slides` | LIBRARY | Not invoked: preserve existing geometry, imagery and animation; no Blender scene inspection, generated replacement media or video production requested. | [E0](#e0), [E1](#e1), [E2](#e2) |
| `fsharp-testing` | LIBRARY | Not invoked: this framework/language has no application runtime in the current JS/TS/Node portfolio; no parallel implementation. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `gan-style-harness` | LIBRARY | Not invoked: No generator/evaluator training-style loop or extra service is needed for measured defect fixes. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `gateguard` | LIBRARY | Not invoked: Do not install edit-blocking hooks; use concrete evidence and the existing project requirements. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `generating-python-installer` | LIBRARY | Not invoked for application work: Python can inspect maintenance metadata, but the website does not ship a Python app or installer. | [E1](#e1), [E4](#e4) |
| `git-workflow` | DAILY | Review only intended changes, preserve personal attachments and push verified commits. | [E0](#e0), [E4](#e4), [E6](#e6) |
| `github-ops` | LIBRARY | Use existing authenticated Git tooling for the authorized push and revision verification; no new integration. | [E4](#e4), [E6](#e6) |
| `golang-patterns` | LIBRARY | Not invoked: this framework/language has no application runtime in the current JS/TS/Node portfolio; no parallel implementation. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `golang-testing` | LIBRARY | Not invoked: this framework/language has no application runtime in the current JS/TS/Node portfolio; no parallel implementation. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `google-workspace-ops` | LIBRARY | Not invoked: website repair does not authorize social/network/mail/document actions; no corresponding app integration in runtime. | [E0](#e0), [E1](#e1) |
| `growth-log` | LIBRARY | Optional short record of reusable verified lessons; current reports already hold detailed evidence. | [E6](#e6) |
| `healthcare-cdss-patterns` | LIBRARY | Not invoked: no clinical, regulated health, genomic, patent or academic-research workflow in the portfolio. | [E1](#e1), [E4](#e4) |
| `healthcare-emr-patterns` | LIBRARY | Not invoked: no clinical, regulated health, genomic, patent or academic-research workflow in the portfolio. | [E1](#e1), [E4](#e4) |
| `healthcare-eval-harness` | LIBRARY | Not invoked: no clinical, regulated health, genomic, patent or academic-research workflow in the portfolio. | [E1](#e1), [E4](#e4) |
| `healthcare-phi-compliance` | LIBRARY | Not invoked: no clinical, regulated health, genomic, patent or academic-research workflow in the portfolio. | [E1](#e1), [E4](#e4) |
| `hermes-imports` | LIBRARY | Not invoked: No Hermes workflow import or operator-session migration requested. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `hexagonal-architecture` | LIBRARY | No rewrite into ports/adapters; small local-server helpers already separate concerns. | [E0](#e0), [E4](#e4) |
| `hipaa-compliance` | LIBRARY | Not invoked: no clinical, regulated health, genomic, patent or academic-research workflow in the portfolio. | [E1](#e1), [E4](#e4) |
| `homelab-network-readiness` | LIBRARY | Not invoked: no router/VLAN/VPN/SSH infrastructure in this repository; browser lag is not evidence of a network-device defect. | [E1](#e1), [E4](#e4), [E6](#e6) |
| `homelab-network-setup` | LIBRARY | Not invoked: no router/VLAN/VPN/SSH infrastructure in this repository; browser lag is not evidence of a network-device defect. | [E1](#e1), [E4](#e4), [E6](#e6) |
| `homelab-pihole-dns` | LIBRARY | Not invoked: no router/VLAN/VPN/SSH infrastructure in this repository; browser lag is not evidence of a network-device defect. | [E1](#e1), [E4](#e4), [E6](#e6) |
| `homelab-vlan-segmentation` | LIBRARY | Not invoked: no router/VLAN/VPN/SSH infrastructure in this repository; browser lag is not evidence of a network-device defect. | [E1](#e1), [E4](#e4), [E6](#e6) |
| `homelab-wireguard-vpn` | LIBRARY | Not invoked: no router/VLAN/VPN/SSH infrastructure in this repository; browser lag is not evidence of a network-device defect. | [E1](#e1), [E4](#e4), [E6](#e6) |
| `hookify-rules` | LIBRARY | Not invoked: Do not install new hooks; the user code-size rule already lives in AGENTS. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `i18n-sync` | LIBRARY | Not invoked: no Bengali processing or translation catalog in current runtime; retain current supplied website copy. | [E1](#e1), [E2](#e2) |
| `inherit-legacy-style` | DAILY | Keep the existing design, animation timing and interaction conventions during fixes. | [E0](#e0), [E2](#e2) |
| `intent-driven-development` | LIBRARY | Clarify material ambiguity only; current user scope and preservation constraints are explicit. | [E0](#e0), [E6](#e6) |
| `inventory-demand-planning` | LIBRARY | Not invoked: this operational supply-chain/industrial domain is absent; no corresponding website feature or data. | [E1](#e1), [E4](#e4) |
| `investor-materials` | LIBRARY | Not invoked: current audit has no billing, fundraising, contracts, signature or document-processing workflow. | [E1](#e1), [E4](#e4) |
| `investor-outreach` | LIBRARY | Not invoked: current audit has no billing, fundraising, contracts, signature or document-processing workflow. | [E1](#e1), [E4](#e4) |
| `ios-icon-gen` | LIBRARY | Not invoked: no native Apple app or on-device model runtime; test iOS/WebKit behavior without adding a native UI stack. | [E1](#e1), [E2](#e2), [E5](#e5) |
| `issue-review` | LIBRARY | Use if a concrete repository issue is supplied; no issue-tracker workflow is required now. | [E5](#e5), [E6](#e6) |
| `iterative-retrieval` | LIBRARY | Read targeted call sites and reports as needed; avoid loading every skill into context. | [E1](#e1), [E6](#e6) |
| `ito-baskets` | LIBRARY | Not invoked: no payments, blockchain, trading or prediction-market feature; do not add one to optimize the portfolio. | [E1](#e1), [E4](#e4) |
| `ito-compute` | LIBRARY | Not invoked: no scraping, model training, serving, recommendations or bulk-data platform; local offline photo tooling is not a visitor ML service. | [E1](#e1), [E4](#e4) |
| `ito-inference` | LIBRARY | Not invoked: no scraping, model training, serving, recommendations or bulk-data platform; local offline photo tooling is not a visitor ML service. | [E1](#e1), [E4](#e4) |
| `ito-training` | LIBRARY | Not invoked: no scraping, model training, serving, recommendations or bulk-data platform; local offline photo tooling is not a visitor ML service. | [E1](#e1), [E4](#e4) |
| `java-coding-standards` | LIBRARY | Not invoked: this framework/language has no application runtime in the current JS/TS/Node portfolio; no parallel implementation. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `jira-integration` | LIBRARY | Not invoked: website repair does not authorize social/network/mail/document actions; no corresponding app integration in runtime. | [E0](#e0), [E1](#e1) |
| `jpa-patterns` | LIBRARY | Not invoked: this framework/language has no application runtime in the current JS/TS/Node portfolio; no parallel implementation. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `knowledge-ops` | LIBRARY | Not invoked: No knowledge-base ingestion, synchronization or retrieval feature. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `kotlin-coroutines-flows` | LIBRARY | Not invoked: this is a responsive browser website, not a native Android/Kotlin/React Native application. Phone checks use browser journeys. | [E1](#e1), [E2](#e2), [E5](#e5) |
| `kotlin-exposed-patterns` | LIBRARY | Not invoked: this is a responsive browser website, not a native Android/Kotlin/React Native application. Phone checks use browser journeys. | [E1](#e1), [E2](#e2), [E5](#e5) |
| `kotlin-ktor-patterns` | LIBRARY | Not invoked: this is a responsive browser website, not a native Android/Kotlin/React Native application. Phone checks use browser journeys. | [E1](#e1), [E2](#e2), [E5](#e5) |
| `kotlin-patterns` | LIBRARY | Not invoked: this is a responsive browser website, not a native Android/Kotlin/React Native application. Phone checks use browser journeys. | [E1](#e1), [E2](#e2), [E5](#e5) |
| `kotlin-testing` | LIBRARY | Not invoked: this is a responsive browser website, not a native Android/Kotlin/React Native application. Phone checks use browser journeys. | [E1](#e1), [E2](#e2), [E5](#e5) |
| `kubernetes-patterns` | LIBRARY | Not invoked: current Node/npm and static Vercel delivery do not use this container/cluster/environment platform. | [E1](#e1), [E4](#e4) |
| `laravel-patterns` | LIBRARY | Not invoked: local endpoints are plain Node and production is static Vercel; this server framework is absent. | [E1](#e1), [E4](#e4) |
| `laravel-plugin-discovery` | LIBRARY | Not invoked: local endpoints are plain Node and production is static Vercel; this server framework is absent. | [E1](#e1), [E4](#e4) |
| `laravel-security` | LIBRARY | Not invoked: local endpoints are plain Node and production is static Vercel; this server framework is absent. | [E1](#e1), [E4](#e4) |
| `laravel-tdd` | LIBRARY | Not invoked: local endpoints are plain Node and production is static Vercel; this server framework is absent. | [E1](#e1), [E4](#e4) |
| `laravel-verification` | LIBRARY | Not invoked: local endpoints are plain Node and production is static Vercel; this server framework is absent. | [E1](#e1), [E4](#e4) |
| `latency-critical-systems` | LIBRARY | Reference task/frame budgeting for proven long tasks; no realtime backend is introduced. | [E2](#e2), [E5](#e5), [E6](#e6) |
| `lead-intelligence` | LIBRARY | Not invoked: current task preserves site content/design and fixes runtime defects; no marketing campaign or competitor research requested. | [E0](#e0), [E2](#e2) |
| `liquid-glass-design` | LIBRARY | Not invoked: no native Apple app or on-device model runtime; test iOS/WebKit behavior without adding a native UI stack. | [E1](#e1), [E2](#e2), [E5](#e5) |
| `living-docs-governance` | LIBRARY | Optional check that historical reports describe their original revision and evidence limits. | [E6](#e6) |
| `llm-trading-agent-security` | LIBRARY | Not invoked: no payments, blockchain, trading or prediction-market feature; do not add one to optimize the portfolio. | [E1](#e1), [E4](#e4) |
| `logistics-exception-management` | LIBRARY | Not invoked: this operational supply-chain/industrial domain is absent; no corresponding website feature or data. | [E1](#e1), [E4](#e4) |
| `loop-design-check` | LIBRARY | Not invoked: Reference only if repeated testing becomes an explicit autonomous loop; current runs are bounded. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `mailtrap-email-integration` | LIBRARY | Not invoked: no new connector, transactional-email service, MCP server or external search integration is needed for the current site repairs. | [E1](#e1), [E4](#e4) |
| `make-interfaces-feel-better` | LIBRARY | Use only for demonstrated interaction defects; preserve requested appearance and animation behavior. | [E0](#e0), [E2](#e2), [E5](#e5) |
| `manim-video` | LIBRARY | Not invoked: preserve existing geometry, imagery and animation; no Blender scene inspection, generated replacement media or video production requested. | [E0](#e0), [E1](#e1), [E2](#e2) |
| `market-research` | LIBRARY | Not invoked: current task preserves site content/design and fixes runtime defects; no marketing campaign or competitor research requested. | [E0](#e0), [E2](#e2) |
| `marketing-campaign` | LIBRARY | Not invoked: current task preserves site content/design and fixes runtime defects; no marketing campaign or competitor research requested. | [E0](#e0), [E2](#e2) |
| `master-agreement-generator` | LIBRARY | Not invoked: current audit has no billing, fundraising, contracts, signature or document-processing workflow. | [E1](#e1), [E4](#e4) |
| `mcp-dependency-review` | LIBRARY | Not invoked: no new connector, transactional-email service, MCP server or external search integration is needed for the current site repairs. | [E1](#e1), [E4](#e4) |
| `mcp-server-patterns` | LIBRARY | Not invoked: no new connector, transactional-email service, MCP server or external search integration is needed for the current site repairs. | [E1](#e1), [E4](#e4) |
| `messages-ops` | LIBRARY | Not invoked: website repair does not authorize social/network/mail/document actions; no corresponding app integration in runtime. | [E0](#e0), [E1](#e1) |
| `ml-adoption-playbook` | LIBRARY | Not invoked: no scraping, model training, serving, recommendations or bulk-data platform; local offline photo tooling is not a visitor ML service. | [E1](#e1), [E4](#e4) |
| `mle-workflow` | LIBRARY | Not invoked: no scraping, model training, serving, recommendations or bulk-data platform; local offline photo tooling is not a visitor ML service. | [E1](#e1), [E4](#e4) |
| `module-governance` | LIBRARY | Optional local ownership guidance if modules expand; do not scatter new AGENTS files now. | [E0](#e0), [E2](#e2) |
| `module-regression` | LIBRARY | Use shared regression cases for source/build/browser boundaries rather than duplicate suite scaffolding. | [E1](#e1), [E5](#e5) |
| `motion-advanced` | LIBRARY | Reference existing drag, cursor spring and interrupted transitions when a concrete bug needs it. | [E2](#e2), [E5](#e5) |
| `motion-foundations` | DAILY | Audit animation clocks, visibility suspension and reduced-motion paths without reanimation. | [E2](#e2), [E5](#e5) |
| `motion-patterns` | DAILY | Review existing Framer Motion/GSAP island transitions for interruption and cleanup. | [E1](#e1), [E2](#e2) |
| `mybatis-patterns` | LIBRARY | Not invoked: this framework/language has no application runtime in the current JS/TS/Node portfolio; no parallel implementation. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `mysql-patterns` | LIBRARY | Not invoked: editor persistence is bounded JSON plus derived modules; no database, ORM or Redis to tune or migrate. | [E4](#e4), [E5](#e5) |
| `nanoclaw-repl` | LIBRARY | Not invoked: No NanoClaw session runtime in the portfolio or current test toolchain. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `nasiko-control-plane` | LIBRARY | Not invoked: No experimental Nasiko control plane installation requested. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `nestjs-patterns` | LIBRARY | Not invoked: local endpoints are plain Node and production is static Vercel; this server framework is absent. | [E1](#e1), [E4](#e4) |
| `netmiko-ssh-automation` | LIBRARY | Not invoked: no router/VLAN/VPN/SSH infrastructure in this repository; browser lag is not evidence of a network-device defect. | [E1](#e1), [E4](#e4), [E6](#e6) |
| `network-bgp-diagnostics` | LIBRARY | Not invoked: no router/VLAN/VPN/SSH infrastructure in this repository; browser lag is not evidence of a network-device defect. | [E1](#e1), [E4](#e4), [E6](#e6) |
| `network-config-validation` | LIBRARY | Not invoked: no router/VLAN/VPN/SSH infrastructure in this repository; browser lag is not evidence of a network-device defect. | [E1](#e1), [E4](#e4), [E6](#e6) |
| `network-interface-health` | LIBRARY | Not invoked: no router/VLAN/VPN/SSH infrastructure in this repository; browser lag is not evidence of a network-device defect. | [E1](#e1), [E4](#e4), [E6](#e6) |
| `nextjs-turbopack` | LIBRARY | Not invoked: React islands plus vanilla modules are built with esbuild; no Angular/Vue/Nuxt/Next/Vite migration. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `nodejs-keccak256` | LIBRARY | Not invoked: no payments, blockchain, trading or prediction-market feature; do not add one to optimize the portfolio. | [E1](#e1), [E4](#e4) |
| `nutrient-document-processing` | LIBRARY | Not invoked: current audit has no billing, fundraising, contracts, signature or document-processing workflow. | [E1](#e1), [E4](#e4) |
| `nuxt4-patterns` | LIBRARY | Not invoked: React islands plus vanilla modules are built with esbuild; no Angular/Vue/Nuxt/Next/Vite migration. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `openclaw-persona-forge` | LIBRARY | Not invoked: No OpenClaw persona or conversational-agent feature in this website. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `opensource-pipeline` | LIBRARY | Not invoked: No fork/sanitize/package release of another project requested; only this site is being repaired. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `operator-approval-loop` | LIBRARY | Not invoked: Current user instructions already authorize local fixes, preview, push and hosted verification. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `orch-add-feature` | LIBRARY | Reserve for a separately requested feature; the current request is behavior-preserving improvement. | [E0](#e0), [E2](#e2) |
| `orch-build-mvp` | LIBRARY | Not rebuilding an MVP; the current portfolio already has source, build and regression coverage. | [E1](#e1), [E5](#e5) |
| `orch-change-feature` | LIBRARY | Reserve for explicitly authorized behavior changes; no feature redesign in this audit. | [E0](#e0), [E2](#e2) |
| `orch-fix-defect` | LIBRARY | Selective reproduce-fix-verify reference for confirmed defects; reuse existing checks. | [E0](#e0), [E5](#e5) |
| `orch-pipeline` | LIBRARY | Optional orchestration reference; no new orchestration runtime or duplicated workflow. | [E0](#e0), [E1](#e1) |
| `orch-refine-code` | LIBRARY | Reference behavior-preserving consolidation after evidence shows genuine duplication. | [E0](#e0), [E5](#e5), [E6](#e6) |
| `osint-investigation` | LIBRARY | Not invoked: No person/entity investigation needed to repair website source and delivery. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `parallel-execution-optimizer` | LIBRARY | Not invoked: Reserve for demonstrably independent expensive checks; do not multiply browser/GPU work or helpers. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `perl-patterns` | LIBRARY | Not invoked: this framework/language has no application runtime in the current JS/TS/Node portfolio; no parallel implementation. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `perl-security` | LIBRARY | Not invoked: this framework/language has no application runtime in the current JS/TS/Node portfolio; no parallel implementation. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `perl-testing` | LIBRARY | Not invoked: this framework/language has no application runtime in the current JS/TS/Node portfolio; no parallel implementation. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `plan-canvas` | LIBRARY | Optional readable local audit preview; existing website preview remains the primary deliverable. | [E4](#e4), [E6](#e6) |
| `plan-orchestrate` | LIBRARY | Optional sequencing aid; use current bounded stages rather than add a plan execution system. | [E0](#e0), [E5](#e5) |
| `plankton-code-quality` | LIBRARY | Not invoked: No new quality daemon/tool dependency; existing typecheck, source checks and reviews are the gates. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `postgres-patterns` | LIBRARY | Not invoked: editor persistence is bounded JSON plus derived modules; no database, ORM or Redis to tune or migrate. | [E4](#e4), [E5](#e5) |
| `prediction-market-oracle-research` | LIBRARY | Not invoked: no payments, blockchain, trading or prediction-market feature; do not add one to optimize the portfolio. | [E1](#e1), [E4](#e4) |
| `prediction-market-risk-review` | LIBRARY | Not invoked: no payments, blockchain, trading or prediction-market feature; do not add one to optimize the portfolio. | [E1](#e1), [E4](#e4) |
| `prisma-patterns` | LIBRARY | Not invoked: editor persistence is bounded JSON plus derived modules; no database, ORM or Redis to tune or migrate. | [E4](#e4), [E5](#e5) |
| `product-capability` | LIBRARY | Not invoked: Reserve for a separately requested capability; preserve current placeholders and features. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `product-lens` | LIBRARY | Not invoked: No product rethink is requested; current audit targets concrete existing defects. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `production-audit` | DAILY | Compare local and deployed rendering, resources, recovery and console evidence. | [E4](#e4), [E5](#e5), [E6](#e6) |
| `production-scheduling` | LIBRARY | Manufacturing scheduling is unrelated to the portfolio; no production-line workflow. | [E1](#e1), [E4](#e4) |
| `project-flow-ops` | LIBRARY | Reserve GitHub/Linear work tracking for a user-requested workflow; no new board or external writes. | [E0](#e0), [E6](#e6) |
| `prompt-caching-strategy` | LIBRARY | Not invoked: the portfolio is not an LLM/agent service; existing browser/backend checks, not agent eval infrastructure, verify website behavior. | [E1](#e1), [E4](#e4), [E5](#e5) |
| `prompt-optimizer` | LIBRARY | Not invoked: the portfolio is not an LLM/agent service; existing browser/backend checks, not agent eval infrastructure, verify website behavior. | [E1](#e1), [E4](#e4), [E5](#e5) |
| `python-patterns` | LIBRARY | Not invoked for application work: Python can inspect maintenance metadata, but the website does not ship a Python app or installer. | [E1](#e1), [E4](#e4) |
| `python-testing` | LIBRARY | Not invoked for application work: Python can inspect maintenance metadata, but the website does not ship a Python app or installer. | [E1](#e1), [E4](#e4) |
| `pytorch-patterns` | LIBRARY | Not invoked: no scraping, model training, serving, recommendations or bulk-data platform; local offline photo tooling is not a visitor ML service. | [E1](#e1), [E4](#e4) |
| `quality-nonconformance` | LIBRARY | Not invoked: this operational supply-chain/industrial domain is absent; no corresponding website feature or data. | [E1](#e1), [E4](#e4) |
| `quarkus-patterns` | LIBRARY | Not invoked: local endpoints are plain Node and production is static Vercel; this server framework is absent. | [E1](#e1), [E4](#e4) |
| `quarkus-security` | LIBRARY | Not invoked: local endpoints are plain Node and production is static Vercel; this server framework is absent. | [E1](#e1), [E4](#e4) |
| `quarkus-tdd` | LIBRARY | Not invoked: local endpoints are plain Node and production is static Vercel; this server framework is absent. | [E1](#e1), [E4](#e4) |
| `quarkus-verification` | LIBRARY | Not invoked: local endpoints are plain Node and production is static Vercel; this server framework is absent. | [E1](#e1), [E4](#e4) |
| `rails-patterns` | LIBRARY | Not invoked: local endpoints are plain Node and production is static Vercel; this server framework is absent. | [E1](#e1), [E4](#e4) |
| `ralphinho-rfc-pipeline` | LIBRARY | Not invoked: No large RFC execution DAG needed for this bounded repair and verification pass. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `react-native-patterns` | LIBRARY | Not invoked: this is a responsive browser website, not a native Android/Kotlin/React Native application. Phone checks use browser journeys. | [E1](#e1), [E2](#e2), [E5](#e5) |
| `react-patterns` | DAILY | Inspect hooks, effects, stable props and island mount/unmount behavior. | [E1](#e1), [E2](#e2) |
| `react-performance` | DAILY | Profile unnecessary React work and expensive image preparation in overlay islands. | [E1](#e1), [E2](#e2), [E5](#e5) |
| `react-testing` | LIBRARY | Reference only where an isolated React test is needed; existing browser tests cover rendered behavior. | [E2](#e2), [E5](#e5) |
| `recsys-pipeline-architect` | LIBRARY | Not invoked: no scraping, model training, serving, recommendations or bulk-data platform; local offline photo tooling is not a visitor ML service. | [E1](#e1), [E4](#e4) |
| `recursive-decision-ledger` | LIBRARY | Not invoked: No unbounded rollout/decision ledger; retain repeatable test evidence for specific hypotheses. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `redis-patterns` | LIBRARY | Not invoked: editor persistence is bounded JSON plus derived modules; no database, ORM or Redis to tune or migrate. | [E4](#e4), [E5](#e5) |
| `regex-vs-llm-structured-text` | LIBRARY | No LLM parsing pipeline; keep existing deterministic manifest/build parsing. | [E1](#e1), [E4](#e4) |
| `remotion-video-creation` | LIBRARY | Not invoked: preserve existing geometry, imagery and animation; no Blender scene inspection, generated replacement media or video production requested. | [E0](#e0), [E1](#e1), [E2](#e2) |
| `repo-scan` | LIBRARY | Not invoked: No external bootstrap/install required; local rg, manifests and reports provide repo evidence. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `research-ops` | LIBRARY | Use only for a specific factual dependency or browser question; prefer repo evidence first. | [E1](#e1), [E2](#e2), [E5](#e5) |
| `returns-reverse-logistics` | LIBRARY | Not invoked: this operational supply-chain/industrial domain is absent; no corresponding website feature or data. | [E1](#e1), [E4](#e4) |
| `rules-distill` | LIBRARY | Not invoked: No global rules rewrite; preserve the explicit user AGENTS instructions. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `rust-patterns` | LIBRARY | Not invoked: this framework/language has no application runtime in the current JS/TS/Node portfolio; no parallel implementation. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `rust-testing` | LIBRARY | Not invoked: this framework/language has no application runtime in the current JS/TS/Node portfolio; no parallel implementation. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `safety-guard` | LIBRARY | Keep path/data protections and isolated fixtures; do not install a new hook/configuration system. | [E0](#e0), [E4](#e4), [E5](#e5) |
| `santa-method` | LIBRARY | Not invoked: Reserve for high-impact disputed changes; no extra adversarial agent swarm is installed. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `scientific-db-pubmed-database` | LIBRARY | Not invoked: no clinical, regulated health, genomic, patent or academic-research workflow in the portfolio. | [E1](#e1), [E4](#e4) |
| `scientific-db-uspto-database` | LIBRARY | Not invoked: no clinical, regulated health, genomic, patent or academic-research workflow in the portfolio. | [E1](#e1), [E4](#e4) |
| `scientific-pkg-gget` | LIBRARY | Not invoked: no clinical, regulated health, genomic, patent or academic-research workflow in the portfolio. | [E1](#e1), [E4](#e4) |
| `scientific-thinking-literature-review` | LIBRARY | Not invoked: no clinical, regulated health, genomic, patent or academic-research workflow in the portfolio. | [E1](#e1), [E4](#e4) |
| `scientific-thinking-scholar-evaluation` | LIBRARY | Not invoked: no clinical, regulated health, genomic, patent or academic-research workflow in the portfolio. | [E1](#e1), [E4](#e4) |
| `search-first` | LIBRARY | Search existing helpers, tests and primary docs before adding a dependency. | [E0](#e0), [E1](#e1), [E5](#e5) |
| `security-bounty-hunter` | LIBRARY | No bounty hunting or broad live exploitation; use bounded review of owned local code. | [E0](#e0), [E4](#e4) |
| `security-review` | DAILY | Review existing local upload, JSON-body, origin and filesystem boundaries; no remote probing. | [E4](#e4), [E5](#e5) |
| `security-scan` | LIBRARY | Not invoked: No Claude configuration scan as a substitute for actual application security review. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `seo` | LIBRARY | Verify metadata, canonical URL and static output using existing SEO build/checks after relevant changes. | [E1](#e1), [E4](#e4), [E5](#e5) |
| `skill-comply` | LIBRARY | Not invoked: Inventory documentation only; no skill compliance visualization or enforcement integration. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `skill-host-compat` | LIBRARY | Not invoked: Use only if a specific imported skill fails under Codex; no catalog rewrite here. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `skill-scout` | LIBRARY | Not invoked: No further skill discovery/install needed; catalog already contains 314 skills. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `skill-stocktake` | LIBRARY | Not invoked: Reserve for a later catalog-quality audit; this report classifies relevance without deleting skills. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `social-graph-ranker` | LIBRARY | Not invoked: website repair does not authorize social/network/mail/document actions; no corresponding app integration in runtime. | [E0](#e0), [E1](#e1) |
| `social-publisher` | LIBRARY | Not invoked: website repair does not authorize social/network/mail/document actions; no corresponding app integration in runtime. | [E0](#e0), [E1](#e1) |
| `springboot-patterns` | LIBRARY | Not invoked: local endpoints are plain Node and production is static Vercel; this server framework is absent. | [E1](#e1), [E4](#e4) |
| `springboot-security` | LIBRARY | Not invoked: local endpoints are plain Node and production is static Vercel; this server framework is absent. | [E1](#e1), [E4](#e4) |
| `springboot-tdd` | LIBRARY | Not invoked: local endpoints are plain Node and production is static Vercel; this server framework is absent. | [E1](#e1), [E4](#e4) |
| `springboot-verification` | LIBRARY | Not invoked: local endpoints are plain Node and production is static Vercel; this server framework is absent. | [E1](#e1), [E4](#e4) |
| `story-lifecycle` | LIBRARY | Not invoked: Do not add epic/story/sprint files for small confirmed website defects. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `strategic-compact` | LIBRARY | Optional long-session handoff aid; preserve scope and results without website changes. | [E0](#e0), [E6](#e6) |
| `swift-actor-persistence` | LIBRARY | Not invoked: no native Apple app or on-device model runtime; test iOS/WebKit behavior without adding a native UI stack. | [E1](#e1), [E2](#e2), [E5](#e5) |
| `swift-concurrency-6-2` | LIBRARY | Not invoked: no native Apple app or on-device model runtime; test iOS/WebKit behavior without adding a native UI stack. | [E1](#e1), [E2](#e2), [E5](#e5) |
| `swift-protocol-di-testing` | LIBRARY | Not invoked: no native Apple app or on-device model runtime; test iOS/WebKit behavior without adding a native UI stack. | [E1](#e1), [E2](#e2), [E5](#e5) |
| `swiftui-patterns` | LIBRARY | Not invoked: no native Apple app or on-device model runtime; test iOS/WebKit behavior without adding a native UI stack. | [E1](#e1), [E2](#e2), [E5](#e5) |
| `taste` | LIBRARY | Not invoked: preserve existing geometry, imagery and animation; no Blender scene inspection, generated replacement media or video production requested. | [E0](#e0), [E1](#e1), [E2](#e2) |
| `taste-application` | LIBRARY | Not invoked: preserve existing geometry, imagery and animation; no Blender scene inspection, generated replacement media or video production requested. | [E0](#e0), [E1](#e1), [E2](#e2) |
| `taste-distillation` | LIBRARY | Not invoked: preserve existing geometry, imagery and animation; no Blender scene inspection, generated replacement media or video production requested. | [E0](#e0), [E1](#e1), [E2](#e2) |
| `tasteforge-video` | LIBRARY | Not invoked: preserve existing geometry, imagery and animation; no Blender scene inspection, generated replacement media or video production requested. | [E0](#e0), [E1](#e1), [E2](#e2) |
| `tdd-workflow` | DAILY | For each concrete defect, add/reuse a failure-trigger regression before the smallest fix. | [E0](#e0), [E5](#e5) |
| `team-agent-orchestration` | LIBRARY | Not invoked: No new persistent squad runtime; keep any authorized reviews bounded and read-only until integration. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `team-builder` | LIBRARY | Not invoked: No further agent picker needed; role assignments for this audit are stated below. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `terminal-opener` | LIBRARY | Only open a visible terminal if specifically useful; existing PowerShell execution suffices. | [E1](#e1), [E5](#e5) |
| `terminal-ops` | DAILY | Use PowerShell for scoped builds, syntax/type checks, fixtures and Git verification. | [E1](#e1), [E5](#e5) |
| `test-collaboration` | DAILY | Map historical symptoms to existing tests, fill real gaps and report coverage limits. | [E5](#e5), [E6](#e6) |
| `tinystruct-patterns` | LIBRARY | Not invoked: this framework/language has no application runtime in the current JS/TS/Node portfolio; no parallel implementation. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `token-budget-advisor` | LIBRARY | Not invoked: Do not interrupt site work for response-depth choices; current user scope is already explicit. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `token-card` | LIBRARY | Not invoked: No usage-card artifact needed for website functionality or performance. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `typescript-patterns` | DAILY | Keep strict TS checks and accurate overlay/helper contracts. | [E1](#e1), [E2](#e2) |
| `ui-demo` | LIBRARY | Optional local walkthrough recording after fixes; not a substitute for runtime assertions. | [E5](#e5), [E6](#e6) |
| `ui-to-vue` | LIBRARY | Not invoked: React islands plus vanilla modules are built with esbuild; no Angular/Vue/Nuxt/Next/Vite migration. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `uncloud` | LIBRARY | Not invoked: current Node/npm and static Vercel delivery do not use this container/cluster/environment platform. | [E1](#e1), [E4](#e4) |
| `unified-memory` | LIBRARY | Not invoked: No cross-agent memory installation; existing reports and this mapping are inspectable durable context. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `unified-notifications-ops` | LIBRARY | Use only for a separately requested and connected notification channel; none added by this audit. | [E0](#e0), [E1](#e1) |
| `verification-loop` | DAILY | Run affected checks, full required regression/build gates, then verify the hosted revision. | [E1](#e1), [E5](#e5), [E6](#e6) |
| `video-editing` | LIBRARY | Not invoked: preserve existing geometry, imagery and animation; no Blender scene inspection, generated replacement media or video production requested. | [E0](#e0), [E1](#e1), [E2](#e2) |
| `videodb` | LIBRARY | Not invoked: preserve existing geometry, imagery and animation; no Blender scene inspection, generated replacement media or video production requested. | [E0](#e0), [E1](#e1), [E2](#e2) |
| `visa-doc-translate` | LIBRARY | Not invoked: current audit has no billing, fundraising, contracts, signature or document-processing workflow. | [E1](#e1), [E4](#e4) |
| `vite-patterns` | LIBRARY | Not invoked: React islands plus vanilla modules are built with esbuild; no Angular/Vue/Nuxt/Next/Vite migration. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `vue-patterns` | LIBRARY | Not invoked: React islands plus vanilla modules are built with esbuild; no Angular/Vue/Nuxt/Next/Vite migration. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `windows-desktop-e2e` | LIBRARY | Not invoked: Test the website in browsers; it is not a native WPF/WinForms/WinUI application. | [E0](#e0), [E1](#e1), [E5](#e5), [E6](#e6) |
| `workspace-surface-audit` | LIBRARY | Optional inventory of local tooling before choosing a connector; no new integration is necessary. | [E1](#e1), [E4](#e4) |
| `x-api` | LIBRARY | Not invoked: website repair does not authorize social/network/mail/document actions; no corresponding app integration in runtime. | [E0](#e0), [E1](#e1) |

## Agent profile inventory

**71 profiles: 3 DAILY, 68 LIBRARY. Three used reviews; 22 proposed selective jobs; 46 not invoked.** Canonical source root: `C:/Users/Hp/.codex/vendor_imports/ECC/agents/`; each row identifies `<name>.md`. These are profile assignments, not new installed processes or background agents.

| Agent profile | Bucket | Execution status | Actual review / proposed job / reason not invoked | Evidence |
| --- | --- | --- | --- | --- |
| `a11y-architect` | DAILY | USED — role-guided review | Completed bounded accessibility/dialog/input review; preserve behavior while identifying actual barriers. | [E2](#e2), [E5](#e5) |
| `agent-evaluator` | LIBRARY | NOT INVOKED | No coding-agent head-to-head evaluation requested; evaluate website behavior instead. | [E0](#e0), [E1](#e1), [E5](#e5) |
| `architect` | LIBRARY | PROPOSED — not run | Consult only if evidence requires a cross-module architectural decision; no site rewrite. | [E0](#e0), [E1](#e1), [E2](#e2) |
| `bengali-reviewer` | LIBRARY | NOT INVOKED | No Bengali/NLP runtime or translation task. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `build-error-resolver` | LIBRARY | PROPOSED — not run | If build/typecheck fails, repair the specific import/config/generated-asset failure. | [E1](#e1), [E4](#e4), [E5](#e5) |
| `chief-of-staff` | LIBRARY | NOT INVOKED | No personal operations, delegation inbox or office workflow requested. | [E0](#e0), [E1](#e1), [E5](#e5) |
| `code-architect` | LIBRARY | PROPOSED — not run | Optional minimal shared-helper design for proven duplication; avoid abstraction scaffolding. | [E0](#e0), [E2](#e2) |
| `code-explorer` | LIBRARY | PROPOSED — not run | Trace specific animation/media call paths and their test/build consumers. | [E1](#e1), [E2](#e2), [E5](#e5) |
| `code-reviewer` | LIBRARY | PROPOSED — not run | Independently review the final diff for regressions, correctness and smallest clear code. | [E0](#e0), [E5](#e5) |
| `code-simplifier` | LIBRARY | PROPOSED — not run | Consolidate genuine duplication after behavior tests; never shorten by hiding failures. | [E0](#e0), [E5](#e5), [E6](#e6) |
| `comment-analyzer` | LIBRARY | PROPOSED — not run | Review misleading comments only when touched code requires it; no broad comment rewrite. | [E0](#e0), [E2](#e2) |
| `commit-reviewer` | LIBRARY | PROPOSED — not run | Review staged files, exclude personal attachments and match the commit message to validated changes. | [E0](#e0), [E4](#e4), [E6](#e6) |
| `conversation-analyzer` | LIBRARY | NOT INVOKED | No conversation analytics product; source/history are only audit evidence. | [E0](#e0), [E1](#e1), [E5](#e5) |
| `cpp-build-resolver` | LIBRARY | NOT INVOKED | No C++ application build. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `cpp-reviewer` | LIBRARY | NOT INVOKED | No C++ application source. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `csharp-reviewer` | LIBRARY | NOT INVOKED | No C#/.NET application. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `dart-build-resolver` | LIBRARY | NOT INVOKED | No Dart/Flutter build. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `database-reviewer` | LIBRARY | NOT INVOKED | No database/ORM; persistence is local JSON plus derived modules. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `django-build-resolver` | LIBRARY | NOT INVOKED | No Django build/runtime. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `django-reviewer` | LIBRARY | NOT INVOKED | No Django application. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `doc-updater` | LIBRARY | PROPOSED — not run | Update audit/regression reports with actual outcomes and explicit evidence limits. | [E5](#e5), [E6](#e6) |
| `docs-lookup` | LIBRARY | PROPOSED — not run | Consult primary docs for a specific uncertain API; avoid speculative library upgrades. | [E1](#e1), [E2](#e2) |
| `e2e-runner` | LIBRARY | PROPOSED — not run | Run existing affected/full browser journeys, local preview and final hosted smoke checks. | [E5](#e5), [E6](#e6) |
| `fastapi-reviewer` | LIBRARY | NOT INVOKED | No FastAPI service. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `flutter-reviewer` | LIBRARY | NOT INVOKED | No Flutter application. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `fsharp-reviewer` | LIBRARY | NOT INVOKED | No F# application. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `gan-evaluator` | LIBRARY | NOT INVOKED | No GAN-style agent framework; existing correctness checks judge proposed fixes. | [E0](#e0), [E1](#e1), [E5](#e5) |
| `gan-generator` | LIBRARY | NOT INVOKED | No generator swarm or model-training work; smallest evidence-backed repairs suffice. | [E0](#e0), [E1](#e1), [E5](#e5) |
| `gan-planner` | LIBRARY | NOT INVOKED | No GAN-style plan generation; use bounded verified stages. | [E0](#e0), [E1](#e1), [E5](#e5) |
| `go-build-resolver` | LIBRARY | NOT INVOKED | No Go build. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `go-reviewer` | LIBRARY | NOT INVOKED | No Go application. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `harmonyos-app-resolver` | LIBRARY | NOT INVOKED | No native HarmonyOS app; mobile scope is browser rendering. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `harness-optimizer` | LIBRARY | NOT INVOKED | No agent harness to optimize inside the website runtime. | [E0](#e0), [E1](#e1), [E5](#e5) |
| `healthcare-reviewer` | LIBRARY | NOT INVOKED | No clinical/PHI application workflow. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `homelab-architect` | LIBRARY | NOT INVOKED | No homelab infrastructure in the portfolio. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `java-build-resolver` | LIBRARY | NOT INVOKED | No Java build. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `java-reviewer` | LIBRARY | NOT INVOKED | No Java application. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `kotlin-build-resolver` | LIBRARY | NOT INVOKED | No Kotlin/Android build. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `kotlin-reviewer` | LIBRARY | NOT INVOKED | No Kotlin application; responsive web tests cover phones. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `loop-operator` | LIBRARY | NOT INVOKED | No persistent autonomous loop installation; test iterations remain bounded. | [E0](#e0), [E1](#e1), [E5](#e5) |
| `marketing-agent` | LIBRARY | NOT INVOKED | No new campaign/content strategy; preserve current site content. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `mle-reviewer` | LIBRARY | NOT INVOKED | No visitor-facing ML/training pipeline. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `network-architect` | LIBRARY | NOT INVOKED | No router/VLAN/network architecture project. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `network-config-reviewer` | LIBRARY | NOT INVOKED | No managed switch/router config to review. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `network-troubleshooter` | LIBRARY | NOT INVOKED | No demonstrated infrastructure defect; measure browser/network requests first. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `opensource-forker` | LIBRARY | NOT INVOKED | No new upstream fork requested. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `opensource-packager` | LIBRARY | NOT INVOKED | No third-party source distribution package requested. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `opensource-sanitizer` | LIBRARY | NOT INVOKED | No third-party release sanitization requested; normal site diff excludes personal attachments. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `performance-optimizer` | DAILY | USED — role-guided review | Completed bounded performance/source review for hosted lag, animation scheduling, asset decoding and visibility. | [E1](#e1), [E2](#e2), [E5](#e5), [E6](#e6) |
| `php-reviewer` | LIBRARY | NOT INVOKED | No PHP runtime. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `planner` | LIBRARY | PROPOSED — not run | Sequence measured fixes, local verification, preview, push and deployed verification. | [E0](#e0), [E5](#e5), [E6](#e6) |
| `pr-test-analyzer` | LIBRARY | PROPOSED — not run | Map historical bugs to checks, strengthen actual missing triggers and distinguish emulated/physical coverage. | [E5](#e5), [E6](#e6) |
| `python-reviewer` | LIBRARY | NOT INVOKED | Python metadata inspection is maintenance-only, not website application code. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `pytorch-build-resolver` | LIBRARY | NOT INVOKED | No PyTorch training/build service. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `rag-pipeline-reviewer` | LIBRARY | NOT INVOKED | No retrieval-augmented/LLM service. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `react-build-resolver` | LIBRARY | PROPOSED — not run | Use only for a concrete React island/type/build failure; retain current esbuild pipeline. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `react-reviewer` | LIBRARY | PROPOSED — not run | Review effect cleanup, interruption and rerenders in gallery/loading/skills islands. | [E1](#e1), [E2](#e2), [E5](#e5) |
| `refactor-cleaner` | LIBRARY | PROPOSED — not run | Remove confirmed dead/duplicate code after references and regression evidence support removal. | [E0](#e0), [E5](#e5), [E6](#e6) |
| `ruby-reviewer` | LIBRARY | NOT INVOKED | No Ruby/Rails application. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `rust-build-resolver` | LIBRARY | NOT INVOKED | No Rust build. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `rust-reviewer` | LIBRARY | NOT INVOKED | No Rust application. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `security-reviewer` | DAILY | USED — role-guided review | Completed bounded local backend/build/delivery review; confirmed static-host boundary and attachment staging safeguard. | [E4](#e4), [E5](#e5) |
| `seo-specialist` | LIBRARY | PROPOSED — not run | Verify existing static SEO metadata/canonical output after relevant build changes. | [E1](#e1), [E4](#e4), [E5](#e5) |
| `silent-failure-hunter` | LIBRARY | PROPOSED — not run | Inspect swallowed load/decode/recovery failures against fault-injection cases. | [E2](#e2), [E4](#e4), [E5](#e5) |
| `spec-miner` | LIBRARY | PROPOSED — not run | Recover intended behavior from user rules, source and historical regression reports before changing it. | [E0](#e0), [E5](#e5), [E6](#e6) |
| `swift-build-resolver` | LIBRARY | NOT INVOKED | No Swift/iOS application build. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `swift-reviewer` | LIBRARY | NOT INVOKED | No Swift app; WebKit checks remain browser evidence. | [E1](#e1), [E2](#e2), [E4](#e4) |
| `tdd-guide` | LIBRARY | PROPOSED — not run | Use an actual failure-trigger regression for each confirmed repair; reuse current fixtures. | [E0](#e0), [E5](#e5) |
| `type-design-analyzer` | LIBRARY | PROPOSED — not run | Inspect touched island/helper/API contracts; do not introduce generic type scaffolding. | [E0](#e0), [E1](#e1), [E2](#e2) |
| `typescript-reviewer` | LIBRARY | PROPOSED — not run | Review touched TS/React types and run tsc; preserve runtime semantics. | [E1](#e1), [E2](#e2), [E5](#e5) |
| `vue-reviewer` | LIBRARY | NOT INVOKED | No Vue application; retain React islands and vanilla modules. | [E1](#e1), [E2](#e2), [E4](#e4) |

## Install plan and verification

- Retain all 314 skills and 71 profiles. DAILY/LIBRARY is a relevance plan, not a configuration mutation; do not add autoload rules, new hooks, daemons, provider integrations or extra agents from this document.
- Invoke a listed skill selectively when the concrete stage needs it, read its instructions then, and honor project/user constraints. Do not claim a LIBRARY framework or domain was used merely because its metadata was indexed.
- Parsed every canonical skill/profile frontmatter, required a name/description, matched every source directory/profile exactly once, and rejected missing/extra map entries. Counts are checked against source inventory, not estimated from the catalog UI.
- This documentation task ran no builds, stress benchmarks, real editor mutations, deployments or physical-device tests. It changed only this report in the project; personal attachments were not read, modified or incorporated.
