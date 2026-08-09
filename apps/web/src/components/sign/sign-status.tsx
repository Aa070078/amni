import type { BadgeProps } from "@amni/ui";
import {
  SIGN_DOCUMENT_TYPES,
  SIGN_REQUEST_STATUSES,
  SIGNER_STATUSES,
  type SignDocumentType,
  type SignRequestStatus,
  type SignTemplateStatus,
  type SignerStatus,
} from "@amni/shared";
import { Badge } from "@amni/ui";

const REQUEST_VARIANT: Record<SignRequestStatus, BadgeProps["variant"]> = {
  draft: "secondary",
  sent: "warning",
  awaiting_signature: "default",
  completed: "success",
  declined: "destructive",
  expired: "outline",
};

export function SignRequestStatusBadge({ status }: { status: SignRequestStatus }) {
  const label = SIGN_REQUEST_STATUSES.find((entry) => entry.value === status)?.label ?? status;
  return <Badge variant={REQUEST_VARIANT[status]}>{label}</Badge>;
}

const SIGNER_VARIANT: Record<SignerStatus, BadgeProps["variant"]> = {
  pending: "secondary",
  signed: "success",
  declined: "destructive",
};

export function SignerStatusBadge({ status }: { status: SignerStatus }) {
  const label = SIGNER_STATUSES.find((entry) => entry.value === status)?.label ?? status;
  return <Badge variant={SIGNER_VARIANT[status]}>{label}</Badge>;
}

const TEMPLATE_VARIANT: Record<SignTemplateStatus, BadgeProps["variant"]> = {
  active: "success",
  archived: "outline",
};

export function SignTemplateStatusBadge({ status }: { status: SignTemplateStatus }) {
  const label = status === "active" ? "Active" : "Archived";
  return <Badge variant={TEMPLATE_VARIANT[status]}>{label}</Badge>;
}

export function SignDocumentTypeBadge({ documentType }: { documentType: SignDocumentType }) {
  const label = SIGN_DOCUMENT_TYPES.find((entry) => entry.value === documentType)?.label ?? documentType;
  return <Badge variant="secondary">{label}</Badge>;
}
