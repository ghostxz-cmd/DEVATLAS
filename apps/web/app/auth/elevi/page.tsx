import { redirect } from "next/navigation";

export default function EleviAuthIndexPage() {
  redirect("/auth/elevi/signin");
}
