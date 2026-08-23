import Link from "next/link";
import { Button } from "@amni/ui";
import { LandingFeatures } from "@/src/components/landing/landing-features";
import { LandingHero } from "@/src/components/landing/landing-hero";
import { LandingWorkflow } from "@/src/components/landing/landing-workflow";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-sm font-bold text-primary-foreground">
              A
            </span>
            <span className="text-lg font-semibold tracking-tight">Amni</span>
          </Link>
          <nav className="flex items-center gap-2" aria-label="Main navigation">
            <div className="mr-3 hidden items-center gap-1 md:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="#product">Product</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="#how-it-works">How it works</Link>
              </Button>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <LandingHero />
      <LandingFeatures />
      <LandingWorkflow />

      <footer className="mt-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Amni</span>
          <nav className="flex items-center gap-6">
            <Link href="/login" className="transition-colors hover:text-foreground">
              Log in
            </Link>
            <Link href="/signup" className="transition-colors hover:text-foreground">
              Sign up
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
