"use client";

import { FormField } from "@/components/shared/FormField";

interface CsvListInputProps {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  error?: string;
  helpText?: string;
}

export function CsvListInput({
  label,
  value,
  onChange,
  placeholder,
  error,
  helpText,
}: CsvListInputProps) {
  return (
    <FormField label={label} error={error} description={helpText}>
      <div>
        <textarea
          className="min-h-24 w-full resize-y rounded-lg bg-white px-3 py-3 text-sm leading-relaxed text-[#171717] shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] outline-none transition-shadow placeholder:text-[#808080] hover:shadow-[rgba(0,0,0,0.14)_0px_0px_0px_1px] focus-visible:shadow-[rgba(0,114,245,1)_0px_0px_0px_2px] focus-visible:ring-0"
          value={value.join(", ")}
          placeholder={placeholder}
          rows={3}
          onChange={(event) => {
            const next = event.target.value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean);
            onChange(next);
          }}
        />
      </div>
    </FormField>
  );
}
