import type { Metadata } from "next";
import { SignTemplateDetailView } from "@/src/components/sign/sign-template-detail";

export const metadata: Metadata = { title: "Sign template" };

interface Props {
  params: Promise<{ code: string }>;
}

export default async function SignTemplateDetailPage({ params }: Props) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-5xl">
      <SignTemplateDetailView code={code} />
    </div>
  );
}
