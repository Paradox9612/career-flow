# CAREERFLOW
## Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** November 13, 2026  
**Product:** CareerFlow – Job Application Tracker  
**Platform:** Responsive Web Application  
**Development Environment:** Google AI Studio Build Mode  
**Target:** Zero-cost development and operation within free-tier limits

---

# 1. PRODUCT OVERVIEW

## 1.1 Product Description

CareerFlow is an intelligent job application management platform that helps job seekers organize, track, analyze and improve their job search journey.

The application acts as a centralized career workspace where users can manage job applications, companies, recruiters, interviews, resumes, follow-ups, career goals and job search analytics.

It also includes an optional AI-powered career assistant that helps users analyze resumes, compare job descriptions, generate cover letters and prepare for interviews.

CareerFlow should be designed as a professional SaaS-style application with a clean interface, excellent usability and a scalable architecture.

## 1.2 Product Vision

"Make every job application organized, every interview prepared and every career decision informed."

## 1.3 Target Users

Primary:
- Fresh graduates.
- Students searching for internships.
- Software developers.
- Experienced professionals.
- Job seekers applying to multiple companies.

Secondary:
- People switching careers.
- Freelancers searching for employment.
- Professionals preparing for new opportunities.

## 1.4 Product Goals

1. Track every job application in one place.
2. Make application status management simple.
3. Reduce missed interviews and recruiter follow-ups.
4. Store resumes and application-specific documents.
5. Provide meaningful job search analytics.
6. Improve application quality through AI assistance.
7. Help users identify their job search weaknesses.
8. Operate without mandatory paid subscriptions or services.

## 1.5 Non-Goals for Initial Release

- Building a job portal.
- Automatically applying to jobs.
- Scraping LinkedIn, Naukri or other job portals.
- Paid subscription management.
- Enterprise recruitment management.
- Automated recruiter messaging.
- Native Android or iOS applications.

---

# 2. PRODUCT ARCHITECTURE

## 2.1 Technology Stack

| Layer | Technology |
|---|---|
| Development | Google AI Studio Build Mode |
| Frontend | React + TypeScript |
| Build tool | Vite, if supported by generated project |
| Styling | Tailwind CSS |
| UI components | shadcn/ui |
| Icons | Lucide React |
| Backend | Node.js server runtime |
| Database | Firebase Firestore |
| Authentication | Firebase Authentication |
| AI | Gemini API Free Tier |
| Charts | Recharts |
| Date utilities | date-fns |
| Form handling | React Hook Form |
| Validation | Zod |
| State management | React Context / hooks |
| File processing | Browser-side parsing |
| Local storage | IndexedDB where appropriate |
| Version control | GitHub |
| Hosting | Eligible free-tier hosting |

Do not introduce MongoDB Atlas, PostgreSQL, Prisma, paid APIs or paid SaaS dependencies unless a future requirement justifies them.

## 2.2 Architecture Principles

- Keep frontend and backend logic separate.
- Keep Gemini API keys server-side.
- Use Firebase Authentication for identity.
- Use Firestore for persistent application data.
- Apply Firebase Security Rules.
- Validate all incoming data.
- Use reusable components.
- Avoid duplicated business logic.
- Support loading, error and empty states.
- Make AI features optional.
- Keep the core tracker functional without AI.

## 2.3 High-Level Architecture

User
  |
  v
React + TypeScript Frontend
  |
  +---- Authentication
  |       |
  |       v
  |    Firebase Auth
  |
  +---- Application Services
  |       |
  |       v
  |    Firestore Database
  |
  +---- AI Assistant
          |
          v
       Node.js Server
          |
          v
       Gemini API

All user-owned database records must be isolated using authenticated user IDs and Firestore security rules.

---

# 3. APPLICATION MODULES

## MODULE 1: AUTHENTICATION AND USER PROFILE

### Features

1. Google sign-in.
2. Email and password sign-in.
3. Registration.
4. Logout.
5. Password recovery.
6. Protected routes.
7. Persistent authentication.
8. User profile management.

### User Profile Fields

- Full name.
- Email.
- Profile picture.
- Phone number (optional).
- Current job title.
- Total experience.
- Education.
- Skills.
- Preferred job roles.
- Preferred locations.
- Remote / hybrid / office preference.
- Expected salary.
- Preferred employment type.

### Acceptance Criteria

- Users can register and log in.
- Unauthenticated users cannot access private application data.
- Users can update their profiles.
- Users can log out.
- One user cannot access another user's records.

---

## MODULE 2: DASHBOARD

The dashboard is the primary landing page after authentication.

### KPI Cards

1. Total Applications.
2. Applied.
3. In Progress.
4. Interviews.
5. Offers Received.
6. Rejected.
7. Pending Follow-ups.

### Dashboard Widgets

**A. Application Funnel**

Visualize:
- Interested.
- Preparing.
- Applied.
- Assessment.
- Interview.
- Offer.
- Accepted.

**B. Application Trend**

- Applications per week.
- Applications per month.
- Current month versus previous month.

**C. Application Status Distribution**

Display the number of applications in each status.

**D. Upcoming Activities**

- Upcoming interviews.
- Follow-up reminders.
- Pending assessments.
- Important deadlines.

**E. Recent Activity**

Show the latest application updates and user actions.

**F. Weekly Goals**

- Weekly application target.
- Applications submitted.
- Remaining applications.
- Goal completion percentage.

### Acceptance Criteria

- Dashboard values must come from actual database records.
- Charts must update when applications change.
- Empty dashboards must show helpful onboarding guidance.
- Users can navigate directly from KPI cards to filtered application lists.

---

## MODULE 3: JOB APPLICATION MANAGEMENT

This is the most important module.

### 3.1 Create Application

Fields:

**Company Information**
- Company name.
- Company logo (optional).
- Company website.
- Industry.
- Company location.

**Job Information**
- Job title.
- Job description.
- Job URL.
- Job location.
- Employment type.
- Work mode.
- Experience required.
- Salary range.
- Job source.

**Application Information**
- Application date.
- Current status.
- Priority.
- Resume version.
- Cover letter.
- Recruiter name.
- Recruiter email.
- Recruiter LinkedIn URL.
- Notes.
- Next follow-up date.

### 3.2 Application Statuses

Support these predefined statuses:

1. Interested.
2. Preparing.
3. Applied.
4. Assessment.
5. HR Interview.
6. Technical Interview.
7. Managerial Interview.
8. Final Interview.
9. Offer Received.
10. Offer Accepted.
11. Offer Rejected.
12. Rejected.
13. Withdrawn.
14. No Response.

Allow users to customize stages in a later phase.

### 3.3 Application Views

**Kanban View**
- Drag and drop applications.
- Columns grouped by status.
- Quick status changes.
- Application summary cards.

**Table View**
- Sortable columns.
- Search.
- Filtering.
- Pagination.
- Quick actions.

**List View**
- Compact application cards.
- Recent updates.
- Status labels.

**Calendar View**
- Interview dates.
- Follow-up dates.
- Assessment deadlines.

### 3.4 Application Details

Each application should have a detailed page containing:

- Company information.
- Job information.
- Application status.
- Application timeline.
- Interview rounds.
- Attached resume information.
- Cover letter information.
- Recruiter information.
- Notes.
- Tasks.
- Follow-up history.

### 3.5 Application Activity Timeline

Record:
- Application created.
- Application submitted.
- Status changed.
- Interview scheduled.
- Interview completed.
- Recruiter contacted.
- Follow-up completed.
- Offer received.
- Application closed.

### 3.6 Duplicate Detection

Before creating a new application, warn if a similar application already exists.

Check:
- Company name.
- Job title.
- Job URL.

Do not automatically reject duplicates. Allow the user to review and proceed if necessary.

### Acceptance Criteria

- Users can create, update, view and delete applications.
- Every application belongs to its owner.
- Status changes update the timeline.
- Filters and sorting work correctly.
- Kanban changes persist after refresh.
- Duplicate warnings are displayed when appropriate.

---

## MODULE 4: INTERVIEW MANAGEMENT

### Features

- Create interview rounds.
- Associate interviews with applications.
- Schedule date and time.
- Select interview type.
- Add interviewer information.
- Store meeting links.
- Add preparation notes.
- Add questions asked.
- Record feedback.
- Record results.

### Interview Types

- HR.
- Technical.
- Coding assessment.
- Managerial.
- System design.
- Final interview.
- Other.

### Interview Status

- Scheduled.
- Completed.
- Rescheduled.
- Cancelled.

### Interview Preparation

Each interview should provide:

- Topics to revise.
- Questions to practice.
- Personal notes.
- Preparation checklist.
- Interview feedback.

### Acceptance Criteria

- One application supports multiple interview rounds.
- Interviews appear on the calendar.
- Completed interviews can retain feedback.
- Upcoming interviews are displayed on the dashboard.

---

## MODULE 5: FOLLOW-UP AND TASK MANAGEMENT

### Features

Create tasks with:

- Task title.
- Description.
- Associated application.
- Due date.
- Priority.
- Reminder date.
- Completion status.

### Task Categories

- Recruiter follow-up.
- Interview preparation.
- Assessment deadline.
- Resume update.
- Research company.
- Other.

### Task Status

- Pending.
- In Progress.
- Completed.
- Overdue.

### Follow-up Management

- Set follow-up dates.
- View upcoming follow-ups.
- Mark follow-ups complete.
- Maintain follow-up history.
- Generate suggested email templates.

### Reminder Strategy

MVP:
- In-app reminders.
- Dashboard reminders.
- Calendar-based upcoming tasks.

Future:
- Browser notifications.
- Email notifications if a free email integration is available.

Do not depend on paid SMS, WhatsApp or email services.

---

## MODULE 6: RESUME AND DOCUMENT MANAGEMENT

### Features

- Create resume records.
- Upload or select resume files.
- Maintain multiple resume versions.
- Associate a resume version with an application.
- Store cover letter records.
- Maintain certificates and supporting documents.
- Track which resume was used for each application.

### Resume Fields

- Resume name.
- Version.
- File name.
- Skills.
- Experience.
- Created date.
- Last updated date.
- Notes.

### Storage Strategy

For the zero-cost MVP:
- Keep resume metadata in Firestore.
- Keep selected local files in browser IndexedDB.
- Allow users to download files.
- Process uploaded files locally when possible.
- Never claim that locally stored files are available on another device.

Future enhancement:
- Add cloud file storage if required.

---

## MODULE 7: COMPANY AND RECRUITER MANAGEMENT

### Company Records

- Company name.
- Website.
- Industry.
- Location.
- Careers page.
- Company notes.
- Company status.
- Previous applications.

### Recruiter Records

- Recruiter name.
- Email.
- Phone (optional).
- LinkedIn URL.
- Company.
- Designation.
- Communication notes.

### Features

- Search companies.
- View company application history.
- View associated recruiters.
- Store communication history.
- Link companies with applications.

---

## MODULE 8: AI CAREER ASSISTANT

AI features must use the Gemini API through the server-side runtime.

AI should be optional and must never block core application workflows.

### 8.1 Resume Analyzer

Input:
- Resume text extracted from PDF or DOCX.

Output:
- Resume summary.
- Skills detected.
- Experience summary.
- Strengths.
- Weaknesses.
- Missing information.
- Improvement recommendations.
- ATS-oriented formatting suggestions.

Do not advertise an AI-generated score as a guaranteed ATS score.

### 8.2 Job Description Analyzer

Input:
- Job title.
- Company.
- Job description.

Output:
- Required skills.
- Preferred skills.
- Responsibilities.
- Experience requirements.
- Education requirements.
- Important keywords.

### 8.3 Resume-to-Job Matching

Compare resume content against job requirements.

Output:
- Match percentage.
- Matched skills.
- Missing skills.
- Relevant experience.
- Recommendations.

Explain how the match percentage was calculated. Do not present it as an actual employer ATS result.

### 8.4 Cover Letter Generator

Inputs:
- Resume information.
- Job description.
- Company name.
- Job title.
- Tone preference.

Output:
- Personalized cover letter.
- Editable content.
- Copy option.
- Regenerate option.

### 8.5 Interview Question Generator

Generate:
- Technical questions.
- HR questions.
- Role-specific questions.
- Behavioral questions.
- System design questions where applicable.
- Suggested answers and explanations.

### 8.6 AI Usage Management

- Display AI loading states.
- Handle API errors.
- Handle rate limits.
- Show when AI is unavailable.
- Allow users to retry.
- Limit input size.
- Never expose API keys in frontend code.
- Do not send private documents without user action.

### Fallback

When Gemini is unavailable:
- All non-AI features must continue working.
- Display a clear AI unavailable message.
- Do not fabricate AI analysis.

---

## MODULE 9: ANALYTICS AND REPORTS

### Metrics

- Total applications.
- Interview conversion rate.
- Offer conversion rate.
- Rejection rate.
- Response rate.
- Average response time.
- Average applications per week.
- Application source performance.

### Charts

1. Applications over time.
2. Applications by status.
3. Interview conversion funnel.
4. Application sources.
5. Monthly activity.
6. Offers and rejections.

### Filters

- Last 7 days.
- Last 30 days.
- Last 90 days.
- Last 6 months.
- Custom date range.

### Export

- Export applications as CSV.
- Export basic activity reports.
- Print a summary report.

All metrics must be calculated from actual application records.

---

# 4. USER INTERFACE AND NAVIGATION

## 4.1 Main Navigation

1. Dashboard.
2. Applications.
3. Pipeline.
4. Interviews.
5. Calendar.
6. Tasks and Follow-ups.
7. Companies.
8. Recruiters.
9. Resumes and Documents.
10. AI Career Assistant.
11. Analytics.
12. Settings.

## 4.2 Design Direction

The interface should look like a premium, modern SaaS product.

Visual direction:
- Clean professional layout.
- Elegant typography.
- Consistent spacing.
- Neutral background.
- Carefully selected accent color.
- Subtle shadows and borders.
- Smooth transitions.
- Minimal animations.
- Responsive navigation.
- Accessible controls.

Avoid:
- Excessive gradients.
- Oversized dashboard cards.
- Unnecessary decorative elements.
- Excessive scrolling.
- Cluttered tables.
- Generic admin template appearance.

## 4.3 Global Features

- Global search.
- Notification center.
- User profile menu.
- Quick-add application.
- Quick-add task.
- Theme switching.
- Responsive sidebar.
- Keyboard accessibility.

## 4.4 Responsive Requirements

Desktop:
- Full sidebar.
- Dashboard widgets.
- Kanban board.
- Detailed data tables.

Tablet:
- Collapsible navigation.
- Adaptive grids.
- Responsive application cards.

Mobile:
- Compact navigation.
- Single-column dashboard.
- Mobile-friendly application forms.
- Scrollable or stacked Kanban columns.
- Touch-friendly controls.

---

# 5. DATABASE DESIGN

Use Firebase Firestore.

Recommended collections:

## users
- uid
- name
- email
- photoURL
- currentRole
- experience
- skills
- preferredRoles
- preferredLocations
- salaryPreference
- createdAt
- updatedAt

## applications
- id
- userId
- companyId
- jobTitle
- jobDescription
- jobUrl
- location
- workMode
- employmentType
- salary
- experienceRequired
- source
- appliedDate
- status
- priority
- resumeId
- coverLetter
- recruiterId
- notes
- nextFollowUpDate
- createdAt
- updatedAt

## companies
- id
- userId
- name
- website
- industry
- location
- careersUrl
- notes
- createdAt

## recruiters
- id
- userId
- companyId
- name
- email
- phone
- linkedinUrl
- designation
- notes

## interviews
- id
- userId
- applicationId
- roundName
- interviewType
- scheduledAt
- interviewer
- meetingUrl
- status
- preparationNotes
- questions
- feedback
- result
- createdAt

## tasks
- id
- userId
- applicationId
- title
- description
- category
- dueDate
- priority
- status
- completedAt
- createdAt

## resumes
- id
- userId
- name
- version
- fileName
- localStorageReference
- skills
- notes
- createdAt

## activityLogs
- id
- userId
- applicationId
- activityType
- description
- metadata
- createdAt

## aiHistory
- id
- userId
- applicationId
- operationType
- inputSummary
- result
- createdAt

Important:
- Use Firestore document IDs.
- Keep userId on all user-owned records.
- Create Firestore security rules.
- Validate ownership before every read/write.
- Use server timestamps where appropriate.
- Avoid storing large binary documents in Firestore.
- Add required composite indexes.
- Use pagination for growing collections.

---

# 6. SECURITY AND PRIVACY

1. Use Firebase Authentication.
2. Require authentication for private data.
3. Enforce per-user Firestore security rules.
4. Never trust userId supplied by the client.
5. Validate all form submissions.
6. Keep Gemini API keys server-side.
7. Limit file types and file sizes.
8. Avoid storing unnecessary personal information.
9. Never expose another user's application records.
10. Allow users to delete their records.
11. Provide an account deletion flow.
12. Clearly disclose when resume information is sent to an AI provider.
13. Do not send data to AI without user initiation.

---

# 7. DEVELOPMENT PHASES AND TASK BREAKDOWN

## PHASE 0 — PROJECT FOUNDATION

Goal: Set up the project correctly.

Tasks:
- Create Google AI Studio project.
- Generate React + TypeScript application.
- Configure Tailwind CSS.
- Configure shadcn/ui.
- Configure Lucide icons.
- Establish application folder structure.
- Create routing.
- Create reusable layout components.
- Configure Firebase project.
- Connect Firebase Authentication.
- Connect Firestore.
- Set environment configuration.
- Create initial Firestore security rules.
- Set up GitHub synchronization.

Deliverable:
A working application shell with authentication and database connectivity.

## PHASE 1 — AUTHENTICATION AND PROFILE

Tasks:
- Build login screen.
- Build registration screen.
- Implement Google authentication.
- Implement email authentication.
- Build protected routes.
- Build user profile.
- Implement logout.
- Implement session persistence.
- Test data isolation.

Deliverable:
Users can register and securely access their own workspace.

## PHASE 2 — APPLICATION MANAGEMENT

Tasks:
- Design application data model.
- Build application creation form.
- Build edit application form.
- Build application detail page.
- Implement status management.
- Implement priority management.
- Build Kanban view.
- Build table view.
- Implement filters.
- Implement search.
- Implement sorting.
- Implement duplicate warnings.
- Implement activity timeline.
- Implement delete confirmation.

Deliverable:
Complete job application tracking.

## PHASE 3 — DASHBOARD AND ANALYTICS

Tasks:
- Build KPI cards.
- Build application funnel.
- Build status distribution chart.
- Build application trend chart.
- Build recent activity widget.
- Build upcoming task widget.
- Implement weekly goals.
- Connect all dashboard data to Firestore.
- Add loading and empty states.

Deliverable:
A functional data-driven dashboard.

## PHASE 4 — INTERVIEWS AND CALENDAR

Tasks:
- Build interview creation form.
- Associate interviews with applications.
- Implement interview rounds.
- Build interview detail page.
- Add preparation notes.
- Add feedback management.
- Implement calendar view.
- Display upcoming interviews.

Deliverable:
Complete interview tracking and scheduling.

## PHASE 5 — TASKS AND FOLLOW-UPS

Tasks:
- Build task management page.
- Create task forms.
- Associate tasks with applications.
- Implement due dates.
- Build follow-up management.
- Add overdue task detection.
- Add dashboard reminders.
- Add task completion history.

Deliverable:
A reliable follow-up and productivity system.

## PHASE 6 — DOCUMENT MANAGEMENT

Tasks:
- Build resume management page.
- Add resume version records.
- Add browser-side file processing.
- Implement local document persistence.
- Build cover letter records.
- Associate resume versions with applications.
- Add document download.
- Handle local storage limitations.

Deliverable:
A usable resume and document workspace.

## PHASE 7 — AI CAREER ASSISTANT

Tasks:
- Configure Gemini API.
- Add server-side API integration.
- Build AI assistant interface.
- Implement resume analysis.
- Implement JD analysis.
- Implement resume-job matching.
- Implement cover letter generation.
- Implement interview question generation.
- Add AI usage handling.
- Add loading and failure states.
- Save AI history with user consent.

Deliverable:
A functional optional AI career assistant.

## PHASE 8 — COMPANY AND RECRUITER MANAGEMENT

Tasks:
- Build company records.
- Build recruiter records.
- Associate companies with applications.
- Associate recruiters with companies.
- Implement search.
- Implement communication notes.
- Build company history view.

Deliverable:
Complete company and recruiter management.

## PHASE 9 — POLISH AND RELEASE

Tasks:
- Test every module.
- Verify database security rules.
- Test user data isolation.
- Fix responsive issues.
- Improve loading states.
- Improve empty states.
- Add error boundaries.
- Add CSV export.
- Test application performance.
- Test AI failure handling.
- Verify there are no fake buttons.
- Verify no feature requires paid services unexpectedly.
- Export source code.
- Sync to GitHub.
- Deploy using an eligible free option.

Deliverable:
A fully functional, tested, deployable CareerFlow application.

---

# 8. MVP PRIORITIES

## P0 — Mandatory

- Authentication.
- User profile.
- Application CRUD.
- Application statuses.
- Kanban view.
- Table view.
- Dashboard.
- Application timeline.
- Interview management.
- Follow-up management.
- Firestore persistence.
- Security rules.
- Responsive design.

## P1 — Important

- Resume management.
- Company management.
- Recruiter management.
- Analytics.
- Calendar.
- CSV export.
- AI resume analysis.
- AI job matching.
- AI cover letter generation.

## P2 — Future Enhancements

- Chrome extension.
- Email integration.
- Automated email parsing.
- Job discovery integrations.
- Custom application pipelines.
- Advanced AI interview assistant.
- Advanced reports.
- Multi-user SaaS functionality.
- Mobile application.

---

# 9. FUNCTIONAL AND NON-FUNCTIONAL REQUIREMENTS

## Functional Requirements

- All application records must persist.
- All CRUD operations must work.
- Dashboard data must be dynamic.
- Filters and search must work.
- Interview records must link to applications.
- Tasks must link to applications.
- Status updates must be recorded.
- AI responses must be generated by the configured API.
- Exports must contain real data.
- User records must remain isolated.

## Non-Functional Requirements

Performance:
- Fast initial page rendering.
- Lazy-load larger modules.
- Use pagination.
- Avoid unnecessary database reads.
- Cache appropriate UI data.

Reliability:
- Handle network failures.
- Handle API quota exhaustion.
- Avoid data loss on form errors.
- Provide retry functionality.

Usability:
- Simple application entry.
- Minimal clicks for common actions.
- Consistent navigation.
- Clear visual feedback.

Security:
- Authentication.
- Authorization.
- Firestore security rules.
- Server-side secrets.
- Input validation.

---

# 10. ACCEPTANCE CRITERIA FOR RELEASE

The product is ready for initial release only when:

1. A user can register and log in.
2. A user can create at least one application.
3. Applications persist after refreshing the browser.
4. A user can update application statuses.
5. Kanban and table views show the same underlying records.
6. Dashboard figures match the database.
7. Users can schedule and manage interviews.
8. Users can create and complete follow-up tasks.
9. The calendar displays actual events.
10. Resume records can be associated with applications.
11. AI functions correctly when available.
12. AI failure does not break other features.
13. Users cannot read other users' private records.
14. Mobile layouts are usable.
15. No buttons are merely decorative.
16. No fake or hardcoded analytics remain.
17. Source code is synchronized with GitHub.
18. The deployment method does not silently activate paid billing.

---

# 11. COST CONTROL POLICY

The product must remain usable without mandatory spending.

Rules:
- Use Firebase Spark where applicable.
- Use only Gemini free-tier models.
- No paid AI model fallback.
- No paid email services.
- No paid SMS services.
- No paid job search APIs.
- No mandatory Cloudinary dependency.
- Avoid paid hosting.
- Do not enable Google Cloud billing just to bypass free-tier limits.
- Monitor free quotas.
- Make AI usage optional.
- Provide graceful quota exhaustion handling.

Important: Free-tier quotas, availability and deployment eligibility may change. The application must not assume unlimited resources.

---

# 12. SUCCESS METRICS

Measure:
- Number of applications created.
- Number of interviews tracked.
- Follow-ups completed.
- Percentage of applications with complete details.
- Weekly application activity.
- Interview conversion rate.
- Offer conversion rate.
- AI feature usage.
- User retention.

The main product success metric is whether the application helps users maintain a complete, accurate and actionable record of their job search.

---

# 13. FINAL PRODUCT DEFINITION

CareerFlow should be a polished, reliable and intelligent career management workspace.

The application must prioritize the core job tracking experience first, then gradually add AI capabilities and advanced integrations.

The user must be able to manage their complete job search without paying for any mandatory service.

Build in phases. Verify every module before proceeding to the next phase. Maintain a working application throughout development.
