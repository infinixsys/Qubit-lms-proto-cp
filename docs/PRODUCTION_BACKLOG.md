# From functional prototype to production

The supplied PRD describes production acceptance requirements beyond a prototype. The following work must be estimated and implemented before a real launch.

## Foundation and security

- Choose target learner ages, jurisdictions, institutions, production region and data processor policy.
- Replace local SQLite document persistence with normalised PostgreSQL migrations, explicit constraints, tenant-scoped repositories, transaction/outbox design and performance indexes.
- Remove public demo credentials and development self-registration assumptions. Implement verification, expiring recovery tokens, session rotation, MFA for privileged accounts, broader step-up policies, secure native authentication storage and tested CSRF/CORS deployment settings.
- Add generated OpenAPI contracts, schema compatibility checks, server pagination/filtering, consistent optimistic locking, rate/abuse budgets, load tests, CI secret/dependency scans, a threat model and independent security review.
- Enforce tenant suspension, account status, permission and object-level isolation through production repositories. Re-test every resource and provider boundary.

## Content and learning engine

- Real private object storage, quarantine, malware scanning, rights metadata, MIME validation, signed delivery, processing workers, video/audio renditions, caption tracks, PiP and playback recovery.
- Rich lesson editor and attachments/links, keyboard-accessible drag/reorder, detailed review/version comparison, scheduled publication, rollback and explicit enrolment migration policies.
- Per-course versioned quiz banks/pools, matching/ordering/short-response question modes, accommodations, feedback-reveal rules, retry delays, deadline/grading rules and item analysis.
- Structured rubric criteria, reviewer assignment, appeals and controlled resubmission/deadline policies.
- Configurable certificate templates/expiry, server PDF generation and public verification domain.

## Advanced and provider-dependent modules

- Select and integrate AI provider(s), tenant-filtered retrieval, source fidelity evaluations, quotas, budget enforcement, prompt versioning/reviews, privacy controls, multilingual quality tests and observability. The reference fallback remains useful when AI is off.
- A measured skills graph and adaptive recommendations with transparent reasons; actual time/activity analytics and valid cohort comparisons. Do not substitute completion for mastery.
- Notification outbox/workers, selected email/push providers, quiet-hour enforcement, delivery retries, translations, campaign scheduling and consent rules.
- Live conferencing/attendance/recordings and community moderation/report queues.
- Selected payment provider, sandbox checkout, signed/idempotent webhook reconciliation, entitlements, subscriptions, refunds, coupons, tax and finance permissions.
- SSO/SAML, SCORM/xAPI/LTI and external analytics only after specific integration decisions.
- Tenant provisioning, verified custom domains, tenant theming and quotas.

## Offline, mobile and accessibility

- Secure keychain/keystore storage, download encryption/expiry/revocation rules, quota and resumable media downloads, background sync and lifecycle conflict tests on physical devices.
- Build/sign Android and iOS packages, test supported OS/device matrices and store policies, complete crash telemetry and upgrade/migration strategy.
- Professional localisation and content translation; all interface strings currently ship in English.
- Manual WCAG 2.2 AA and equivalent native accessibility review: screen readers, focus order, large text, switch/keyboard, captions, contrast across all states and charts.

## Operations, privacy and reliability

- Durable workers, dead-letter handling, signature-verified webhooks, safe replay controls, actual metrics/traces, SLO baselines, alert ownership and incident procedures.
- Encrypted offsite backups, object-storage recovery, restore drills on a separate environment, measured RPO/RTO and deployment rollback exercises.
- Verified privacy-request execution, retention enforcement, legal holds, processor deletion/export propagation and production privacy/terms review.
- Audit logs shipped to a separately controlled immutable or tamper-evident destination with access controls and retention.

Prototype feature records and preferences are useful review surfaces; saving a provider name, schedule, budget or retention period does not implement the corresponding execution engine.
