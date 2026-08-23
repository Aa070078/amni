"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
  Dialog,
  DialogContent,
} from "@amni/ui";
import { modulesForRole } from "@/src/lib/nav";
import { searchClient } from "@/src/lib/wizard";
import { useMe } from "@/src/hooks/use-me";

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter();
  const { data: user } = useMe();
  const modules = modulesForRole(user?.role);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const trimmed = query.trim();

  const searchQuery = useQuery({
    queryKey: ["global-search", trimmed],
    queryFn: () => searchClient.global(trimmed),
    enabled: open && trimmed.length > 0,
    staleTime: 30_000,
  });

  const run = (href: string) => {
    onOpenChange(false);
    setQuery("");
    router.push(href);
  };

  const results = searchQuery.data?.groups ?? [];
  const hasResults = results.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <CommandInput
            placeholder="Search customers, orders, invoices, items…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
        {trimmed.length === 0 ? (
          <>
            <CommandGroup heading="Navigation">
              {modules.map((module) => (
                <CommandItem key={module.href} onSelect={() => run(module.href)}>
                  <module.icon className="h-4 w-4" />
                  <span>{module.title}</span>
                  <CommandShortcut>{module.intent}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Quick actions">
              <CommandItem onSelect={() => run("/settings")}>
                <span>Open settings</span>
                <CommandShortcut>⌘,</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => run("/setup")}>
                <span>Set up workspace</span>
              </CommandItem>
            </CommandGroup>
          </>
        ) : searchQuery.isLoading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Searching�?�</div>
        ) : searchQuery.isError ? (
          <CommandEmpty>Search is unavailable right now.</CommandEmpty>
        ) : !hasResults ? (
          <CommandEmpty>No results found for &ldquo;{trimmed}&rdquo;.</CommandEmpty>
        ) : (
          results.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.results.map((result) => (
                <CommandItem key={result.id} value={result.title} onSelect={() => run(result.href)}>
                  <span className="text-foreground">{result.title}</span>
                  {result.subtitle ? (
                    <span className="ml-auto max-w-[40%] truncate text-xs text-muted-foreground">
                      {result.subtitle}
                    </span>
                  ) : null}
                  {result.meta ? <CommandShortcut>{result.meta}</CommandShortcut> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ))
        )}
        </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
