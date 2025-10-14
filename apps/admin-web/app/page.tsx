import { redirect } from "next/navigation"

export default function Home() {
  // Redirect to login page - in production, check auth status first
  redirect("/cards")
}
