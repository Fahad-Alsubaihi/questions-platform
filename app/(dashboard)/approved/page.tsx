import type { Metadata } from "next";
import { ApprovedLibrary } from "@/components/features/approved/approved-library";

export const metadata: Metadata = {
  title: "الأسئلة المعتمدة | منصة الأسئلة",
};

export default function ApprovedPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">الأسئلة المعتمدة</h1>
        <p className="text-muted-foreground mt-1">
          مكتبة الأسئلة التي تم التحقق منها واعتمادها
        </p>
      </div>
      <ApprovedLibrary />
    </div>
  );
}
