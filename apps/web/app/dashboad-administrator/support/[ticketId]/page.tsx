import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ ticketId: string }>;
};

export default async function AdminSupportTicketRedirectPage({ params }: PageProps) {
  const { ticketId } = await params;
  redirect(`/dashboad-administrator/support?ticket=${encodeURIComponent(ticketId)}`);
}
