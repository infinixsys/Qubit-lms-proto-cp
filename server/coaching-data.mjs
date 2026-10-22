import { fileURLToPath } from "node:url";
const stamp = () => new Date().toISOString();
export const coachingCourses = [
  {
    id: "jee-physics-2027",
    title: "JEE 2027 · Complete Physics",
    category: "JEE",
    exam: "JEE Main & Advanced",
    subject: "Physics",
    level: "Class 11–12",
    duration: "120+ hours",
    instructor: "Dr. Ananya Rao",
    initials: "AR",
    image: "/images/physics.png",
    color: "blue",
    description:
      "Build concepts from the ground up. Live-style video lessons, chapter notes and exam-focused practice for your JEE journey.",
    outcomes:
      "Master mechanics and electricity; Solve numerical problems confidently; Practise JEE-pattern questions",
    language: "Hindi + English",
    status: "Published",
    version: 1,
    access: "Restricted",
    coaching: true,
    requiresSubscription: true,
    rating: 4.9,
    batch: "Lakshya 2027",
    lessonsLabel: "48 chapters",
    price: 2499,
  },
  {
    id: "neet-biology-2027",
    title: "NEET 2027 · Biology Masterclass",
    category: "NEET",
    exam: "NEET UG",
    subject: "Biology",
    level: "Class 11–12",
    duration: "100+ hours",
    instructor: "Dr. Priya Nair",
    initials: "PN",
    image: "/images/biology.png",
    color: "sage",
    description:
      "NCERT-first biology with clear explanations, diagrams, revision notes and topic-wise practice for medical aspirants.",
    outcomes:
      "Connect NCERT concepts; Understand human physiology; Revise with chapter-wise practice",
    language: "Hindi + English",
    status: "Published",
    version: 1,
    access: "Restricted",
    coaching: true,
    requiresSubscription: true,
    rating: 4.9,
    batch: "Udaan 2027",
    lessonsLabel: "38 chapters",
    price: 2999,
  },
  {
    id: "upsc-foundation",
    title: "UPSC Foundation · Your First Step",
    category: "UPSC",
    exam: "UPSC CSE",
    subject: "General Studies",
    level: "Foundation",
    duration: "150+ hours",
    instructor: "Vikram Deshmukh",
    initials: "VD",
    image: "/images/upsc.png",
    color: "peach",
    description:
      "A structured foundation in polity, history, geography and current affairs. Learn with a clear syllabus and a steady study plan.",
    outcomes:
      "Build a general studies foundation; Read current affairs critically; Practise answer writing",
    language: "English + Hindi support",
    status: "Published",
    version: 1,
    access: "Restricted",
    coaching: true,
    requiresSubscription: true,
    rating: 4.8,
    batch: "Prarambh",
    lessonsLabel: "60 chapters",
    price: 3999,
  },
  {
    id: "cbse-maths-10",
    title: "CBSE Class 10 · Maths Made Clear",
    category: "CBSE",
    exam: "CBSE Board",
    subject: "Mathematics",
    level: "Class 10",
    duration: "65+ hours",
    instructor: "Rahul Verma",
    initials: "RV",
    image: "/images/maths.png",
    color: "lilac",
    description:
      "Strengthen your basics, work through NCERT examples and practise board-style questions at a comfortable pace.",
    outcomes:
      "Understand algebra and geometry; Solve NCERT exercises; Prepare for board assessments",
    language: "Hindi + English",
    status: "Published",
    version: 1,
    access: "Restricted",
    coaching: true,
    requiresSubscription: true,
    rating: 4.8,
    batch: "Achievers 2027",
    lessonsLabel: "15 chapters",
    price: 1499,
  },
];
const material = {
  "jee-physics-2027": [
    [
      "Welcome to your physics journey",
      "Reading",
      "Start with concepts, then build speed.",
      "Physics becomes easier when you connect an equation to the physical situation it describes. Work through units, assumptions and diagrams before substituting numbers.\n\nThis demonstration chapter introduces mechanics. Your coaching owner can replace it with full lectures, PDFs and assignments.\n\nStudy habit: after each lesson, solve three questions without looking at the solution. Write down where you got stuck.",
    ],
    [
      "Newton’s laws · a quick revision",
      "Video",
      "See how force, mass and acceleration connect.",
      "Newton’s first law describes motion when the net external force is zero. The second law relates net force to mass and acceleration: F = ma. The third law describes equal and opposite forces acting on different bodies.\n\nAlways identify the body, draw its free-body diagram and choose coordinate axes before writing equations. The short video here is a revision sample, not a full coaching lecture.",
    ],
    [
      "Chapter notes · laws of motion",
      "Document",
      "A concise revision sheet, ready when you are.",
      "Read the attached chapter notes. Check the definition, units and assumptions for each law. Mark any unfamiliar step and ask your faculty during doubt resolution.",
    ],
    [
      "Worked example · free-body diagrams",
      "Image",
      "One diagram can make the next step clear.",
      "For a block resting on a horizontal surface, identify its weight acting downwards and the normal reaction acting upwards. Add any applied force and friction. Equal and opposite action-reaction forces act on different bodies, so they do not cancel in one body’s force equation.",
    ],
    [
      "Practice & your next revision",
      "Reading",
      "Turn understanding into exam confidence.",
      "A 2 kg object accelerates at 3 metres per second squared. The net force is 6 newtons. Before applying F = ma, make sure you are adding all external forces along the chosen axis.\n\nRevision plan: review the notes, attempt five numerical questions and explain one solution aloud. Ask your faculty to check any assumptions you are unsure about.",
    ],
  ],
  "neet-biology-2027": [
    [
      "How to study NCERT biology",
      "Reading",
      "Understand, recall, revise.",
      "Read each NCERT paragraph actively. Connect unfamiliar terms to a diagram or example, then close the book and recall the main idea in your own words.\n\nFor NEET preparation, distinguish conceptual understanding from memorised details. Use topic-wise practice to identify which kind of revision you need.",
    ],
    [
      "The cell · foundations",
      "Reading",
      "The unit of life, explained clearly.",
      "Cells are the basic structural and functional units of living organisms. Prokaryotic cells do not have a membrane-bound nucleus; eukaryotic cells do.\n\nBuild a comparison table for organelles and their functions. Use accurate diagrams and revisit the NCERT wording when checking your answer.",
    ],
    [
      "Human physiology · a study map",
      "Reading",
      "Connect systems instead of learning isolated lists.",
      "The circulatory, respiratory and excretory systems work together to maintain the internal environment. Study how transport, exchange and regulation connect.\n\nDraw a flow diagram of blood through the heart, lungs and body. Explain the direction of flow and the function of each chamber.",
    ],
    [
      "Revision notes · biology",
      "Document",
      "Your quick-reference workbook.",
      "Use the attached study workbook to organise concepts and questions. Add your own chapter references and confirm details against the current NCERT syllabus.",
    ],
    [
      "Practice with purpose",
      "Reading",
      "Your mistakes can guide your revision.",
      "After a topic test, classify each mistake as a missed fact, a misunderstood concept or an error in reading the question. Choose your next revision based on that evidence.\n\nThis sample material demonstrates the learning workflow. Your faculty will publish course-specific teaching and assessments.",
    ],
  ],
  "upsc-foundation": [
    [
      "Your foundation study plan",
      "Reading",
      "Build a consistent, realistic routine.",
      "Begin by reading the current UPSC syllabus and previous-year papers. These define the scope of preparation more reliably than an ever-growing list of resources.\n\nUse one core source per subject, revise regularly and connect current events to syllabus topics.",
    ],
    [
      "Indian polity · the Constitution",
      "Reading",
      "Understand the framework before the details.",
      "The Constitution sets out the structure of government, fundamental rights, directive principles and the distribution of powers. Read each concept in relation to its purpose and institutional context.\n\nPractise explaining the difference between a right, a duty and a directive principle using a concrete example.",
    ],
    [
      "Reading current affairs",
      "Reading",
      "From headlines to understanding.",
      "For a current-affairs issue, identify the syllabus link, key institutions, competing perspectives and available evidence. Avoid treating every news item as equally important.\n\nWrite a short note with context, significance and one question for further reading.",
    ],
    [
      "Answer-writing workbook",
      "Document",
      "Structure a clear argument.",
      "Use an introduction, logically grouped points and a conclusion that responds to the question. Refer to evidence accurately and avoid unsupported assertions.",
    ],
    [
      "Reflect and revise",
      "Reading",
      "A useful plan changes with your progress.",
      "Review your study plan each week. Compare completed topics with recall and practice performance. Completion alone does not demonstrate readiness for the examination.\n\nThis is sample foundation material. Your coaching faculty can publish full lectures and readings.",
    ],
  ],
  "cbse-maths-10": [
    [
      "A confident start to Class 10 maths",
      "Reading",
      "A clear method, one step at a time.",
      "Start with the NCERT examples and practise writing every step. Understanding why a method works helps you remember it and recognise when to use it.\n\nKeep a notebook of mistakes with a corrected example beside each one.",
    ],
    [
      "Quadratic equations · foundations",
      "Reading",
      "Recognise the form and choose a method.",
      "A quadratic equation has the form ax² + bx + c = 0, where a is not zero. Factorisation, completing the square and the quadratic formula are useful methods.\n\nCheck your solution by substituting each root into the original equation.",
    ],
    [
      "Triangles and similarity",
      "Reading",
      "Use the diagram to guide the reasoning.",
      "Similar triangles have equal corresponding angles and proportional corresponding sides. Write the correspondence clearly before forming a ratio.\n\nDraw a labelled diagram and state the similarity criterion used in your proof.",
    ],
    [
      "Board revision workbook",
      "Document",
      "Practise presentation as well as calculation.",
      "Use the workbook to set out your given information, method and final answer. Include units where appropriate and check the marking scheme with your teacher.",
    ],
    [
      "Your next practice session",
      "Reading",
      "Small, focused practice builds fluency.",
      "Choose five questions from one topic. Solve them without a worked solution, check each step and revisit any concept that caused difficulty.\n\nThis sample chapter is for workflow demonstration. Faculty can replace it with complete board-aligned content.",
    ],
  ],
};
export function seedCoaching(store, hashPassword) {
  const { db, get, put } = store;
  db.exec(`CREATE TABLE IF NOT EXISTS coaching_packages(id TEXT PRIMARY KEY,tenant TEXT NOT NULL,name TEXT NOT NULL,price_paise INTEGER NOT NULL CHECK(price_paise>=0),validity_days INTEGER NOT NULL CHECK(validity_days>0),description TEXT NOT NULL,course_ids TEXT NOT NULL,status TEXT NOT NULL,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS subscription_requests(id TEXT PRIMARY KEY,tenant TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),package_id TEXT NOT NULL,package_snapshot TEXT NOT NULL,status TEXT NOT NULL,payment_method TEXT NOT NULL,payment_reference TEXT NOT NULL DEFAULT '',receipt_id TEXT,created TEXT NOT NULL,reviewed TEXT,reviewer TEXT,reason TEXT NOT NULL DEFAULT '');
 CREATE TABLE IF NOT EXISTS subscriptions(id TEXT PRIMARY KEY,tenant TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),package_id TEXT NOT NULL,request_id TEXT UNIQUE,package_name TEXT NOT NULL,course_ids TEXT NOT NULL,paid_paise INTEGER NOT NULL CHECK(paid_paise>=0),starts TEXT NOT NULL,expires TEXT NOT NULL,status TEXT NOT NULL,created TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS subscriptions_access ON subscriptions(user_id,status,starts,expires);
 CREATE INDEX IF NOT EXISTS subscription_requests_queue ON subscription_requests(tenant,status,created);
 CREATE TABLE IF NOT EXISTS coaching_roles(id TEXT PRIMARY KEY,tenant TEXT NOT NULL,name TEXT NOT NULL,permissions TEXT NOT NULL,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS coaching_role_assignments(user_id TEXT PRIMARY KEY REFERENCES users(id),role_id TEXT NOT NULL REFERENCES coaching_roles(id));`);
  const columns = db
    .prepare("PRAGMA table_info(users)")
    .all()
    .map((c) => c.name);
  if (!columns.includes("phone"))
    db.exec("ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT ''");
  if (!columns.includes("last_seen"))
    db.exec("ALTER TABLE users ADD COLUMN last_seen TEXT");
  const questions = {
    "jee-physics-2027": [
      [
        "A 2 kg object accelerates at 3 m/s². What is the net force?",
        ["1.5 N", "5 N", "6 N", "9 N"],
        2,
        "Newton’s second law gives F = ma = 2 × 3 = 6 N.",
      ],
      [
        "When the net external force is zero, an object in motion…",
        [
          "Must stop",
          "Moves at constant velocity",
          "Always accelerates",
          "Moves in a circle",
        ],
        1,
        "Newton’s first law: zero net force means no change in velocity.",
      ],
      [
        "The SI unit of force is…",
        ["Joule", "Watt", "Newton", "Pascal"],
        2,
        "One newton is one kg·m/s².",
      ],
      [
        "Action and reaction forces act on…",
        [
          "The same body",
          "Different bodies",
          "Only stationary bodies",
          "Only falling bodies",
        ],
        1,
        "Newton’s third-law pair acts on different interacting bodies.",
      ],
      [
        "Before writing force equations, which step is most useful?",
        [
          "Ignore friction",
          "Draw a free-body diagram",
          "Assume all forces cancel",
          "Substitute numbers immediately",
        ],
        1,
        "A free-body diagram identifies the external forces on the selected body.",
      ],
    ],
    "neet-biology-2027": [
      [
        "The basic structural and functional unit of life is the…",
        ["Tissue", "Cell", "Organ", "Organ system"],
        1,
        "All living organisms are composed of cells.",
      ],
      [
        "A prokaryotic cell lacks a…",
        ["Cell membrane", "Cytoplasm", "Membrane-bound nucleus", "Ribosome"],
        2,
        "Prokaryotes do not have a membrane-bound nucleus.",
      ],
      [
        "Which organ pumps blood through the circulatory system?",
        ["Lung", "Liver", "Heart", "Kidney"],
        2,
        "The heart pumps blood through pulmonary and systemic circulation.",
      ],
      [
        "Which is a useful approach to NCERT revision?",
        [
          "Recall actively after reading",
          "Only highlight every line",
          "Skip diagrams",
          "Avoid practice questions",
        ],
        0,
        "Active recall helps identify what you understand and what needs revision.",
      ],
      [
        "Gas exchange in human lungs mainly takes place in the…",
        ["Trachea", "Alveoli", "Bronchi", "Diaphragm"],
        1,
        "The alveoli provide a large thin surface for gas exchange.",
      ],
    ],
    "upsc-foundation": [
      [
        "Which source should define the scope of UPSC preparation?",
        [
          "Social media trends",
          "Current syllabus and previous-year papers",
          "Only newspaper headlines",
          "A single coaching advertisement",
        ],
        1,
        "The official syllabus and past papers clarify scope and question demands.",
      ],
      [
        "The Indian Constitution sets out…",
        [
          "Only election dates",
          "The structure of government and fundamental rights",
          "Only economic policies",
          "Only school curricula",
        ],
        1,
        "It provides the constitutional framework of the Indian state.",
      ],
      [
        "Current-affairs study is most useful when linked to…",
        [
          "Syllabus topics",
          "Every trending hashtag",
          "Only celebrity news",
          "Memorising dates alone",
        ],
        0,
        "A syllabus link gives news context and relevance.",
      ],
      [
        "A clear answer should…",
        [
          "Ignore the question",
          "Present a structured argument supported by evidence",
          "Use unsupported claims",
          "Repeat one point",
        ],
        1,
        "Structure and evidence help respond precisely to the question.",
      ],
      [
        "Study progress is best reviewed using…",
        [
          "Pages read alone",
          "Recall and practice performance",
          "Hours of video watched alone",
          "Number of purchased books",
        ],
        1,
        "Practice and recall reveal understanding beyond simple completion.",
      ],
    ],
    "cbse-maths-10": [
      [
        "In ax² + bx + c = 0, the condition for a quadratic is…",
        ["a = 0", "a ≠ 0", "b = 0 always", "c = 0 always"],
        1,
        "The coefficient of x² must be non-zero.",
      ],
      [
        "The roots of x² − 5x + 6 = 0 are…",
        ["1 and 6", "2 and 3", "−2 and −3", "0 and 5"],
        1,
        "Factorisation gives (x − 2)(x − 3) = 0.",
      ],
      [
        "Similar triangles have…",
        [
          "Equal corresponding angles",
          "All sides always equal",
          "Only one equal side",
          "No proportional sides",
        ],
        0,
        "Corresponding angles are equal and corresponding sides proportional.",
      ],
      [
        "A reliable way to check an equation’s root is to…",
        [
          "Guess another number",
          "Substitute it into the original equation",
          "Ignore the constant",
          "Change the equation",
        ],
        1,
        "Substitution verifies that both sides of the original equation agree.",
      ],
      [
        "Which is a recognised quadratic solution method?",
        [
          "Factorisation",
          "Rounding all numbers first",
          "Ignoring the x² term",
          "Dividing by zero",
        ],
        0,
        "Factorisation, completing the square and the quadratic formula are valid methods.",
      ],
    ],
  };
  if (!get("settings", "coaching-question-seed-v1")) {
    for (const [courseId, items] of Object.entries(questions))
      items.forEach(([prompt, options, answer, explanation], i) =>
        put("questions", {
          id: courseId + "-q" + (i + 1),
          courseId,
          type: "single",
          prompt,
          options,
          answer,
          explanation,
          reference: courseId + " · sample chapter",
          updated: stamp(),
        }),
      );
    put("settings", { id: "coaching-question-seed-v1", completed: stamp() });
  }

  if (!get("settings", "coaching-content-v2")) {
    for (const id of ["n1", "n2"]) {
      const n = get("notifications", id);
      if (
        n?.description?.includes("design thinking") ||
        n?.description?.includes("Design Circle")
      )
        put("notifications", { ...n, status: "Archived" });
    }
    for (const [id, oldName, name] of [
      ["instructor-demo", "Olivia Rhye", "Dr. Ananya Rao"],
      ["support-demo", "Demi Wilkinson", "Neha Kulkarni"],
      ["finance-demo", "Phoenix Baker", "Amit Shah"],
      ["tenant-admin", "Lana Steiner", "Pooja Desai"],
    ])
      db.prepare("UPDATE users SET name=? WHERE id=? AND name=?").run(
        name,
        id,
        oldName,
      );
    put("assignments", {
      id: "coaching-physics-practice",
      title: "Laws of motion · numerical practice",
      courseId: "jee-physics-2027",
      description:
        "Draw free-body diagrams for a book resting on a table and a block pulled along a rough surface. Calculate the net force on a 2 kg block accelerating at 3 m/s². Explain your assumptions and include units.",
      due: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      reviewer: "Dr. Ananya Rao",
      status: "Open",
    });
    put("discussions", {
      id: "coaching-physics-doubts",
      title: "Mechanics doubt corner",
      courseId: "jee-physics-2027",
      description:
        "Share a step that confused you in the laws of motion chapter. Explain what you have tried so faculty and classmates can help.",
      author: "Dr. Ananya Rao",
      status: "Open",
      replies: [],
    });
    put("settings", { id: "coaching-content-v2", completed: stamp() });
  }
  if (!get("settings", "coaching-demo-profiles-v1")) {
    const names = [
      "Aditi Sharma",
      "Vivaan Mehta",
      "Anika Rao",
      "Krish Verma",
      "Saira Ansari",
      "Aarush Shah",
      "Mia Patel",
      "Rudra Singh",
      "Avni Nair",
      "Kabir Sethi",
      "Riya Kapoor",
      "Dhruv Iyer",
      "Pari Joshi",
      "Ved Kulkarni",
    ];
    names.forEach((name, i) => {
      const id = "user-" + (i + 1);
      db.prepare(
        "UPDATE users SET name=? WHERE id=? AND email=? AND name IN ('Sienna Hewitt','Noah Williams','Ava Thompson','Ethan Miller','Isabella Moore','Lucas Chen','Mia Patel','Oliver Wilson','Amelia Davis','James Taylor','Charlotte Lee','Benjamin Clark','Harper Lewis','Henry Allen')",
      ).run(name, id, "learner" + (i + 1) + "@example.test");
    });
    put("settings", { id: "coaching-demo-profiles-v1", completed: stamp() });
  }
  if (get("settings", "coaching-migration-v1")) return;
  for (const c of coachingCourses) {
    const lessons = material[c.id].map(
      ([title, type, subtitle, content], i) => ({
        id: c.id + "-lesson-" + (i + 1),
        courseId: c.id,
        title,
        type,
        subtitle,
        content,
        module:
          i < 2 ? "01 · Build your foundation" : "02 · Learn, practise, revise",
        position: i,
        duration: 8 + i * 3,
        required: true,
        downloadable: type === "Reading",
        captions: true,
        rights: true,
        assetIds:
          type === "Video"
            ? ["sample-physics-video"]
            : type === "Document"
              ? ["sample-study-pdf"]
              : type === "Image"
                ? ["sample-physics-image"]
                : [],
      }),
    );
    put("courses", c);
    for (const l of lessons) put("lessons", l);
    put("versions", {
      id: c.id + "-v1",
      courseId: c.id,
      version: 1,
      course: c,
      lessons,
      published: stamp(),
    });
  }
  const mediaRoot = fileURLToPath(new URL("./assets/", import.meta.url));
  for (const [id, title, type, file] of [
    [
      "sample-physics-video",
      "Laws of motion · revision sample",
      "video/mp4",
      "physics-revision.mp4",
    ],
    [
      "sample-study-pdf",
      "Chapter revision workbook",
      "application/pdf",
      "study-workbook.pdf",
    ],
    [
      "sample-physics-image",
      "Free-body diagram",
      "image/svg+xml",
      "free-body-diagram.svg",
    ],
  ])
    put("coaching_assets", {
      id,
      title,
      type,
      filename: file,
      diskPath: mediaRoot + file,
      rights: true,
      status: "Ready",
      created: stamp(),
      userId: "admin-demo",
    });
  const packages = [
    [
      "pkg-jee",
      "JEE Physics · 90 days",
      249900,
      90,
      "Complete physics access, chapter resources, practice and faculty support.",
      ["jee-physics-2027"],
    ],
    [
      "pkg-neet",
      "NEET Biology · 90 days",
      299900,
      90,
      "NCERT-focused biology, revision notes and topic practice.",
      ["neet-biology-2027"],
    ],
    [
      "pkg-all",
      "All Access · 180 days",
      499900,
      180,
      "Explore every published coaching course with one package.",
      coachingCourses.map((c) => c.id),
    ],
    [
      "pkg-cbse",
      "CBSE Maths · 90 days",
      149900,
      90,
      "A structured Class 10 mathematics preparation package.",
      ["cbse-maths-10"],
    ],
  ];
  for (const [id, name, price, days, description, courses] of packages)
    db.prepare(
      "INSERT OR IGNORE INTO coaching_packages VALUES(?,?,?,?,?,?,?,?,?)",
    ).run(
      id,
      "tenant-demo",
      name,
      price,
      days,
      description,
      JSON.stringify(courses),
      "Active",
      stamp(),
    );
  const names = [
    "Ishita Patel",
    "Rohan Kumar",
    "Meera Iyer",
    "Aditya Singh",
    "Sana Khan",
    "Arnav Gupta",
    "Kavya Nair",
    "Dev Shah",
    "Anvi Joshi",
    "Yash Mishra",
    "Diya Reddy",
    "Kabir Malhotra",
  ];
  for (let i = 0; i < names.length; i++) {
    const id = "coaching-learner-" + (i + 1),
      status =
        i >= 8 && i < 11
          ? "Pending activation"
          : i === 11
            ? "Blocked"
            : "Active";
    db.prepare(
      "INSERT OR IGNORE INTO users(id,tenant,email,name,role,status,password,preferences,phone,last_seen) VALUES(?,?,?,?,?,?,?,?,?,?)",
    ).run(
      id,
      "tenant-demo",
      `student${i + 1}@qubit.demo`,
      names[i],
      "Learner",
      status,
      hashPassword("QubitDemo2026!"),
      JSON.stringify({ language: "Hindi + English", timezone: "Asia/Kolkata" }),
      "98765" + String(10000 + i),
      null,
    );
  }
  for (const [id, name] of [
    ["admin-demo", "Rajesh Sharma"],
    ["learner-demo", "Aarav Sharma"],
    ["instructor-demo", "Dr. Ananya Rao"],
  ])
    db.prepare(
      "UPDATE users SET name=? WHERE id=? AND name IN ('Alex Morgan','Jamie Parker','Olivia Rhye')",
    ).run(name, id);
  const active = [
    ["learner-demo", "pkg-all", 65, 115],
    ["coaching-learner-1", "pkg-jee", 84, 6],
    ["coaching-learner-2", "pkg-neet", 87, 3],
    ["coaching-learner-3", "pkg-all", 30, 150],
    ["coaching-learner-4", "pkg-cbse", 20, 70],
    ["coaching-learner-5", "pkg-jee", 95, -5],
  ];
  const at = (days) => new Date(Date.now() + days * 86400000).toISOString();
  for (const [userId, pid, ago, left] of active) {
    const p = db.prepare("SELECT * FROM coaching_packages WHERE id=?").get(pid);
    db.prepare(
      "INSERT OR IGNORE INTO subscriptions VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
    ).run(
      "seed-sub-" + userId,
      "tenant-demo",
      userId,
      pid,
      null,
      p.name,
      p.course_ids,
      p.price_paise,
      at(-ago),
      at(left),
      "Active",
      at(-ago),
    );
    for (const cid of JSON.parse(p.course_ids))
      db.prepare("INSERT OR IGNORE INTO enrolments VALUES(?,?,?,?,?)").run(
        userId,
        cid,
        1,
        "Active",
        at(-ago),
      );
  }
  for (const [i, pid, status, method, ref] of [
    [7, "pkg-jee", "Pending payment", "Cash", ""],
    [8, "pkg-neet", "Pending approval", "UPI", "UPI-DEMO-1026"],
    [9, "pkg-cbse", "Pending approval", "Bank transfer", "BANK-DEMO-2106"],
    [10, "pkg-all", "Pending payment", "Cash", ""],
  ]) {
    const p = db.prepare("SELECT * FROM coaching_packages WHERE id=?").get(pid);
    db.prepare(
      "INSERT OR IGNORE INTO subscription_requests VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
    ).run(
      "seed-request-" + i,
      "tenant-demo",
      "coaching-learner-" + i,
      pid,
      JSON.stringify(p),
      status,
      method,
      ref,
      null,
      at(-1),
      null,
      null,
      "",
    );
  }
  db.prepare("INSERT OR IGNORE INTO progress VALUES(?,?,?,?,?)").run(
    "learner-demo",
    "jee-physics-2027-lesson-1",
    1,
    480,
    stamp(),
  );
  put("settings", {
    id: "coaching",
    name: "Qubit Coaching",
    tagline: "Your ambition. A clear path.",
    city: "Pune, Maharashtra",
    timezone: "Asia/Kolkata",
    supportPhone: "+91 98765 43210",
    upiId: "",
    paymentInstructions:
      "Pay at the coaching centre or submit a reference after making an agreed payment. Access begins after owner verification and account activation.",
    currency: "INR",
    registrationApproval: true,
  });
  put("notifications", {
    id: "coaching-welcome",
    title: "Your next chapter starts here",
    description:
      "Welcome to Qubit Coaching. Explore your courses, keep track of your package and make every study session count.",
    audience: "All learners",
    status: "Published",
    channel: "In-app",
  });
  put("settings", { id: "coaching-migration-v1", completed: stamp() });
}
