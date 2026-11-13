import type { JobApplication } from '@/src/types/careerflow';

export interface FollowUpTemplate {
  id: string;
  label: string;
  subject: string;
  body: string;
}

export function buildFollowUpEmailTemplates(params: {
  application?: JobApplication;
  senderName?: string;
}): FollowUpTemplate[] {
  const company = params.application?.companyName || '[Company Name]';
  const role = params.application?.jobTitle || '[Job Title]';
  const recruiter = params.application?.recruiterName?.trim() || 'Hiring Team';
  const sender = params.senderName?.trim() || '[Your Name]';

  return [
    {
      id: 'post-application',
      label: 'Post-Application Check-in',
      subject: `Following up on ${role} application — ${sender}`,
      body: `Hi ${recruiter},\n\nI hope you are doing well. I recently submitted my application for the ${role} position at ${company} and wanted to briefly reiterate my strong interest in the team.\n\nPlease let me know if there is any additional information I can share as you review candidates. Thank you for your time and consideration.\n\nBest regards,\n${sender}`,
    },
    {
      id: 'post-interview',
      label: 'Post-Interview Thank You',
      subject: `Thank you — ${role} interview at ${company}`,
      body: `Hi ${recruiter},\n\nThank you for coordinating my recent conversation regarding the ${role} role at ${company}. Learning more about the team's priorities reinforced my enthusiasm for contributing to ${company}.\n\nPlease feel free to reach out if you need anything further ahead of the next step.\n\nBest regards,\n${sender}`,
    },
    {
      id: 'status-inquiry',
      label: 'Timeline & Status Inquiry',
      subject: `Checking in on ${role} timeline — ${company}`,
      body: `Hi ${recruiter},\n\nI wanted to check in regarding the status and expected timeline for the ${role} process at ${company}. I remain very excited about the opportunity and would appreciate any update you are able to share.\n\nThank you again for your time.\n\nBest regards,\n${sender}`,
    },
    {
      id: 'recruiter-intro',
      label: 'Direct Recruiter Outreach',
      subject: `Interest in ${role} at ${company} — ${sender}`,
      body: `Hi ${recruiter},\n\nI noticed the ${role} opening at ${company} and submitted my application. Given my relevant background, I would welcome a brief conversation if you are the right point of contact for this search.\n\nThank you for considering my note.\n\nBest regards,\n${sender}`,
    },
  ];
}
