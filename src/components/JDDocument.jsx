import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Line, Svg, Path, Polygon,
} from "@react-pdf/renderer";

/* ── Brand colours ── */
const NAVY  = "#1A3A5C";
const LIGHT = "#f0f4f8";
const MUTED = "#5A6A7A";
const BORDER= "#D0D7E3";

/* ── Styles ── */
const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1C2B3A",
    backgroundColor: "#fff",
    paddingBottom: 56,
  },

  /* ─ Header ─ */
  headerWrap: {
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 0,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  companyBlock: {
    flexDirection: "column",
    justifyContent: "center",
  },
  companyName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 20,
    color: NAVY,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  companySub: {
    fontSize: 9,
    color: MUTED,
    fontFamily: "Helvetica-Oblique",
    marginBottom: 2,
  },
  /* Crystal logo box */
  logoBox: {
    width: 68,
    height: 68,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    padding: 8,
  },
  logoBoxText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: "#fff",
    textAlign: "center",
    marginTop: 4,
    letterSpacing: 0.5,
  },
  logoBoxSub: {
    fontFamily: "Helvetica",
    fontSize: 6.5,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  /* Navy rule */
  navyRule: {
    height: 2.5,
    backgroundColor: NAVY,
    marginBottom: 0,
  },
  taglineBar: {
    paddingHorizontal: 28,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tagline: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: NAVY,
    letterSpacing: 1,
  },

  /* ─ Body ─ */
  body: {
    paddingHorizontal: 28,
    paddingTop: 14,
  },
  docTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: "#1C2B3A",
    textAlign: "center",
    marginBottom: 10,
  },
  positionBanner: {
    backgroundColor: LIGHT,
    borderLeftWidth: 3,
    borderLeftColor: NAVY,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  positionBannerText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: NAVY,
    letterSpacing: 0.2,
  },
  positionBannerSub: {
    fontSize: 8.5,
    color: MUTED,
    marginTop: 2,
  },

  /* ─ Section card ─ */
  sectionCard: {
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 10,
  },
  sectionHead: {
    backgroundColor: LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
  },
  sectionHeadDot: {
    width: 4,
    height: 4,
    backgroundColor: NAVY,
    borderRadius: 2,
    marginRight: 6,
  },
  sectionHeadText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: NAVY,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sectionBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  /* ─ Detail rows ─ */
  detailRow: {
    flexDirection: "row",
    marginBottom: 5,
    alignItems: "flex-start",
  },
  detailLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    color: MUTED,
    width: 120,
    flexShrink: 0,
  },
  detailColon: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    color: MUTED,
    marginRight: 6,
  },
  detailValue: {
    flex: 1,
    fontSize: 8.5,
    color: "#1C2B3A",
    lineHeight: 1.5,
  },

  /* ─ Body text ─ */
  bodyText: {
    fontSize: 8.5,
    color: "#1C2B3A",
    lineHeight: 1.65,
  },

  /* ─ Bullet list ─ */
  bulletRow: {
    flexDirection: "row",
    marginBottom: 3.5,
    alignItems: "flex-start",
  },
  bulletMark: {
    width: 12,
    fontSize: 9,
    color: NAVY,
    fontFamily: "Helvetica-Bold",
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: 8.5,
    color: "#1C2B3A",
    lineHeight: 1.55,
  },

  /* ─ Two-column grid ─ */
  twoCol: {
    flexDirection: "row",
    gap: 10,
  },
  colLeft: {
    flex: 1,
  },
  colRight: {
    flex: 1,
  },

  /* ─ Footer ─ */
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1.5,
    borderTopColor: NAVY,
    paddingHorizontal: 28,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  footerCol: {
    flexDirection: "column",
    gap: 2,
  },
  footerLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  footerText: {
    fontSize: 7,
    color: NAVY,
  },
  footerCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  footerCenterText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: NAVY,
    letterSpacing: 1,
  },
  confidential: {
    textAlign: "center",
    fontSize: 7,
    color: MUTED,
    marginTop: 1,
    fontFamily: "Helvetica-Oblique",
  },
});

/* ── Helpers ── */
function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={S.detailRow}>
      <Text style={S.detailLabel}>{label}</Text>
      <Text style={S.detailColon}>:</Text>
      <Text style={S.detailValue}>{value}</Text>
    </View>
  );
}

function BulletList({ text }) {
  if (!text) return null;
  const lines = text.split("\n").map(l => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
  return (
    <View>
      {lines.map((line, i) => (
        <View key={i} style={S.bulletRow}>
          <Text style={S.bulletMark}>•</Text>
          <Text style={S.bulletText}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

function SectionCard({ title, children }) {
  return (
    <View style={S.sectionCard}>
      <View style={S.sectionHead}>
        <View style={S.sectionHeadDot} />
        <Text style={S.sectionHeadText}>{title}</Text>
      </View>
      <View style={S.sectionBody}>{children}</View>
    </View>
  );
}

/* Crystal chevron SVG mark */
function CrystalMark({ size = 22 }) {
  return (
    <Svg viewBox="0 0 40 34" width={size} height={size * 0.85}>
      <Polygon points="20,2 38,32 2,32" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      <Polygon points="20,10 32,32 8,32" fill="#fff" opacity="0.4" />
    </Svg>
  );
}

/* ── Main Document ── */
export default function JDDocument({ form }) {
  const posTitle = (form.position_title || "—").toUpperCase().replace(/\s+/g, "_");
  const loc = form.locations?.join(", ") || form.location || "—";
  const reqId = form.req_id || "DRAFT";

  return (
    <Document
      title={`JD – ${form.position_title} (${reqId})`}
      author="CRPL Infra Pvt. Ltd."
      subject="Job Description"
    >
      <Page size="A4" style={S.page}>

        {/* ══ HEADER ══ */}
        <View style={S.headerWrap}>
          <View style={S.headerRow}>
            {/* Left: Company name */}
            <View style={S.companyBlock}>
              <Text style={S.companyName}>CRPL Infra Pvt. Ltd.</Text>
              <Text style={S.companySub}>A Crystal Group Company</Text>
            </View>
            {/* Right: Crystal logo box */}
            <View style={S.logoBox}>
              <CrystalMark size={24} />
              <Text style={S.logoBoxText}>Crystal</Text>
              <Text style={S.logoBoxSub}>Cold Chain Solution Company</Text>
            </View>
          </View>
        </View>

        {/* Navy rule */}
        <View style={S.navyRule} />

        {/* Tagline */}
        <View style={S.taglineBar}>
          <Text style={S.tagline}>BUILDING INDIA'S COLD CHAIN BACKBONE</Text>
        </View>

        {/* ══ BODY ══ */}
        <View style={S.body}>

          {/* Document title */}
          <Text style={S.docTitle}>Job Description</Text>

          {/* Position banner */}
          <View style={S.positionBanner}>
            <Text style={S.positionBannerText}>
              {posTitle} – {loc.split(",")[0].trim()} ({reqId})
            </Text>
            <Text style={S.positionBannerSub}>
              {form.department || "—"} Department  ·  {form.total_nos || 1} Opening(s)  ·  Reporting to: {form.reporting_manager || "—"}
            </Text>
          </View>

          {/* Section 1: Position Overview */}
          <SectionCard title="Job Description">
            <DetailRow label="Position Title"  value={form.position_title} />
          </SectionCard>

          {/* Section 2: Position Details */}
          <SectionCard title="Position Details">
            <DetailRow label="Requisition ID" value={reqId} />
            <DetailRow label="Department"     value={form.department} />
            <DetailRow label="Location(s)"    value={loc} />
            <DetailRow label="Total Openings" value={String(form.total_nos || 1)} />
            <DetailRow label="Reporting To"   value={form.reporting_manager} />
            <DetailRow label="Salary Range"   value={form.salary_range} />
            {form.joining_date && (
              <DetailRow label="Preferred Joining" value={form.joining_date} />
            )}
          </SectionCard>

          {/* Section 3: Responsibilities */}
          {form.responsibilities && (
            <SectionCard title="Key Responsibilities">
              <BulletList text={form.responsibilities} />
            </SectionCard>
          )}

          {/* Section 4: Requirements */}
          {(form.education || form.experience || form.key_skills || form.preferred_filters) && (
            <SectionCard title="Requirements / Qualification">
              {form.education && (
                <View style={{ marginBottom: 5 }}>
                  <Text style={{ ...S.detailLabel, marginBottom: 3 }}>Education :</Text>
                  <Text style={S.bodyText}>{form.education}</Text>
                </View>
              )}
              {form.experience && (
                <View style={{ marginBottom: 5 }}>
                  <Text style={{ ...S.detailLabel, marginBottom: 3 }}>Experience :</Text>
                  <Text style={S.bodyText}>{form.experience}</Text>
                </View>
              )}
              {form.key_skills && (
                <View style={{ marginBottom: 5 }}>
                  <Text style={{ ...S.detailLabel, marginBottom: 3 }}>Key Skills :</Text>
                  <BulletList text={form.key_skills} />
                </View>
              )}
              {form.preferred_filters && (
                <View>
                  <Text style={{ ...S.detailLabel, marginBottom: 3 }}>Preferred Filters :</Text>
                  <Text style={S.bodyText}>{form.preferred_filters}</Text>
                </View>
              )}
            </SectionCard>
          )}

          {/* Full JD text if provided */}
          {form.jd_text && (
            <SectionCard title="Additional Job Description">
              <Text style={S.bodyText}>{form.jd_text}</Text>
            </SectionCard>
          )}

          {/* Confidential note */}
          <Text style={S.confidential}>
            This document is confidential and intended solely for recruitment purposes.
          </Text>
        </View>

        {/* ══ FOOTER ══ */}
        <View style={S.footer} fixed>
          {/* Left */}
          <View style={S.footerCol}>
            <View style={S.footerLine}>
              <Text style={S.footerText}>📍  8B Middleton St, Kolkata 71 (WB)</Text>
            </View>
            <View style={S.footerLine}>
              <Text style={S.footerText}>📞  +91-33-35446310</Text>
            </View>
          </View>

          {/* Center */}
          <View style={S.footerCenter}>
            <Text style={S.footerCenterText}>CRPL</Text>
            <Text style={{ ...S.footerText, textAlign: "center", marginTop: 1 }}>Infra Pvt. Ltd.</Text>
          </View>

          {/* Right */}
          <View style={[S.footerCol, { alignItems: "flex-end" }]}>
            <View style={S.footerLine}>
              <Text style={S.footerText}>🌐  crystalgroup.in</Text>
            </View>
            <View style={S.footerLine}>
              <Text style={S.footerText}>✉  info@crystalgroup.in</Text>
            </View>
          </View>
        </View>

      </Page>
    </Document>
  );
}
