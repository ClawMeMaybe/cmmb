import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const sessionUserId = cookieStore.get("session_user_id");

  if (!sessionUserId) {
    redirect("/login");
  }

  // Redirect to instances page
  redirect("/instances");
}
