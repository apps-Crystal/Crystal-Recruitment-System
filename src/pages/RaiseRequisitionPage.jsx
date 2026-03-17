import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createRequisition, savePDFToDrive } from "../utils/api";

/** Generates PDF blob. */
async function buildPDFBlob(formData) {
  const { pdf } = await import("@react-pdf/renderer");
  const { default: JDDocument } = await import("../components/JDDocument");
  const { createElement } = await import("react");
  const blob = await pdf(createElement(JDDocument, { form: formData })).toBlob();
  return blob;
}

/** Convert Blob → base64 string. */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Download a blob as a file. */
function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

const DEPARTMENTS = ["Operations", "Warehouse", "Finance", "HR", "IT", "Sales", "Marketing", "Legal", "Admin"];
const LOCATIONS   = ["Dankuni", "Kolkata", "Thane", "Noida", "Kheda", "Detroj", "Dhulagarh", "Bhubaneswar", "Other"];
const POC_LIST    = ["Himani Khemka", "Sameeksha"];

function genReqId() {
  const yr  = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `REQ-${yr}-${seq}`;
}

const EMPTY = {
  position_title: "", department: "", reporting_manager: "",
  total_nos: 1, locations: [],
  experience: "", education: "", responsibilities: "",
  key_skills: "", preferred_filters: "",
  salary_range: "", joining_date: "", jd_text: "",
  poc: "Himani Khemka",
};

function SectionHeader({ children }) {
  return (
    <div
      className="text-xs font-bold uppercase tracking-widest px-4 py-2.5"
      style={{
        color: "var(--color-primary-700)",
        background: "var(--color-primary-50)",
        borderBottom: "1px solid var(--color-border)",
        letterSpacing: "0.08em",
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, required, hint, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
        {label}
        {required && <span className="ml-0.5" style={{ color: "var(--color-danger)" }}>*</span>}
      </label>
      {hint && <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{hint}</span>}
      {children}
      {error && <span className="text-xs font-medium" style={{ color: "var(--color-danger)" }}>{error}</span>}
    </div>
  );
}

export default function RaiseRequisitionPage() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState(null);
  const [errors, setErrors]     = useState({});
  const [submitError, setSubmitError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: null })); }

  function toggleLocation(loc) {
    setForm(f => ({
      ...f,
      locations: f.locations.includes(loc)
        ? f.locations.filter(l => l !== loc)
        : [...f.locations, loc],
    }));
  }

  function validate() {
    const e = {};
    if (!form.position_title.trim()) e.position_title = "Required";
    if (!form.department)            e.department = "Required";
    if (!form.reporting_manager.trim()) e.reporting_manager = "Required";
    if (!form.total_nos || form.total_nos < 1) e.total_nos = "Must be at least 1";
    if (!form.locations.length)      e.locations = "Select at least one location";
    if (!form.experience.trim())     e.experience = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSubmitError("");

    const req_id = genReqId();

    // Build a clean payload — explicitly list fields to avoid sending
    // the `locations` array (we only want the joined `location` string).
    const payload = {
      req_id,
      position_title:    form.position_title,
      department:        form.department,
      location:          form.locations.join(", "),
      total_nos:         form.total_nos,
      poc:               form.poc,
      salary_range:      form.salary_range,
      experience:        form.experience,
      education:         form.education,
      responsibilities:  form.responsibilities,
      key_skills:        form.key_skills,
      preferred_filters: form.preferred_filters,
      joining_date:      form.joining_date,
      jd_text:           form.jd_text,
      reporting_manager: form.reporting_manager,
      raised_by:         user.email,
      raised_at:         new Date().toLocaleDateString("en-IN"),
      status:            "Pending Approval",
      timestamp:         new Date().toISOString(),
      jd_pdf_link:       "",
    };

    // Generate PDF → upload to Drive (non-fatal)
    let driveLink = "";
    try {
      const blob    = await buildPDFBlob(payload);
      const base64  = await blobToBase64(blob);
      const driveRes = await savePDFToDrive(req_id, payload.position_title, base64);
      if (driveRes?.link) {
        driveLink = driveRes.link;
        payload.jd_pdf_link = driveLink;
      }
    } catch {
      // PDF/Drive failure is non-fatal — requisition still submits
    }

    // Submit to GAS → Google Sheet
    try {
      const res = await createRequisition(payload);
      if (res?.success === false) {
        throw new Error(res.error || "Submission failed. Please try again.");
      }
      setSuccess({ req_id, formData: payload, driveLink });
    } catch (err) {
      setSubmitError(err.message || "Could not save to sheet. Check GAS deployment and sheet setup.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadPDF() {
    if (!success) return;
    setPdfLoading(true);
    try {
      const blob = await buildPDFBlob(success.formData);
      downloadBlob(blob, `JD_${success.req_id}.pdf`);
    } finally {
      setPdfLoading(false);
    }
  }

  /* ─── Success screen ─────────────────────────────────────── */
  if (success) return (
    <div>
      <div
        className="sticky top-0 z-10 flex items-center px-3 sm:px-6"
        style={{ background: "var(--color-primary-900)", borderBottom: "1px solid rgba(255,255,255,0.07)", height: 56 }}
      >
        <h1 className="text-sm font-bold text-white">Requisition Submitted</h1>
      </div>
      <div className="flex items-center justify-center p-4 sm:p-8" style={{ minHeight: "calc(100vh - 56px)" }}>
        <div className="enterprise-card p-6 sm:p-10 text-center max-w-lg w-full">
          {/* Success icon */}
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center rounded-full" style={{ width: 52, height: 52, background: "rgba(46,125,50,0.1)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="26" height="26"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </div>
          <h2 className="text-lg font-bold mb-1" style={{ color: "var(--color-success)" }}>Raised Successfully</h2>
          <p className="text-sm mb-5" style={{ color: "var(--color-text-secondary)" }}>
            Your requisition has been submitted for approval.
          </p>

          {/* Req ID */}
          <div className="inline-block px-5 py-3 rounded-sm mb-4" style={{ background: "var(--color-primary-50)", border: "1px solid var(--color-border)" }}>
            <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "var(--color-text-secondary)" }}>Requisition ID</div>
            <div className="font-mono text-xl font-extrabold" style={{ color: "var(--color-primary-700)" }}>{success.req_id}</div>
          </div>

          {/* Summary chips */}
          <div className="flex flex-wrap justify-center gap-2 mb-5">
            {[
              { l: "Status",   v: "Pending Approval" },
              { l: "POC",      v: success.formData.poc },
              { l: "Position", v: success.formData.position_title },
              { l: "Nos",      v: String(success.formData.total_nos) },
            ].map(({ l, v }) => (
              <div key={l} className="px-3 py-1.5 rounded-sm text-xs" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <span style={{ color: "var(--color-text-secondary)" }}>{l}: </span>
                <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{v}</span>
              </div>
            ))}
          </div>

          {/* PDF download + Drive link */}
          <div className="rounded-sm p-4 mb-5" style={{ background: "var(--color-primary-50)", border: "1px solid var(--color-border)" }}>
            <p className="text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>
              A Job Description PDF has been generated using the CRPL letterhead
              {success.driveLink ? " and saved to the Recuirtment_Master Drive folder." : "."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={handleDownloadPDF}
                disabled={pdfLoading}
                className="flex items-center gap-2 h-9 px-4 text-xs font-semibold rounded-sm text-white disabled:opacity-60"
                style={{ background: "var(--color-primary-800)", border: "none", cursor: pdfLoading ? "not-allowed" : "pointer" }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {pdfLoading ? "Generating PDF…" : "Download PDF"}
              </button>
              {success.driveLink && (
                <a
                  href={success.driveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 h-9 px-4 text-xs font-semibold rounded-sm"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-primary-700)", textDecoration: "none" }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  View in Drive
                </a>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setSuccess(null); setForm(EMPTY); }}
              className="h-8 px-4 text-xs font-semibold rounded-sm"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", cursor: "pointer" }}
            >
              Raise Another
            </button>
            <button
              onClick={() => navigate("/")}
              className="h-8 px-4 text-xs font-semibold rounded-sm text-white"
              style={{ background: "var(--color-primary-800)", border: "none", cursor: "pointer" }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  /* ─── Form ───────────────────────────────────────────────── */
  const inputCls    = "enterprise-input";
  const selectCls   = `${inputCls} appearance-none`;
  const textareaCls = "enterprise-input h-auto py-2";

  return (
    <div>
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-3 sm:px-6"
        style={{ background: "var(--color-primary-900)", borderBottom: "1px solid rgba(255,255,255,0.07)", height: 56 }}
      >
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white leading-tight">Raise Manpower Requisition</h1>
          <p className="text-xs hidden sm:block" style={{ color: "rgba(255,255,255,0.45)" }}>Fill in all details to submit a hiring request</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-sm flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}
        >
          ← Back
        </button>
      </div>

      <div className="p-3 md:p-6">
        <form onSubmit={handleSubmit} noValidate className="w-full flex flex-col gap-4">

          {/* Section 1 — Basic Info */}
          <div className="enterprise-card overflow-hidden">
            <SectionHeader>Basic Information</SectionHeader>
            <div className="p-3 md:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <Field label="Submitter Email">
                <div className="enterprise-input opacity-60 cursor-not-allowed select-none text-sm truncate">{user?.email}</div>
              </Field>
              <Field label="Recruitment POC" required>
                <select className={selectCls} value={form.poc} onChange={e => setF("poc", e.target.value)}>
                  {POC_LIST.map(p => <option key={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Position Title" required error={errors.position_title}>
                <input className={inputCls} value={form.position_title} onChange={e => setF("position_title", e.target.value)} placeholder="e.g. Warehouse Supervisor" />
              </Field>
              <Field label="Department" required error={errors.department}>
                <select className={selectCls} value={form.department} onChange={e => setF("department", e.target.value)}>
                  <option value="">Select department…</option>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Reporting Manager" required error={errors.reporting_manager}>
                <input className={inputCls} value={form.reporting_manager} onChange={e => setF("reporting_manager", e.target.value)} placeholder="Name of reporting manager" />
              </Field>
              <Field label="Total Numbers Required" required error={errors.total_nos}>
                <input className={inputCls} type="number" min={1} value={form.total_nos} onChange={e => setF("total_nos", Number(e.target.value))} />
              </Field>
              <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                <Field label="Location(s)" required error={errors.locations}>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {LOCATIONS.map(loc => {
                      const checked = form.locations.includes(loc);
                      return (
                        <label
                          key={loc}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm cursor-pointer text-xs font-medium transition-colors select-none"
                          style={{
                            background: checked ? "var(--color-primary-100)" : "var(--color-surface)",
                            border: `1px solid ${checked ? "var(--color-primary-600)" : "var(--color-border)"}`,
                            color: checked ? "var(--color-primary-800)" : "var(--color-text-secondary)",
                          }}
                        >
                          <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleLocation(loc)} />
                          {checked && <span style={{ color: "var(--color-primary-600)" }}>✓</span>}
                          {loc}
                        </label>
                      );
                    })}
                  </div>
                </Field>
              </div>
            </div>
          </div>

          {/* Section 2 — Role Requirements */}
          <div className="enterprise-card overflow-hidden">
            <SectionHeader>Role Requirements</SectionHeader>
            <div className="p-3 md:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <Field label="Years of Experience" required error={errors.experience}>
                <input className={inputCls} value={form.experience} onChange={e => setF("experience", e.target.value)} placeholder="e.g. 3–5 years" />
              </Field>
              <Field label="Salary Range">
                <input className={inputCls} value={form.salary_range} onChange={e => setF("salary_range", e.target.value)} placeholder="e.g. ₹4–6 LPA" />
              </Field>
              <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                <Field label="Educational Qualification">
                  <textarea className={textareaCls} rows={2} value={form.education} onChange={e => setF("education", e.target.value)} placeholder="e.g. B.Com / MBA Finance from reputed institute" />
                </Field>
              </div>
              <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                <Field label="Core Responsibilities">
                  <textarea className={textareaCls} rows={4} value={form.responsibilities} onChange={e => setF("responsibilities", e.target.value)} placeholder="List the main duties and responsibilities…" />
                </Field>
              </div>
              <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                <Field label="Key Skills Required">
                  <textarea className={textareaCls} rows={3} value={form.key_skills} onChange={e => setF("key_skills", e.target.value)} placeholder="e.g. Tally, MS Excel, Team Management…" />
                </Field>
              </div>
              <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                <Field label="Preferred Filters / Candidate Features">
                  <textarea className={textareaCls} rows={2} value={form.preferred_filters} onChange={e => setF("preferred_filters", e.target.value)} placeholder="e.g. Female preferred, local candidate, immediate joiner…" />
                </Field>
              </div>
            </div>
          </div>

          {/* Section 3 — Timeline */}
          <div className="enterprise-card overflow-hidden">
            <SectionHeader>Compensation & Timeline</SectionHeader>
            <div className="p-3 md:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <Field label="Preferred Joining Date">
                <input className={inputCls} type="date" value={form.joining_date} onChange={e => setF("joining_date", e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Section 4 — JD */}
          <div className="enterprise-card overflow-hidden">
            <SectionHeader>Job Description</SectionHeader>
            <div className="p-3 md:p-4">
              <Field label="JD Text" hint="Paste or type the full job description. A PDF with the CRPL letterhead will be auto-generated on submission.">
                <textarea className={textareaCls} rows={7} value={form.jd_text} onChange={e => setF("jd_text", e.target.value)} placeholder="Full job description text — responsibilities, qualifications, scope of role…" />
              </Field>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pb-2">
            {submitError && (
              <div className="text-xs px-3 py-2 rounded-sm font-medium" style={{ background: "rgba(198,40,40,0.08)", color: "var(--color-danger)", border: "1px solid rgba(198,40,40,0.2)" }}>
                ⚠ {submitError}
              </div>
            )}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="h-9 px-5 text-sm font-semibold rounded-sm"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-5 text-sm font-semibold rounded-sm text-white disabled:opacity-60"
              style={{ background: "var(--color-primary-800)", border: "none", cursor: saving ? "not-allowed" : "pointer" }}
            >
              {saving ? "Submitting…" : "Submit Requisition →"}
            </button>
          </div>
          </div>
        </form>
      </div>
    </div>
  );
}
