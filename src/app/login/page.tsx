import { getLoginMethods } from "@/lib/login-methods";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const loginMethods = await getLoginMethods();

  return <LoginForm loginMethods={loginMethods} />;
}
