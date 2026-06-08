import type { Metadata } from "next";
import { LoginForm } from "@/components/features/auth/login-form";

export const metadata: Metadata = {
  title: "تسجيل الدخول | منصة الأسئلة",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            منصة الأسئلة
          </h1>
          <p className="text-muted-foreground">
            سجّل دخولك لإدارة محتوى الأسئلة
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
