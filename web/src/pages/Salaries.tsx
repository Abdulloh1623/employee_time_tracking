import { useEffect, useState } from "react";
import { Stack, Title, Paper } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { listEmployees } from "../api/employees";
import { apiErrorMessage } from "../api/client";
import SalaryManager from "../components/SalaryManager";
import type { Employee } from "../types";

export default function Salaries() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    listEmployees({ perPage: 200, status: "active" })
      .then((res) => setEmployees(res.data))
      .catch((err) => notifications.show({ color: "red", message: apiErrorMessage(err) }));
  }, []);

  return (
    <Stack gap="md">
      <Title order={2}>{t("salary.title")}</Title>
      <Paper withBorder radius="md" p="lg">
        <SalaryManager employees={employees} />
      </Paper>
    </Stack>
  );
}
