"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/layout/AuthProvider";
import { apiPatch, apiPost } from "@/lib/api";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { user, accessToken } = useAuth();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{
    displayName?: string;
    bio?: string;
    website?: string;
    location?: string;
    isPublicProfile?: boolean;
  }>({
    defaultValues: {
      displayName: user?.displayName ?? "",
      bio: user?.bio ?? "",
      website: user?.website ?? "",
      location: user?.location ?? "",
      isPublicProfile: user?.isPublicProfile ?? true,
    },
  });

  const { register: registerPw, handleSubmit: handlePwSubmit, formState: { isSubmitting: pwSubmitting } } = useForm<{
    currentPassword: string;
    newPassword: string;
  }>();

  const onProfile = async (data: Record<string, unknown>) => {
    if (!accessToken) return;
    await apiPatch("/users/me/profile", data, accessToken);
    toast.success("Profile updated");
  };

  const onPassword = async (data: { currentPassword: string; newPassword: string }) => {
    if (!accessToken) return;
    try {
      await apiPost("/users/me/change-password", data, accessToken);
      toast.success("Password changed successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Account Settings</h1>

      {/* Profile form */}
      <div className="card p-6">
        <h2 className="font-semibold mb-4">Profile Information</h2>
        <form onSubmit={handleSubmit(onProfile)} className="space-y-4">
          <div>
            <label className="label">Display Name</label>
            <input {...register("displayName")} className="input" placeholder={user.username} />
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea {...register("bio")} rows={3} className="input resize-none" placeholder="Tell the community about yourself..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Website</label>
              <input {...register("website")} className="input" placeholder="https://..." />
            </div>
            <div>
              <label className="label">Location</label>
              <input {...register("location")} className="input" placeholder="City, Country" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input {...register("isPublicProfile")} type="checkbox" />
            Public profile (visible to everyone)
          </label>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="card p-6">
        <h2 className="font-semibold mb-4">Change Password</h2>
        <form onSubmit={handlePwSubmit(onPassword)} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input {...registerPw("currentPassword", { required: true })} type="password" className="input" />
          </div>
          <div>
            <label className="label">New Password</label>
            <input {...registerPw("newPassword", { required: true, minLength: 8 })} type="password" className="input" />
          </div>
          <button type="submit" disabled={pwSubmitting} className="btn-primary">
            {pwSubmitting ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
