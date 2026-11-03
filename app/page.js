import LibraryPage from "@/components/library";
import { requireUser } from "@/lib/session";

export default async function Page() {
  await requireUser("/");
  return <LibraryPage />;
}
