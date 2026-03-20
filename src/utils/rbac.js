/* SOP-HR-001 | Version 1.0 — Role-Based Access Control */

export const ROLES = {
  MANAGEMENT:     "management",      // Directors / Owners — offer approval + read-only
  CHRO:           "chro",            // Chief Human Resources Officer — full access
  TA_HEAD:        "ta_head",         // Talent Acquisition Head — all HR modules
  SENIOR_HR_EXEC: "senior_hr_exec",  // Senior HR Executive — assigned pipeline
  ADMIN:          "admin",           // System Administrator
};

/* ── Permission helpers ─────────────────────────────────────── */
export function canRaise(role)        { return ["ta_head","senior_hr_exec","admin"].includes(role); }
export function canApproveReq(role)   { return ["chro","ta_head","admin"].includes(role); }
export function canViewAll(role)      { return ["chro","ta_head","management","admin"].includes(role); }
export function canScreen(role)       { return ["senior_hr_exec","ta_head","chro","admin"].includes(role); }
export function canDecide(role)       { return ["senior_hr_exec","ta_head","chro","admin"].includes(role); }
export function canInterview(role)    { return ["senior_hr_exec","ta_head","admin"].includes(role); }
export function canVerifyDocs(role)   { return ["senior_hr_exec","ta_head","chro","admin"].includes(role); }
export function canApproveOffer(role) { return ["management","chro","admin"].includes(role); }
export function canOnboard(role)      { return ["senior_hr_exec","ta_head","chro","admin"].includes(role); }

/* Key Control — SOP §16: No individual may both raise and approve the same action */
export function canApprove(role) { return canApproveReq(role); }

/* ── Navigation items — ordered by SOP module sequence ─────── */
export function navItems(role) {
  const all = [
    /* Module 1 — Job Requisition (grouped) */
    { label:"Raise Requisition", path:"/raise",          icon:"plus",       roles:["ta_head","senior_hr_exec","admin"],                   group:"Requisitions" },
    { label:"All Requisitions",  path:"/requisitions",   icon:"list",       roles:["chro","ta_head","management","admin"],                 group:"Requisitions" },
    { label:"Approve",           path:"/approve",        icon:"check",      roles:["chro","ta_head","admin"],                              group:"Requisitions" },
    { label:"My Requisitions",   path:"/my-requests",    icon:"user",       roles:["ta_head","senior_hr_exec","admin"],                    group:"Requisitions" },

    /* Module 2–5 — Recruitment pipeline (grouped) */
    { label:"Screening",         path:"/screening",      icon:"screen",     roles:["senior_hr_exec","ta_head","chro","admin"],             group:"Recruitment" },
    { label:"HR Decision",       path:"/hr-decision",    icon:"decision",   roles:["senior_hr_exec","ta_head","chro","admin"],             group:"Recruitment" },
    { label:"Interviews",        path:"/interview",      icon:"interview",  roles:["senior_hr_exec","ta_head","admin"],                    group:"Recruitment" },

    /* Candidate Profile Hub */
    { label:"Candidates",        path:"/candidates",     icon:"candidates", roles:["ta_head","chro","senior_hr_exec","admin"] },

    /* Module 6 — Document Collection */
    { label:"Documents",         path:"/documents",      icon:"docs",       roles:["senior_hr_exec","ta_head","chro","admin"] },

    /* Module 7 — Offer Approval */
    { label:"Offer Approval",    path:"/offer-approval", icon:"approval",   roles:["management","chro","admin"] },

    /* Module 8 — Onboarding */
    { label:"Onboarding",        path:"/onboarding",     icon:"onboard",    roles:["senior_hr_exec","ta_head","chro","admin"] },
  ];
  return all.filter(i => !i.roles || i.roles.includes(role));
}

/* ── Role labels ───────────────────────────────────────────── */
export function roleLabel(role) {
  return {
    management:     "Management",
    chro:           "CHRO",
    ta_head:        "Talent Acquisition Head",
    senior_hr_exec: "Senior HR Executive",
    admin:          "Admin",
  }[role] || role;
}

/* ── Stage definitions (SOP §3.1 End-to-End Process Flow) ──── */
export const STAGES = [
  { key:"SCREENING",       label:"Screening",       step:1 },
  { key:"AI_EVALUATION",  label:"AI Evaluation",   step:2 },
  { key:"HR_DECISION",    label:"HR Decision",     step:3 },
  { key:"INTERVIEW",      label:"Interview",        step:4 },
  { key:"DOCUMENTS",      label:"Documents",        step:5 },
  { key:"OFFER_APPROVAL", label:"Offer Approval",  step:6 },
  { key:"OFFER_RELEASED", label:"Offer Released",  step:7 },
  { key:"ONBOARDING",     label:"Onboarding",      step:8 },
  { key:"COMPLETED",      label:"Completed",        step:9 },
  { key:"REJECTED",       label:"Rejected",         step:null },
];

export function stageStep(key) {
  return STAGES.find(s => s.key === key)?.step ?? 0;
}
