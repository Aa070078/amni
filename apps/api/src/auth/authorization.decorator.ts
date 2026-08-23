import { SetMetadata } from "@nestjs/common";

export const ALLOW_MEMBER_MUTATION = "amni:allow-member-mutation";

/** Allows a signed-in member to mutate only their own onboarding/profile state. */
export const AllowMemberMutation = () => SetMetadata(ALLOW_MEMBER_MUTATION, true);
