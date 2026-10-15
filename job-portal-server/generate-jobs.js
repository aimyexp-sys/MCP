const fs = require('fs');
const path = require('path');

const companies = [
  { name: "NovaTech Solutions", domain: "novatech.io", hr: "Sarah Jenkins (Head of Talent)", phone: "+1 (415) 890-1123", city: "San Francisco, CA", industry: "Cloud & SaaS" },
  { name: "Apex Financial Systems", domain: "apexfin.com", hr: "David Ross (Lead Tech Recruiter)", phone: "+1 (212) 555-0198", city: "New York, NY", industry: "FinTech & Payments" },
  { name: "HealthPulse Analytics", domain: "healthpulse.ai", hr: "Elena Rostova (People Ops Lead)", phone: "+1 (617) 449-3321", city: "Boston, MA", industry: "HealthTech & MedTech" },
  { name: "Vortex Gaming Studios", domain: "vortextstudio.gg", hr: "Marcus Brody (Talent Partner)", phone: "+1 (310) 762-9988", city: "Los Angeles, CA", industry: "Gaming & Entertainment" },
  { name: "CyberShield Security", domain: "cybershield.net", hr: "Priya Nair (Director of Talent Acquisition)", phone: "+1 (703) 891-4455", city: "Reston, VA", industry: "Cybersecurity" },
  { name: "Quantum Commerce", domain: "quantumcommerce.com", hr: "Michael Chang (Senior Tech Sourcer)", phone: "+1 (206) 881-2290", city: "Seattle, WA", industry: "E-Commerce & Logistics" },
  { name: "Aura Mobility", domain: "auramobility.io", hr: "Chloe Bennett (Head of People)", phone: "+1 (512) 674-1189", city: "Austin, TX", industry: "Smart Mobility & EV" },
  { name: "Beacon Health Informatics", domain: "beaconhealth.org", hr: "Robert Kelly (Talent Acquisition)", phone: "+1 (312) 902-6677", city: "Chicago, IL", industry: "Healthcare Informatics" },
  { name: "OmniStream Media", domain: "omnistream.tv", hr: "Sophia Martinez (Talent Executive)", phone: "+1 (408) 321-7788", city: "San Jose, CA", industry: "Streaming & Interactive Media" },
  { name: "Horizon EdTech Lab", domain: "horizonedtech.com", hr: "Liam O'Connor (People Specialist)", phone: "+1 (303) 789-5544", city: "Denver, CO", industry: "EdTech & Learning Platforms" },
  { name: "Zenith Robotics", domain: "zenithrobotics.tech", hr: "Amina Al-Mansoor (VP People)", phone: "+1 (412) 556-3399", city: "Pittsburgh, PA", industry: "Robotics & Automation" },
  { name: "Krypton Cloud Services", domain: "kryptoncloud.io", hr: "Andrew Miller (Technical Recruiter)", phone: "+1 (650) 774-8822", city: "Palo Alto, CA", industry: "Cloud Infrastructure" },
  { name: "SwiftLogistics Global", domain: "swiftlogistics.com", hr: "Jessica Alba-Cruz (HR Director)", phone: "+1 (404) 662-1133", city: "Atlanta, GA", industry: "Supply Chain & IoT" },
  { name: "Hyperion AI Labs", domain: "hyperionai.com", hr: "Dr. Arthur Campbell (Head of Recruitment)", phone: "+1 (617) 998-1244", city: "Cambridge, MA", industry: "Artificial Intelligence" },
  { name: "BluePeak Payments", domain: "bluepeakpay.com", hr: "Rachel Weiss (Talent Manager)", phone: "+1 (305) 441-9087", city: "Miami, FL", industry: "Digital Banking" }
];

const stackTemplates = {
  "MERN": [
    {
      title: "Senior Full Stack MERN Developer",
      skills: ["MongoDB", "Express.js", "React.js", "Node.js", "TypeScript", "Redux Toolkit", "REST APIs", "Docker"],
      desc: "Join our core engineering team to build scalable full-stack web applications using the MERN stack. You will architect robust RESTful microservices, optimize MongoDB query pipelines, and develop high-performance React frontends with TypeScript."
    },
    {
      title: "Lead MERN Engineer (Full Stack Architecture)",
      skills: ["MongoDB", "Express.js", "React.js", "Node.js", "GraphQL", "AWS", "Microservices", "CI/CD"],
      desc: "We are seeking a Lead MERN Engineer to spearhead our next-generation SaaS dashboard. You will drive system design, mentor mid-level engineers, ensure high code quality, and maintain sub-second response times across our platform."
    },
    {
      title: "MERN Stack Web Developer",
      skills: ["React.js", "Node.js", "Express.js", "MongoDB", "Tailwind CSS", "Next.js", "Jest"],
      desc: "Looking for an energetic MERN Developer to build modular, accessible, and responsive user interfaces while collaborating closely with product designers and backend engineers to deploy robust APIs."
    },
    {
      title: "Backend-Heavy MERN Developer",
      skills: ["Node.js", "Express.js", "MongoDB Aggregation", "Redis", "Kafka", "React.js", "Docker"],
      desc: "Focus on distributed server-side logic, high-throughput message ingestion, and caching layers with Redis, while supporting React frontend integration for management portals."
    },
    {
      title: "Junior MERN Stack Associate",
      skills: ["JavaScript (ES6+)", "React.js", "Node.js", "Express.js", "MongoDB", "Git", "REST APIs"],
      desc: "Exciting opportunity for an early-career engineer with strong foundation in JavaScript, React, and Node.js. You will work directly with seasoned mentors on shipping client-facing web features."
    }
  ],
  "MEAN": [
    {
      title: "Senior Full Stack MEAN Developer",
      skills: ["Angular 17+", "Node.js", "Express.js", "MongoDB", "RxJS", "TypeScript", "NgRx", "SCSS"],
      desc: "Lead the frontend architecture utilizing modern Angular standalone components and NgRx state management, backed by battle-tested Node.js and Express REST services on MongoDB."
    },
    {
      title: "Enterprise MEAN Stack Engineer",
      skills: ["Angular", "TypeScript", "Node.js", "Express.js", "MongoDB", "Docker", "Kubernetes", "OAuth2"],
      desc: "Design and implement high-security enterprise portal applications. Strong emphasis on modular Angular architecture, reactive programming with RxJS, and clean RESTful endpoint standards."
    },
    {
      title: "Angular & Node.js (MEAN) Specialist",
      skills: ["Angular", "RxJS", "Node.js", "MongoDB", "Express.js", "Jasmine", "Karma", "WebSockets"],
      desc: "Develop real-time data streaming dashboards using Angular WebSockets and Node.js backend listeners. Optimize DOM rendering performance for high-frequency data updates."
    },
    {
      title: "Full Stack MEAN Developer (FinTech)",
      skills: ["MongoDB", "Express.js", "Angular", "Node.js", "TypeScript", "PCI-DSS compliance", "Jest"],
      desc: "Work on mission-critical transaction settlement portals. Ensure bulletproof transactional integrity in MongoDB and seamless UX in Angular for institutional traders."
    }
  ],
  "Python/Django": [
    {
      title: "Senior Python / Django Backend Engineer",
      skills: ["Python 3.12", "Django", "Django REST Framework", "PostgreSQL", "Celery", "Redis", "Docker"],
      desc: "Build scalable asynchronous data pipelines and RESTful APIs using Django REST Framework and Celery. Optimize complex PostgreSQL database schemas, indexes, and queries."
    },
    {
      title: "Lead Python Backend Architect (Django & FastAPI)",
      skills: ["Python", "Django", "FastAPI", "PostgreSQL", "AWS ECS", "Microservices", "Kafka", "PyTest"],
      desc: "Architect enterprise-grade backend services combining Django's admin/ORM power with FastAPI high-speed async microservices. Mentor engineering teams and enforce API versioning."
    },
    {
      title: "Full Stack Python/Django Developer",
      skills: ["Python", "Django", "HTMX", "PostgreSQL", "TailwindCSS", "JavaScript", "Docker"],
      desc: "Build modern, hyper-fast server-rendered applications using Django and HTMX. Ideal for developers who appreciate pragmatic software engineering without heavy client-side frameworks."
    },
    {
      title: "Python/Django API & Data Engineer",
      skills: ["Python", "Django ORM", "Django REST Framework", "PostgreSQL", "Pandas", "Airflow", "AWS S3"],
      desc: "Bridge the gap between product APIs and our analytical data lake. Design clean REST endpoints for ingestion while automating scheduled background jobs via Celery and Airflow."
    },
    {
      title: "Python Software Engineer (Django Cloud Services)",
      skills: ["Python", "Django", "PostgreSQL", "Redis", "GraphQL (Graphene)", "Kubernetes", "CI/CD"],
      desc: "Contribute to our multi-tenant SaaS backend powering 500k+ daily active users. Focus on high availability, caching strategies, and GraphQL schema governance."
    }
  ],
  "Android": [
    {
      title: "Senior Android Engineer (Jetpack Compose)",
      skills: ["Kotlin", "Jetpack Compose", "Coroutines & Flow", "Dagger Hilt", "Android SDK", "MVVM / MVI", "Room"],
      desc: "Craft beautiful, native Android consumer experiences using modern declarative UI with Jetpack Compose. Champion reactive data flow with Kotlin StateFlow and clean architecture."
    },
    {
      title: "Lead Android Mobile Architect",
      skills: ["Kotlin", "Android SDK", "Jetpack Compose", "Modularization", "CI/CD (Fastlane)", "Unit & UI Testing"],
      desc: "Oversee Android application architecture across multiple feature squads. Drive app startup time optimizations, memory leak mitigation, and modular codebases."
    },
    {
      title: "Android Native Developer (FinTech App)",
      skills: ["Kotlin", "Java", "Android Jetpack", "Retrofit", "Biometric Authentication", "EncryptedSharedPreferences"],
      desc: "Implement high-security mobile banking features on native Android. Integrate biometric authentication, safety net checks, and offline-first Room database synchronization."
    },
    {
      title: "Mobile Engineer - Android Media & Streaming",
      skills: ["Kotlin", "ExoPlayer / Media3", "Jetpack Compose", "OpenGL / C++ NDK", "Android Auto"],
      desc: "Build low-latency audio/video streaming native Android apps. Optimize buffering algorithms with ExoPlayer/Media3 and deliver buttery-smooth playback experiences."
    }
  ],
  "iOS": [
    {
      title: "Senior iOS Developer (SwiftUI & Combine)",
      skills: ["Swift", "SwiftUI", "Combine", "Async/Await", "CoreData / SwiftData", "XCTest", "Clean Architecture"],
      desc: "Design and implement elegant native iOS applications using SwiftUI and modern Swift concurrency. Deliver silky 120Hz animations and fluid interactions across iPhone and iPad devices."
    },
    {
      title: "Staff iOS Architect",
      skills: ["Swift", "SwiftUI", "UIKit", "CocoaPods / SPM", "App Store Guidelines", "Design Systems", "Memory Profiling"],
      desc: "Define the technical vision for our flagship iOS app. Work with product design to build a reusable Swift package design system and ensure top-tier accessibility (VoiceOver, Dynamic Type)."
    },
    {
      title: "iOS Native Engineer (Health & Wearables)",
      skills: ["Swift", "SwiftUI", "HealthKit", "WatchConnectivity", "CoreBluetooth", "SwiftData"],
      desc: "Connect our iOS app to medical wearables and Apple Watch. Stream realtime biometric telemetry using CoreBluetooth, background processing, and HealthKit APIs."
    },
    {
      title: "iOS Mobile Application Engineer",
      skills: ["Swift", "UIKit", "SwiftUI", "Combine", "REST APIs", "Alamofire / URLSession", "Git"],
      desc: "Collaborate in a fast-paced agile team maintaining our e-commerce iOS app. Transition legacy UIKit controllers to SwiftUI while delivering zero-crash production releases."
    }
  ],
  "DevOps / Cloud": [
    {
      title: "Senior Cloud & DevOps Engineer",
      skills: ["AWS", "Terraform", "Kubernetes (EKS)", "Docker", "GitHub Actions", "Prometheus", "Helm"],
      desc: "Build automated GitOps infrastructure, deploy multi-region Kubernetes clusters, and establish automated security compliance across our cloud footprint."
    },
    {
      title: "Site Reliability Engineer (SRE)",
      skills: ["Linux", "Go", "Python", "Kubernetes", "Datadog", "Terraform", "Incident Management"],
      desc: "Ensure 99.99% availability of core customer-facing APIs. Lead chaos engineering drills, automate alerting runbooks, and optimize cloud infrastructure spending."
    }
  ],
  "AI / ML & Data": [
    {
      title: "Machine Learning Engineer (Python & PyTorch)",
      skills: ["Python", "PyTorch", "Transformers (Hugging Face)", "LangChain", "FastAPI", "Vector DBs (Pinecone)", "MLflow"],
      desc: "Build and deploy generative AI applications, fine-tune open-source LLMs, and implement semantic retrieval-augmented generation (RAG) pipelines for enterprise search."
    },
    {
      title: "Senior Data Engineer (Python & Spark)",
      skills: ["Python", "Apache Spark", "Airflow", "PostgreSQL", "Snowflake", "dbt", "AWS Glue"],
      desc: "Architect streaming and batch data pipelines processing millions of daily events. Build data models in Snowflake using dbt and ensure high data reliability."
    }
  ],
  "Java / Spring Boot": [
    {
      title: "Senior Java / Spring Boot Microservices Engineer",
      skills: ["Java 21", "Spring Boot 3", "Spring Cloud", "Kafka", "PostgreSQL", "Docker", "JUnit 5"],
      desc: "Develop distributed, event-driven microservices handling high-volume transaction processing. Implement resilient saga patterns, distributed tracing, and circuit breakers."
    }
  ],
  "Flutter / Cross-Platform": [
    {
      title: "Senior Flutter Mobile Developer",
      skills: ["Dart", "Flutter SDK", "BLoC Pattern", "Firebase", "REST APIs", "iOS & Android deployment"],
      desc: "Build single-codebase cross-platform mobile apps for iOS and Android with pixel-perfect native fidelity and high FPS rendering."
    }
  ]
};

const jobTypes = ["Full-Time", "Full-Time", "Full-Time", "Contract", "Remote", "Hybrid"];
const expLevels = ["Mid-Level", "Senior", "Senior", "Lead / Staff", "Entry-Level"];
const salaries = [
  "$85,000 - $110,000 / year",
  "$105,000 - $135,000 / year",
  "$125,000 - $155,000 / year",
  "$140,000 - $175,000 / year",
  "$160,000 - $195,000 / year",
  "$180,000 - $220,000 / year"
];

// Target counts across stacks (Total = 100)
const distribution = [
  { stack: "MERN", count: 22 },
  { stack: "MEAN", count: 18 },
  { stack: "Python/Django", count: 22 },
  { stack: "Android", count: 15 },
  { stack: "iOS", count: 15 },
  { stack: "DevOps / Cloud", count: 3 },
  { stack: "AI / ML & Data", count: 3 },
  { stack: "Java / Spring Boot", count: 1 },
  { stack: "Flutter / Cross-Platform", count: 1 }
];

const jobs = [];
let idCounter = 1;

distribution.forEach(({ stack, count }) => {
  const templates = stackTemplates[stack];
  for (let i = 0; i < count; i++) {
    const tpl = templates[i % templates.length];
    const comp = companies[(idCounter + i * 3) % companies.length];
    const exp = expLevels[(idCounter + i) % expLevels.length];
    const jType = jobTypes[(idCounter + i * 2) % jobTypes.length];
    const sal = salaries[(idCounter + i * 4) % salaries.length];
    
    // Vary title slightly if repeated
    let title = tpl.title;
    if (i >= templates.length) {
      const prefixes = ["Senior", "Staff", "Principal", "Associate", "Lead"];
      const prefix = prefixes[i % prefixes.length];
      if (!title.startsWith("Senior") && !title.startsWith("Lead") && !title.startsWith("Staff")) {
        title = `${prefix} ${title}`;
      } else {
        title = title.replace(/^(Senior|Lead|Junior)/, prefix);
      }
    }

    const id = `JOB-${String(idCounter).padStart(3, '0')}`;
    const day = (idCounter % 28) + 1;
    const month = ((idCounter % 3) + 8); // 8, 9, 10
    const postedDate = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const deadlineDay = ((day + 22) % 28) + 1;
    const deadlineMonth = month === 12 ? 1 : month + 1;
    const deadlineYear = month === 12 ? 2027 : 2026;
    const applicationDeadline = `${deadlineYear}-${String(deadlineMonth).padStart(2, '0')}-${String(deadlineDay).padStart(2, '0')}`;

    jobs.push({
      id,
      title,
      category: stack,
      techStack: stack,
      company: {
        name: comp.name,
        industry: comp.industry,
        contact: {
          email: `careers@${comp.domain}`,
          phone: comp.phone,
          website: `https://${comp.domain}`,
          address: comp.city,
          hrContactPerson: comp.hr
        }
      },
      description: tpl.desc,
      requirements: {
        experienceLevel: exp,
        experienceYears: exp === "Entry-Level" ? "1-2 years" : exp === "Mid-Level" ? "3-5 years" : exp === "Senior" ? "5-8 years" : "8+ years",
        requiredSkills: tpl.skills,
        education: "Bachelor's degree in Computer Science, Software Engineering, or equivalent practical experience",
        preferredQualifications: [
          "Demonstrated ability to write clean, maintainable, and test-driven code",
          "Strong communication and cross-functional team collaboration skills",
          "Experience with automated CI/CD pipelines and agile development workflows"
        ]
      },
      jobType: jType,
      location: jType === "Remote" ? "Remote (Worldwide / US timezones)" : comp.city,
      salary: sal,
      postedDate,
      applicationDeadline,
      status: "Active"
    });

    idCounter++;
  }
});

const fileContent = `// ============================================================
//  data/jobs.js – 100 Comprehensive Job Vacancy Records
// ============================================================

const jobs = ${JSON.stringify(jobs, null, 2)};

module.exports = jobs;
`;

const targetPath = path.join(__dirname, 'data', 'jobs.js');
fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, fileContent, 'utf8');
console.log(`Generated ${jobs.length} jobs at ${targetPath}`);
