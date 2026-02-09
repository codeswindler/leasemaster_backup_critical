import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type ResetPasswordDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  accountType: "agent" | "client" | "tenant";
  token?: string | null;
  loginPath: string;
};

export function ResetPasswordDialog({
  isOpen,
  onOpenChange,
  accountType,
  token,
  loginPath,
}: ResetPasswordDialogProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const hasToken = Boolean(token);
  const dialogClassName =
    accountType === "agent"
      ? "max-w-md border-2 shadow-2xl backdrop-blur-2xl bg-white/80 dark:bg-background/20"
      : "max-w-md border-2 shadow-2xl backdrop-blur-2xl bg-background/20 dark:bg-background/20";

  useEffect(() => {
    if (!isOpen) {
      setIdentifier("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [isOpen]);

  const handleRequestReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!identifier.trim()) {
      toast({
        title: "Missing details",
        description: "Please enter your username or email.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier, accountType }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to send reset link.");
      }
      toast({
        title: "Reset link sent",
        description: "If the account exists, a reset link has been sent.",
      });
      setIdentifier("");
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Request failed",
        description: error?.message || "Unable to send reset link.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      toast({
        title: "Invalid password",
        description: "Password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please confirm your new password.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, newPassword, accountType }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to reset password.");
      }
      toast({
        title: "Password updated",
        description: "You can now sign in with your new password.",
      });
      onOpenChange(false);
      setLocation(loginPath);
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error?.message || "Unable to reset password.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDialogChange = (open: boolean) => {
    onOpenChange(open);
    if (!open && hasToken) {
      setLocation(loginPath);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className={dialogClassName}>
        <DialogHeader>
          <DialogTitle>{hasToken ? "Set New Password" : "Reset Password"}</DialogTitle>
          <DialogDescription>
            {hasToken
              ? "Enter a new password for your account."
              : "We'll send a reset link to your email if the account exists."}
          </DialogDescription>
        </DialogHeader>

        {hasToken ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Username or Email</Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>
        )}

        <Button
          type="button"
          variant="ghost"
          className="w-full mt-4"
          onClick={() => handleDialogChange(false)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Login
        </Button>
      </DialogContent>
    </Dialog>
  );
}
