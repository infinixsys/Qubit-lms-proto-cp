import type { Field } from "./ui";
export type ResourceConfig = {
  title: string;
  description: string;
  icon: string;
  singular: string;
  columns: string[];
  fields: Field[];
  statuses?: string[];
  readOnly?: boolean;
};
const text = (name: string, label: string, required = true): Field => ({
  name,
  label,
  required,
});
const select = (
  name: string,
  label: string,
  options: string[],
  required = true,
): Field => ({ name, label, options, type: "select", required });
const area = (name: string, label: string, required = true): Field => ({
  name,
  label,
  type: "textarea",
  required,
});
export const configs: Record<string, ResourceConfig> = {
  groups: {
    title: "Groups & cohorts",
    description: "Bring people together around shared learning goals.",
    icon: "UsersRound",
    singular: "group",
    columns: ["name", "description", "members", "owner", "status"],
    fields: [
      text("name", "Group name"),
      area("description", "About this group"),
      text("owner", "Group owner"),
      { name: "members", label: "Cohort capacity", type: "number" },
      select("status", "Status", ["Active", "Archived"]),
    ],
  },
  assignments: {
    title: "Assignments",
    description:
      "Meaningful work, thoughtful feedback, and a clearer picture of progress.",
    icon: "ClipboardList",
    singular: "assignment",
    columns: ["title", "courseId", "due", "reviewer", "status"],
    fields: [
      text("title", "Assignment title"),
      text("courseId", "Course ID"),
      area("description", "Instructions & rubric"),
      { name: "due", label: "Due date", type: "date", required: true },
      text("reviewer", "Reviewer"),
      select("status", "Status", ["Open", "Closed"]),
    ],
  },
  submissions: {
    title: "Review workspace",
    description:
      "Give every learner the feedback they need to take their next step.",
    icon: "ListChecks",
    singular: "review",
    columns: ["learner", "title", "submitted", "grade", "status"],
    fields: [
      { name: "grade", label: "Score (0–100)", type: "number", required: true },
      area("feedback", "Rubric feedback"),
      select("status", "Review outcome", ["Graded", "Returned"]),
    ],
    readOnly: true,
  },
  questions: {
    title: "Question bank",
    description:
      "Build a version-aware library of thoughtful assessment questions.",
    icon: "CircleHelp",
    singular: "question",
    columns: ["prompt", "type", "reference", "updated"],
    fields: [
      area("prompt", "Question"),
      select("type", "Question type", [
        "single",
        "multiple",
        "boolean",
        "text",
      ]),
      area("options", "Options · one per line", false),
      text(
        "answer",
        "Answer · option index (0-based), comma-separated indexes, or text",
      ),
      area("explanation", "Explanation"),
      text("reference", "Lesson reference", false),
    ],
  },
  media: {
    title: "Media library",
    description: "A home for the resources that bring your courses to life.",
    icon: "Images",
    singular: "asset",
    columns: ["title", "type", "size", "rights", "status"],
    fields: [
      text("title", "Asset title"),
      select("type", "Type", ["Document", "Image", "Audio", "Video"]),
      text("rights", "Rights & licensing"),
      text("captions", "Caption / transcript status", false),
    ],
    readOnly: true,
  },
  notifications: {
    title: "Communication",
    description:
      "The right message, at the right moment in the learning journey.",
    icon: "Megaphone",
    singular: "announcement",
    columns: ["title", "audience", "channel", "status"],
    fields: [
      text("title", "Announcement title"),
      area("description", "Message"),
      select("audience", "Audience", [
        "All learners",
        "Design explorers",
        "Product leaders",
      ]),
      select("channel", "Channel", ["In-app", "Email", "Push"]),
      select("status", "Status", ["Draft", "Published", "Scheduled"]),
      {
        name: "scheduledAt",
        label: "Scheduled time (saved configuration)",
        type: "datetime-local",
      },
    ],
  },
  sessions: {
    title: "Live learning",
    description:
      "Make space for conversation, collaboration, and shared discovery.",
    icon: "Video",
    singular: "session",
    columns: ["title", "instructor", "date", "provider", "status"],
    fields: [
      text("title", "Session title"),
      text("instructor", "Host"),
      text("courseId", "Course ID"),
      {
        name: "date",
        label: "Date & time",
        type: "datetime-local",
        required: true,
      },
      {
        name: "duration",
        label: "Duration in minutes",
        type: "number",
        required: true,
      },
      text("provider", "Conferencing provider"),
      { name: "url", label: "Approved HTTPS join URL", type: "url" },
      select("status", "Status", ["Scheduled", "Cancelled", "Completed"]),
    ],
  },
  discussions: {
    title: "Community",
    description: "Cultivate conversations that make learning more meaningful.",
    icon: "MessagesSquare",
    singular: "discussion",
    columns: ["title", "courseId", "author", "status"],
    fields: [
      text("title", "Discussion title"),
      text("courseId", "Course ID"),
      area("description", "Conversation starter"),
      select("status", "Moderation state", ["Open", "Closed", "Archived"]),
    ],
  },
  certificates: {
    title: "Certificates",
    description: "Recognise real achievement, backed by completion evidence.",
    icon: "Award",
    singular: "certificate",
    columns: ["id", "name", "title", "issued", "status"],
    fields: [
      select("status", "Certificate state", ["Revoked"]),
      area("reason", "Revocation reason"),
    ],
    readOnly: true,
  },
  tickets: {
    title: "Support inbox",
    description: "Help people get back to what matters. Their learning.",
    icon: "LifeBuoy",
    singular: "case",
    columns: ["title", "category", "priority", "assignee", "status"],
    fields: [
      text("title", "Case title"),
      area("description", "Issue details"),
      select("category", "Category", [
        "Login",
        "Course access",
        "Playback",
        "Assessment",
        "Billing",
        "Other",
      ]),
      select("priority", "Priority", ["Low", "Normal", "High", "Urgent"]),
      text("assignee", "Assigned to"),
      select("status", "Status", [
        "Open",
        "In progress",
        "Resolved",
        "Escalated",
      ]),
    ],
  },
  tenants: {
    title: "Organisations",
    description:
      "Distinct learning spaces, connected by one thoughtful platform.",
    icon: "Building2",
    singular: "organisation",
    columns: ["name", "slug", "plan", "learners", "status"],
    fields: [
      text("name", "Organisation name"),
      text("slug", "URL slug"),
      select("plan", "Plan", ["Starter", "Growth", "Enterprise"]),
      { name: "accent", label: "Brand colour", type: "color" },
      text("domain", "Custom domain · configuration only", false),
      select("status", "Status", ["Active", "Suspended"]),
    ],
  },
  plans: {
    title: "Plans & pricing",
    description: "Shape your commercial offering. Payments are not connected.",
    icon: "CreditCard",
    singular: "plan",
    columns: ["name", "price", "interval", "learners", "status"],
    fields: [
      text("name", "Plan name"),
      { name: "price", label: "Price (USD)", type: "number", required: true },
      select("interval", "Billing interval", ["Monthly", "Yearly"]),
      {
        name: "learners",
        label: "Learner capacity",
        type: "number",
        required: true,
      },
      select("status", "Status", ["Active", "Archived"]),
    ],
  },
  transactions: {
    title: "Transactions",
    description:
      "Provider transactions will appear after a payment integration is configured.",
    icon: "Receipt",
    singular: "transaction",
    columns: ["id", "name", "amount", "status"],
    fields: [],
    readOnly: true,
  },
  privacy: {
    title: "Privacy requests",
    description:
      "Handle personal data with care, clear ownership, and an audit trail.",
    icon: "ShieldCheck",
    singular: "request",
    columns: ["name", "type", "created", "status"],
    fields: [
      select("status", "Request status", [
        "Pending verification",
        "Under review",
        "Awaiting retention review",
        "Completed",
        "Rejected",
      ]),
      area("reason", "Review notes & retention basis"),
    ],
    readOnly: true,
  },
  jobs: {
    title: "Background jobs",
    description:
      "Understand what is happening behind the scenes. Retry with intention.",
    icon: "Workflow",
    singular: "job",
    columns: ["title", "type", "attempts", "correlationId", "status"],
    fields: [],
    readOnly: true,
  },
  incidents: {
    title: "Incident workspace",
    description:
      "Turn operational issues into clear actions and shared learning.",
    icon: "Activity",
    singular: "incident",
    columns: ["title", "service", "severity", "status"],
    fields: [
      text("title", "Incident title"),
      text("service", "Affected service"),
      select("severity", "Severity", ["Low", "Medium", "High", "Critical"]),
      area("description", "Investigation / root cause"),
      select("status", "Status", ["Investigating", "Monitoring", "Resolved"]),
    ],
  },
  integrations: {
    title: "Integrations",
    description: "Connect the services that power your learning ecosystem.",
    icon: "Plug",
    singular: "integration",
    columns: ["name", "category", "provider", "status"],
    fields: [text("provider", "Selected provider · configuration only")],
    readOnly: true,
  },
  flags: {
    title: "Feature flags",
    description: "Roll out capabilities deliberately. Keep a clear path back.",
    icon: "Flag",
    singular: "feature",
    columns: ["name", "key", "description", "status"],
    fields: [],
    readOnly: true,
  },
  reports: {
    title: "Saved reports",
    description: "Your recurring questions, with the right data close at hand.",
    icon: "FileChartColumn",
    singular: "report",
    columns: ["name", "type", "frequency", "status"],
    fields: [
      text("name", "Report name"),
      select("type", "Report type", [
        "Learner activity",
        "Course completion",
        "Assessment results",
        "Operations",
        "Commercial",
      ]),
      select("frequency", "Schedule preference", [
        "Daily",
        "Weekly",
        "Monthly",
        "On demand",
      ]),
      area("description", "Filters & metric definitions"),
      select("status", "Status", ["Saved", "Archived"]),
    ],
  },
  prompts: {
    title: "AI prompt registry",
    description:
      "Versioned instructions, editorial review, and traceable changes.",
    icon: "Sparkles",
    singular: "prompt",
    columns: ["name", "version", "status", "updated"],
    fields: [
      text("name", "Prompt name"),
      text("version", "Version"),
      area("description", "Prompt instructions"),
      select("status", "Review status", [
        "Draft",
        "In Review",
        "Approved",
        "Archived",
      ]),
    ],
  },
  backups: {
    title: "Backup & recovery",
    description:
      "A recoverable platform starts with a tested restore, not a green badge.",
    icon: "DatabaseBackup",
    singular: "backup",
    columns: ["name", "created", "status"],
    fields: [],
    readOnly: true,
  },
};
