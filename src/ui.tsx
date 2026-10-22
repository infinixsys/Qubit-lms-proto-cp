import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Award,
  BadgeCheck,
  Bell,
  BookOpen,
  BookOpenCheck,
  BookOpenText,
  BookPlus,
  Bookmark,
  Building2,
  ChartNoAxesCombined,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  ClipboardList,
  Clock3,
  CreditCard,
  Crown,
  Database,
  DatabaseBackup,
  Download,
  FileChartColumn,
  FileText,
  FileUp,
  Flag,
  GitBranch,
  GraduationCap,
  HeartHandshake,
  Image,
  Images,
  Inbox,
  Info,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  Link,
  List,
  ListChecks,
  LockKeyhole,
  LogIn,
  LogOut,
  Megaphone,
  Menu,
  MessagesSquare,
  Network,
  Package,
  PanelLeft,
  Pencil,
  Plug,
  Plus,
  Receipt,
  RefreshCw,
  RotateCw,
  Route,
  Search,
  Send,
  Server,
  Settings,
  Settings2,
  Shapes,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sprout,
  ToggleRight,
  Type,
  Upload,
  UserPlus,
  UsersRound,
  Video,
  WandSparkles,
  Workflow,
  X,
} from "lucide-react";
const iconMap: Record<string, any> = {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Award,
  BadgeCheck,
  Bell,
  BookOpen,
  BookOpenCheck,
  BookOpenText,
  BookPlus,
  Bookmark,
  Building2,
  ChartNoAxesCombined,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  ClipboardList,
  Clock3,
  CreditCard,
  Crown,
  Database,
  DatabaseBackup,
  Download,
  FileChartColumn,
  FileText,
  FileUp,
  Flag,
  GitBranch,
  GraduationCap,
  HeartHandshake,
  Image,
  Images,
  Inbox,
  Info,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  Link,
  List,
  ListChecks,
  LockKeyhole,
  LogIn,
  LogOut,
  Megaphone,
  Menu,
  MessagesSquare,
  Network,
  Package,
  PanelLeft,
  Pencil,
  Plug,
  Plus,
  Receipt,
  RefreshCw,
  RotateCw,
  Route,
  Search,
  Send,
  Server,
  Settings,
  Settings2,
  Shapes,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sprout,
  ToggleRight,
  Type,
  Upload,
  UserPlus,
  UsersRound,
  Video,
  WandSparkles,
  Workflow,
  X,
};
export type Row = Record<string, any>;
const SURFACE = "admin";
export async function api(path: string, options: RequestInit = {}) {
  const r = await fetch("/api/v1" + path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Qubit-Surface": SURFACE,
      ...options.headers,
    },
  });
  const data = await r.json();
  if (!r.ok)
    throw new Error(data.error?.message || "Unable to complete that request.");
  return data;
}
export const post = (p: string, b: unknown = {}) =>
  api(p, { method: "POST", body: JSON.stringify(b) });
export const patch = (p: string, b: unknown) =>
  api(p, { method: "PATCH", body: JSON.stringify(b) });
export function Icon({
  name = "Circle",
  size = 20,
  ...props
}: {
  name?: string;
  size?: number;
  [key: string]: any;
}) {
  const I = iconMap[name] || Circle;
  return <I size={size} strokeWidth={1.7} {...props} />;
}
export function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className={"brand " + (small ? "small" : "")}>
      <span className="brand-mark">
        <span />
        <span />
        <span />
        <span />
      </span>
      <span>
        qubit<span className="brand-dot">.</span>
      </span>
    </div>
  );
}
export function Avatar({
  name = "Alex Morgan",
  size = "",
}: {
  name?: string;
  size?: string;
}) {
  return (
    <span className={"avatar " + size}>
      {name
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}
export function Badge({ children }: { children: React.ReactNode }) {
  const s = String(children);
  return (
    <span
      className={
        "badge " +
        (/Published|Active|Ready|Valid|Completed|Approved|Enabled|Graded|Success|Resolved|Open|Saved/.test(
          s,
        )
          ? "good"
          : /Failed|Suspended|Revoked|Rejected|Deactivated|Blocked|Inactive/.test(
                s,
              )
            ? "bad"
            : /Review|Pending|Submitted|Investigating|Queued|Invited/.test(s)
              ? "warn"
              : "neutral")
      }
    >
      {children}
    </span>
  );
}
export function Empty({
  icon = "Inbox",
  title = "A little space for what’s next",
  text = "New activity will appear here.",
  action,
}: {
  icon?: string;
  title?: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span>
        <Icon name={icon} size={27} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      Getting things ready…
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: string;
  retry?: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <Icon name="CircleAlert" />
      <div>
        <strong>We couldn’t load this just yet.</strong>
        <p>{error}</p>
      </div>
      {retry && (
        <button className="btn" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function useData(path: string, dependency: unknown = 0) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    setError("");
    if (!path) {
      setData(null);
      return;
    }
    api(path)
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [path, dependency, version]);
  return { data, error, reload: () => setVersion((v) => v + 1), setData };
}
const ToastContext = createContext<(s: string, type?: string) => void>(
  () => {},
);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState({ text: "", type: "" });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = (text: string, type = "success") => {
    setToast({ text, type });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast({ text: "", type: "" }), 5500);
  };
  return (
    <ToastContext.Provider value={notify}>
      {children}
      {toast.text && (
        <div
          className={"toast " + toast.type}
          role={toast.type === "error" ? "alert" : "status"}
        >
          <Icon name={toast.type === "error" ? "CircleAlert" : "CircleCheck"} />
          {toast.text}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast({ text: "", type: "" })}
          >
            <Icon name="X" size={16} />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const el = ref.current;
    el?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const a = el?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input,select,textarea,a[href],[tabindex="0"]',
        );
        if (!a?.length) return;
        const first = a[0],
          last = a[a.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === el)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = old;
      prev?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        className={"modal " + (wide ? "wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-btn"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <Icon name="X" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
export type Field = {
  name: string;
  label: string;
  type?: string;
  options?: (string | { label: string; value: string })[];
  required?: boolean;
  placeholder?: string;
  help?: string;
};
export function Form({
  fields,
  initial = {},
  onSubmit,
  label = "Save changes",
  onCancel,
}: {
  fields: Field[];
  initial?: Row;
  onSubmit: (v: Row) => Promise<unknown>;
  label?: string;
  onCancel?: () => void;
}) {
  const [v, setV] = useState<Row>(initial),
    [busy, setBusy] = useState(false),
    [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const data: Row = {};
      fields.forEach((f) => {
        if (v[f.name] !== undefined && v[f.name] !== "")
          data[f.name] = f.type === "number" ? Number(v[f.name]) : v[f.name];
      });
      await onSubmit(data);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="form">
      <div className="form-fields">
        {fields.map((f) => (
          <label
            key={f.name}
            className={f.type === "checkbox" ? "checkbox-field" : ""}
          >
            <span>
              {f.label}
              {f.required && <small> *</small>}
            </span>
            {f.type === "textarea" ? (
              <textarea
                aria-label={f.label}
                rows={4}
                required={f.required}
                value={v[f.name] ?? ""}
                placeholder={f.placeholder}
                onChange={(e) => setV({ ...v, [f.name]: e.target.value })}
              />
            ) : f.type === "select" ? (
              <select
                aria-label={f.label}
                required={f.required}
                value={v[f.name] ?? ""}
                onChange={(e) => setV({ ...v, [f.name]: e.target.value })}
              >
                <option value="">Select an option</option>
                {f.options?.map((o) => (
                  <option
                    key={typeof o === "string" ? o : o.value}
                    value={typeof o === "string" ? o : o.value}
                  >
                    {typeof o === "string" ? o : o.label}
                  </option>
                ))}
              </select>
            ) : f.type === "checkbox" ? (
              <input
                aria-label={f.label}
                type="checkbox"
                checked={!!v[f.name]}
                onChange={(e) => setV({ ...v, [f.name]: e.target.checked })}
              />
            ) : (
              <input
                aria-label={f.label}
                type={f.type || "text"}
                required={f.required}
                value={v[f.name] ?? ""}
                placeholder={f.placeholder}
                onChange={(e) => setV({ ...v, [f.name]: e.target.value })}
              />
            )}{" "}
            {f.help && <small className="field-help">{f.help}</small>}
          </label>
        ))}
      </div>
      {err && (
        <p className="form-error" role="alert">
          {err}
        </p>
      )}
      <footer className="form-actions">
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button className="btn primary" disabled={busy}>
          {busy ? "Saving…" : label}
          <Icon name="ArrowUpRight" size={16} />
        </button>
      </footer>
    </form>
  );
}
export function Art({
  color = "sage",
  variant = 0,
  small = false,
}: {
  color?: string;
  variant?: number;
  small?: boolean;
}) {
  return (
    <div
      className={"course-art " + color + (small ? " mini" : "")}
      aria-hidden="true"
    >
      <div className="art-grain" />
      {variant % 3 === 0 ? (
        <svg viewBox="0 0 360 200">
          <g transform="translate(180 100) rotate(-23)">
            <ellipse
              rx="94"
              ry="72"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <ellipse
                key={i}
                rx={15 + i * 11}
                ry="72"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            ))}
            <ellipse rx="94" ry="37" fill="none" stroke="currentColor" />
            <ellipse rx="94" ry="53" fill="none" stroke="currentColor" />
            <path d="M-94 0H94" stroke="currentColor" />
            <circle cx="88" cy="-50" r="18" fill="currentColor" />
          </g>
          <path
            d="M46 40h20m-10-10v20M292 151h16m-8-8v16"
            stroke="currentColor"
          />
        </svg>
      ) : variant % 3 === 1 ? (
        <svg viewBox="0 0 360 200">
          <g transform="translate(180 109) rotate(-24)">
            {[3, 2, 1, 0].map((i) => (
              <rect
                key={i}
                x={-64 + i * 13}
                y={-64 - i * 13}
                width="116"
                height="116"
                rx="13"
                fill="var(--art-bg)"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            ))}
            <path
              d="M-30-43L30 17M-30 17L30-43"
              stroke="currentColor"
              strokeWidth="1.3"
            />
          </g>
          <circle cx="65" cy="55" r="7" fill="currentColor" />
          <path d="M282 145h18m-9-9v18" stroke="currentColor" />
        </svg>
      ) : (
        <svg viewBox="0 0 360 200">
          <g transform="translate(95 142)">
            {[55, 88, 112, 145].map((h, i) => (
              <g key={h}>
                <path
                  d={`M${i * 43} 0v-${h}l27 -12v${h}z`}
                  fill="currentColor"
                  opacity={0.3 + i * 0.17}
                />
                <path
                  d={`M${i * 43} -${h}l27 -12 15 9-27 12z`}
                  fill="currentColor"
                  opacity=".7"
                />
              </g>
            ))}
          </g>
          <circle cx="80" cy="48" r="13" fill="none" stroke="currentColor" />
          <path d="M284 128h18m-9-9v18" stroke="currentColor" />
        </svg>
      )}
    </div>
  );
}
export function download(
  name: string,
  content: string,
  type = "application/json",
) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(new Blob([content], { type }));
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export function csv(rows: Row[]) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]).filter(
    (k) => typeof rows[0][k] !== "object",
  );
  const cell = (x: any) => {
    let s = String(x ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return [
    keys.map(cell).join(","),
    ...rows.map((r) => keys.map((k) => cell(r[k])).join(",")),
  ].join("\r\n");
}
export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="heading-actions">{actions}</div>
    </div>
  );
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="app-recovery">
        <Brand />
        <Empty
          icon="RefreshCw"
          title="Let’s find your way back."
          text="This screen ran into an unexpected issue. Your saved work is still available."
          action={
            <button
              className="btn primary"
              onClick={() => location.assign("/")}
            >
              Return to your workspace
            </button>
          }
        />
      </div>
    ) : (
      this.props.children
    );
  }
}

export const absoluteApiPath = (path: string) => path;
