import { fileURLToPath } from "node:url";

export const academyCourses = [
  [
    "laptop-diagnostics",
    "Laptop Repair · From Fault to Fix",
    "Laptop repair",
    "Beginner",
    "Sandeep Verma",
    "laptop",
    8999,
    "Diagnose no-power and no-display faults with a documented, safe workflow.",
    "Identify laptop subsystems; Record voltage and resistance observations; Plan a repair and verify the result",
  ],
  [
    "mobile-board-repair",
    "Mobile Repair · Board-level Essentials",
    "Mobile repair",
    "Intermediate",
    "Neha Kulkarni",
    "mobile",
    7999,
    "Understand smartphone boards, common charging faults and disciplined component inspection.",
    "Map a smartphone board; Inspect connectors and charging paths; Document a safe diagnosis",
  ],
  [
    "precision-soldering",
    "Precision Soldering & Rework",
    "Soldering",
    "Beginner",
    "Imran Shaikh",
    "soldering",
    4999,
    "Build careful rework habits on practice boards before handling customer devices.",
    "Prepare an ESD-safe bench; Select appropriate tools and flux; Inspect joints and record quality checks",
  ],
  [
    "desktop-motherboards",
    "Desktop & Motherboard Troubleshooting",
    "Computer hardware",
    "Intermediate",
    "Sandeep Verma",
    "desktop",
    6999,
    "Learn a systematic approach to POST failures, memory issues and board inspection.",
    "Interpret POST symptoms; Isolate replaceable components; Verify a repair with a repeatable checklist",
  ],
  [
    "repair-workshop",
    "Run a Professional Repair Workshop",
    "Workshop business",
    "All levels",
    "Priya Desai",
    "laptop",
    2999,
    "Build customer trust with clear job cards, estimates, consent and a consistent handover process.",
    "Create a device intake record; Prepare an itemised estimate; Handle customer data and e-waste responsibly",
  ],
  [
    "electronics-foundation",
    "Electronics for Repair Technicians",
    "Electronics",
    "Beginner",
    "Neha Kulkarni",
    "desktop",
    3999,
    "Connect circuit fundamentals to practical measurements on unpowered training boards.",
    "Identify passive components; Choose measurement modes safely; Read a basic power-path diagram",
  ],
].map(
  ([
    id,
    title,
    category,
    level,
    instructor,
    photo,
    price,
    description,
    outcomes,
  ]) => ({
    id,
    title,
    category,
    level,
    instructor,
    image: `/images/repair-${photo}.jpg`,
    price,
    description,
    outcomes,
    language: "Hindi + English",
    duration: "5 demo lessons",
    batch: "Refix Skills · October",
    status: "Published",
    version: 1,
    revision: 1,
    access: "Restricted",
    coaching: true,
    academy: true,
    requiresSubscription: true,
    initials: instructor
      .split(" ")
      .map((s) => s[0])
      .join(""),
    color: "blue",
    lessonsLabel: "5 sample lessons",
    demo: true,
  }),
);

const fundamentals =
  "Before opening a device, record the customer's complaint and obtain consent. Disconnect external power and follow the manufacturer's battery isolation procedure. Use an ESD mat and appropriate wrist strap. Never work on a swollen, hot or damaged battery; isolate the device safely and refer it to a trained battery specialist. Do not open mains power supplies.\n\nStart with visual inspection: liquid damage, corrosion, loose connectors and missing components. Photograph the board with consent. Record measurements and compare with the service documentation for the exact model. Never assume every board uses the same voltage or component layout.\n\nThis is original demonstration content for the institute prototype, not a complete repair qualification. Practise on unpowered training boards under instructor supervision.";
const practice =
  "Practical task: prepare a device intake and diagnosis sheet for an unpowered training board. Include the model, reported symptom, consent, ESD checklist, visual observations, test plan and verification criteria. Do not include customer passwords or personal files.\n\nSubmit your observations in Practical lab. Your trainer can request changes or mark the task competent. A course completion indicator records lesson progress; it does not certify professional competence.";

export function seedAcademy(store) {
  const { db, get, put, list } = store;
  if (!get("settings", "refix-institute-copy-v1")) {
    const welcome = get("notifications", "coaching-welcome");
    if (
      welcome?.description ===
      "Welcome to Qubit Coaching. Explore your courses, keep track of your package and make every study session count."
    )
      put("notifications", {
        ...welcome,
        title: "Welcome to the Refix repair bench",
        description:
          "Welcome to Refix India Institute. Explore mobile and laptop repair courses, submit bench observations and learn from your trainer's feedback.",
      });
    for (const [id, oldName, newName] of [
      ["instructor-demo", "Dr. Ananya Rao", "Sandeep Verma"],
      ["support-demo", "Demi Wilkinson", "Neha Patil"],
      ["finance-demo", "Phoenix Baker", "Amit Kulkarni"],
      ["tenant-admin", "Lana Steiner", "Priya Desai"],
    ])
      db.prepare(
        "UPDATE users SET name=? WHERE id=? AND name=? AND tenant='tenant-demo'",
      ).run(newName, id, oldName);
    put("settings", {
      id: "refix-institute-copy-v1",
      completed: new Date().toISOString(),
    });
  }
  if (!get("settings", "refix-institute-v1")) {
    const config = get("settings", "coaching");
    if (["Refix India Academy", "Refix India Institute"].includes(config?.name))
      put("settings", { ...config, name: "Refix India Institute" });
    db.prepare(
      "UPDATE subscription_requests SET status='Rejected',reason='Bundled exam demo superseded by repair institute demo' WHERE id IN ('seed-request-7','seed-request-8','seed-request-9','seed-request-10') AND tenant='tenant-demo' AND status IN ('Pending payment','Pending approval')",
    ).run();
    put("settings", {
      id: "refix-institute-v1",
      completed: new Date().toISOString(),
    });
  }
  if (get("settings", "refix-academy-v1")) return;
  db.exec("BEGIN IMMEDIATE");
  try {
    // Retain old records and version history; hide only untouched bundled exam demos.
    for (const c of list("courses", "tenant-demo")) {
      if (
        [
          "jee-physics-2027",
          "neet-biology-2027",
          "upsc-foundation",
          "cbse-maths-10",
        ].includes(c.id) &&
        !c.revision
      )
        put("courses", { ...c, status: "Archived", legacyDemo: true });
    }
    for (const [id, name, price, days, description] of [
      [
        "pkg-jee",
        "JEE Physics · 90 days",
        249900,
        90,
        "Complete physics access, chapter resources, practice and faculty support.",
      ],
      [
        "pkg-neet",
        "NEET Biology · 90 days",
        299900,
        90,
        "NCERT-focused biology, revision notes and topic practice.",
      ],
      [
        "pkg-all",
        "All Access · 180 days",
        499900,
        180,
        "Explore every published coaching course with one package.",
      ],
      [
        "pkg-cbse",
        "CBSE Maths · 90 days",
        149900,
        90,
        "A structured Class 10 mathematics preparation package.",
      ],
    ]) {
      const p = db
        .prepare(
          "SELECT * FROM coaching_packages WHERE id=? AND tenant='tenant-demo'",
        )
        .get(id);
      if (
        p &&
        p.name === name &&
        p.price_paise === price &&
        p.validity_days === days &&
        p.description === description &&
        JSON.parse(p.course_ids).every((cid) => get("courses", cid)?.legacyDemo)
      ) {
        db.prepare(
          "UPDATE coaching_packages SET status='Archived' WHERE id=?",
        ).run(id);
      }
    }
    const root = fileURLToPath(new URL("./assets/", import.meta.url));
    for (const [id, title, type, filename] of [
      [
        "repair-laptop-video",
        "Laptop diagnosis · visual demo",
        "video/mp4",
        "repair-laptop.mp4",
      ],
      [
        "repair-mobile-video",
        "Mobile board inspection · visual demo",
        "video/mp4",
        "repair-mobile.mp4",
      ],
      [
        "repair-workbook",
        "Repair bench · diagnosis workbook",
        "application/pdf",
        "repair-workbook.pdf",
      ],
      [
        "repair-diagram",
        "Safe diagnosis · workflow diagram",
        "image/svg+xml",
        "repair-workflow.svg",
      ],
    ])
      put("coaching_assets", {
        id,
        title,
        type,
        filename,
        diskPath: root + filename,
        rights: true,
        status: "Ready",
        userId: "admin-demo",
        created: new Date().toISOString(),
        demo: true,
      });
    for (const c of academyCourses) {
      put("courses", c);
      const labels = [
        "Start here · Your safe repair bench",
        c.category === "Mobile repair"
          ? "Mobile board inspection · demo class"
          : "Laptop diagnosis · demo class",
        "Your repair diagnosis workbook",
        "The diagnosis workflow",
        "Bench practice · document your diagnosis",
      ];
      const lessons = labels.map((title, i) => ({
        id: c.id + "-lesson-" + (i + 1),
        courseId: c.id,
        title,
        type: ["Reading", "Video", "Document", "Image", "Reading"][i],
        module:
          i < 2
            ? "01 · Foundations & demonstration"
            : "02 · Observe, document, practise",
        position: i,
        duration: i === 1 ? 1 : 6 + i,
        content: i === 4 ? practice : fundamentals,
        subtitle: "Original prototype lesson · supervised practice recommended",
        required: true,
        downloadable: i === 0 || i === 4,
        captions: true,
        rights: true,
        assetIds:
          i === 1
            ? [
                c.category === "Mobile repair"
                  ? "repair-mobile-video"
                  : "repair-laptop-video",
              ]
            : i === 2
              ? ["repair-workbook"]
              : i === 3
                ? ["repair-diagram"]
                : [],
      }));
      lessons.forEach((l) => put("lessons", l));
      put("versions", {
        id: c.id + "-v1",
        courseId: c.id,
        version: 1,
        course: c,
        lessons,
        published: new Date().toISOString(),
      });
      const qs = [
        [
          "What should you do before opening a customer's device?",
          [
            "Obtain consent and record the complaint",
            "Erase all data",
            "Apply heat immediately",
            "Guess the faulty component",
          ],
          0,
        ],
        [
          "A battery is swollen. What is the appropriate response?",
          [
            "Puncture it",
            "Continue charging",
            "Stop work and follow safe isolation procedures",
            "Heat it to flatten it",
          ],
          2,
        ],
        [
          "Resistance measurements should normally be taken on…",
          [
            "A live mains input",
            "An isolated, unpowered circuit after checking stored energy",
            "Any circuit without checking",
            "A charging battery",
          ],
          1,
        ],
        [
          "Why record measurements and observations?",
          [
            "To replace customer consent",
            "To document evidence and verify the diagnosis",
            "To skip testing",
            "To guarantee a repair",
          ],
          1,
        ],
        [
          "Where should a beginner practise rework?",
          [
            "A customer's only working device",
            "A swollen battery",
            "An unpowered training board under supervision",
            "An open mains power supply",
          ],
          2,
        ],
      ];
      qs.forEach(([prompt, options, answer], i) =>
        put("questions", {
          id: c.id + "-q" + i,
          courseId: c.id,
          prompt,
          options,
          answer,
          explanation:
            "Use a safe, evidence-led repair workflow. Follow manufacturer guidance and practise under supervision.",
          type: "single",
          reference: "Refix bench induction · demo",
          topic: c.category,
          difficulty: "Foundation",
          status: "Approved",
        }),
      );
    }
    const at = (days) => new Date(Date.now() + days * 86400000).toISOString();
    const packages = [
      [
        "pkg-laptop",
        "Laptop Technician",
        899900,
        90,
        [
          "laptop-diagnostics",
          "desktop-motherboards",
          "electronics-foundation",
        ],
      ],
      [
        "pkg-mobile",
        "Mobile Repair Specialist",
        799900,
        90,
        [
          "mobile-board-repair",
          "precision-soldering",
          "electronics-foundation",
        ],
      ],
      [
        "pkg-repair-all",
        "Complete Repair Institute",
        1499900,
        180,
        academyCourses.map((c) => c.id),
      ],
    ];
    for (const [id, name, price, days, courses] of packages)
      db.prepare(
        "INSERT OR IGNORE INTO coaching_packages VALUES(?,?,?,?,?,?,?,?,?)",
      ).run(
        id,
        "tenant-demo",
        name,
        price,
        days,
        "Demo pricing in INR · video classes, bench workbooks, practical tasks and trainer support.",
        JSON.stringify(courses),
        "Active",
        at(-30),
      );
    for (const [n, userId, pid, left] of [
      [0, "learner-demo", "pkg-repair-all", 115],
      [1, "coaching-learner-1", "pkg-laptop", 6],
      [2, "coaching-learner-2", "pkg-mobile", 3],
      [3, "coaching-learner-3", "pkg-repair-all", 150],
      [4, "coaching-learner-4", "pkg-laptop", 70],
      [5, "coaching-learner-5", "pkg-mobile", -5],
    ]) {
      const p = db
        .prepare("SELECT * FROM coaching_packages WHERE id=?")
        .get(pid);
      db.prepare(
        "INSERT OR IGNORE INTO subscriptions VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
      ).run(
        "refix-demo-sub-" + n,
        "tenant-demo",
        userId,
        pid,
        null,
        p.name,
        p.course_ids,
        p.price_paise,
        at(-30),
        at(left),
        "Active",
        at(-30),
      );
      for (const cid of JSON.parse(p.course_ids))
        db.prepare("INSERT OR IGNORE INTO enrolments VALUES(?,?,?,?,?)").run(
          userId,
          cid,
          1,
          "Active",
          at(-30),
        );
    }
    db.prepare("INSERT OR IGNORE INTO progress VALUES(?,?,?,?,?)").run(
      "learner-demo",
      "laptop-diagnostics-lesson-1",
      1,
      0,
      at(-1),
    );
    // Old requests remain a historical queue; the repair requests are clearly labelled samples.
    for (const [n, pid] of [
      [8, "pkg-mobile"],
      [9, "pkg-laptop"],
    ]) {
      const p = db
        .prepare("SELECT * FROM coaching_packages WHERE id=?")
        .get(pid);
      db.prepare(
        "INSERT OR IGNORE INTO subscription_requests VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
      ).run(
        "refix-demo-request-" + n,
        "tenant-demo",
        "coaching-learner-" + n,
        pid,
        JSON.stringify(p),
        "Pending approval",
        "UPI",
        "DEMO-REFIX-" + n,
        null,
        at(-1),
        null,
        null,
        "Sample payment reference · verify before approval",
      );
    }
    put("academy_batches", {
      id: "refix-batch-laptop",
      name: "Laptop Technician · October",
      courseIds: ["laptop-diagnostics", "desktop-motherboards"],
      trainer: "Sandeep Verma",
      capacity: 24,
      starts: at(0).slice(0, 10),
      ends: at(60).slice(0, 10),
      schedule: "Mon, Wed, Fri · 6:00–7:30 PM IST",
      status: "Active",
      learnerIds: ["learner-demo", "coaching-learner-1", "coaching-learner-4"],
      notes: "Demo cohort · bench practice every Saturday",
    });
    put("academy_batches", {
      id: "refix-batch-mobile",
      name: "Mobile Board Repair · Weekend",
      courseIds: ["mobile-board-repair", "precision-soldering"],
      trainer: "Neha Kulkarni",
      capacity: 18,
      starts: at(3).slice(0, 10),
      ends: at(63).slice(0, 10),
      schedule: "Sat–Sun · 10:00 AM–12:00 PM IST",
      status: "Upcoming",
      learnerIds: ["learner-demo", "coaching-learner-2"],
      notes: "Demo cohort · Hindi + English",
    });
    put("academy_practicals", {
      id: "refix-practical-1",
      courseId: "laptop-diagnostics",
      userId: "learner-demo",
      title: "No-power laptop · intake & visual inspection",
      observation:
        "Training board only. External power removed, battery disconnected per trainer guidance, ESD mat checked. Recorded a loose DC-in connector and signs of corrosion. No powered measurements attempted. Next step: instructor review before further testing.",
      status: "Submitted",
      feedback: "",
      score: null,
      created: at(-1),
    });
    put("discussions", {
      id: "refix-bench-doubts",
      courseId: "laptop-diagnostics",
      title: "Ask at the repair bench",
      description:
        "Share observations, model details and what you have checked. Never post customer personal data.",
      author: "Sandeep Verma",
      status: "Open",
      replies: [],
    });
    const config = get("settings", "coaching");
    if (config?.name === "Qubit Coaching")
      put("settings", {
        ...config,
        name: "Refix India Institute",
        tagline: "Learn the skill. Build the confidence. Repair better.",
        city: "India",
        supportPhone: "",
        paymentInstructions:
          "Demo academy: ask the training administrator for verified UPI or bank details before making a payment. Upload your reference for manual approval.",
      });
    put("settings", { id: "refix-academy-v1", completed: at(0) });
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
