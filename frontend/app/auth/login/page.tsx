"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api-calls";
import { saveAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { Eye, EyeOff, Activity, Loader2 } from "lucide-react";
import Link from "next/link";

function toErrorMessage(data: unknown, fallback: string): string {
  const detail =
    data && typeof data === "object" && "detail" in data
      ? (data as { detail?: unknown }).detail
      : data;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (!item || typeof item !== "object") return null;

        const msg =
          "msg" in item && typeof item.msg === "string" ? item.msg : null;
        if (!msg) return null;

        const loc =
          "loc" in item && Array.isArray(item.loc)
            ? item.loc.map((part) => String(part)).join(".")
            : null;

        return loc ? `${loc}: ${msg}` : msg;
      })
      .filter((value): value is string => Boolean(value));

    if (messages.length > 0) return messages.join(", ");
  }

  if (detail && typeof detail === "object") {
    if ("msg" in detail && typeof detail.msg === "string") return detail.msg;
    try {
      return JSON.stringify(detail);
    } catch {
      return fallback;
    }
  }

  return fallback;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleDemoMessage, setGoogleDemoMessage] = useState<string | null>(
    null,
  );
  const nextPath = searchParams.get("next");
  const safeNextPath = nextPath?.startsWith("/") ? nextPath : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setGoogleDemoMessage(null);
    try {
      const { data } = await authApi.login({ email, password });
      saveAuth(data.access_token, data.user);
      const role = data.user.role;
      if (role === "super_admin") router.push("/super-admin");
      else if (role === "admin") router.push("/admin");
      else if (role === "doctor") router.push("/doctor");
      else if (role === "receptionist") router.push("/receptionist");
      else router.push(safeNextPath ?? "/patient/dashboard");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(toErrorMessage(err.response?.data, "Invalid email or password"));
      } else {
        setError("Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleDemoLogin = () => {
    setError(null);
    setGoogleDemoMessage(
      "Google login is demo-only right now and not connected yet.",
    );
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-col w-1/2 bg-surface-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-brand-500/10 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-brand-400/8 blur-3xl" />
        </div>

        <div className="absolute top-32 right-8 space-y-3 opacity-60">
          {[
            { token: "A05", status: "Now Serving", color: "text-brand-400" },
            { token: "A06", status: "Next Up", color: "text-amber-400" },
            { token: "A07", status: "Waiting", color: "text-surface-400" },
          ].map((item) => (
            <div
              key={item.token}
              className="bg-white/8 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 w-44"
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-white font-heading">
                  {item.token}
                </span>
                <span className={cn("text-xs font-medium", item.color)}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 flex flex-col justify-end h-full p-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg">
              <Activity size={20} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-white font-heading">
              CareQueue AI
            </span>
          </div>
          <h2 className="text-3xl font-bold text-white font-heading leading-tight mb-3">
            Real-time queue intelligence
            <br />
            for modern clinics
          </h2>
          <p className="text-white/50 text-sm leading-relaxed mb-8">
            Manage patient flow, reduce wait times, and deliver better care with
            AI-powered insights.
          </p>
          <Link
            href="/patient"
            className="text-sm text-brand-400 hover:text-brand-300 transition-colors inline-flex items-center gap-1"
          >
            For patients &rarr; Visit patient portal
          </Link>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <Activity size={16} className="text-white" />
            </div>
            <span className="text-xl font-bold font-heading text-surface-900">
              CareQueue AI
            </span>
          </div>

          <h1 className="text-2xl font-bold font-heading text-surface-900 mb-1">
            Welcome back
          </h1>
          <p className="text-surface-500 text-sm mb-8">
            Sign in to your account
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label
                htmlFor="login-email"
                className="block text-sm font-medium text-surface-700 mb-1.5"
              >
                Email
              </Label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@clinic.com"
                required
                className="h-11 rounded-xl border-surface-200 bg-surface-50 px-4 text-sm focus-visible:ring-brand-300"
              />
            </div>
            <div>
              <Label
                htmlFor="login-password"
                className="block text-sm font-medium text-surface-700 mb-1.5"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-11 rounded-xl border-surface-200 bg-surface-50 px-4 pr-10 text-sm focus-visible:ring-brand-300"
                />
                <Button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              id="login-submit"
              disabled={isLoading}
              className={cn(
                "w-full h-12 rounded-xl font-semibold text-white transition-all",
                "bg-brand-500 hover:bg-brand-600 active:scale-[0.98]",
                "flex items-center justify-center gap-2",
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-surface-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-surface-400">Or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleDemoLogin}
              className={cn(
                "w-full h-12 rounded-xl font-semibold border-surface-200 text-surface-700",
                "hover:bg-surface-50",
              )}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.5 12.24c0-.78-.07-1.53-.2-2.24H12v4.24h5.9a5.05 5.05 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.24-4.74 3.24-8.08Z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.93 0 5.38-.97 7.18-2.64l-3.56-2.76c-.97.65-2.2 1.04-3.62 1.04-2.8 0-5.17-1.9-6.02-4.45H2.3v2.84A10.99 10.99 0 0 0 12 23Z"
                  fill="#34A853"
                />
                <path
                  d="M5.98 14.19a6.6 6.6 0 0 1 0-4.18V7.17H2.3a11 11 0 0 0 0 9.86l3.68-2.84Z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.37c1.56 0 2.94.54 4.03 1.6l3.01-3C17.37 2.44 14.92 1.5 12 1.5a10.99 10.99 0 0 0-9.7 5.67l3.68 2.84C6.83 7.27 9.2 5.37 12 5.37Z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google (Demo)
            </Button>

            {googleDemoMessage && (
              <div className="px-4 py-3 rounded-xl bg-surface-50 border border-surface-200 text-surface-600 text-sm">
                {googleDemoMessage}
              </div>
            )}
          </form>

          <p className="text-center text-sm text-surface-500 mt-6">
            Need a clinic workspace?{" "}
            <Link
              href="/auth/register"
              className="text-brand-600 hover:text-brand-700 font-medium"
            >
              Create clinic account
            </Link>
          </p>

          <p className="text-center text-sm text-surface-400 mt-2">
            Patient?{" "}
            <Link
              href="/auth/patient-register"
              className="text-brand-500 hover:text-brand-600 font-medium"
            >
              Create patient account &rarr;
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
