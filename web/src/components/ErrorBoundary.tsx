import { Component, type ReactNode } from "react";
import { Button, Center, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

function Fallback({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation();
  return (
    <Center mih="60vh">
      <Stack align="center" gap="sm">
        <ThemeIcon size={56} radius="xl" color="red" variant="light"><IconAlertTriangle size={30} /></ThemeIcon>
        <Text fw={700} fz="lg">{t("common.crashTitle")}</Text>
        <Text c="dimmed" size="sm" maw={420} ta="center">{t("common.crashHint")}</Text>
        <Button onClick={onReset} variant="light">{t("common.reload")}</Button>
      </Stack>
    </Center>
  );
}

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("Page crashed:", error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) return <Fallback onReset={this.reset} />;
    return this.props.children;
  }
}
