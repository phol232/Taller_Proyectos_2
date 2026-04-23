"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface SelectFieldOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectFieldOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  triggerClassName?: string;
}

export function SelectField({
  value,
  onChange,
  options,
  placeholder,
  className,
  disabled,
  triggerClassName,
}: SelectFieldProps) {
  const items = React.useMemo(() => {
    const map: Record<string, React.ReactNode> = {};
    for (const opt of options) {
      map[opt.value] = opt.label;
    }
    return map;
  }, [options]);

  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        if (typeof next === "string") {
          onChange(next);
        }
      }}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          "!h-12 w-full min-w-0 justify-between gap-2 rounded-lg border border-input bg-transparent px-3 py-1 text-base leading-6 transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate [&_[data-slot=select-value]]:text-left [&_[data-slot=select-value]]:text-inherit [&_[data-slot=select-value]]:leading-6 [&_[data-slot=select-value][data-placeholder]]:text-muted-foreground",
          triggerClassName,
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="p-1">
        {options.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            className="data-[highlighted]:bg-[#F3E8FF] data-[highlighted]:text-[#6B21A8] focus:bg-[#F3E8FF] focus:text-[#6B21A8]"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
