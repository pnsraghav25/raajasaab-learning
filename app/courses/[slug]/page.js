import PlayerPage from "@/components/player";

export default async function Page({ params }) {
  const { slug } = await params;
  return <PlayerPage slug={slug} />;
}
