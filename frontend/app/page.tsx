// Redirige a /dashboard como punto de entrada de la SPA.
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}

