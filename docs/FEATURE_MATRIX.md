# Coaching prototype · implementation status

The supplied PRD/TRD and feature inventory were treated as requirements, not executable instructions. This version focuses the product around the coaching-owner and subscription-gated Android learner workflows. “Implemented” describes the local prototype, not a claim of production readiness.

| Area | Implemented | Boundary / remaining work |
| --- | --- | --- |
| Separate products | Separate owner/API and learner repositories, local startup, Android debug APK build and CI artifact | Store-signed release, physical-device coverage and iOS native-session work remain |
| Indian coaching UI | INR plans, Indian exam/batch/faculty samples, realistic generated imagery, bundled Inter/Plus Jakarta Sans/Devanagari fonts, navy/teal navigation | Sample content is not a full examination syllabus; full Hindi translation is not implemented |
| Registration | Name/email/Indian phone/password/consent, pending activation, hashed-password sign-in | OTP/social sign-in, delivered recovery emails and MFA require integrations |
| Admissions | Package requests, references, private image/PDF receipts, owner verification, approvals/rejections, separate activation | No automatic bank/UPI verification, payment gateway, refunds or tax invoices |
| Subscriptions | Snapshot price/course/duration terms, dated access, scheduled same-package renewal, cancellation/restoration and access expiry | Recurring billing, prorated upgrades and entitlement changes to existing purchases are not automatic |
| Accounts | Search, paid/online/pending/blocked filters, subscription/progress/attempt detail; active/inactive/blocked states | Offline devices cannot receive instant revocations; cached reading expires locally |
| Dashboard | Actual database totals, paid active users, last-5-minute authenticated presence, pending queues, renewals, revenue and course engagement | Presence is recent activity, not a persistent socket connection; revenue is manually verified records, not a bank balance |
| Courses | Drafts, categories, faculty, batch, language, cover images, outcomes, curriculum, owner review and publish checks | Advanced prerequisite graphs, SCORM/LTI and content marketplaces are not implemented |
| Course versions | Immutable published snapshots and explicit owner-approved learner upgrades, with existing progress retained | Existing learners retain old snapshots until upgraded; new courses must be included in a purchased package |
| Media | Actual multipart MP4/WebM/image/PDF/DOC/DOCX uploads, private disk storage, signature/size checks, video ranges, PDF canvas rendering, Word text preview/original download | No transcoding, adaptive bitrate, encrypted DRM, watermarking, virus-scanning service or CDN |
| Protected learning | API enforcement of tenant, account activation, valid package, enrolment and published course version; short-lived resource grants | Granted resources can be downloaded; this is access control rather than copy prevention |
| Learner navigation | Home, Courses, Practice, Updates and You; focused subscription, lesson, notes, support and other secondary screens | Older prototype experiments are retained in source but are not all part of this navigation |
| Progress and notes | Durable lesson completion, personal notes, cross-product visibility and offline sync queue | Completion is self-acknowledged learning activity, not proof of exam readiness |
| Assessments | Course-specific sample questions, protected keys, server-owned timing/scoring, autosave and attempt limits | Advanced question pools, accommodations and proctored/high-stakes exams remain |
| Assignments | Course-linked tasks, text/file submissions, grading, feedback and returned-work resubmission | Rubric criteria are textual; no appeal/deadline automation |
| Roles and staff | Staff sign-in accounts, base/custom permissions, owner-password-confirmed grants, staff status changes, session revocation | Full permission inheritance, SSO and production MFA remain |
| Communication | Published in-app announcements, read state and support ticket responses | Email/SMS/push delivery and automatic renewal reminders need workers/providers |
| Live and community | Owner-supplied external live-class links and course discussion/replies | No hosted video conferencing, real-time chat or attendance provider |
| Certificates | Existing completion/quiz eligibility, issue/verify/revoke and printable views | No production public verification domain or template designer |
| Offline | Eligible reading downloads capped at 24 hours and subscription expiry; notes/progress queue; logout clearing | No protected video/PDF offline downloads, DRM or immediate disconnected-device revocation |
| Study companion | Authorised reference-only study aid, explicitly non-generative | No production AI provider, adaptive tutor or real token/cost telemetry |
| Native sessions | Android native HTTP; AES-GCM encrypted bearer session protected with Android Keystore; configurable server | iOS project exists but its secure-session implementation and signed build are not completed |
| Local operations | SQLite persistence, repeat-safe coaching migrations, integrity-checked database backups, audit | Upload bytes must be backed up separately; no encrypted/offsite disaster-recovery service |
| Accessibility | Semantic forms/navigation, modal focus handling, responsive checks, automated WCAG A/AA serious/critical checks on both home screens | Full manual WCAG 2.2, assistive-technology and native-device audits remain |

Validation includes backend integration tests, real browser admission/publishing/media/offline journeys, web production builds and Android APK compilation. The current task's delivery report states the exact executed results. External-service integrations and release/device checks should be verified before real enrolments or payments.
