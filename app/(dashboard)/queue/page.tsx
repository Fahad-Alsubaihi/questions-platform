import type { Metadata } from "next";
import { ReviewQueue } from "@/components/features/queue/review-queue";

export const metadata: Metadata = {
  title: "طابور المراجعة | منصة تريفيا",
};

export default function QueuePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">طابور المراجعة</h1>
        <p className="text-muted-foreground mt-1">
          راجع الأسئلة التي أنشأها الذكاء الاصطناعي قبل نشرها
        </p>
      </div>
      <ReviewQueue />
    </div>
  );
}
