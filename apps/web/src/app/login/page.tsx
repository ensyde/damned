"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/components/layout/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

const schema = z.object({
  login: z.string().min(1, "Required"),
  password: z.string().min(1, "Required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.login, data.password);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <h1 className="text-2xl font-bold mb-6 text-center">Sign In</h1>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Username or Email</label>
              <input
                {...register("login")}
                className="input"
                placeholder="johndoe or john@example.com"
                autoComplete="username"
              />
              {errors.login && <p className="text-red-400 text-xs mt-1">{errors.login.message}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <input
                {...register("password")}
                type="password"
                className="input"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <Link href="/forgot-password" className="text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <p className="text-center text-sm text-text-muted mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
