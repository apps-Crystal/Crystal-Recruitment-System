export const ROLES = { APPROVER:"approver", HR_MANAGER:"hr_manager", HR_EXEC:"hr_executive", REQUESTER:"requester", ADMIN:"admin" };

export function canRaise(role)   { return ["hr_manager","hr_executive","requester","admin"].includes(role); }
export function canApprove(role) { return ["approver","admin"].includes(role); }
export function canViewAll(role) { return ["hr_manager","approver","admin"].includes(role); }
export function canAssignPOC(role) { return ["hr_manager","admin"].includes(role); }
export function canScreen(role)  { return ["hr_manager","hr_executive","admin","recruitment_poc"].includes(role); }

export function navItems(role) {
  const all = [
    { label:"Raise Requisition",path:"/raise",       icon:"plus",   roles:["hr_manager","hr_executive","requester","admin"], group:"Requisitions" },
    { label:"All Requisitions", path:"/requisitions",icon:"list",   roles:["hr_manager","approver","admin"],                  group:"Requisitions" },
    { label:"Approve",          path:"/approve",     icon:"check",  roles:["approver","admin"],                               group:"Requisitions" },
    { label:"My Requisitions",  path:"/my-requests", icon:"user",   roles:["hr_manager","hr_executive","requester"],          group:"Requisitions" },
    { label:"Screening",        path:"/screening",   icon:"screen",    roles:["hr_manager","hr_executive","admin","recruitment_poc"] },
    { label:"Interviews",       path:"/interview",      icon:"interview", roles:["hr_manager","hr_executive","admin","recruitment_poc"] },
    { label:"Offer Approval",   path:"/offer-approval", icon:"approval",  roles:["approver","hr_manager","admin"] },
  ];
  return all.filter(i => !i.roles || i.roles.includes(role));
}

export function roleLabel(role) {
  return { approver:"Approver (CHRO)", hr_manager:"HR Manager", hr_executive:"HR Executive", requester:"Request Owner", admin:"Admin" }[role] || role;
}
