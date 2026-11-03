import PlayerPage from "@/components/player";
import { requireUser } from "@/lib/session";

export default async function Page() {
  await requireUser("/player");
  return <PlayerPage />;
}
