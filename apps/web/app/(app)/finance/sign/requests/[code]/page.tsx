import type { Metadata } from "next";
import { SignRequestDetailView } from "@/src/components/sign/sign-request-detail";

export const metadata: Metadata = { title: "Signature request" };

interface Props {
  params: Promise<{ code: string }>;
}

export default async function SignRequestDetailPage({ params }: Props) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-5xl">
      <SignRequestDetailView code={code} />
    </div>
  );
}
