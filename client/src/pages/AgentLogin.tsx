import { AdminLogin } from "@/pages/AdminLogin";

export function AgentLogin() {
  return (
    <AdminLogin
      loginType="agent"
      hideEnquiries={true}
      portalLabel="Agent Portal"
      showForgotPassword={true}
      forgotPasswordPath="/agent/reset"
      showBecomeAgent={true}
      becomeAgentPath="/register"
    />
  );
}
