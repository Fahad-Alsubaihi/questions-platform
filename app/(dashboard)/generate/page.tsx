import type { Metadata } from "next";
import { GenerateForm } from "@/components/features/agent/generate-form";

export const metadata: Metadata = {
  title: "توليد أسئلة | منصة الأسئلة",
};

export default function GeneratePage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">توليد أسئلة</h1>
        <p className="text-muted-foreground mt-1">
          استخدم الذكاء الاصطناعي لتوليد أسئلة الأسئلة عن أي موضوع
        </p>
      </div>
      <GenerateForm />
    </div>
  );
}
