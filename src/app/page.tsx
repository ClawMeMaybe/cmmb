import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default async function Home() {
  const cookieStore = await cookies();
  const sessionUserId = cookieStore.get("session_token");

  // If not authenticated, redirect to login
  if (!sessionUserId) {
    redirect("/login");
  }

  // If authenticated, redirect to instances
  redirect("/instances");
}
