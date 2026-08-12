"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { Button, Card, CardContent, Skeleton } from "@amni/ui";
import { crmClient, formatCrmDateTime } from "@/src/lib/crm";
import { CrmReferenceChip } from "./crm-badges";
import { CrmSectionHeader } from "./crm-nav";
import { SendWhatsAppDialog } from "./whatsapp/send-whatsapp-dialog";

export function WhatsAppView() {
  const queryClient = useQueryClient();
  const [sendOpen, setSendOpen] = useState(false);

  const historyQuery = useQuery({
    queryKey: ["crm", "whatsapp", "history"],
    queryFn: () => crmClient.whatsapp.history({ limit: 100 }),
    placeholderData: (previous) => previous,
  });

  return (
    <div className="space-y-6">
      <CrmSectionHeader
        title="WhatsApp"
        description="Message contacts and review your WhatsApp history."
      >
        <Button onClick={() => setSendOpen(true)}>
          <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
          Send message
        </Button>
      </CrmSectionHeader>

      {historyQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : historyQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">Couldn&apos;t load WhatsApp history</p>
              <p className="text-sm text-muted-foreground">Something went wrong. Please try again.</p>
            </div>
            <Button variant="outline" onClick={() => void historyQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : historyQuery.data?.items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">No messages yet</p>
              <p className="text-sm text-muted-foreground">
                Send your first WhatsApp message to start a conversation.
              </p>
            </div>
            <Button onClick={() => setSendOpen(true)}>Send message</Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {(historyQuery.data?.items ?? []).map((message) => (
            <li key={message.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  To <span className="tabular-nums font-medium text-foreground">{message.to}</span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="rounded-md bg-muted px-1.5 py-0.5 capitalize">{message.status}</span>
                  <span>{formatCrmDateTime(message.sentAt)}</span>
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{message.message}</p>
              {message.referenceType && message.referenceCode ? (
                <div className="mt-2">
                  <CrmReferenceChip
                    referenceType={message.referenceType}
                    referenceCode={message.referenceCode}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <SendWhatsAppDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        onSent={() => void queryClient.invalidateQueries({ queryKey: ["crm", "whatsapp", "history"] })}
      />
    </div>
  );
}
