import { redirect } from "next/navigation";

export default function FloatDetailsPage({
  params,
}: {
  params: { platform: string };
}) {
  redirect("/");
}
