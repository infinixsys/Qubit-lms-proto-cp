# Repository workflow

This repository owns the control panel and shared backend (server/). The separate sibling repository is `Qubit-lms-proto-app`.

## User delivery preference

- After completing requested changes, commit and push this repository's changes to its own GitHub origin. Push learner changes only to `infinixsys/Qubit-lms-proto-app` and control-panel/backend changes only to `infinixsys/Qubit-lms-proto-cp`.
- Check remote updates first and preserve existing user changes. Use normal fast-forward pushes; never force-push or overwrite remote work. Do not include unrelated work or another checkout in a commit.
- Run checks appropriate to the change and report the pushed commit and validation. Do not commit dependencies, local databases, uploads, build outputs, credentials or signing keys.
- The shared prototype backend currently lives in the CP repository. If extracting it becomes necessary, explain the reason and ask the user to create the backend repository.
- Keep `LOCAL_SETUP.md` accurate so the user can clone and run both products locally.

Each cloud task already has an isolated environment. Use the existing checkouts; do not create a worktree unless the user requests it.
