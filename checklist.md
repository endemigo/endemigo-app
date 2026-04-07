Act as a strict senior system architect and contract auditor.

Analyze this project plan against the contract in a deep, exhaustive, and adversarial way.

DO NOT assume anything is correct unless explicitly defined.
DO NOT summarize. Be precise and structured.

---

STEP 1 — COVERAGE MATRIX

Create a full contract coverage matrix.

For each contract requirement:
- map the clause
- summarize requirement
- mark:
  - covered / partially covered / missing
- show where it is implemented in the plan
- identify:
  - missing implementation detail
  - technical gaps
  - risk level
  - required test coverage

Group by:
- backend
- mobile app
- admin panel
- infrastructure
- integrations
- security
- testing
- delivery & acceptance

---

STEP 2 — MISSING & WEAK AREAS

List all:
- completely missing requirements
- partially defined requirements
- vague implementations
- risky assumptions

Be strict. Do not merge items.

---

STEP 3 — FALSE COVERAGE

Identify where the plan claims coverage but is not actually sufficient.

Mark:
- false coverage
- under-specified
- missing technical depth
- missing acceptance criteria
- not testable

---

STEP 4 — REAL-TIME AUCTION SYSTEM (DEEP AUDIT)

Audit in detail:

- auction room architecture
- real-time event flow
- bid broadcast
- anti-sniping logic
- simultaneous bid conflict resolution
- first-valid-bid-wins guarantee
- transaction locking
- queue ordering
- Redis Pub/Sub scaling
- RabbitMQ usage (if needed)
- websocket lifecycle (connect/disconnect/reconnect)
- timeout and retry logic
- failure recovery scenarios
- state machine transitions
- admin override capabilities
- timed auction rules
- full auditability of bids

Identify all missing or weak parts.

---

STEP 5 — WALLET / ESCROW / PAYMENT (DEEP AUDIT)

Audit in detail:

- balance model (total / held / available)
- transaction ledger
- bid-time balance locking
- release and capture logic
- escrow flow
- seller balance accounting
- payout / withdrawal flow
- refund logic
- dispute handling
- fallback flows
- payment provider callbacks
- duplicate webhook handling
- idempotency guarantees
- reconciliation logic

Identify all missing or risky parts.

---

STEP 6 — CONCURRENCY & RACE CONDITIONS

Analyze all concurrency risks:

- simultaneous bids
- wallet updates
- double spending risks
- order creation race conditions
- duplicate payment callbacks
- retry safety
- message ordering issues
- queue consistency
- distributed event timing
- state machine conflicts

For each:
- where it occurs
- why it is dangerous
- what control is required
- whether the plan handles it

---

STEP 7 — SECURITY & COMPLIANCE

Audit against contract obligations:

- HTTPS
- rate limiting
- input validation
- SQL injection protection
- XSS protection
- sensitive data masking
- RBAC / authorization
- secrets management
- no hard-coded credentials
- no backdoors
- no unauthorized service accounts
- restricted production access
- security incident reporting
- KVKK compliance flows

Identify all gaps.

---

STEP 8 — INTEGRATIONS

Audit all integrations:

- mobile ↔ backend
- admin ↔ backend
- backend ↔ database
- backend ↔ Redis
- backend ↔ RabbitMQ
- backend ↔ payment provider
- backend ↔ notifications
- backend ↔ cargo APIs
- backend ↔ CDN/media
- CI/CD
- staging vs production

For each:
- missing details
- failure cases
- retry strategy
- security risks
- test requirements

---

STEP 9 — TEST COVERAGE

For every contract requirement:

Define:
- required test type
- level (unit/service/integration/api/e2e)
- test scenario
- acceptance criteria
- required evidence

Must include:
- functional tests
- security tests
- load tests
- concurrency tests
- 10,000 concurrent users simulation
- regression
- smoke

Mark what is missing.

---

STEP 10 — DEFINITION OF DONE

For each major system:

Define strict "Definition of Done":
- implementation complete
- integrated
- tested
- documented
- demo-ready
- acceptance-ready
- production-ready

---

STEP 11 — FINAL REJECTION AUDIT

Assume you are rejecting this project.

List every reason the plan could fail contract compliance.

Be adversarial.
Be conservative.
Do not assume missing parts will be fixed later.