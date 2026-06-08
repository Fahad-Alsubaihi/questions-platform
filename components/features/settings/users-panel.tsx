"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, Plus, Shield, User, Pencil, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
}

async function fetchUsers(): Promise<UserRow[]> {
  const res = await fetch("/api/users");
  if (!res.ok) throw new Error("Failed to fetch");
  return (await res.json()).data;
}

export function UsersPanel() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });

  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" as "user" | "admin" });
  const [editForm, setEditForm] = useState({ name: "", role: "user" as "user" | "admin", password: "" });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "فشل الإنشاء");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowCreate(false);
      setForm({ name: "", email: "", password: "", role: "user" });
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string } & typeof editForm) => {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "فشل التعديل");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditId(null);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "فشل الحذف");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
    onError: (e: Error) => setError(e.message),
  });

  function startEdit(user: UserRow) {
    setEditId(user.id);
    setEditForm({ name: user.name, role: user.role, password: "" });
    setError(null);
  }

  if (isLoading) {
    return <div className="h-32 rounded-lg border border-border bg-card animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Users list */}
      <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
        {users.map((user) => (
          <div key={user.id} className="px-4 py-3">
            {editId === user.id ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="الاسم"
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value as "user" | "admin" }))}
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="user">مستخدم</option>
                    <option value="admin">مشرف</option>
                  </select>
                </div>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="كلمة مرور جديدة (اختياري)"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => updateMutation.mutate({ id: user.id, ...editForm })}
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    حفظ
                  </button>
                  <button
                    onClick={() => { setEditId(null); setError(null); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    user.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {user.role === "admin" ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full border font-medium",
                    user.role === "admin"
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-muted text-muted-foreground border-border"
                  )}>
                    {user.role === "admin" ? "مشرف" : "مستخدم"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(user)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    title="تعديل"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(user.id)}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {users.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            لا يوجد مستخدمون
          </div>
        )}
      </div>

      {/* Create user */}
      {showCreate ? (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h4 className="text-sm font-medium text-foreground">إضافة مستخدم جديد</h4>
          <div className="grid grid-cols-2 gap-3">
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="الاسم *"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="البريد الإلكتروني *"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="كلمة المرور * (٨ أحرف على الأقل)"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as "user" | "admin" }))}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="user">مستخدم</option>
              <option value="admin">مشرف</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              إضافة
            </button>
            <button
              onClick={() => { setShowCreate(false); setError(null); }}
              className="px-4 py-2 text-sm rounded-md border border-border text-muted-foreground hover:text-foreground"
            >
              إلغاء
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors w-full justify-center"
        >
          <Plus className="h-4 w-4" />
          إضافة مستخدم
        </button>
      )}
    </div>
  );
}
