import { useEffect, useState } from "react";
import {
  Title, Group, Table, Badge, Paper, Stack, Text, Pagination, Select, Code, LoadingOverlay,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { IconHistory } from "@tabler/icons-react";
import { listAuditLogs, type AuditLog } from "../api/audit";
import { apiErrorMessage } from "../api/client";

const PER_PAGE = 15;
const ACTIONS = [
  "", "LOGIN", "LOGIN_FAILED", "LOGIN_LOCKED", "PASSWORD_CHANGE",
  "EMPLOYEE_CREATE", "EMPLOYEE_UPDATE", "EMPLOYEE_DEACTIVATE", "EMPLOYEE_QR_REGENERATE",
  "PAYROLL_CALCULATE", "PAYROLL_CLOSE", "LEAVE_APPROVED", "LEAVE_REJECTED",
];

function actionColor(a: string): string {
  if (a.startsWith("LOGIN_FAIL") || a.includes("LOCKED")) return "red";
  if (a.startsWith("LOGIN")) return "teal";
  if (a.includes("DEACTIVATE") || a.includes("REJECTED")) return "orange";
  if (a.includes("PAYROLL")) return "grape";
  return "blue";
}

export default function Audit() {
  const { t } = useTranslation();
  const [items, setItems] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<string | null>("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await listAuditLogs({ action: action || undefined, page, perPage: PER_PAGE });
      setItems(res.data); setTotal(res.total);
    } catch (err) {
      notifications.show({ color: "red", message: apiErrorMessage(err) });
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, action]);

  const rows = items.map((a) => (
    <Table.Tr key={a.id}>
      <Table.Td><Text size="xs" c="dimmed">{new Date(a.createdAt).toLocaleString()}</Text></Table.Td>
      <Table.Td>{a.userLogin}</Table.Td>
      <Table.Td><Badge variant="light" color={actionColor(a.action)}>{a.action}</Badge></Table.Td>
      <Table.Td>{a.entityType ?? "—"}{a.entityId ? ` #${a.entityId}` : ""}</Table.Td>
      <Table.Td>{a.newValue ? <Code>{a.newValue}</Code> : "—"}</Table.Td>
      <Table.Td><Text size="xs" c="dimmed">{a.ipAddress ?? "—"}</Text></Table.Td>
    </Table.Tr>
  ));

  return (
    <Stack gap="md">
      <Title order={2}>{t("audit.title")}</Title>
      <Select label={t("audit.actionType")} w={260}
        data={ACTIONS.map((a) => ({ value: a, label: a === "" ? t("common.all") : a }))}
        value={action} onChange={(v) => { setPage(1); setAction(v); }} />

      <Paper withBorder radius="md" pos="relative">
        <LoadingOverlay visible={loading} zIndex={5} overlayProps={{ radius: "md", blur: 1 }} />
        <Table.ScrollContainer minWidth={820}>
          <Table verticalSpacing="sm" highlightOnHover fz="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("audit.time")}</Table.Th><Table.Th>{t("audit.user")}</Table.Th>
                <Table.Th>{t("audit.action")}</Table.Th><Table.Th>{t("audit.entity")}</Table.Th>
                <Table.Th>{t("audit.data")}</Table.Th><Table.Th>{t("audit.ip")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? rows : (
                <Table.Tr><Table.Td colSpan={6}>
                  <Stack align="center" py="xl" gap={6}>
                    <IconHistory size={34} color="var(--mantine-color-dimmed)" />
                    <Text c="dimmed" size="sm">{t("audit.noRecords")}</Text>
                  </Stack>
                </Table.Td></Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {total > PER_PAGE && (
        <Group justify="flex-end">
          <Pagination total={Math.ceil(total / PER_PAGE)} value={page} onChange={setPage} />
        </Group>
      )}
    </Stack>
  );
}
