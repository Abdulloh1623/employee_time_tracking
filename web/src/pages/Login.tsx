import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Paper, TextInput, PasswordInput, Button, Title, Text, Alert, Stack, Center, ThemeIcon, Box,
} from "@mantine/core";
import { IconClockHour4, IconAlertCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { apiErrorMessage } from "../api/client";

export default function Login() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [login, setLogin] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(login, password);
      navigate("/");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1554a8 0%, #003f86 100%)",
        padding: 16,
      }}
    >
      <Paper shadow="xl" radius="lg" p={36} w={400} maw="92vw">
        <Center mb="md">
          <Stack gap={6} align="center">
            <ThemeIcon size={56} radius="md" variant="light" color="brand">
              <IconClockHour4 size={34} />
            </ThemeIcon>
            <Title order={2} c="brand.8">TimeGate</Title>
            <Text size="sm" c="dimmed">{t("auth.subtitle")}</Text>
          </Stack>
        </Center>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" variant="light">
            {error}
          </Alert>
        )}

        <form onSubmit={onSubmit}>
          <Stack>
            <TextInput
              label={t("auth.login")}
              value={login}
              onChange={(e) => setLogin(e.currentTarget.value)}
              required
              data-autofocus
            />
            <PasswordInput
              label={t("auth.password")}
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required
            />
            <Button type="submit" loading={busy} fullWidth size="md" mt="xs">
              {t("auth.signIn")}
            </Button>
          </Stack>
        </form>

        <Text size="xs" c="dimmed" ta="center" mt="lg">
          {t("auth.demo")}
        </Text>
      </Paper>
    </Box>
  );
}
