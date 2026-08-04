import Link from "next/link";
import { Button } from "@amni/ui";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="text-lg font-semibold tracking-tight">Amni</span>
        <nav className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          ERP, set up in <span className="text-primary">minutes</span>
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Amni provisions a full-featured, isolated ERP for your company — accounting, sales,
          inventory and purchasing — so you can run the business, not the software.
        </p>
        <div className="flex items-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup">Start free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/signup">See how it works</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
