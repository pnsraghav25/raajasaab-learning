import LibraryPage from "@/components/library";
import { requireUser } from "@/lib/session";

export default async function Page({ params }) {
  const { slug } = await params;
  await requireUser(`/batches/${slug}`);
  return <LibraryPage mode="batch" slug={slug} />;
}
