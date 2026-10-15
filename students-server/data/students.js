// ============================================================
//  Dummy Student Data  –  100 records
//  Tech stacks covered: MERN | MEAN | Python | Android | iOS
// ============================================================

const TECH_STACKS = {
  MERN: {
    label: "MERN Stack",
    subSkills: [
      "MongoDB – Schema design, Aggregation, Indexing",
      "Express.js – REST API, Middleware, Authentication",
      "React.js – Hooks, Context API, Redux",
      "Node.js – Event Loop, Streams, Clustering",
      "JWT Authentication",
      "Mongoose ORM",
      "React Router v6",
      "Axios / Fetch API",
      "Socket.IO",
      "Docker & Deployment (Vercel / Render)",
    ],
  },
  MEAN: {
    label: "MEAN Stack",
    subSkills: [
      "MongoDB – Schema design, Atlas Cloud",
      "Express.js – REST API, CORS, Rate Limiting",
      "Angular – Components, Services, RxJS",
      "Node.js – Event-driven architecture",
      "TypeScript",
      "Angular Material UI",
      "NgRx State Management",
      "JWT & OAuth2",
      "Mongoose ORM",
      "Nginx Reverse Proxy",
    ],
  },
  Python: {
    label: "Python / Django / Flask",
    subSkills: [
      "Python Core – OOP, Decorators, Generators",
      "Django – MVT, ORM, REST Framework",
      "Flask – Blueprints, Jinja2, WTForms",
      "FastAPI – Pydantic, Async Endpoints",
      "SQLAlchemy & Alembic Migrations",
      "Celery & Redis Task Queue",
      "Pandas & NumPy",
      "Scikit-learn Basics",
      "PostgreSQL / MySQL",
      "Docker & Gunicorn Deployment",
    ],
  },
  Android: {
    label: "Android Development",
    subSkills: [
      "Kotlin – Coroutines, Flow, Sealed Classes",
      "Android SDK – Activities, Fragments, Intents",
      "Jetpack Compose – Layouts, State, Navigation",
      "MVVM Architecture",
      "Room Database",
      "Retrofit & OkHttp",
      "Hilt Dependency Injection",
      "Firebase (Auth, Firestore, FCM)",
      "Material Design 3",
      "Google Play Store Deployment",
    ],
  },
  iOS: {
    label: "iOS Development",
    subSkills: [
      "Swift – Optionals, Protocols, Closures",
      "SwiftUI – Views, State, Combine",
      "UIKit – Storyboards, Auto Layout",
      "Core Data",
      "URLSession & Alamofire",
      "Combine Framework",
      "MVVM-C Architecture",
      "Push Notifications (APNs)",
      "TestFlight & App Store Connect",
      "Xcode Instruments & Profiling",
    ],
  },
};

// Helper – pick N unique random items from an array
function pickRandom(arr, min, max) {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ── Raw name / data pools ────────────────────────────────────
const FIRST_NAMES = [
  "Aarav","Aditi","Aditya","Akash","Amit","Amrita","Ananya","Anil","Anjali","Ankit",
  "Anushka","Arjun","Aryan","Ashish","Bhavna","Chandan","Deepa","Deepak","Dhruv","Divya",
  "Gaurav","Harish","Harsha","Ishaan","Ishita","Jay","Jiya","Kabir","Karan","Kavya",
  "Kiara","Kriti","Kunal","Lakshmi","Manish","Meera","Mihir","Mira","Mohit","Namrata",
  "Neha","Nikhil","Nisha","Nishant","Palak","Pankaj","Pooja","Priya","Rahul","Raj",
  "Rajesh","Raksha","Ramesh","Ravi","Ritesh","Rohit","Roshni","Ruchi","Sachin","Sahil",
  "Sakshi","Sandeep","Sanjay","Sarika","Seema","Shivam","Shruti","Simran","Sneha","Sonal",
  "Sonia","Sourav","Suresh","Swati","Tanvi","Tarun","Tushar","Uday","Uma","Vaibhav",
  "Varsha","Vikas","Vikram","Vipul","Vivek","Yash","Yogesh","Zara","Arnav","Bharat",
  "Chirag","Disha","Farhan","Garima","Hitesh","Isha","Jayesh","Kartik",
];

const LAST_NAMES = [
  "Sharma","Verma","Patel","Gupta","Singh","Kumar","Mehta","Joshi","Rao","Shah",
  "Chopra","Malhotra","Nair","Reddy","Iyer","Pillai","Chatterjee","Bose","Das","Sen",
  "Mishra","Tiwari","Pandey","Dubey","Shukla","Srivastava","Agarwal","Bansal","Garg","Jain",
];

const DOMAINS = [
  "gmail.com","yahoo.com","outlook.com","hotmail.com",
  "protonmail.com","icloud.com","rediffmail.com",
];

const STACK_KEYS = Object.keys(TECH_STACKS); // ['MERN','MEAN','Python','Android','iOS']

// ── Generator ────────────────────────────────────────────────
function generateStudents(count = 100) {
  const students = [];
  const usedEmails = new Set();

  for (let i = 1; i <= count; i++) {
    const firstName = FIRST_NAMES[(i - 1) % FIRST_NAMES.length];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const fullName = `${firstName} ${lastName}`;

    // Unique email
    let email;
    do {
      const tag = Math.random() < 0.5 ? `${Math.floor(Math.random() * 999)}` : "";
      email = `${firstName.toLowerCase()}${tag}@${DOMAINS[Math.floor(Math.random() * DOMAINS.length)]}`;
    } while (usedEmails.has(email));
    usedEmails.add(email);

    // Indian-style mobile: 10 digits starting with 6-9
    const mobile =
      `+91 ${String(Math.floor(Math.random() * 4) + 6)}` +
      `${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;

    // Each student knows 1-3 stacks
    const assignedStackKeys = pickRandom(STACK_KEYS, 1, 3);

    const technicalSkills = assignedStackKeys.map((stackKey) => {
      const stack = TECH_STACKS[stackKey];
      return {
        stack: stackKey,
        label: stack.label,
        // Pick 4-7 sub-skills per assigned stack
        subSkills: pickRandom(stack.subSkills, 4, 7),
        proficiencyLevel: ["Beginner", "Intermediate", "Advanced"][
          Math.floor(Math.random() * 3)
        ],
      };
    });

    students.push({
      id: i,
      name: fullName,
      email,
      mobile,
      technicalSkills,
      enrolledYear: 2021 + Math.floor(Math.random() * 4), // 2021-2024
      graduationYear: 2025 + Math.floor(Math.random() * 3), // 2025-2027
    });
  }

  return students;
}

let students;
try {
  students = require("./students.json");
} catch (e) {
  students = generateStudents(100);
}

module.exports = { students, TECH_STACKS };
