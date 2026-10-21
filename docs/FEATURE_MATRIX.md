# Requirements coverage · prototype v0.1

Source: supplied PRD/TRD v1.0 and complete features inventory. Document text was treated as requirements, not executable instructions. **Working** means the local workflow has an implementation. **Partial** means only the stated subset exists. **Provider required** and **Production work** are not claims of implemented behaviour.

## Learner mobile product

| Requirement family | Prototype behaviour | Boundary |
| --- | --- | --- |
| Registration and sign-in | Working email/password accounts, demo login, sign-out and terms consent | Social/OTP login, email verification, delivered recovery tokens, MFA and biometric unlock require implementation/providers |
| Onboarding and profile | Working name, interests, weekly goals, locale/timezone preferences | Profile image upload and translated UI not implemented |
| Personalised home | Working enrolled courses and progress, next-step recommendation, goal view, navigation | Goal-time/week indicators are explicitly illustrative estimates; recommendation is rule-based, not predictive AI |
| Learning Compass | Explainable enrolled-course next step, time and dismissal | Adaptive skills-graph recommendation engine is production work |
| Catalogue | Working search across course title/description/instructor, category/level filters, rating/name sorting, saved courses, course detail | More duration/language/format facets and full-text backend search are production work |
| Enrolment and entitlement | Free/open enrolment, restricted-course denial, administrator grants and suspension | Paid checkout and expiry windows require implementation/provider |
| Course Atlas | Working visual/linear curriculum with completed/current/locked states | Complex prerequisite DAG rules and automatic course migration not implemented |
| Reading and learning assets | Working authored reading/transcript, downloadable reflection workbook, device text-to-speech | Real video/audio streaming, quality selection, PiP, interactive embeds, caption files and private media CDN need media integration |
| Focus player | Working focus mode, read-aloud speed, outline, personal notes, bookmarks and issue reporting | Reading position measurement is a simplified prototype; no real media resume/seek engine |
| Assessments | Working single choice, multiple answer, true/false, exact-text questions, shuffled questions, server timer, autosave, review, scores, attempts | Matching, ordering, random pools per objective, accommodations, short-answer manual quiz marking and cooldown policy remain production work |
| Assignments | Working text drafts, validated file upload, submission status, rubric text, staff feedback/score, returned-work resubmission | Rubric criteria are textual; appeals and deadline policy engine not implemented |
| Progress and Mastery Lens | Working per-course completion, assessment averages/history, personal notes, exports, separate completion vs evidence | Skills graph, scientifically calibrated mastery, cohort norming and real session-time analytics are not implemented |
| Offline learning | Working explicit 24h reading downloads, application shell, offline notes/progress queue, visible sync failures, removal and logout clearing | No encryption/DRM, immediate offline revocation, media download pause/resume or high-stakes offline grading |
| Assistant | Working authorised reference retrieval, summaries, reflection prompts, flashcard-like references and sources | Clearly non-generative. AI provider, multilingual answers, adaptive planning, token/cost telemetry require integration |
| Inbox | Working in-app publication, read/unread, preferences | Email/push delivery, quiet-hour execution and automatic reminders need worker/provider |
| Live learning | Working session records, calendar ICS export, approved HTTPS join links if entered | Conferencing/attendance/recording integration not connected |
| Community | Working enrolled-course threads, replies, staff closure and support report path | Real-time chat, content moderation queue and moderation automation not implemented |
| Certificates | Working evidence-based issue/verify/revoke, print/save as PDF and share details | Direct server PDF generation, public verification domain, certificate expiry/template designer are production work |
| Accessibility and appearance | Responsive navigation, dialog focus trap, labels, light/dark, larger lesson text and reduced motion | Full WCAG 2.2 AA/manual assistive-technology/device audit remains required |
| Privacy and account safety | Working personal export, reviewed deletion request, optional consents, password change and session revocation | Deletion execution/retention jobs, legal consent versioning, secure native token storage and production policy approval remain required |

## Control panel product

| Requirement family | Prototype behaviour | Boundary |
| --- | --- | --- |
| Privileged access | Working role-aware UI and API enforcement; password confirmation on role changes | Production MFA, step-up for all high-risk operations, suspicious login detection and emergency access are not implemented |
| Command centre | Actual workspace totals, seeded illustrative pilot chart, drill-down links and activity | No claimed measured API SLO, revenue or learner retention; broad date/cohort query engine is production work |
| Command search | Keyboard shortcut and permission-filtered navigation search | Global record/action search is not implemented |
| Users | Working directory search/sort/paging, invitations, status, roles, course grants, session revocation and exports | Invitations are local records, not delivered emails; email recovery and duplicate-account merge require implementation |
| Bulk operations | Working CSV template/preview/row validation and sequential invitation creation | Not an atomic import. Partial-success errors are reported. Background imports and rollback require production work |
| Roles | Working six predefined role families plus Super Admin, server permission map | Arbitrary custom role editing/permission assignment is not implemented |
| Groups and cohorts | Working group records, same-tenant member roster, cohort course assignment, search and exports | Departments, nested groups, dynamic membership rules and membership import remain production work |
| Course management | Working metadata, lessons, outline ordering, draft/review/approve/publish/archive, rights/caption preflight | No WYSIWYG editor, scheduled publish worker, diff/rollback UI or uploaded playable media pipeline |
| Version policy | Working immutable snapshots; enrolled learners keep their original content while next draft changes | Full assessment policy versions, scheduled migration and rollback engine require production implementation |
| Media library | Working bounded PDF/text/image uploads, signatures, metadata and authorised attachment download | No transcoding, malware scan, replacement workflow, CDN or storage accounting |
| Question bank | Working question creation/edit/export, types, answer keys restricted to assessment staff, attempt snapshots | Per-course bank/pools, version comparison, CSV question import and question-quality analysis are production work |
| Assignment review | Working learner submissions, feedback, score range validation, return/grade states and attachment download | Multi-reviewer assignment, detailed rubric scoring and appeal workflows remain |
| AI studio | Working feature switches, reference fallback, prompt registry, deterministic outline template/export | No generated authoring, external inference, true usage/cost monitoring or automated learning insights |
| Reporting | Actual current totals, synthetic trend labelled, course metadata table/filter, CSV exports and saved report preferences | Saved schedules are configuration only; no scheduled report worker, warehouse, custom chart engine or delivery |
| Communication | Working in-app announcements, draft/published records, inbox read state | Saved scheduling/channel preferences do not execute external delivery |
| Certificates | Working issue evidence, record export and revocation | Template designer, reissue workflow, configurable expiry and mass server PDFs not implemented |
| Billing | Working plan preferences and empty transaction workspace | No checkout, actual subscription/entitlement reconciliation, refunds, coupons, tax or webhook processing |
| Multi-tenant | Working tenant data boundaries, different-tenant test account, organisation/brand metadata | Tenant provisioning workers, tenant-specific theming/domains/limits and full white-label deployment remain |
| Support | Working learner cases, staff assignment/status/notes and learner-visible responses | No impersonation. SLA escalation automations and external helpdesk integration remain |
| Audit/governance | Working append-only application audit, search/outcome filter, authorised export and privacy request review | No tamper-evident sink, retention enforcement, legal holds or immutable external archive |
| Settings | Working brand/locale/timezone/goal/budget/retention/maintenance preferences, integration selections and feature switches | Retention/maintenance/budget preferences do not implement their production enforcement engines |
| Jobs and operations | Working local API/database health, job/incident visibility, guarded retry denial and correlation IDs | No generic unsafe replay; configured execution provider required; durable worker, dead-letter execution and monitoring remain |
| Backups | Working local snapshot command, integrity check and restored-record reads | No automated/offsite/encrypted backups or full disaster recovery drill |
| Interoperability | Visible integration readiness entries | SSO/SAML, SCORM, xAPI, LTI, external analytics and LMS import require separate implementation |

## PRD P0 traceability

| ID | Evidence |
| --- | --- |
| FR-001 | Browser registration/sign-in; API authentication tests. Verification/recovery delivery is provider-dependent. |
| FR-002 | API role and cross-tenant denial tests; role-aware route/navigation checks. |
| FR-003 | Catalogue filtering, restricted enrolment tests, learner browser discovery flow. |
| FR-004 | Author/review/preflight/publish browser flow; snapshot and draft-leakage API tests. |
| FR-005 | Reading and authorised uploads. Full video/audio delivery is partial. |
| FR-006 | Deduplicated monotonic progress, personal notes/bookmarks, offline sync browser flow. |
| FR-007 | Server-owned scores/timing/attempt limits, response autosave, browser quiz flow. Advanced question/policy variants are partial. |
| FR-010 | Status/role/session controls; password step-up; audit tests. MFA is missing. |
| FR-013 | Append-only API audit, export auditing and no mutation route. External tamper resistance is missing. |

This is a broad functional **prototype**, not completion of every production acceptance criterion in the source documents. Use `PRODUCTION_BACKLOG.md` to plan the remaining engineering work.
