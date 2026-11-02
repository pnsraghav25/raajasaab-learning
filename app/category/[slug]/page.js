import LibraryPage from "@/components/library";

export default async function Page({ params }) {
  const { slug } = await params;
  return <LibraryPage mode="category" slug={slug} />;
}
