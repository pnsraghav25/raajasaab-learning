import LibraryPage from "@/components/library";
import { requireUser } from "@/lib/session";

export default async function Page({ searchParams }) {
  const params = await searchParams;
  const q = typeof params?.q === "string" ? params.q : "";
  await requireUser(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  return <LibraryPage mode="search" query={q} />;
}
