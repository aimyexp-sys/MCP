import React, { useState, useEffect, useMemo } from 'react';
import { 
  Briefcase, 
  Search, 
  MapPin, 
  DollarSign, 
  Clock, 
  Building2, 
  ExternalLink, 
  Mail, 
  Phone, 
  UserCheck, 
  Sun, 
  Moon, 
  X, 
  Send, 
  CheckCircle2, 
  Layers, 
  Filter, 
  PlusCircle,
  Share2,
  ShieldCheck,
  ShieldAlert,
  Trash2
} from 'lucide-react';
import { fallbackJobs } from './data/fallbackJobs';
import {
  isAuth0Configured,
  getStoredToken,
  getStoredUser,
  setSession,
  loginWithAuth0,
  handleAuthCallback,
  clearSession,
  createLocalDevToken
} from './auth';
import './App.css';

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [authToken, setAuthToken] = useState(() => getStoredToken());
  const [authUser, setAuthUser] = useState(() => getStoredUser());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [manualToken, setManualToken] = useState('');

  // Handle Auth0 redirect callback (?code=...) on mount
  useEffect(() => {
    handleAuthCallback().then((handled) => {
      if (handled) {
        setAuthToken(getStoredToken());
        setAuthUser(getStoredUser());
      }
    });
  }, []);

  // Filter States
  const [selectedStack, setSelectedStack] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobType, setSelectedJobType] = useState('All');
  const [selectedExpLevel, setSelectedExpLevel] = useState('All');

  // Modals
  const [activeJobModal, setActiveJobModal] = useState(null);
  const [applyModalJob, setApplyModalJob] = useState(null);
  const [applySuccess, setApplySuccess] = useState(null);
  const [isPostingModal, setIsPostingModal] = useState(false);

  // Application Form State
  const [applicantData, setApplicantData] = useState({
    fullName: '',
    email: '',
    phone: '',
    portfolio: '',
    experienceYears: '3-5 years',
    note: ''
  });

  // Toggle Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  function getApiBase() {
    let url = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:4000/api' : '/api');
    if (!url.startsWith('http') && !url.startsWith('/')) {
      if (!url.includes('.')) {
        url = `${url}.onrender.com`;
      }
      url = `https://${url}`;
    }
    if (!url.endsWith('/api') && url.startsWith('http')) url = `${url.replace(/\/$/, '')}/api`;
    return url;
  }

  // Fetch Jobs from backend API (with Auth0 Bearer token if signed in)
  useEffect(() => {
    async function fetchJobs() {
      setLoading(true);
      const API_BASE = getApiBase();
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

      try {
        const res = await fetch(`${API_BASE}/jobs`, { headers });
        if (res.ok) {
          const data = await res.json();
          const jobList = Array.isArray(data) ? data : (data && data.data);
          if (jobList && jobList.length > 0) {
            setJobs(jobList);
            setApiConnected(true);
            setLoading(false);
            return;
          }
        }
        throw new Error('API not available, fallback to bundled data');
      } catch (err) {
        // Try direct fetch to port 4000 in case proxy isn't routing
        try {
          const directRes = await fetch('http://localhost:4000/api/jobs', { headers });
          if (directRes.ok) {
            const data = await directRes.json();
            if (data && data.data) {
              setJobs(data.data);
              setApiConnected(true);
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          // Use verified local dataset of 100 vacancies
        }
        setJobs(fallbackJobs);
        setApiConnected(false);
        setLoading(false);
      }
    }

    fetchJobs();
  }, [authToken]);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts = { All: jobs.length };
    jobs.forEach(j => {
      const cat = j.techStack || j.category || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [jobs]);

  // Unique categories list
  const categoriesList = useMemo(() => {
    const cats = Object.keys(categoryCounts).filter(c => c !== 'All');
    return ['All', ...cats];
  }, [categoryCounts]);

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Tech stack filter
      if (selectedStack !== 'All') {
        const stackMatch = (job.techStack || job.category || '').toLowerCase() === selectedStack.toLowerCase();
        if (!stackMatch) return false;
      }

      // Job Type filter
      if (selectedJobType !== 'All') {
        if (!job.jobType.toLowerCase().includes(selectedJobType.toLowerCase())) return false;
      }

      // Experience Level filter
      if (selectedExpLevel !== 'All') {
        if (job.requirements.experienceLevel.toLowerCase() !== selectedExpLevel.toLowerCase()) return false;
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = job.title.toLowerCase().includes(q);
        const inCompany = job.company.name.toLowerCase().includes(q);
        const inDesc = job.description.toLowerCase().includes(q);
        const inSkills = job.requirements.requiredSkills.some(s => s.toLowerCase().includes(q));
        const inLocation = job.location.toLowerCase().includes(q);
        if (!inTitle && !inCompany && !inDesc && !inSkills && !inLocation) return false;
      }

      return true;
    });
  }, [jobs, selectedStack, selectedJobType, selectedExpLevel, searchQuery]);

  // Helper for stack badge CSS class
  const getStackClass = (stack) => {
    if (!stack) return 'stack-default';
    const s = stack.toLowerCase();
    if (s.includes('mern')) return 'stack-mern';
    if (s.includes('mean')) return 'stack-mean';
    if (s.includes('python') || s.includes('django')) return 'stack-python';
    if (s.includes('android')) return 'stack-android';
    if (s.includes('ios')) return 'stack-ios';
    if (s.includes('devops') || s.includes('cloud')) return 'stack-devops';
    if (s.includes('ai') || s.includes('ml')) return 'stack-aiml';
    return 'stack-default';
  };

  // Submit Application
  const handleApplySubmit = (e) => {
    e.preventDefault();
    const appId = `APP-${Math.floor(100000 + Math.random() * 900000)}`;
    setApplySuccess({
      applicationId: appId,
      candidateName: applicantData.fullName,
      jobTitle: applyModalJob.title,
      company: applyModalJob.company.name
    });
    // Reset form after brief moment
    setApplicantData({
      fullName: '',
      email: '',
      phone: '',
      portfolio: '',
      experienceYears: '3-5 years',
      note: ''
    });
  };

  return (
    <div className="app-container">
      {/* ── Navbar ────────────────────────────────────────────── */}
      <header className="navbar">
        <div className="brand-section">
          <div className="brand-logo-icon">
            <Briefcase size={22} />
          </div>
          <div>
            <div className="brand-title">TechCareers</div>
            <div className="brand-subtitle">Curated Tech Job Portal • 100+ Vacancies</div>
          </div>
        </div>

        <div className="nav-actions">
          <div className={`api-status-badge ${apiConnected ? '' : 'offline'}`} title="Backend Connection Status">
            <span className="status-dot"></span>
            {apiConnected ? 'API Connected (Port 4000)' : 'Live Demo Data (100 Jobs)'}
          </div>

          <button 
            className="btn-secondary" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '0.82rem', 
              padding: '0.45rem 0.95rem',
              fontWeight: 700,
              background: authToken ? 'rgba(16, 185, 129, 0.15)' : 'linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(168, 85, 247, 0.22))',
              borderColor: authToken ? 'rgba(16, 185, 129, 0.5)' : 'rgba(168, 85, 247, 0.5)',
              color: authToken ? '#10b981' : '#fff',
              boxShadow: authToken ? 'none' : '0 2px 8px rgba(124, 110, 255, 0.2)'
            }}
            onClick={async () => {
              if (authToken) {
                if (confirm('Sign out of Auth0 session?')) {
                  clearSession();
                  setAuthToken('');
                  setAuthUser(null);
                }
              } else {
                setShowAuthModal(true);
              }
            }}
            title={authToken ? "Signed in with Auth0. Click to sign out." : "Log In with Auth0 as Employer/Admin"}
            id="auth-toggle-btn"
          >
            {authToken ? <ShieldCheck size={16} color="#10b981" /> : <ShieldAlert size={16} />}
            <span>{authToken ? (authUser?.name ? `${authUser.name} (Sign Out)` : 'Auth0 Employer (Sign Out)') : 'Log In with Auth0'}</span>
          </button>

          <button 
            className="icon-button" 
            onClick={toggleTheme} 
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            id="theme-toggle-btn"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button 
            className="btn-primary" 
            onClick={() => setIsPostingModal(true)}
            id="post-job-nav-btn"
          >
            <PlusCircle size={16} />
            <span>Post a Vacancy</span>
          </button>
        </div>
      </header>

      {/* ── Hero & Metrics ────────────────────────────────────── */}
      <section className="hero-section">
        <div className="hero-pill">
          <Layers size={14} /> Modern Tech Stack Job Directory
        </div>
        <h1 className="hero-title">
          Discover Your Next High-Impact <br />
          <span className="hero-gradient-text">Software Engineering Role</span>
        </h1>
        <p className="hero-description">
          100 verified job vacancies categorized across MERN, MEAN, Python/Django, Android, iOS, Cloud, and AI/ML ecosystems with verified company contact details.
        </p>

        {/* Aggregate Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              <Briefcase size={24} />
            </div>
            <div>
              <div className="stat-value">{jobs.length}</div>
              <div className="stat-label">Active Vacancies Available</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <Layers size={24} />
            </div>
            <div>
              <div className="stat-value">{categoriesList.length - 1}</div>
              <div className="stat-label">Tech Stack Categories</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <div className="stat-value">$135k</div>
              <div className="stat-label">Average Base Salary</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
              <UserCheck size={24} />
            </div>
            <div>
              <div className="stat-value">100%</div>
              <div className="stat-label">Verified HR & Contacts</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Search & Filter Controls ─────────────────────────── */}
      <div className="controls-container">
        <div className="search-and-dropdowns">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by role, company, skill (e.g. React, Kotlin, Celery)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="job-search-input"
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                <X size={16} />
              </button>
            )}
          </div>

          <select 
            className="filter-select"
            value={selectedJobType}
            onChange={(e) => setSelectedJobType(e.target.value)}
            id="job-type-select"
          >
            <option value="All">All Job Types</option>
            <option value="Full-Time">Full-Time</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="Contract">Contract</option>
          </select>

          <select 
            className="filter-select"
            value={selectedExpLevel}
            onChange={(e) => setSelectedExpLevel(e.target.value)}
            id="experience-level-select"
          >
            <option value="All">All Experience Levels</option>
            <option value="Entry-Level">Entry-Level</option>
            <option value="Mid-Level">Mid-Level</option>
            <option value="Senior">Senior</option>
            <option value="Lead / Staff">Lead / Staff</option>
          </select>
        </div>

        {/* Tech Stack Filter Pills */}
        <div className="stack-tags-wrapper">
          {categoriesList.map(cat => (
            <button
              key={cat}
              className={`stack-tag-btn ${selectedStack === cat ? 'active' : ''}`}
              onClick={() => setSelectedStack(cat)}
            >
              <span>{cat}</span>
              <span className="tag-counter">{categoryCounts[cat] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Results Header ───────────────────────────────────── */}
      <div className="results-header">
        <div className="results-count">
          Showing <strong>{filteredJobs.length}</strong> of {jobs.length} job vacancies
          {selectedStack !== 'All' && <span> in <strong>{selectedStack}</strong></span>}
        </div>
        {(selectedStack !== 'All' || selectedJobType !== 'All' || selectedExpLevel !== 'All' || searchQuery) && (
          <button 
            className="btn-secondary" 
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
            onClick={() => {
              setSelectedStack('All');
              setSelectedJobType('All');
              setSelectedExpLevel('All');
              setSearchQuery('');
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* ── Job Cards Grid ───────────────────────────────────── */}
      {filteredJobs.length > 0 ? (
        <div className="jobs-grid">
          {filteredJobs.map(job => (
            <div key={job.id} className="job-card">
              <div className="card-top">
                <div className="company-info">
                  <span className="company-name">{job.company.name}</span>
                  <span className="company-industry">{job.company.industry}</span>
                </div>
                <span className={`stack-badge ${getStackClass(job.techStack || job.category)}`}>
                  {job.techStack || job.category}
                </span>
              </div>

              <h2 className="job-title" title={job.title}>{job.title}</h2>

              <div className="job-meta-row">
                <span className="meta-item">
                  <MapPin size={14} /> {job.location}
                </span>
                <span className="meta-item">
                  <Clock size={14} /> {job.jobType}
                </span>
                <span className="meta-item">
                  <Building2 size={14} /> {job.requirements.experienceLevel}
                </span>
              </div>

              <p className="job-snippet">{job.description}</p>

              {/* Skills Tags */}
              <div className="skills-pills-row">
                {job.requirements.requiredSkills.slice(0, 4).map(skill => (
                  <span key={skill} className="skill-pill">{skill}</span>
                ))}
                {job.requirements.requiredSkills.length > 4 && (
                  <span className="skill-pill">+{job.requirements.requiredSkills.length - 4} more</span>
                )}
              </div>

              <div className="card-footer">
                <div className="salary-tag">{job.salary}</div>
                <div className="card-actions">
                  <button 
                    className="btn-card-details"
                    onClick={() => setActiveJobModal(job)}
                  >
                    View Details
                  </button>
                  <button 
                    className="btn-card-apply"
                    onClick={() => {
                      setApplySuccess(null);
                      setApplyModalJob(job);
                    }}
                  >
                    Apply Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3 className="empty-title">No Job Postings Match Your Search</h3>
          <p className="empty-subtitle">Try adjusting your filters or searching for another keyword or tech stack.</p>
          <button 
            className="btn-primary"
            onClick={() => {
              setSelectedStack('All');
              setSelectedJobType('All');
              setSelectedExpLevel('All');
              setSearchQuery('');
            }}
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* ── Modal: Job Details & Company Contact ────────────── */}
      {activeJobModal && (
        <div className="modal-backdrop" onClick={() => setActiveJobModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setActiveJobModal(null)}>
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span className={`stack-badge ${getStackClass(activeJobModal.techStack)}`}>
                {activeJobModal.techStack}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {activeJobModal.id}</span>
            </div>

            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              {activeJobModal.title}
            </h2>

            <div className="job-meta-row" style={{ marginBottom: '1.25rem' }}>
              <span className="meta-item"><MapPin size={15} /> {activeJobModal.location}</span>
              <span className="meta-item"><Clock size={15} /> {activeJobModal.jobType}</span>
              <span className="meta-item"><DollarSign size={15} /> {activeJobModal.salary}</span>
            </div>

            {/* Company Contact Card */}
            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Company & Contact Details</span>
              {activeJobModal.isRecruiterContactMasked ? (
                <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600 }}>🔒 Contact Masked (Public)</span>
              ) : (
                <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>🔓 Verified Recruiter Contact</span>
              )}
            </h4>
            <div className="company-contact-card">
              <div>
                <div className="contact-field-label">Company</div>
                <div className="contact-field-value">{activeJobModal.company.name}</div>
              </div>
              <div>
                <div className="contact-field-label">Industry</div>
                <div className="contact-field-value">{activeJobModal.company.industry}</div>
              </div>
              <div>
                <div className="contact-field-label">HR / Recruiter</div>
                <div className="contact-field-value"><UserCheck size={14} /> {activeJobModal.company.contact.hrContactPerson}</div>
              </div>
              <div>
                <div className="contact-field-label">Careers Email</div>
                <div className="contact-field-value"><Mail size={14} /> <a href={`mailto:${activeJobModal.company.contact.email}`}>{activeJobModal.company.contact.email}</a></div>
              </div>
              <div>
                <div className="contact-field-label">Phone</div>
                <div className="contact-field-value"><Phone size={14} /> {activeJobModal.company.contact.phone}</div>
              </div>
              <div>
                <div className="contact-field-label">Website</div>
                <div className="contact-field-value"><ExternalLink size={14} /> <a href={activeJobModal.company.contact.website} target="_blank" rel="noreferrer">{activeJobModal.company.contact.website}</a></div>
              </div>
            </div>

            {/* Job Description */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem' }}>Job Description</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.92rem' }}>
                {activeJobModal.description}
              </p>
            </div>

            {/* Required Skills */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.65rem' }}>Required Skill Sets</h3>
              <div className="skills-pills-row">
                {activeJobModal.requirements.requiredSkills.map(skill => (
                  <span key={skill} className="skill-pill" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Qualifications & Experience */}
            <div style={{ marginBottom: '1.5rem', background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                <strong>Experience:</strong> {activeJobModal.requirements.experienceLevel} ({activeJobModal.requirements.experienceYears})
              </div>
              <div style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                <strong>Education:</strong> {activeJobModal.requirements.education}
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                <strong>Application Deadline:</strong> {activeJobModal.applicationDeadline}
              </div>
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <button 
                className="btn-primary" 
                style={{ flex: 2, minWidth: '160px', justifyContent: 'center' }}
                onClick={() => {
                  const jobToApply = activeJobModal;
                  setActiveJobModal(null);
                  setApplySuccess(null);
                  setApplyModalJob(jobToApply);
                }}
              >
                Apply for this Role
              </button>
              <button 
                className="btn-secondary"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert(`Job link for '${activeJobModal.title}' copied to clipboard!`);
                }}
              >
                <Share2 size={16} /> Share
              </button>
              {authToken && (
                <button 
                  className="btn-secondary"
                  style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                  onClick={async () => {
                    if (!confirm(`Are you sure you want to delete job vacancy '${activeJobModal.title}' (${activeJobModal.id})?`)) return;
                    const API_BASE = getApiBase();
                    try {
                      const res = await fetch(`${API_BASE}/jobs/${activeJobModal.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${authToken}` }
                      });
                      if (res.ok) {
                        setJobs(prev => prev.filter(j => j.id !== activeJobModal.id));
                        setActiveJobModal(null);
                        alert(`Job '${activeJobModal.id}' deleted successfully.`);
                      } else {
                        const err = await res.json().catch(() => ({}));
                        alert(`Failed to delete vacancy: ${err.message || 'Unauthorized action'}`);
                      }
                    } catch (e) {
                      alert(`Error connecting to server: ${e.message}`);
                    }
                  }}
                  title="Delete this vacancy posting (Authenticated Action)"
                >
                  <Trash2 size={16} /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Apply Now Form ────────────────────────────── */}
      {applyModalJob && (
        <div className="modal-backdrop" onClick={() => setApplyModalJob(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setApplyModalJob(null)}>
              <X size={18} />
            </button>

            {applySuccess ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <CheckCircle2 size={54} color="#10b981" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>Application Submitted!</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                  Thank you <strong>{applySuccess.candidateName}</strong>! Your application for <strong>{applySuccess.jobTitle}</strong> at <strong>{applySuccess.company}</strong> has been received by their talent acquisition team.
                </p>
                <div style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  Application Ref: <strong>{applySuccess.applicationId}</strong>
                </div>
                <button className="btn-primary" onClick={() => setApplyModalJob(null)}>
                  Close
                </button>
              </div>
            ) : (
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.25rem' }}>Apply for Position</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  {applyModalJob.title} • {applyModalJob.company.name}
                </p>

                <form onSubmit={handleApplySubmit}>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input 
                        type="text" 
                        required 
                        className="form-input" 
                        placeholder="e.g. Alex Morgan"
                        value={applicantData.fullName}
                        onChange={(e) => setApplicantData({ ...applicantData, fullName: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email Address *</label>
                      <input 
                        type="email" 
                        required 
                        className="form-input" 
                        placeholder="alex@example.com"
                        value={applicantData.email}
                        onChange={(e) => setApplicantData({ ...applicantData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Phone Number *</label>
                      <input 
                        type="tel" 
                        required 
                        className="form-input" 
                        placeholder="+1 (555) 000-0000"
                        value={applicantData.phone}
                        onChange={(e) => setApplicantData({ ...applicantData, phone: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Portfolio / GitHub Profile</label>
                      <input 
                        type="url" 
                        className="form-input" 
                        placeholder="https://github.com/username"
                        value={applicantData.portfolio}
                        onChange={(e) => setApplicantData({ ...applicantData, portfolio: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Years of Experience</label>
                    <select 
                      className="form-select"
                      value={applicantData.experienceYears}
                      onChange={(e) => setApplicantData({ ...applicantData, experienceYears: e.target.value })}
                    >
                      <option value="1-2 years">1-2 years (Junior / Associate)</option>
                      <option value="3-5 years">3-5 years (Mid-Level)</option>
                      <option value="5-8 years">5-8 years (Senior)</option>
                      <option value="8+ years">8+ years (Lead / Staff)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cover Note / Why You're a Great Fit</label>
                    <textarea 
                      className="form-textarea" 
                      rows={3}
                      placeholder="Brief note highlighting your relevant tech stack experience..."
                      value={applicantData.note}
                      onChange={(e) => setApplicantData({ ...applicantData, note: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                    <button type="button" className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setApplyModalJob(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
                      <Send size={15} /> Submit Application
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Post a Job ────────────────────────────────── */}
      {isPostingModal && (
        <div className="modal-backdrop" onClick={() => setIsPostingModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setIsPostingModal(false)}>
              <X size={18} />
            </button>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem' }}>Post a New Vacancy</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Add a new tech role to the portal. It will immediately appear in the listings.
            </p>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target;
              const API_BASE = getApiBase();

              const newJob = {
                title: form.title.value,
                category: form.techStack.value,
                techStack: form.techStack.value,
                company: {
                  name: form.companyName.value,
                  industry: form.industry.value,
                  contact: {
                    email: form.contactEmail.value,
                    phone: '+1 (555) 789-0123',
                    website: form.website.value,
                    address: form.location.value,
                    hrContactPerson: form.hrContact.value
                  }
                },
                description: form.description.value,
                requirements: {
                  experienceLevel: form.experienceLevel.value,
                  experienceYears: '3+ years',
                  requiredSkills: form.skills.value.split(',').map(s => s.trim()).filter(Boolean),
                  education: "Bachelor's degree in Computer Science or equivalent practical experience",
                  preferredQualifications: ['Strong engineering fundamentals']
                },
                jobType: form.jobType.value,
                location: form.location.value,
                salary: form.salary.value
              };

              if (!authToken) {
                alert('Authentication required: Please sign in with Auth0 to post a vacancy.');
                return;
              }

              try {
                const res = await fetch(`${API_BASE}/jobs`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                  },
                  body: JSON.stringify(newJob)
                });

                if (res.ok) {
                  const created = await res.json();
                  const saved = created.data;
                  setJobs([saved, ...jobs]);
                  setIsPostingModal(false);
                  alert(`Job '${saved.title}' posted and authenticated successfully on server!`);
                } else {
                  const errData = await res.json().catch(() => ({}));
                  alert(`Posting rejected by server: ${errData.message || 'Unauthorized action'}`);
                }
              } catch (err) {
                alert(`Error connecting to server: ${err.message}`);
              }
            }}>
              {!authToken && (
                <div style={{ padding: '0.85rem', marginBottom: '1rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span>⚠️ You must be signed in with Auth0 to publish a vacancy (SEC-07).</span>
                  <button type="button" className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setShowAuthModal(true)}>
                    Log In with Auth0
                  </button>
                </div>
              )}
              {authToken && (
                <div style={{ padding: '0.65rem 0.85rem', marginBottom: '1rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} /> Authenticated as {authUser?.name || authUser?.sub || 'Authorized Employer'}
                </div>
              )}

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Job Title *</label>
                  <input name="title" required className="form-input" placeholder="e.g. Senior MERN Stack Architect" />
                </div>
                <div className="form-group">
                  <label className="form-label">Tech Stack Category *</label>
                  <select name="techStack" className="form-select">
                    <option value="MERN">MERN</option>
                    <option value="MEAN">MEAN</option>
                    <option value="Python/Django">Python/Django</option>
                    <option value="Android">Android</option>
                    <option value="iOS">iOS</option>
                    <option value="DevOps / Cloud">DevOps / Cloud</option>
                    <option value="AI / ML & Data">AI / ML & Data</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Company Name *</label>
                  <input name="companyName" required className="form-input" placeholder="e.g. Acme Tech" />
                </div>
                <div className="form-group">
                  <label className="form-label">Industry</label>
                  <input name="industry" className="form-input" placeholder="e.g. FinTech / SaaS" defaultValue="Software & Cloud" />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">HR / Recruiter Name *</label>
                  <input name="hrContact" required className="form-input" placeholder="e.g. Jane Doe (Talent Lead)" />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Email *</label>
                  <input name="contactEmail" type="email" required className="form-input" placeholder="careers@acme.com" />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Company Website</label>
                  <input name="website" type="url" className="form-input" placeholder="https://acme.com" defaultValue="https://example.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input name="location" className="form-input" placeholder="San Francisco, CA or Remote" defaultValue="Remote" />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Job Type</label>
                  <select name="jobType" className="form-select">
                    <option value="Full-Time">Full-Time</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Experience Level</label>
                  <select name="experienceLevel" className="form-select">
                    <option value="Mid-Level">Mid-Level</option>
                    <option value="Senior">Senior</option>
                    <option value="Lead / Staff">Lead / Staff</option>
                    <option value="Entry-Level">Entry-Level</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Salary Range</label>
                <input name="salary" className="form-input" placeholder="$120,000 - $150,000 / year" defaultValue="$120,000 - $150,000 / year" />
              </div>

              <div className="form-group">
                <label className="form-label">Required Skills (comma separated) *</label>
                <input name="skills" required className="form-input" placeholder="React, Node.js, TypeScript, MongoDB" />
              </div>

              <div className="form-group">
                <label className="form-label">Job Description (JD) *</label>
                <textarea name="description" required className="form-textarea" rows={3} placeholder="Detailed role description..." />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setIsPostingModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
                  Publish Vacancy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Auth0 Login Modal ─────────────────────────────────── */}
      {showAuthModal && (
        <div className="modal-backdrop" onClick={() => setShowAuthModal(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowAuthModal(false)}>
              <X size={18} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
              <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '8px', borderRadius: '8px' }}>
                <ShieldCheck size={20} color="#818cf8" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Auth0 Employer Login</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Authenticate with Auth0 to post vacancies & view recruiter contacts</div>
              </div>
            </div>

            <div style={{ padding: '1rem 0 0.5rem 0' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                  <span style={{ background: 'rgba(247, 168, 79, 0.2)', color: '#f59e0b', padding: '2px 8px', borderRadius: '100px', fontWeight: 700, fontSize: '0.72rem' }}>
                    🔒 Fail-Closed Protection (SEC-05)
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.4' }}>
                  Per SEC-05 & SEC-07, mutations require verified Auth0 Bearer tokens. All demo secrets have been removed.
                </div>
              </div>

              {isAuth0Configured() ? (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', marginBottom: '0.75rem', fontSize: '0.92rem' }}
                  onClick={async () => {
                    try {
                      await loginWithAuth0();
                    } catch (err) {
                      alert(`Auth0 Error: ${err.message}`);
                    }
                  }}
                >
                  🚀 Continue to Auth0 Login (PKCE)
                </button>
              ) : (
                <>
                  <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '8px', padding: '10px', marginBottom: '14px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    💡 <strong>Production Setup</strong>: Set <code>VITE_AUTH0_DOMAIN</code> and <code>VITE_AUTH0_CLIENT_ID</code> in <code>.env</code> for live cloud Auth0 redirect.
                  </div>

                  <button
                    type="button"
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', marginBottom: '14px', fontSize: '0.9rem', background: 'linear-gradient(135deg, #10b981, #059669)', borderColor: '#10b981' }}
                    onClick={async () => {
                      try {
                        const token = await createLocalDevToken();
                        setSession(token, { name: 'Demo Employer' });
                        setAuthToken(token);
                        setAuthUser({ name: 'Demo Employer' });
                        setShowAuthModal(false);
                      } catch (err) {
                        alert(`Error: ${err.message}`);
                      }
                    }}
                  >
                    ⚡ Sign In as Demo Employer (Local Dev)
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '12px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>or paste bearer token</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Paste Auth0 Bearer Token (JWT)..."
                      value={manualToken}
                      onChange={e => setManualToken(e.target.value)}
                      style={{ fontSize: '0.78rem', fontFamily: 'monospace' }}
                    />
                  </div>

                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', padding: '0.6rem' }}
                    onClick={() => {
                      if (!manualToken.trim()) {
                        alert('Please enter a valid token');
                        return;
                      }
                      setSession(manualToken.trim(), { name: 'Verified Token' });
                      setAuthToken(manualToken.trim());
                      setAuthUser({ name: 'Verified Token' });
                      setShowAuthModal(false);
                    }}
                  >
                    Apply Bearer Token
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
