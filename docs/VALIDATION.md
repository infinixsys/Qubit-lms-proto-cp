# Validation evidence

Validated in the development cloud environment on 22 October 2026 (Asia/Kolkata). All application data used in validation is synthetic.

| Check | Result | Scope |
| --- | --- | --- |
| Control panel web build / TypeScript | Passed | `npm run build` |
| Learner web build / TypeScript | Passed | `npm run build`, including versioned offline asset generation |
| API integration suite | **18 passed, 0 failed, 0 skipped** | Authentication, permissions, tenant boundaries, CSRF, enrolment idempotency, progress deduplication, grading, timing/attempt limits, submissions/feedback, certificates, publication/version access, session revocation, upload signatures, reference assistant flags, audit/export/retry guards, privacy scope, cohort assignment and offline entitlement |
| Browser suite | **5 passed, 0 failed, 0 skipped** | Real Chromium; both products and production offline preview |
| Accessibility automation | Passed for both overview screens at desktop and mobile widths | axe WCAG 2 A/AA and WCAG 2.1 AA rule tags; this is not full-site or manual WCAG 2.2 certification |
| Route/render checks | Passed | 30 admin workspaces and 14 learner destinations, no uncaught browser errors |
| Responsive overflow | Passed on overview screens | 1440px desktop and 390px mobile widths |
| Android/iOS Capacitor asset sync | Passed | Native project creation, web assets and declared plugin sync |
| Local SQLite backup | Passed | Online backup, `PRAGMA integrity_check`, restored database record reads |
| Source formatting | Passed | Both repositories' `npm run format:check` |

## Browser workflows

1. New learner registration and sign-in → course discovery → enrolment → note → explicit download → offline progress queue → reconnect/sync → all lessons complete → 100% server-graded assessment → evidence-based certificate issue and verification → assignment submission → staff grading → learner feedback.
2. Administrator creates draft → adds lesson with rights/transcript metadata → approves human review → runs publishing preflight → publishes version.
3. Both overview screens scanned with axe at desktop and mobile sizes; no reported violations in the selected rule sets.
4. Every major route renders without uncaught browser errors or unexpected API error panels.
5. Built production learner app reloads an explicitly downloaded reading while fully offline, queues a note, syncs after reconnecting, and rejects expired downloaded content after an offline reload.

## Not claimed

No signed Android/iOS build, real-device test, live payment/email/push/conferencing/AI delivery, production security certification, full manual accessibility review, load/SLO test or encrypted offsite disaster recovery has been completed. iOS compilation requires macOS/Xcode; CocoaPods is unavailable in this Linux environment. Android SDK/device tooling is also unavailable.

CI definitions are included for future repository checks. Creating a workflow file does not establish that a remote CI run has executed.
