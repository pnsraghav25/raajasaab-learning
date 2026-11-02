import LibraryPage from "@/components/library";

export default async function Page({ searchParams }) {
  const params = await searchParams;
  const q = typeof params?.q === "string" ? params.q : "";
  return <LibraryPage mode="search" query={q} />;
}
