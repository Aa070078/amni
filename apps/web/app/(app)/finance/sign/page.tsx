import type { Metadata } from "next";
import { SignView } from "@/src/components/sign/sign-view";

export const metadata: Metadata = { title: "Sign" };

export default function SignPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <SignView />
    </div>
  );
}
