import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { Center, Loader } from "@mantine/core";
import { useAuth } from "../auth/AuthContext";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <Center h="100vh">
        <Loader color="brand" />
      </Center>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
