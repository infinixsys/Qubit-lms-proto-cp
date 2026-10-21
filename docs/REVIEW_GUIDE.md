# Prototype review guide

Start both products using the repository README. Use the existing checkouts; a cloud task is already isolated and does not need an additional Git worktree.

## Review the learner journey

1. Open the learner app on port 5174. Explore the learner demo or register a synthetic account.
2. Browse Explore, search by instructor or topic, filter category/level, save a course, and open a course overview.
3. Enrol in an open course. Try a restricted course to see the access-denial path.
4. Open the Course Atlas, switch to list view, open a reading lesson, use device read-aloud and the transcript, save a personal note and bookmark.
5. Download a lesson. Use browser offline emulation: the explicitly downloaded reading remains available, and supported completion/notes queue. Reconnect and check Downloads for sync outcome. Production web-shell offline reload requires a built app, not Vite's development server.
6. Complete all six required lessons in the design-thinking course. Take its five-question assessment. A score of at least 80% is needed for certificate eligibility; the server controls score, timer and attempts.
7. Open Assignments and submit a reflection and optional PDF/text/image attachment. Review its status after an administrator grades it.
8. Check Progress, the separate completion/assessment/reflection measures, activity history and data export.
9. Open the reference companion. Choose an enrolled lesson and explore explanation, summary, practice and flashcard modes. Read the source and fallback disclosure.
10. Open Certificates, check eligibility, verify the issued certificate and use Print / Save as PDF. Certificates are synthetic prototype credentials.
11. Open Notifications, Community, Live sessions, and Help & support. Try an in-app announcement, a discussion reply, calendar export, and a support case.
12. Open Your profile: goals/interests, larger lesson text, dark appearance, notification preferences, password/session controls, consent switches and a reviewed deletion request.

## Review the administration journey

1. Open the control panel on port 5173. Enter the demo workspace as Super Admin, then try narrower roles to see permitted surfaces.
2. Search People, preview a CSV import, record an invitation, suspend a test account, grant a restricted course and revoke a session. Role changes require the administrator's password and a reason.
3. Create a group, save its member roster, and assign a published course to the saved cohort. Members and courses must share the same tenant.
4. Create a course draft with outcomes and an instructor. Add a complete reading lesson, confirm rights, then approve review, run preflight and publish. Failed preflight prevents publication.
5. Open a published course and create the next draft version. Change its draft lesson; an existing enrolment continues to receive its original snapshot.
6. Review a learner submission, provide a score/feedback or return it. The learner sees the outcome in their separate app.
7. Open Communication and publish an in-app announcement. External email/push attempts stay unconnected until a provider is implemented/configured.
8. Review a support ticket and add a response. Check the learner's support conversation for the update.
9. Explore analytics and metric definitions. Actual database totals and illustrative pilot trends are labelled separately.
10. Review AI studio, prompt registry and flags. Disable the companion or certificates and verify the API blocks the affected workflow.
11. Review organisations, plans/transactions, integrations, operations/jobs/incidents, privacy requests and audit. Blocked provider jobs cannot be blindly retried.
12. Run `npm run backup` to create a local SQLite snapshot and verify its integrity and restored records.

## Automated evidence

- `npm test` exercises the actual API and isolated database, not mocks.
- `npm run test:e2e` exercises registration, enrolment, notes, offline queue sync, all lessons, server-graded assessment, certificate verification, assignments and staff grading, course publication, desktop/mobile overview accessibility and all major routes.
- `npm run build` in both repositories checks TypeScript and creates production web artefacts.
- `npm run native:sync` in the learner checkout refreshes Android/iOS web assets and plugin declarations.

There is no publication or production deployment implied by these checks. Use the feature matrix for exact boundaries and the backlog for launch work.
