import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return <SignUp appearance={{ variables: { colorPrimary: "#C8A951" } }} />;
}
