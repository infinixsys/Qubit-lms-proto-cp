# Refix India Institute · implementation status

The supplied PRD/TRD and feature inventory are requirements, not executable instructions. [CONTROL_PANEL_UPGRADE.md](CONTROL_PANEL_UPGRADE.md) maps the upgraded owner workflows to their original sections and documents their limits. “Implemented” means the local prototype works; it does not mean every production release gate has passed.

| PRD requirement | Implemented prototype behaviour | Remaining boundary |
| --- | --- | --- |
| FR-001 Identity | Password auth, pending registration, one-use learner invitation/password setup, staff TOTP and recovery codes | Delivered recovery, OTP/social/SSO and mandatory privileged enrolment policy |
| FR-002 Permissions | Server-checked area roles, custom roles, tenant-scoped new workflows, owner step-up, session revocation | Assigned-course ownership scope and production identity federation |
| FR-003 Catalog | Repair courses, category search, version-aware details and protected packages | Full taxonomy/tag administration and marketplace |
| FR-004 Publishing | Draft/review/approval/publication/archive, curriculum ordering, duplication, revision conflicts, review timeline and version history | Full visual content diff and rollback designer |
| FR-005 Delivery | Private MP4/WebM/images/PDF/Word, signature/size checks, byte ranges and resource previews | Transcoding/CDN, encrypted DRM and a malware service |
| FR-006 Progress | Durable, idempotent lesson progress; notes, bookmarks, resume and offline queue | Completion is activity evidence, not a professional qualification |
| FR-007 Assessments | Course question bank, captured question order/content/policy, server timer/attempts/retry delay/pass mark/availability/reveal, four question formats | Separate editorial question-version registry, accommodations and high-stakes proctoring |
| FR-008 Assignments | Course-linked submissions, feedback, return/resubmit; repair practical review | Criterion-level rubric versioning and appeal workflow |
| FR-009 Communication | Scoped and scheduled in-app campaigns, per-recipient availability, read state and cancellation | Email/SMS/push providers, external preferences/unsubscribe and provider retry workers |
| FR-010 People | Search/status filters, server pagination, imports/invitations, activation/block/deactivation, staff roles and device revocation | Verified-contact and full delegated support workflow |
| FR-011 Bulk operations | Learner CSV validation preview, row errors, duplicate/race checks, atomic/idempotent commit, import history; authorised CSV exports | Catalog/question CSV imports and large asynchronous exports |
| FR-012 Analytics | Database-derived owner metrics, course/cohort/date filters, assessment summaries, saved personal views and CSV exports | Event warehouse, retention cohorts, automated report delivery and production telemetry |
| FR-013 Audit | Append-only application interface; new security, import, review, policy, campaign, report and privacy actions logged | Separately controlled audit destination and legal retention rollout |
| FR-014 Privacy | Tracked identity review, hold/reason, personal-data preparation and separate session-revoking deactivation | Irreversible erasure and connected-system/backup deletion |
| FR-015 AI | Explicitly reference-only, optional assistant; provider shown as not configured | Provider-backed grounded authoring/tutoring, quota accounting and review governance |
| FR-016 Offline | Eligible reading expires within 24 hours and no later than subscription; queued notes/progress | Protected offline video/PDF and disconnected-device instant revocation |
| FR-017 Certificates | Server eligibility by enrolled version, pass mark and optional competent practical; issue/verify/revoke | Template designer, PDF rendering service and production public verification domain |
| FR-018 Billing | INR price/access snapshots, manual receipts/verification, separate activation, renewals, cancellations, grants and ledger | Gateway, recurring charges, refunds, tax invoices and webhook reconciliation |

Separate repositories and local ports remain: owner/API in CP (7311/7310), learner browser preview/app in APP (7312). The native Android app retains its secure-session transport. iOS native-session integration and signed device/store release work remain separate. Automated tests, builds and download verification are reported for each delivered change.
