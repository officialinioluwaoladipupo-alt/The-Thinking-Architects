import type { Metadata } from "next";
import AdminConsoleClient from "../../components/AdminConsoleClient";

export const metadata: Metadata = {
  title: "Studio Console | The Thinking Architects",
  description:
    "Manage Think Sessions, the Home page Next Session spotlight, and Media recordings.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminConsoleClient />;
}
