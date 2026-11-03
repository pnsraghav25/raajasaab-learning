import PlayerPage from "@/components/player";
import { requireUser } from "@/lib/session";

export default async function Page({ params }) {
  const { slug } = await params;
  await requireUser(`/courses/${slug}`);
  return <PlayerPage slug={slug} />;
}
