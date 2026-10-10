import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation } from "react-router-dom";

import { getLoginDestination } from "@/app/router/authNavigation";
import { useAuth } from "@/context/auth/useAuth";
import { normalizeApiError } from "@/core/api/apiError";
import { loginSchema } from "@/features/auth/components/login.schema";
import type { AuthRealm, LoginRequest } from "@/services/auth/auth.types";
import { Button } from "@/shared/ui/button";

export function LoginForm({ realm }: { realm: AuthRealm }) {
  const auth = useAuth();
  const location = useLocation();
  const {
    register,
    handleSubmit,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (auth.status === "bootstrapping")
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Checking your session…
      </p>
    );
  if (auth.status === "authenticated" && auth.realm) {
    return (
      <Navigate to={getLoginDestination(auth.realm, location.state)} replace />
    );
  }

  const isAdmin = realm === "admin";
  const fieldPrefix = isAdmin ? "admin" : "user";
  const inputClassName =
    "h-11 w-full rounded-lg border bg-white px-3 text-sm shadow-sm transition-shadow placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/15";
  const submit = handleSubmit(async (credentials) => {
    clearErrors("root");
    try {
      await (isAdmin
        ? auth.loginAdmin(credentials)
        : auth.loginUser(credentials));
    } catch (error: unknown) {
      setError("root.server", { message: normalizeApiError(error).message });
    }
  });

  return (
    <form
      className="space-y-5"
      aria-label={isAdmin ? "Administrator sign in" : "User sign in"}
      noValidate
      onSubmit={submit}
    >
      <div className="space-y-2">
        <label
          htmlFor={`${fieldPrefix}-email`}
          className="text-sm font-medium text-slate-800"
        >
          {isAdmin ? "Admin email" : "Email address"}
        </label>
        <input
          {...register("email")}
          id={`${fieldPrefix}-email`}
          type="email"
          autoComplete="email"
          placeholder={isAdmin ? "admin@company.com" : "you@company.com"}
          className={inputClassName}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={
            errors.email ? `${fieldPrefix}-email-error` : undefined
          }
        />
        {errors.email ? (
          <p
            id={`${fieldPrefix}-email-error`}
            role="alert"
            className="text-sm text-red-600"
          >
            {errors.email.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <label
          htmlFor={`${fieldPrefix}-password`}
          className="text-sm font-medium text-slate-800"
        >
          Password
        </label>
        <input
          {...register("password")}
          id={`${fieldPrefix}-password`}
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          className={inputClassName}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={
            errors.password ? `${fieldPrefix}-password-error` : undefined
          }
        />
        {errors.password ? (
          <p
            id={`${fieldPrefix}-password-error`}
            role="alert"
            className="text-sm text-red-600"
          >
            {errors.password.message}
          </p>
        ) : null}
      </div>
      {errors.root?.server ? (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {errors.root.server.message}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting
          ? "Signing in…"
          : isAdmin
            ? "Continue to admin"
            : "Sign in"}
        <ArrowRight aria-hidden="true" />
      </Button>
    </form>
  );
}
