import { RESULT_FIELDS } from "@/lib/constants";
import { ResultField } from "@/types/api";

interface FieldSelectorProps {
  value: ResultField | null;
  onChange: (field: ResultField | null) => void;
}

export function FieldSelector({ value, onChange }: FieldSelectorProps) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => {
        const val = e.target.value;
        onChange(val ? (val as ResultField) : null);
      }}
      className="input-field"
    >
      <option value="">-- Select Field --</option>
      {Object.entries(RESULT_FIELDS).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}
