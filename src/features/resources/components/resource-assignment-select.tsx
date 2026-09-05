import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ResourceAssignmentSelect({
  id,
  label,
  items,
  value,
  loading,
  disabled,
  onValueChange,
}: {
  id?: string;
  label: "Project" | "Area";
  items: { uuid: string; name: string }[];
  value: string[];
  loading: boolean;
  disabled: boolean;
  onValueChange: (value: string[]) => void;
}) {
  const selectedNames = value
    .map((uuid) => items.find((item) => item.uuid === uuid)?.name)
    .filter((name): name is string => Boolean(name));
  const plural = `${label.toLowerCase()}s`;
  const summary = loading
    ? `Loading ${plural}…`
    : selectedNames.length === 0
      ? `No ${label.toLowerCase()}s`
      : selectedNames.length === 1
        ? selectedNames[0]
        : `${selectedNames.length} ${plural} selected`;

  return (
    <Select
      multiple
      value={value}
      disabled={disabled}
      onValueChange={(nextValue) => onValueChange(nextValue ?? [])}
    >
      <SelectTrigger id={id} className="w-full" aria-label={label}>
        <SelectValue>{summary}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        {items.map((item) => (
          <SelectItem key={item.uuid} value={item.uuid}>
            {item.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
