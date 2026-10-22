import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  post,
  patch,
  useData,
  useToast,
  Icon,
  Badge,
  Form,
  Modal,
  Loading,
  ErrorState,
  Empty,
} from "./ui";
import type { Row } from "./ui";
import { date } from "./coaching-ui";

function Title({
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
        <span className="eyebrow">REFIX / INSTITUTE OPERATIONS</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {children}
    </div>
  );
}
function Checks({
  title,
  rows,
  ids,
  change,
}: {
  title: string;
  rows: Row[];
  ids: string[];
  change: (v: string[]) => void;
}) {
  return (
    <fieldset className="academy-checks">
      <legend>{title}</legend>
      {rows.map((r) => (
        <label key={r.id}>
          <input
            type="checkbox"
            checked={ids.includes(r.id)}
            onChange={(e) =>
              change(
                e.target.checked
                  ? [...ids, r.id]
                  : ids.filter((id) => id !== r.id),
              )
            }
          />
          <span>
            {r.title || r.name}
            <small>{r.email}</small>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
export function Batches() {
  const d = useData("/owner/batches"),
    courses = useData("/admin/courses"),
    learners = useData("/owner/learners"),
    toast = useToast();
  const [edit, setEdit] = useState<Row | null>(null),
    [courseIds, setCourses] = useState<string[]>([]),
    [learnerIds, setLearners] = useState<string[]>([]),
    [query, setQuery] = useState("");
  const open = (r: Row) => {
    setEdit(r);
    setCourses(r.courseIds || []);
    setLearners(r.learnerIds || []);
    setQuery("");
  };
  return (
    <>
      <Title
        title="Training batches"
        text="Plan your cohorts, assign trainers and keep the repair bench organised."
      >
        <button
          className="btn primary"
          onClick={() =>
            open({
              status: "Upcoming",
              capacity: 24,
              starts: new Date().toISOString().slice(0, 10),
              ends: new Date(Date.now() + 60 * 86400000)
                .toISOString()
                .slice(0, 10),
            })
          }
        >
          <Icon name="Plus" size={17} />
          Create batch
        </button>
      </Title>
      <div className="academy-intro">
        <Icon name="UsersRound" />
        <div>
          <strong>A place for every technician.</strong>
          <p>
            Membership organises the timetable. Approved packages or owner
            access grants control course access.
          </p>
        </div>
      </div>
      {d.error ? (
        <ErrorState error={d.error} />
      ) : !d.data ? (
        <Loading />
      ) : (
        <div className="academy-batch-grid">
          {d.data.map((b: Row) => (
            <article className="coach-panel batch-card" key={b.id}>
              <div className="card-top">
                <span className="soft-icon">
                  <Icon name="UsersRound" />
                </span>
                <Badge>{b.status}</Badge>
              </div>
              <h2>{b.name}</h2>
              <p>{b.trainer}</p>
              <div className="batch-schedule">
                <Icon name="CalendarDays" size={18} />
                <span>
                  {b.schedule}
                  <small>
                    {date(b.starts)} – {date(b.ends)}
                  </small>
                </span>
              </div>
              <div className="progress-track">
                <span
                  style={{
                    width: Math.min(100, (b.learners / b.capacity) * 100) + "%",
                  }}
                />
              </div>
              <p className="muted">
                {b.learners} / {b.capacity} seats · {b.courseIds.length} courses
              </p>
              <button className="btn" onClick={() => open(b)}>
                Manage batch <Icon name="ArrowRight" size={16} />
              </button>
            </article>
          ))}
          {!d.data.length && (
            <Empty
              title="Your next cohort starts here"
              text="Create a batch and add learners."
            />
          )}
        </div>
      )}
      {edit && (
        <Modal
          title={edit.id ? "Manage training batch" : "Create training batch"}
          subtitle="Timings are shown in IST. Batch membership does not grant paid course access."
          onClose={() => setEdit(null)}
          wide
        >
          <Checks
            title="Courses in this batch"
            rows={(courses.data || []).filter(
              (c: Row) =>
                c.coaching && !c.legacyDemo && c.status !== "Archived",
            )}
            ids={courseIds}
            change={setCourses}
          />
          <label className="search-field">
            <Icon name="Search" size={16} />
            <input
              aria-label="Find batch learners"
              placeholder="Find learners by name or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <Checks
            title={`Learner membership (${learnerIds.length})`}
            rows={(learners.data || []).filter((u: Row) =>
              (u.name + u.email).toLowerCase().includes(query.toLowerCase()),
            )}
            ids={learnerIds}
            change={setLearners}
          />
          <Form
            fields={[
              { name: "name", label: "Batch name", required: true },
              { name: "trainer", label: "Trainer name", required: true },
              {
                name: "capacity",
                label: "Seat capacity",
                type: "number",
                required: true,
              },
              {
                name: "schedule",
                label: "Weekly schedule (IST)",
                required: true,
              },
              {
                name: "starts",
                label: "Starts on",
                type: "date",
                required: true,
              },
              { name: "ends", label: "Ends on", type: "date", required: true },
              {
                name: "status",
                label: "Batch status",
                type: "select",
                options: ["Upcoming", "Active", "Completed", "Archived"],
                required: true,
              },
              { name: "notes", label: "Internal notes", type: "textarea" },
            ]}
            initial={edit}
            label="Save batch"
            onSubmit={async (v) => {
              await (edit.id
                ? patch("/owner/batches/" + edit.id, {
                    ...v,
                    notes: v.notes || "",
                    courseIds,
                    learnerIds,
                  })
                : post("/owner/batches", {
                    ...v,
                    notes: v.notes || "",
                    courseIds,
                    learnerIds,
                  }));
              setEdit(null);
              d.reload();
              toast("Training batch saved.");
            }}
          />
        </Modal>
      )}
    </>
  );
}
export function Practicals() {
  const d = useData("/owner/practicals"),
    toast = useToast();
  const [review, setReview] = useState<Row | null>(null),
    [filter, setFilter] = useState("All");
  return (
    <>
      <Title
        title="Practical review"
        text="Read the evidence. Give useful feedback. Build confident repair technicians."
      />
      <div className="filter-tabs page-tabs">
        {["All", "Submitted", "Changes requested", "Competent"].map((f) => (
          <button
            key={f}
            className={filter === f ? "selected" : ""}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      {d.error ? (
        <ErrorState error={d.error} />
      ) : !d.data ? (
        <Loading />
      ) : (
        <div className="academy-review-list">
          {d.data
            .filter((r: Row) => filter === "All" || r.status === filter)
            .map((r: Row) => (
              <article key={r.id} className="coach-panel practical-card">
                <div className="card-top">
                  <span className="eyebrow">{r.course}</span>
                  <Badge>{r.status}</Badge>
                </div>
                <h2>{r.title}</h2>
                <p>
                  {r.learner} · Submitted {date(r.created)}
                </p>
                <p className="observation-text">{r.observation}</p>
                {r.feedback && (
                  <div className="review-feedback">
                    <strong>Trainer feedback · {r.score}/100</strong>
                    <p>{r.feedback}</p>
                    <small>
                      {r.reviewer} · {date(r.reviewed)}
                    </small>
                  </div>
                )}
                <button className="btn" onClick={() => setReview(r)}>
                  <Icon name="ClipboardCheck" size={17} />
                  Review submission
                </button>
              </article>
            ))}
          {!d.data.length && (
            <Empty
              title="Ready for bench work"
              text="Learner submissions appear here for review."
            />
          )}
        </div>
      )}
      {review && (
        <Modal
          title="Review bench work"
          subtitle={review.learner + " · " + review.title}
          onClose={() => setReview(null)}
        >
          <p className="observation-text">{review.observation}</p>
          <Form
            fields={[
              {
                name: "status",
                label: "Review decision",
                type: "select",
                options: ["Changes requested", "Competent"],
                required: true,
              },
              {
                name: "score",
                label: "Rubric score (0–100)",
                type: "number",
                required: true,
              },
              {
                name: "feedback",
                label: "Trainer feedback",
                type: "textarea",
                required: true,
              },
            ]}
            initial={{
              status:
                review.status === "Competent"
                  ? "Competent"
                  : "Changes requested",
              score: review.score ?? 0,
              feedback: review.feedback,
            }}
            label="Publish review"
            onSubmit={async (v) => {
              await patch("/owner/practicals/" + review.id, v);
              setReview(null);
              d.reload();
              toast("Review is now visible to the learner.");
            }}
          />
        </Modal>
      )}
    </>
  );
}
export function LearnerAccess({
  learner,
  changed,
}: {
  learner: Row;
  changed: () => void;
}) {
  const courses = useData("/admin/courses"),
    devices = useData("/owner/learners/" + learner.id + "/devices"),
    toast = useToast();
  const [mode, setMode] = useState(""),
    [ids, setIds] = useState<string[]>([]);
  return (
    <details className="academy-control-section">
      <summary>Access & device controls</summary>
      <p className="muted">
        Complimentary access is recorded separately from paid revenue. Account
        activation remains a separate decision.
      </p>
      <div className="inline-actions">
        <button className="btn" onClick={() => setMode("grant")}>
          Grant course access
        </button>
        <button className="btn" onClick={() => setMode("logout")}>
          Sign out all devices
        </button>
      </div>
      <h4>Active sessions</h4>
      {devices.error ? (
        <p role="alert">{devices.error}</p>
      ) : !devices.data ? (
        <Loading />
      ) : devices.data.length ? (
        devices.data.map((s: Row) => (
          <div className="list-row" key={s.id}>
            <Icon name="Monitor" size={18} />
            <div>
              <strong>{s.device || "Browser or app"}</strong>
              <small>
                Signed in {date(s.created)} · expires {date(s.expires)}
              </small>
            </div>
          </div>
        ))
      ) : (
        <p className="muted">No active signed-in devices.</p>
      )}
      {mode && (
        <div className="academy-inline-form">
          <h3>
            {mode === "grant"
              ? "Complimentary course access"
              : "Revoke all current sessions"}
          </h3>
          {mode === "grant" && (
            <Checks
              title="Courses to unlock"
              rows={(courses.data || []).filter(
                (c: Row) => c.coaching && c.status === "Published",
              )}
              ids={ids}
              change={setIds}
            />
          )}
          <Form
            key={mode}
            fields={[
              ...(mode === "grant"
                ? [
                    {
                      name: "days",
                      label: "Access validity (days)",
                      type: "number",
                      required: true,
                    },
                  ]
                : []),
              {
                name: "reason",
                label: "Reason for audit record",
                type: "textarea",
                required: true,
              },
            ]}
            initial={{ days: 30 }}
            label={mode === "grant" ? "Grant access" : "Sign out devices"}
            onCancel={() => setMode("")}
            onSubmit={async (v) => {
              await post(
                "/owner/learners/" +
                  learner.id +
                  (mode === "grant" ? "/access" : "/sign-out"),
                mode === "grant" ? { ...v, courseIds: ids } : v,
              );
              setMode("");
              devices.reload();
              changed();
              toast("Learner controls updated.");
            }}
          />
        </div>
      )}
    </details>
  );
}
export function CourseControls({
  course,
  lessons,
  changed,
}: {
  course: Row;
  lessons: Row[];
  changed: () => void;
}) {
  const [mode, setMode] = useState(""),
    [order, setOrder] = useState<string[]>([]),
    toast = useToast(),
    navigate = useNavigate();
  const startOrder = () => {
    setOrder(
      [...lessons].sort((a, b) => a.position - b.position).map((l) => l.id),
    );
    setMode("curriculum");
  };
  const move = (i: number, d: number) => {
    const next = [...order];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setOrder(next);
  };
  return (
    <>
      <div className="academy-course-controls">
        <span>
          <Icon name="Settings2" size={17} />
          Course controls
        </span>
        <div className="inline-actions">
          <button className="btn small" onClick={() => setMode("duplicate")}>
            Duplicate
          </button>
          {!["Published", "Archived"].includes(course.status) && (
            <button className="btn small" onClick={startOrder}>
              Arrange curriculum
            </button>
          )}
          <button
            className="btn small"
            onClick={() =>
              setMode(
                course.status === "Archived" ? "Restore draft" : "Archive",
              )
            }
          >
            {course.status === "Archived" ? "Restore draft" : "Archive course"}
          </button>
        </div>
      </div>
      {mode && (
        <Modal
          title={
            mode === "duplicate"
              ? "Duplicate course"
              : mode === "curriculum"
                ? "Arrange draft curriculum"
                : mode + " course"
          }
          onClose={() => setMode("")}
        >
          {mode === "curriculum" ? (
            <>
              <p>
                Move lessons into teaching order or remove them from this draft.
                Published versions and existing learner progress are preserved.
              </p>
              <ol className="curriculum-sort">
                {order.map((id, i) => (
                  <li key={id}>
                    <span>{lessons.find((l) => l.id === id)?.title}</span>
                    <button
                      className="icon-btn"
                      disabled={i === 0}
                      aria-label={"Move lesson " + (i + 1) + " up"}
                      onClick={() => move(i, -1)}
                    >
                      <Icon name="ArrowUp" size={16} />
                    </button>
                    <button
                      className="icon-btn"
                      disabled={i === order.length - 1}
                      aria-label={"Move lesson " + (i + 1) + " down"}
                      onClick={() => move(i, 1)}
                    >
                      <Icon name="ArrowDown" size={16} />
                    </button>
                    <button
                      className="icon-btn"
                      aria-label={"Remove lesson " + (i + 1)}
                      onClick={() => setOrder(order.filter((x) => x !== id))}
                    >
                      <Icon name="X" size={16} />
                    </button>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            mode !== "duplicate" && (
              <p>
                {mode === "Archive"
                  ? "Remove this course from the published catalog. Existing approved learners retain their version until their access expires."
                  : "Restore to draft for review before republishing."}
              </p>
            )
          )}
          <Form
            fields={
              mode === "duplicate"
                ? [{ name: "title", label: "New course title", required: true }]
                : [
                    {
                      name: "reason",
                      label: "Reason for this course change",
                      type: "textarea",
                      required: true,
                    },
                  ]
            }
            initial={
              mode === "duplicate" ? { title: course.title + " · Copy" } : {}
            }
            label={mode === "duplicate" ? "Create copy" : "Apply course change"}
            onSubmit={async (v) => {
              if (mode === "duplicate") {
                const r = await post(
                  "/owner/courses/" + course.id + "/duplicate",
                  v,
                );
                setMode("");
                navigate("/courses/" + r.id);
              } else {
                await post(
                  "/owner/courses/" +
                    course.id +
                    (mode === "curriculum" ? "/curriculum" : "/lifecycle"),
                  mode === "curriculum"
                    ? { ...v, lessonIds: order, revision: course.revision || 1 }
                    : { ...v, action: mode },
                );
                setMode("");
                changed();
              }
              toast("Course updated.");
            }}
          />
        </Modal>
      )}
    </>
  );
}
export function BillingExport() {
  const toast = useToast();
  return (
    <button
      className="btn"
      onClick={async () => {
        try {
          const response = await fetch("/api/v1/owner/billing/export", {
            credentials: "include",
            headers: { "X-Qubit-Surface": "admin" },
          });
          if (!response.ok) throw new Error("Billing permission is required.");
          const url = URL.createObjectURL(await response.blob()),
            link = document.createElement("a");
          link.href = url;
          link.download = "refix-subscriptions.csv";
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (e) {
          toast((e as Error).message, "error");
        }
      }}
    >
      <Icon name="Download" size={16} />
      Export subscription ledger
    </button>
  );
}
