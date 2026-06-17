import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import SignIn from "@/features/auth/sign-in";

const signInSearchSchema = z.object({
  returnUrl: z.string().optional(),
});

export const Route = createFileRoute("/_auth/sign-in")({
  component: SignInPage,
  validateSearch: signInSearchSchema,
});

function SignInPage() {
  const { returnUrl } = Route.useSearch();
  return <SignIn returnUrl={returnUrl} />;
}
