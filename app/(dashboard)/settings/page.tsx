import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import { ConfigPanel } from "@/components/features/settings/config-panel";
import { ApiKeysPanel } from "@/components/features/settings/api-keys-panel";
import { UsersPanel } from "@/components/features/settings/users-panel";

export const metadata: Metadata = {
  title: "Settings | Trivia Platform",
};

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || (session.user as { role?: string }).role !== "admin") {
    redirect("/queue");
  }

  return (
    <div className="space-y-10 max-w-3xl">
      {/* AI Provider Keys */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">مزودو الذكاء الاصطناعي</h2>
          <p className="text-sm text-muted-foreground mt-1">
            أضف الـ API keys الخاصة بك — تُحفظ مشفّرة ولا تُعرض مجدداً
          </p>
        </div>
        <ApiKeysPanel />
      </section>

      {/* Agent Config */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">إعدادات الـ Agent</h2>
          <p className="text-sm text-muted-foreground mt-1">
            System prompt والإعدادات المتقدمة للتوليد
          </p>
        </div>
        <ConfigPanel />
      </section>

      {/* Users */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">إدارة المستخدمين</h2>
          <p className="text-sm text-muted-foreground mt-1">
            إضافة المستخدمين وتعديل بياناتهم وصلاحياتهم
          </p>
        </div>
        <UsersPanel />
      </section>
    </div>
  );
}
