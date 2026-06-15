import { useState } from "react";
import { Modal, PasswordInput, Button, Stack, Group } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { changePassword } from "../api/auth";
import { apiErrorMessage } from "../api/client";

export default function ChangePasswordModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const form = useForm({
    initialValues: { oldPassword: "", newPassword: "", confirm: "" },
    validate: {
      oldPassword: (v) => (v ? null : t("auth.enterCurrent")),
      newPassword: (v) => (v.length >= 6 ? null : t("auth.min6")),
      confirm: (v, vals) => (v === vals.newPassword ? null : t("auth.noMatch")),
    },
  });

  async function submit(values: typeof form.values) {
    setBusy(true);
    try {
      await changePassword(values.oldPassword, values.newPassword);
      notifications.show({ color: "teal", message: t("auth.passwordChanged") });
      form.reset();
      onClose();
    } catch (err) {
      notifications.show({ color: "red", title: t("common.error"), message: apiErrorMessage(err) });
    } finally { setBusy(false); }
  }

  return (
    <Modal opened={opened} onClose={onClose} title={t("auth.changePassword")} centered>
      <form onSubmit={form.onSubmit(submit)}>
        <Stack>
          <PasswordInput label={t("auth.oldPassword")} withAsterisk {...form.getInputProps("oldPassword")} />
          <PasswordInput label={t("auth.newPassword")} withAsterisk {...form.getInputProps("newPassword")} />
          <PasswordInput label={t("auth.confirmPassword")} withAsterisk {...form.getInputProps("confirm")} />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" loading={busy}>{t("common.save")}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
