"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface PasswordChangeResult {
  success?: boolean;
  message?: string;
  error?: string;
  details?: string[];
}

export default function ProfileSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PasswordChangeResult | null>(null);

  const passwordRequirements = [
    { text: "At least 8 characters", test: (p: string) => p.length >= 8 },
    {
      text: "At least one uppercase letter",
      test: (p: string) => /[A-Z]/.test(p),
    },
    {
      text: "At least one lowercase letter",
      test: (p: string) => /[a-z]/.test(p),
    },
    { text: "At least one number", test: (p: string) => /[0-9]/.test(p) },
    {
      text: "At least one special character",
      test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p),
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setResult({
        error: "New passwords do not match",
      });
      setLoading(false);
      return;
    }

    // Validate password strength locally first
    const failedRequirements = passwordRequirements.filter(
      (r) => !r.test(newPassword)
    );
    if (failedRequirements.length > 0) {
      setResult({
        error: "Password does not meet strength requirements",
        details: failedRequirements.map((r) => r.text),
      });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data: PasswordChangeResult = await res.json();

      if (res.ok) {
        setResult({
          success: true,
          message: data.message,
        });
        // Clear form on success
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setResult({
          error: data.error,
          details: data.details,
        });
      }
    } catch (err) {
      setResult({
        error: err instanceof Error ? err.message : "Password change failed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Profile Settings
          </h1>
          <p className="text-muted-foreground">Change your password</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="space-y-1">
                {passwordRequirements.map((req, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    {req.test(newPassword) ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span
                      className={
                        req.test(newPassword)
                          ? "text-green-500"
                          : "text-muted-foreground"
                      }
                    >
                      {req.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={
                loading || !currentPassword || !newPassword || !confirmPassword
              }
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing Password...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </form>

          {result && (
            <div
              className={`mt-6 flex items-start gap-3 p-4 rounded-lg ${
                result.success
                  ? "bg-green-50 dark:bg-green-950"
                  : "bg-red-50 dark:bg-red-950"
              }`}
            >
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              )}
              <div>
                <p className="font-medium">
                  {result.success ? result.message : result.error}
                </p>
                {result.details && result.details.length > 0 && (
                  <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside">
                    {result.details.map((detail, idx) => (
                      <li key={idx}>{detail}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
