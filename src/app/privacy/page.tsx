import type { Metadata } from "next";
import PrivacyNotice from "@/components/PrivacyNotice";

export const metadata: Metadata = { title: "Privacy Notice" };

export default function PrivacyPage() {
  return <PrivacyNotice appName="SOS Access" />;
}
