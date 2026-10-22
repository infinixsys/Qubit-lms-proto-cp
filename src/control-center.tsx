import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  api,
  post,
  patch,
  useData,
  useToast,
  Icon,
  Avatar,
  Badge,
  Form,
  Modal,
  Loading,
  ErrorState,
  Empty,
} from "./ui";
import type { Row } from "./ui";
import { date } from "./coaching-ui";
export function CenterHeading({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="coach-heading">
      <div>
        <span className="eyebrow">REFIX / INSTITUTE CONTROL CENTRE</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {children}
    </div>
  );
}
function State({
  data,
  children,
}: {
  data: ReturnType<typeof useData>;
  children: React.ReactNode;
}) {
  return data.error ? (
    <ErrorState error={data.error} retry={data.reload} />
  ) : !data.data ? (
    <Loading />
  ) : (
    <>{children}</>
  );
}
export function CenterTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="table-scroll">
      <table className="coach-table">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function saveFile(
  name: string,
  data: unknown,
  type = "application/json",
) {
  const url = URL.createObjectURL(
      new Blob(
        [typeof data === "string" ? data : JSON.stringify(data, null, 2)],
        { type },
      ),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const fromIst = (v: string) =>
  v ? new Date(v + ":00+05:30").toISOString() : null;
const toIst = (v: string | null) =>
  v
    ? new Date(v)
        .toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" })
        .slice(0, 16)
        .replace(" ", "T")
    : "";
export function CommandSearch({ can }: { can: (area: string) => boolean }) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [term, setTerm] = useState("");
  const navigate = useNavigate();
  const results = useData(
    open && term.trim().length >= 2
      ? "/owner/search?q=" + encodeURIComponent(term)
      : "",
  );
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((x) => !x);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setTerm(query), 250);
    return () => clearTimeout(t);
  }, [query]);
  const actions = [
    ["Learner directory", "/directory", "users", "UsersRound"],
    ["Assessment rules", "/assessments", "assessments", "ClipboardList"],
    ["Publishing queue", "/publishing", "courses", "BookOpenCheck"],
    ["Learning insights", "/reports", "analytics", "ChartNoAxesCombined"],
    ["Announcements", "/communications", "notifications", "Megaphone"],
    ["Privacy requests", "/governance", "privacy", "ShieldCheck"],
    ["Security & sessions", "/security", "any", "LockKeyhole"],
    ["Platform operations", "/operations", "settings", "Settings2"],
  ];
  const go = (path: string) => {
    setOpen(false);
    setQuery("");
    navigate(path);
  };
  return (
    <>
      <button
        className="command-trigger"
        onClick={() => setOpen(true)}
        aria-label="Search institute workspace"
      >
        <Icon name="Search" size={16} />
        <span>Search workspace</span>
        <kbd>Ctrl K</kbd>
      </button>
      {open && (
        <Modal
          title="Find a page, course or learner"
          onClose={() => setOpen(false)}
        >
          <label className="search-field command-input">
            <Icon name="Search" size={18} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search courses, learners, support…"
              aria-label="Command search"
            />
          </label>
          <div className="command-results">
            {actions
              .filter(
                (a) =>
                  can(a[2]) && a[0].toLowerCase().includes(query.toLowerCase()),
              )
              .map(([label, path, , icon]) => (
                <button key={path} onClick={() => go(path)}>
                  <span className="soft-icon">
                    <Icon name={icon} size={18} />
                  </span>
                  <span>
                    <strong>{label}</strong>
                    <small>Workspace page</small>
                  </span>
                  <Icon name="ArrowUpRight" size={16} />
                </button>
              ))}
            {results.error && <p className="form-error">{results.error}</p>}
            {results.data?.map((r: Row, i: number) => (
              <button key={i} onClick={() => go(r.path)}>
                <span className="soft-icon">
                  <Icon
                    name={r.type === "Learner" ? "UsersRound" : "BookOpen"}
                    size={18}
                  />
                </span>
                <span>
                  <strong>{r.title}</strong>
                  <small>
                    {r.type} · {r.detail}
                  </small>
                </span>
                <Icon name="ArrowRight" size={16} />
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
export function JoinInvitation() {
  const navigate = useNavigate(),
    currentLocation = useLocation();
  const token =
      new URLSearchParams(currentLocation.hash.slice(1)).get("token") || "",
    [info, setInfo] = useState<Row | null>(null),
    [error, setError] = useState(""),
    [done, setDone] = useState("");
  useEffect(() => {
    if (!token) return;
    setInfo(null);
    setError("");
    setDone("");
    post("/auth/invitations/inspect", { token })
      .then(setInfo)
      .catch((e) => setError(e.message));
  }, [token]);
  return (
    <div className="join-invitation">
      <span className="eyebrow">REFIX INDIA INSTITUTE</span>
      <h1>Your training journey starts here</h1>
      {done ? (
        <div className="note-box">{done}</div>
      ) : error ? (
        <ErrorState error={error} />
      ) : !info ? (
        <Loading />
      ) : (
        <>
          <p>
            Welcome, {info.name}. Set a password for {info.email}.
          </p>
          <Form
            fields={[
              {
                name: "password",
                label: "Choose a password (12+ characters)",
                type: "password",
                required: true,
              },
            ]}
            label="Accept invitation"
            onSubmit={async (v) => {
              const r = await post("/auth/invitations/accept", {
                token,
                password: v.password,
              });
              navigate("/join", { replace: true });
              setDone(r.message);
            }}
          />
        </>
      )}
    </div>
  );
}
export function Directory() {
  const [params, setParams] = useSearchParams(),
    q = params.get("q") || "",
    status = params.get("status") || "All",
    page = Number(params.get("page") || 1),
    d = useData(
      `/owner/directory?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&page=${page}&pageSize=20`,
    ),
    history = useData("/owner/imports"),
    toast = useToast();
  const [importing, setImporting] = useState(false),
    [csv, setCsv] = useState("name,email,phone\n"),
    [preview, setPreview] = useState<Row | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [invites, setInvites] = useState<Row[] | null>(null),
    [invite, setInvite] = useState<Row | null>(null);
  const change = (values: Row) =>
    setParams({ ...Object.fromEntries(params), ...values });
  return (
    <>
      <CenterHeading
        title="People & invitations"
        text="Find learners, validate an import and bring the next batch into your institute."
      >
        <button
          className="btn primary"
          onClick={() => {
            setImporting(true);
            setPreview(null);
            setError("");
          }}
        >
          <Icon name="FileUp" size={17} />
          Import learners
        </button>
      </CenterHeading>
      <div className="control-mini-grid">
        <article>
          <span className="soft-icon">
            <Icon name="UsersRound" />
          </span>
          <div>
            <strong>{d.data?.total ?? "—"}</strong>
            <p>Learners matching your filters</p>
          </div>
        </article>
        <article>
          <span className="soft-icon">
            <Icon name="ShieldCheck" />
          </span>
          <div>
            <strong>Preview before import</strong>
            <p>New accounts await institute activation.</p>
          </div>
        </article>
      </div>
      <section className="coach-panel">
        <div className="toolbar">
          <label className="search-field">
            <Icon name="Search" size={17} />
            <input
              aria-label="Search directory"
              placeholder="Name, email or phone"
              value={q}
              onChange={(e) => change({ q: e.target.value, page: "1" })}
            />
          </label>
          <select
            aria-label="Directory account status"
            value={status}
            onChange={(e) => change({ status: e.target.value, page: "1" })}
          >
            {["All", "Active", "Pending activation", "Inactive", "Blocked"].map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </select>
        </div>
        <State data={d}>
          <CenterTable headers={["Learner", "Phone", "Account", "Actions"]}>
            {d.data?.rows.map((u: Row) => (
              <tr key={u.id}>
                <td>
                  <div className="person-cell">
                    <Avatar name={u.name} />
                    <span>
                      <strong>{u.name}</strong>
                      <small>{u.email}</small>
                    </span>
                  </div>
                </td>
                <td>{u.phone || "—"}</td>
                <td>
                  <Badge>{u.status}</Badge>
                </td>
                <td>
                  <div className="inline-actions">
                    <Link
                      className="btn small"
                      to={"/learners?q=" + encodeURIComponent(u.email)}
                    >
                      Manage
                    </Link>
                    {u.status === "Pending activation" && (
                      <button
                        className="btn small"
                        onClick={() => setInvite(u)}
                      >
                        Create invitation
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </CenterTable>
          {!d.data?.rows.length && (
            <Empty
              title="No matching learners"
              text="Change the search or import a new batch."
            />
          )}
          <div className="control-pagination">
            <span>
              {d.data?.total} results · page {page}
            </span>
            <button
              className="btn small"
              disabled={page === 1}
              onClick={() => change({ page: String(page - 1) })}
            >
              Previous
            </button>
            <button
              className="btn small"
              disabled={page * 20 >= (d.data?.total || 0)}
              onClick={() => change({ page: String(page + 1) })}
            >
              Next
            </button>
          </div>
        </State>
      </section>
      <details className="academy-control-section">
        <summary>Recent import history</summary>
        <State data={history}>
          {history.data?.map((r: Row) => (
            <div className="list-row" key={r.id}>
              <div>
                <strong>
                  {r.total} rows · {r.invalid} errors
                </strong>
                <small>{date(r.created)}</small>
              </div>
              <Badge>{r.status}</Badge>
            </div>
          ))}
        </State>
      </details>
      {importing && (
        <Modal
          title="Import learners from CSV"
          subtitle="Use name,email,phone. Maximum 200 rows. Accounts start pending activation; invitation links are shared manually."
          onClose={() => setImporting(false)}
          wide
        >
          <div className="import-drop">
            <Icon name="FileUp" size={26} />
            <label>
              Choose CSV file
              <input
                aria-label="Learner CSV file"
                type="file"
                accept=".csv,text/csv"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    if (f.size > 250000) {
                      setError("CSV files must be under 250 KB.");
                      return;
                    }
                    setCsv(await f.text());
                    setPreview(null);
                  }
                }}
              />
            </label>
            <button
              className="text-link"
              onClick={() =>
                saveFile(
                  "refix-learner-template.csv",
                  "name,email,phone\nAnanya Example,ananya@example.test,9876543210\n",
                  "text/csv",
                )
              }
            >
              Download template
            </button>
          </div>
          <label className="control-label">
            CSV content
            <textarea
              aria-label="CSV content"
              value={csv}
              onChange={(e) => {
                setCsv(e.target.value);
                setPreview(null);
              }}
              rows={5}
            />
          </label>
          <button
            className="btn"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                setPreview(await post("/owner/imports/preview", { csv }));
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Validate file
          </button>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {preview && (
            <>
              <div className="import-summary">
                <Badge>{preview.valid} valid</Badge>
                <Badge>{preview.invalid} invalid</Badge>
              </div>
              <CenterTable headers={["Line", "Name / email", "Validation"]}>
                {preview.rows.map((r: Row) => (
                  <tr key={r.line}>
                    <td>{r.line}</td>
                    <td>
                      <strong>{r.name}</strong>
                      <small>{r.email}</small>
                    </td>
                    <td>{r.errors.length ? r.errors.join(" · ") : "Ready"}</td>
                  </tr>
                ))}
              </CenterTable>
              {preview.invalid > 0 ? (
                <button
                  className="btn"
                  onClick={() =>
                    saveFile(
                      "refix-import-errors.json",
                      preview.rows.filter((r: Row) => r.errors.length),
                    )
                  }
                >
                  Download validation errors
                </button>
              ) : (
                <Form
                  fields={[
                    { name: "reason", label: "Import reason", required: true },
                    {
                      name: "password",
                      label: "Confirm owner password",
                      type: "password",
                      required: true,
                    },
                  ]}
                  label="Import validated learners"
                  onSubmit={async (v) => {
                    const r = await post(
                      "/owner/imports/" + preview.id + "/commit",
                      v,
                    );
                    setImporting(false);
                    setInvites(r.invitations);
                    d.reload();
                    history.reload();
                    toast(
                      r.alreadyCommitted
                        ? "This import was already completed."
                        : r.created + " learner accounts created.",
                    );
                  }}
                />
              )}
            </>
          )}
        </Modal>
      )}
      {invite && (
        <Modal
          title={"Invite " + invite.name}
          subtitle="This replaces any unused invitation for this pending account. No email is sent automatically."
          onClose={() => setInvite(null)}
        >
          <Form
            fields={[
              { name: "reason", label: "Invitation reason", required: true },
              {
                name: "password",
                label: "Confirm owner password",
                type: "password",
                required: true,
              },
            ]}
            label="Create invitation link"
            onSubmit={async (v) => {
              const r = await post(
                "/owner/learners/" + invite.id + "/invite",
                v,
              );
              setInvite(null);
              setInvites([r]);
            }}
          />
        </Modal>
      )}
      {invites && (
        <Modal
          title="Your learner invitation links"
          subtitle="Save these links now. Each link is valid for seven days and can be accepted once. No messages have been sent."
          onClose={() => setInvites(null)}
          wide
        >
          <div className="invitation-links">
            {invites.map((i: Row) => (
              <div key={i.userId}>
                <strong>
                  {i.name} · {i.email}
                </strong>
                <input
                  readOnly
                  aria-label={"Invitation link for " + i.name}
                  value={location.origin + i.link}
                />
              </div>
            ))}
          </div>
          <button
            className="btn primary"
            onClick={() =>
              saveFile(
                "refix-invitations.json",
                invites.map((i) => ({ ...i, link: location.origin + i.link })),
              )
            }
          >
            Save invitation links
          </button>
        </Modal>
      )}
    </>
  );
}
export function Assessments() {
  const d = useData("/owner/assessments"),
    toast = useToast();
  const [edit, setEdit] = useState<Row | null>(null),
    [q, setQ] = useState("");
  return (
    <>
      <CenterHeading
        title="Assessments & completion"
        text="Set clear rules for practice and certification. Published course versions keep their rules."
      >
        <Link className="btn" to="/tools/questions">
          <Icon name="CircleHelp" size={17} />
          Question bank
        </Link>
      </CenterHeading>
      <label className="search-field control-search">
        <Icon name="Search" size={17} />
        <input
          aria-label="Search assessment courses"
          placeholder="Search a repair course"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      <State data={d}>
        <div className="control-course-grid">
          {d.data
            ?.filter((c: Row) =>
              c.title.toLowerCase().includes(q.toLowerCase()),
            )
            .map((c: Row) => (
              <article className="coach-panel control-course" key={c.id}>
                <div className="card-top">
                  <span className="eyebrow">{c.category}</span>
                  <Badge>{c.status}</Badge>
                </div>
                <h2>{c.title}</h2>
                <div className="assessment-facts">
                  <div>
                    <strong>{c.assessmentPolicy.passMark}%</strong>
                    <small>Pass mark</small>
                  </div>
                  <div>
                    <strong>{c.assessmentPolicy.durationMinutes} min</strong>
                    <small>Time limit</small>
                  </div>
                  <div>
                    <strong>{c.assessmentPolicy.maxAttempts}</strong>
                    <small>Attempts</small>
                  </div>
                </div>
                <p>
                  {c.questions} bank questions · {c.attempts} recorded attempts
                </p>
                <p className="muted">
                  Answers: {c.assessmentPolicy.reveal.toLowerCase()}
                  {c.assessmentPolicy.requirePractical
                    ? " · Practical review required"
                    : ""}
                </p>
                <div className="inline-actions">
                  <Link className="btn small" to={"/courses/" + c.id}>
                    Open course
                  </Link>
                  {c.status === "Published" ? (
                    <button
                      className="btn small"
                      onClick={async () => {
                        try {
                          await post("/admin/courses/" + c.id + "/new-version");
                          d.reload();
                          toast(
                            "Draft created. Published learners keep their existing rules.",
                          );
                        } catch (e) {
                          toast((e as Error).message, "error");
                        }
                      }}
                    >
                      Create policy draft
                    </button>
                  ) : (
                    c.status !== "Archived" && (
                      <button
                        className="btn primary small"
                        onClick={() => setEdit(c)}
                      >
                        Edit assessment rules
                      </button>
                    )
                  )}
                </div>
              </article>
            ))}
        </div>
      </State>
      {edit && (
        <Modal
          title="Assessment rules"
          subtitle={edit.title + " · Draft version " + (edit.version + 1)}
          onClose={() => setEdit(null)}
          wide
        >
          <p className="subtle-note">
            Times are entered in IST. A published version preserves its policy;
            active attempts preserve the rules they started with.
          </p>
          <Form
            fields={[
              {
                name: "durationMinutes",
                label: "Duration (minutes)",
                type: "number",
                required: true,
              },
              {
                name: "maxAttempts",
                label: "Maximum attempts",
                type: "number",
                required: true,
              },
              {
                name: "passMark",
                label: "Passing score (%)",
                type: "number",
                required: true,
              },
              {
                name: "questionCount",
                label: "Questions per attempt",
                type: "number",
                required: true,
              },
              {
                name: "retryDelayMinutes",
                label: "Retry waiting period (minutes)",
                type: "number",
                required: true,
              },
              {
                name: "reveal",
                label: "Show answers and explanations",
                type: "select",
                options: ["After submission", "After passing", "Never"],
                required: true,
              },
              {
                name: "opensAt",
                label: "Opens at (IST)",
                type: "datetime-local",
              },
              {
                name: "closesAt",
                label: "Closes at (IST)",
                type: "datetime-local",
              },
              {
                name: "requirePractical",
                label: "Require a competent practical review for certification",
                type: "checkbox",
              },
              {
                name: "reason",
                label: "Reason for changing the rules",
                type: "textarea",
                required: true,
              },
            ]}
            initial={{
              ...edit.assessmentPolicy,
              opensAt: toIst(edit.assessmentPolicy.opensAt),
              closesAt: toIst(edit.assessmentPolicy.closesAt),
            }}
            label="Save draft assessment policy"
            onSubmit={async (v) => {
              const { reason, ...policy } = v;
              await patch("/owner/courses/" + edit.id + "/assessment-policy", {
                policy: {
                  ...policy,
                  opensAt: fromIst(v.opensAt),
                  closesAt: fromIst(v.closesAt),
                  requirePractical: !!v.requirePractical,
                },
                revision: edit.revision || 1,
                reason,
              });
              setEdit(null);
              d.reload();
              toast(
                "Draft assessment rules saved. Review and publish the course to apply them.",
              );
            }}
          />
        </Modal>
      )}
    </>
  );
}
export function Publishing() {
  const d = useData("/owner/publishing"),
    toast = useToast();
  const [filter, setFilter] = useState("Needs review"),
    [review, setReview] = useState<Row | null>(null),
    [history, setHistory] = useState<Row | null>(null);
  return (
    <>
      <CenterHeading
        title="Publishing & review"
        text="Keep feedback tied to a draft revision. Publish only after the readiness checks pass."
      />
      <div className="filter-tabs page-tabs">
        {["Needs review", "Draft", "Approved", "Published", "All"].map((f) => (
          <button
            key={f}
            className={filter === f ? "selected" : ""}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      <State data={d}>
        <section className="coach-panel">
          <CenterTable
            headers={["Course", "State", "Version", "Review", "Actions"]}
          >
            {d.data
              ?.filter(
                (c: Row) =>
                  filter === "All" ||
                  (filter === "Needs review"
                    ? ["Draft", "In Review"].includes(c.status)
                    : c.status === filter),
              )
              .map((c: Row) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.title}</strong>
                    <small>{c.instructor}</small>
                  </td>
                  <td>
                    <Badge>{c.status}</Badge>
                  </td>
                  <td>{c.version ? "v" + c.version : "Unpublished"}</td>
                  <td>
                    {c.reviews[0]?.decision || "No review yet"}
                    <small>{c.reviews[0]?.actor}</small>
                  </td>
                  <td>
                    <div className="inline-actions">
                      <Link className="btn small" to={"/courses/" + c.id}>
                        Open editor
                      </Link>
                      {!["Published", "Archived"].includes(c.status) && (
                        <button
                          className="btn small"
                          onClick={() => setReview(c)}
                        >
                          Review draft
                        </button>
                      )}
                      <button
                        className="icon-btn"
                        aria-label={"Version history for " + c.title}
                        onClick={() => setHistory(c)}
                      >
                        <Icon name="GitBranch" size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </CenterTable>
        </section>
      </State>
      {review && (
        <Modal
          title="Review course draft"
          subtitle={review.title + " · revision " + (review.revision || 1)}
          onClose={() => setReview(null)}
        >
          <Form
            fields={[
              {
                name: "decision",
                label: "Review decision",
                type: "select",
                options: ["Submit for review", "Request changes", "Approve"],
                required: true,
              },
              {
                name: "comment",
                label: "Review comments & exact lesson reference",
                type: "textarea",
                required: true,
              },
            ]}
            initial={{ decision: "Submit for review" }}
            label="Record review"
            onSubmit={async (v) => {
              await post("/owner/courses/" + review.id + "/review", {
                ...v,
                revision: review.revision || 1,
              });
              setReview(null);
              d.reload();
              toast("Review recorded against this draft revision.");
            }}
          />
        </Modal>
      )}
      {history && (
        <Modal
          title="Publication history"
          subtitle={history.title}
          onClose={() => setHistory(null)}
        >
          <h3>Published versions</h3>
          {history.versions.length ? (
            history.versions.map((v: Row) => (
              <div className="list-row" key={v.version}>
                <Icon name="GitBranch" size={18} />
                <div>
                  <strong>
                    Version {v.version} · {v.lessons} lessons
                  </strong>
                  <small>{date(v.published)}</small>
                </div>
                <Badge>Preserved</Badge>
              </div>
            ))
          ) : (
            <p className="muted">No published version yet.</p>
          )}
          <h3>Draft review timeline</h3>
          {history.reviews.map((r: Row) => (
            <div className="review-feedback" key={r.id}>
              <strong>
                {r.decision} · {r.actor}
              </strong>
              <p>{r.comment}</p>
              <small>
                Draft v{r.courseVersion}, revision {r.revision} ·{" "}
                {date(r.created)}
              </small>
            </div>
          ))}
        </Modal>
      )}
    </>
  );
}
export function Communications() {
  const d = useData("/owner/campaigns"),
    options = useData("/owner/control-options"),
    toast = useToast();
  const [create, setCreate] = useState(false),
    [audience, setAudience] = useState("All learners"),
    [target, setTarget] = useState(""),
    [cancel, setCancel] = useState<Row | null>(null),
    [detail, setDetail] = useState<Row | null>(null);
  const deliveries = useData(
    detail ? "/owner/campaigns/" + detail.id + "/deliveries" : "",
  );
  return (
    <>
      <CenterHeading
        title="Institute announcements"
        text="Publish useful updates to the right learners, now or at a scheduled time."
      >
        <button
          className="btn primary"
          onClick={() => {
            setCreate(true);
            setAudience("All learners");
            setTarget("");
          }}
        >
          <Icon name="Plus" size={17} />
          Create announcement
        </button>
      </CenterHeading>
      <div className="academy-intro">
        <Icon name="Megaphone" />
        <div>
          <strong>Delivered inside the learner app.</strong>
          <p>
            Course and batch audiences are resolved when published. Scheduled
            announcements are processed while the institute server runs.
          </p>
        </div>
      </div>
      <State data={d}>
        <section className="coach-panel">
          <CenterTable
            headers={[
              "Announcement",
              "Audience",
              "When (IST)",
              "Status",
              "Actions",
            ]}
          >
            {d.data?.map((c: Row) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.title}</strong>
                  <small>{c.message.slice(0, 90)}</small>
                </td>
                <td>
                  {c.audience}
                  <small>{c.recipients || 0} recipients</small>
                </td>
                <td>
                  {date(c.scheduledAt || c.delivered || c.created, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td>
                  <Badge>{c.status}</Badge>
                </td>
                <td>
                  {c.status === "Scheduled" ? (
                    <button className="btn small" onClick={() => setCancel(c)}>
                      Cancel schedule
                    </button>
                  ) : (
                    <button className="btn small" onClick={() => setDetail(c)}>
                      Delivery details
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </CenterTable>
          {d.data?.length === 0 && (
            <Empty
              title="Keep your learners in the loop"
              text="Create your first scoped in-app announcement."
            />
          )}
        </section>
      </State>
      {create && (
        <Modal
          title="Create institute announcement"
          subtitle="Only in-app publishing is connected. No email, SMS or push message is sent."
          onClose={() => setCreate(false)}
        >
          <label className="control-label">
            Audience
            <select
              aria-label="Audience"
              value={audience}
              onChange={(e) => {
                setAudience(e.target.value);
                setTarget("");
              }}
            >
              {["All learners", "Course", "Batch"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          {audience !== "All learners" && (
            <label className="control-label">
              {audience === "Course" ? "Course audience" : "Training batch"}
              <select
                aria-label={
                  audience === "Course" ? "Course audience" : "Training batch"
                }
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="">Choose {audience.toLowerCase()}</option>
                {(audience === "Course"
                  ? options.data?.courses
                  : options.data?.batches
                )?.map((r: Row) => (
                  <option key={r.id} value={r.id}>
                    {r.title || r.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <Form
            fields={[
              { name: "title", label: "Announcement title", required: true },
              {
                name: "message",
                label: "Message",
                type: "textarea",
                required: true,
              },
              {
                name: "scheduledAt",
                label: "Schedule for later (IST, optional)",
                type: "datetime-local",
              },
              {
                name: "confirm",
                label: "I reviewed the message and selected audience",
                type: "checkbox",
                required: true,
              },
            ]}
            label="Publish or schedule announcement"
            onSubmit={async (v) => {
              await post("/owner/campaigns", {
                ...v,
                audience,
                targetId: target,
                scheduledAt: fromIst(v.scheduledAt),
              });
              setCreate(false);
              d.reload();
              toast("Announcement saved for the selected audience.");
            }}
          />
        </Modal>
      )}
      {cancel && (
        <Modal
          title="Cancel scheduled announcement"
          subtitle={cancel.title}
          onClose={() => setCancel(null)}
        >
          <Form
            fields={[
              { name: "reason", label: "Cancellation reason", required: true },
            ]}
            onSubmit={async (v) => {
              await post("/owner/campaigns/" + cancel.id + "/cancel", v);
              setCancel(null);
              d.reload();
              toast("Schedule cancelled.");
            }}
          />
        </Modal>
      )}
      {detail && (
        <Modal
          title="Announcement delivery"
          subtitle={detail.title}
          onClose={() => setDetail(null)}
        >
          <State data={deliveries}>
            <div className="assessment-facts">
              <div>
                <strong>{deliveries.data?.length || 0}</strong>
                <small>Available in app</small>
              </div>
              <div>
                <strong>
                  {deliveries.data?.filter((r: Row) => r.read).length || 0}
                </strong>
                <small>Marked read</small>
              </div>
            </div>
            <p className="subtle-note">
              Available in app means the announcement is in the recipient's
              inbox. Read state reflects the learner marking it read.
            </p>
          </State>
        </Modal>
      )}
    </>
  );
}
export function Insights() {
  const [params, setParams] = useSearchParams(),
    today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    }),
    defaults = {
      from: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
      to: today,
      courseId: "",
      batchId: "",
    },
    filters = { ...defaults, ...Object.fromEntries(params) },
    [form, setForm] = useState<Row>(filters),
    [save, setSave] = useState(false),
    options = useData("/owner/control-options"),
    views = useData("/owner/saved-views"),
    query = new URLSearchParams(filters).toString(),
    d = useData("/owner/insights?" + query),
    toast = useToast();
  return (
    <>
      <CenterHeading
        title="Learning insights"
        text="Compare course progress and assessment outcomes with clear definitions and IST date filters."
      >
        <Link className="btn" to="/revenue">
          <Icon name="CreditCard" size={17} />
          Revenue reports
        </Link>
      </CenterHeading>
      <div className="insight-filters coach-panel">
        <label>
          From (IST)
          <input
            type="date"
            value={form.from}
            onChange={(e) => setForm({ ...form, from: e.target.value })}
          />
        </label>
        <label>
          To (IST)
          <input
            type="date"
            value={form.to}
            onChange={(e) => setForm({ ...form, to: e.target.value })}
          />
        </label>
        <label>
          Course
          <select
            aria-label="Course"
            value={form.courseId}
            onChange={(e) => setForm({ ...form, courseId: e.target.value })}
          >
            <option value="">All courses</option>
            {options.data?.courses.map((c: Row) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Batch
          <select
            aria-label="Batch"
            value={form.batchId}
            onChange={(e) => setForm({ ...form, batchId: e.target.value })}
          >
            <option value="">All batches</option>
            {options.data?.batches.map((c: Row) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button className="btn primary" onClick={() => setParams(form)}>
          Apply filters
        </button>
      </div>
      <div className="report-tools">
        <div className="inline-actions">
          <button className="btn small" onClick={() => setSave(true)}>
            Save this view
          </button>
          <button
            className="btn small"
            onClick={async () => {
              try {
                const r = await fetch(
                  "/api/v1/owner/insights/export?" + query,
                  {
                    credentials: "include",
                    headers: { "X-Qubit-Surface": "admin" },
                  },
                );
                if (!r.ok) throw new Error("Unable to export this report.");
                saveFile(
                  "refix-learning-report.csv",
                  await r.text(),
                  "text/csv",
                );
                toast("Report export recorded in the audit trail.");
              } catch (e) {
                toast((e as Error).message, "error");
              }
            }}
          >
            Export filtered CSV
          </button>
        </div>
        <select
          aria-label="Saved learning reports"
          value=""
          onChange={(e) => {
            const v = views.data?.find((v: Row) => v.id === e.target.value);
            if (v) {
              setParams(v.filters);
              setForm(v.filters);
            }
          }}
        >
          <option value="">Open a saved view</option>
          {views.data?.map((v: Row) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>
      {views.data?.length > 0 && (
        <details className="academy-control-section">
          <summary>Manage saved views</summary>
          {views.data.map((view: Row) => (
            <div className="list-row" key={view.id}>
              <div>
                <strong>{view.name}</strong>
                <small>Saved {date(view.created)}</small>
              </div>
              <button
                className="btn small"
                aria-label={"Remove saved view " + view.name}
                onClick={async () => {
                  try {
                    await api("/owner/saved-views/" + view.id, {
                      method: "DELETE",
                    });
                    views.reload();
                    toast("Saved view removed.");
                  } catch (e) {
                    toast((e as Error).message, "error");
                  }
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </details>
      )}
      <State data={d}>
        <div className="control-mini-grid">
          <article>
            <span className="soft-icon">
              <Icon name="BookOpen" />
            </span>
            <div>
              <strong>{d.data?.courses.length}</strong>
              <p>Courses in this view</p>
            </div>
          </article>
          <article>
            <span className="soft-icon">
              <Icon name="ClipboardList" />
            </span>
            <div>
              <strong>{d.data?.submitted}</strong>
              <p>Submitted attempts in the date range</p>
            </div>
          </article>
          <article>
            <span className="soft-icon">
              <Icon name="ChartNoAxesCombined" />
            </span>
            <div>
              <strong>
                {d.data?.averageScore === null
                  ? "—"
                  : d.data?.averageScore + "%"}
              </strong>
              <p>Mean submitted score</p>
            </div>
          </article>
        </div>
        <section className="coach-panel">
          <CenterTable
            headers={[
              "Repair course",
              "Enrolled",
              "Lessons complete",
              "Completion",
              "Attempts",
              "Mean score",
            ]}
          >
            {d.data?.courses.map((c: Row) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.title}</strong>
                  <small>{c.category}</small>
                </td>
                <td>{c.enrolled}</td>
                <td>{c.completed}</td>
                <td>
                  <div className="inline-actions">
                    <div className="progress-track">
                      <span style={{ width: c.completion + "%" }} />
                    </div>
                    <span>{c.completion}%</span>
                  </div>
                </td>
                <td>{c.attempts}</td>
                <td>{c.averageScore === null ? "—" : c.averageScore + "%"}</td>
              </tr>
            ))}
          </CenterTable>
        </section>
        <details className="academy-control-section">
          <summary>How these metrics are calculated</summary>
          {Object.entries(d.data?.definitions || {}).map(([key, value]) => (
            <p key={key}>
              <strong>{key}: </strong>
              {String(value)}
            </p>
          ))}
        </details>
      </State>
      {save && (
        <Modal
          title="Save report view"
          subtitle="Saves these filters for your account. Reports are generated when opened; no scheduled email delivery is connected."
          onClose={() => setSave(false)}
        >
          <Form
            fields={[
              { name: "name", label: "Report view name", required: true },
            ]}
            label="Save report view"
            onSubmit={async (v) => {
              await post("/owner/saved-views", { ...v, filters });
              setSave(false);
              views.reload();
              toast("Report filters saved.");
            }}
          />
        </Modal>
      )}
    </>
  );
}
export function Governance() {
  const d = useData("/owner/governance"),
    toast = useToast();
  const [review, setReview] = useState<Row | null>(null),
    [deactivate, setDeactivate] = useState<Row | null>(null),
    [policy, setPolicy] = useState(false);
  return (
    <>
      <CenterHeading
        title="Privacy & retention"
        text="Verify each request, record the retention basis and keep sensitive actions auditable."
      >
        <button className="btn" onClick={() => setPolicy(true)}>
          Retention policy
        </button>
      </CenterHeading>
      <div className="academy-intro">
        <Icon name="ShieldCheck" />
        <div>
          <strong>Clear decisions. Preserved evidence.</strong>
          <p>
            Access deactivation is available after identity review. Retention
            settings document policy; they do not automatically erase records or
            backups.
          </p>
        </div>
      </div>
      <State data={d}>
        <section className="coach-panel">
          <CenterTable
            headers={["Learner", "Request", "Received", "Status", "Actions"]}
          >
            {d.data?.requests.map((r: Row) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.name}</strong>
                  {r.legalHold && <Badge>Legal hold</Badge>}
                </td>
                <td>{r.type}</td>
                <td>{date(r.created)}</td>
                <td>
                  <Badge>{r.status}</Badge>
                </td>
                <td>
                  <div className="inline-actions">
                    <button className="btn small" onClick={() => setReview(r)}>
                      Review request
                    </button>
                    {r.identityVerified && r.type === "Data export" && (
                      <button
                        className="btn small"
                        onClick={async () => {
                          try {
                            const data = await post(
                              "/owner/governance/" + r.id + "/export",
                              {
                                reason:
                                  "Verified identity and prepared the requested personal data export",
                              },
                            );
                            saveFile("refix-privacy-export.json", data);
                            toast("Verified data export prepared.");
                          } catch (e) {
                            toast((e as Error).message, "error");
                          }
                        }}
                      >
                        Prepare export
                      </button>
                    )}
                    {r.identityVerified && r.type === "Account deletion" && (
                      <button
                        className="btn small"
                        onClick={() => setDeactivate(r)}
                      >
                        Deactivate access
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </CenterTable>
          {d.data?.requests.length === 0 && (
            <Empty
              title="No privacy requests"
              text="Learner export and deletion requests appear here for verified review."
            />
          )}
        </section>
      </State>
      {review && (
        <Modal
          title="Review privacy request"
          subtitle={review.name + " · " + review.type}
          onClose={() => setReview(null)}
        >
          <Form
            fields={[
              {
                name: "status",
                label: "Request decision",
                type: "select",
                options: [
                  "Under review",
                  "Awaiting retention review",
                  "Rejected",
                  ...(review.type === "Data export" ? ["Completed"] : []),
                ],
                required: true,
              },
              {
                name: "identityVerified",
                label: "I verified the requester's identity",
                type: "checkbox",
                required: true,
              },
              {
                name: "legalHold",
                label: "Legal hold or retention restriction applies",
                type: "checkbox",
              },
              {
                name: "reason",
                label: "Review notes & retention basis",
                type: "textarea",
                required: true,
              },
            ]}
            initial={{
              status:
                review.status === "Pending verification"
                  ? "Under review"
                  : review.status,
              identityVerified: !!review.identityVerified,
              legalHold: !!review.legalHold,
              reason: review.reason,
            }}
            label="Record privacy review"
            onSubmit={async (v) => {
              await post("/owner/governance/" + review.id + "/review", {
                ...v,
                legalHold: !!v.legalHold,
              });
              setReview(null);
              d.reload();
              toast("Privacy decision recorded.");
            }}
          />
        </Modal>
      )}
      {deactivate && (
        <Modal
          title="Deactivate learner access"
          subtitle="This revokes sign-in sessions and learning access. Records are retained for further review; no erasure is claimed."
          onClose={() => setDeactivate(null)}
        >
          <Form
            fields={[
              {
                name: "password",
                label: "Confirm owner password",
                type: "password",
                required: true,
              },
              {
                name: "reason",
                label: "Deactivation & retention reason",
                type: "textarea",
                required: true,
              },
            ]}
            label="Deactivate access"
            onSubmit={async (v) => {
              await post(
                "/owner/governance/" + deactivate.id + "/deactivate",
                v,
              );
              setDeactivate(null);
              d.reload();
              toast("Account deactivated; records retained for review.");
            }}
          />
        </Modal>
      )}
      {policy && d.data && (
        <Modal
          title="Institute retention policy"
          subtitle="Policy documentation only. Automatic deletion is not enabled."
          onClose={() => setPolicy(false)}
        >
          <Form
            fields={[
              {
                name: "retentionDays",
                label: "Review retention period (days)",
                type: "number",
                required: true,
              },
              {
                name: "notes",
                label: "Retention basis & handling instructions",
                type: "textarea",
                required: true,
              },
              {
                name: "reason",
                label: "Reason for policy change",
                required: true,
              },
            ]}
            initial={d.data.policy}
            onSubmit={async (v) => {
              await patch("/owner/governance/policy", {
                ...v,
                revision: d.data.policy.revision,
              });
              setPolicy(false);
              d.reload();
              toast("Retention policy saved.");
            }}
          />
        </Modal>
      )}
    </>
  );
}
export function Platform() {
  const d = useData("/owner/platform"),
    toast = useToast();
  const [incident, setIncident] = useState(false);
  return (
    <>
      <CenterHeading
        title="Platform operations"
        text="Inspect the local service, enabled capabilities and incidents without mixing estimates with measurements."
      >
        <button className="btn" onClick={d.reload}>
          <Icon name="RefreshCw" size={16} />
          Refresh status
        </button>
      </CenterHeading>
      <State data={d}>
        <div className="control-mini-grid">
          <article>
            <span className="soft-icon">
              <Icon name="Database" />
            </span>
            <div>
              <strong>
                {d.data?.database === "ok"
                  ? "Database healthy"
                  : "Needs review"}
              </strong>
              <p>SQLite quick integrity check</p>
            </div>
          </article>
          <article>
            <span className="soft-icon">
              <Icon name="Images" />
            </span>
            <div>
              <strong>{d.data?.mediaAssets}</strong>
              <p>Private media records</p>
            </div>
          </article>
          <article>
            <span className="soft-icon">
              <Icon name="Clock3" />
            </span>
            <div>
              <strong>{d.data?.scheduledCampaigns}</strong>
              <p>Scheduled in-app announcements</p>
            </div>
          </article>
        </div>
        <div className="control-two-columns">
          <section className="coach-panel control-padded">
            <div className="panel-heading">
              <div>
                <h2>Connected capabilities</h2>
                <p>Current integration state</p>
              </div>
              <Icon name="Plug" />
            </div>
            {d.data?.integrations.map((i: Row) => (
              <div className="integration-status" key={i.name}>
                <div>
                  <strong>{i.name}</strong>
                  <p>{i.detail}</p>
                </div>
                <Badge>{i.status}</Badge>
              </div>
            ))}
          </section>
          <section className="coach-panel control-padded">
            <div className="panel-heading">
              <div>
                <h2>Learning feature switches</h2>
                <p>API checks enforce these settings.</p>
              </div>
              <Icon name="Flag" />
            </div>
            {d.data?.flags.map((f: Row) => (
              <div className="integration-status" key={f.id}>
                <div>
                  <strong>{f.name}</strong>
                  <p>{f.description}</p>
                </div>
                <button
                  className={"feature-switch " + (f.enabled ? "enabled" : "")}
                  role="switch"
                  aria-checked={!!f.enabled}
                  aria-label={f.name}
                  onClick={async () => {
                    try {
                      await patch("/admin/resources/flags/" + f.id, {
                        enabled: !f.enabled,
                      });
                      d.reload();
                      toast("Feature availability updated.");
                    } catch (e) {
                      toast((e as Error).message, "error");
                    }
                  }}
                >
                  <span />
                  {f.enabled ? "On" : "Off"}
                </button>
              </div>
            ))}
            <p className="subtle-note">
              Server uptime: {Math.floor((d.data?.uptime || 0) / 60)} minutes.
              No production uptime or latency monitoring provider is connected.
            </p>
          </section>
        </div>
        <section className="coach-panel control-padded">
          <div className="panel-heading">
            <div>
              <h2>Incident workspace</h2>
              <p>Record investigation and resolution.</p>
            </div>
            <button className="btn" onClick={() => setIncident(true)}>
              Log incident
            </button>
          </div>
          {d.data?.incidents.map((i: Row) => (
            <div className="list-row" key={i.id}>
              <Icon name="Activity" size={18} />
              <div>
                <strong>{i.title}</strong>
                <small>
                  {i.service} · {i.severity} · {i.description}
                </small>
              </div>
              <Badge>{i.status}</Badge>
              <Link className="text-link" to="/tools/incidents">
                Manage
              </Link>
            </div>
          ))}
          <Link className="btn" to="/tools/certificates">
            Certificate registry
          </Link>{" "}
          <Link className="btn" to="/audit">
            Audit events
          </Link>
        </section>
      </State>
      {incident && (
        <Modal title="Log an incident" onClose={() => setIncident(false)}>
          <Form
            fields={[
              { name: "title", label: "Incident title", required: true },
              { name: "service", label: "Affected service", required: true },
              {
                name: "severity",
                label: "Severity",
                type: "select",
                options: ["Low", "Medium", "High", "Critical"],
                required: true,
              },
              {
                name: "description",
                label: "Investigation & affected learners",
                type: "textarea",
                required: true,
              },
            ]}
            initial={{ severity: "Medium" }}
            label="Create incident"
            onSubmit={async (v) => {
              await post("/admin/resources/incidents", {
                ...v,
                status: "Investigating",
              });
              setIncident(false);
              d.reload();
              toast("Incident recorded.");
            }}
          />
        </Modal>
      )}
    </>
  );
}
