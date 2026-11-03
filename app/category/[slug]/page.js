import LibraryPage from "@/components/library";
import { requireUser } from "@/lib/session";

export default async function Page({ params }) {
  const { slug } = await params;
  await requireUser(`/category/${slug}`);
  return <LibraryPage mode="category" slug={slug} />;
}
