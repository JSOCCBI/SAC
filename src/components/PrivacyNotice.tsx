import Link from "next/link";

// Privacy Notice shared by SEC, IMS and SAC (same file in each app — keep them identical).
// Qatar Personal Data Privacy Protection Law (Law No. 13 of 2016). Draft until HMC Information Governance approves.

export const PRIVACY_LAST_UPDATED = "26 October 2026";
export const PRIVACY_CONTACT = "JSOCCBI@hamad-sos.com";

const APPS = "SOS Equipment Checks (SEC), SOS Inventory Management (IMS) and SOS Access (SAC)";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-extrabold text-gray-900">{title}</h2>
      <div className="text-sm text-gray-700 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

export default function PrivacyNotice({ appName, usesAnalytics = false, backHref = "/" }: {
  appName: string;
  usesAnalytics?: boolean;
  backHref?: string;
}) {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <Link href={backHref} className="text-xs font-semibold text-gray-500 hover:text-gray-800">← Back</Link>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-3">Privacy Notice</h1>
          <p className="text-sm text-gray-500 mt-1">{appName} · Last updated {PRIVACY_LAST_UPDATED}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <p className="text-sm font-bold text-amber-800">Beta — draft notice</p>
          <p className="text-xs text-amber-700 mt-0.5">
            This notice is a draft pending review by HMC Information Governance. It describes how the apps work today and may change.
          </p>
        </div>

        <Section title="1. Who we are">
          <p>
            {APPS} are internal tools of the Special Operations Service (SOS), Hamad Medical Corporation (HMC),
            built and run by the SOS Business Intelligence team. We handle personal data in line with Qatar&apos;s
            Personal Data Privacy Protection Law (Law No. 13 of 2016) and HMC policies.
          </p>
        </Section>

        <Section title="2. What we collect">
          <ul className="list-disc pl-5 space-y-1">
            <li><b>Your account:</b> name, work email, role (staff or manager) and whether your account is active.</li>
            <li><b>What you record:</b> equipment checks (callsign, vehicle, results, comments, and the staff who did the check), production requests (who requested, delivered and received), and inventory, allocation and readiness changes.</li>
            <li><b>Activity history:</b> a log of changes with your email and the time, so records can be traced.</li>
            <li><b>Planning entered by managers:</b> staff names planned for callsigns, travel vehicles and Victor Pathway vehicles in daily allocation reports.</li>
            <li><b>On your device:</b> a sign-in cookie that keeps you logged in, and small settings such as light/dark theme or an unfinished form. We do not use advertising cookies.</li>
            {usesAnalytics && (
              <li><b>Usage statistics:</b> anonymous page-view and performance statistics (Vercel Analytics) that do not identify you.</li>
            )}
          </ul>
        </Section>

        <Section title="3. What we do not collect">
          <p>
            These apps are <b>not</b> for patient information. <b>Do not enter patient names, ID numbers or medical details</b> in any field,
            including comments and notes. If patient information is entered by mistake, tell us so it can be removed.
          </p>
        </Section>

        <Section title="4. Why we use it">
          <ul className="list-disc pl-5 space-y-1">
            <li>Equipment readiness and safety checks for SOS vehicles and teams.</li>
            <li>Inventory, stock, servicing and production request management.</li>
            <li>Planning vehicles and staff for callsigns and sharing daily allocation reports.</li>
            <li>Accountability: knowing who recorded or changed what, and when.</li>
          </ul>
          <p>We use the data only for these SOS operational purposes.</p>
        </Section>

        <Section title="5. Who can see it">
          <ul className="list-disc pl-5 space-y-1">
            <li>SOS staff and managers, according to their role. Managers can see all records.</li>
            <li>Daily allocation reports, including the staff names in them, may be posted to the relevant SOS channels in HMC Microsoft Teams. Teams and Power Automate run inside HMC&apos;s Microsoft 365.</li>
            <li>We do not sell your data or share it outside HMC, other than with the service providers below that run the apps.</li>
          </ul>
        </Section>

        <Section title="6. Where it is stored">
          <ul className="list-disc pl-5 space-y-1">
            <li><b>Database and sign-in:</b> Supabase, hosted in the European Union region (Zurich, Switzerland).</li>
            <li><b>App hosting:</b> Vercel.</li>
            <li><b>Sign-in and password-reset emails:</b> sent from an SOS Microsoft 365 mailbox.</li>
          </ul>
          <p>Data is encrypted in transit (HTTPS) and at rest. The hosting arrangement is under review with HMC.</p>
        </Section>

        <Section title="7. How long we keep it">
          <p>
            Records are kept for as long as they are needed for SOS operations and audit. Retention periods are being set with
            HMC Information Governance; this section will be updated when they are agreed.
          </p>
        </Section>

        <Section title="8. How we protect it">
          <p>
            Access requires an HMC SOS account, and manager-only areas are limited to managers. Changes are logged,
            and only managers can change roles or deactivate accounts. We review access controls regularly.
          </p>
        </Section>

        <Section title="9. Your rights">
          <p>Under Qatar&apos;s personal data law you can ask to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>see the personal data we hold about you;</li>
            <li>correct it (you can update your name in Settings);</li>
            <li>delete it, where it is not needed for operational or audit records;</li>
            <li>object to how it is used; and</li>
            <li>be told if your data is involved in a security incident.</li>
          </ul>
        </Section>

        <Section title="10. Contact">
          <p>
            Questions or requests: <a href={`mailto:${PRIVACY_CONTACT}`} className="font-semibold text-gray-900 underline">{PRIVACY_CONTACT}</a> (SOS Business Intelligence).
          </p>
        </Section>

        <p className="text-xs text-gray-400 pt-2">We will update this notice when the apps or our practices change. The date at the top shows the latest version.</p>
      </div>
    </div>
  );
}
