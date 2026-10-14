import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return <SignIn appearance={{ variables: { colorPrimary: "#C8A951" } }} />;
}
