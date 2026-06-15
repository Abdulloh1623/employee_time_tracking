import { Table, UnstyledButton, Group, Text, Center } from "@mantine/core";
import { IconChevronUp, IconChevronDown, IconSelector } from "@tabler/icons-react";

export default function SortableTh({ label, field, sortBy, sortDir, onSort }: {
  label: string;
  field: string;
  sortBy: string;
  sortDir: "asc" | "desc";
  onSort: (field: string) => void;
}) {
  const active = sortBy === field;
  const Icon = active ? (sortDir === "asc" ? IconChevronUp : IconChevronDown) : IconSelector;
  return (
    <Table.Th>
      <UnstyledButton onClick={() => onSort(field)} style={{ width: "100%" }}>
        <Group justify="space-between" wrap="nowrap" gap={4}>
          <Text fw={600} size="sm">{label}</Text>
          <Center><Icon size={14} color={active ? "var(--mantine-color-brand-6)" : "var(--mantine-color-dimmed)"} /></Center>
        </Group>
      </UnstyledButton>
    </Table.Th>
  );
}
