"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ThresholdSelectorProps = {
  label: string;
  value: number[];
  onChange: (values: number[]) => void;
  disabled?: boolean;
  presets: number[];
};

export function NotificationThresholdSelector({
  label,
  value,
  onChange,
  disabled,
  presets,
}: ThresholdSelectorProps) {
  const togglePreset = (preset: number) => {
    if (value.includes(preset)) {
      onChange(value.filter((v) => v !== preset));
    } else {
      onChange([...value, preset].sort((a, b) => b - a));
    }
  };

  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const isSelected = value.includes(preset);
          return (
            <Button
              key={preset}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => togglePreset(preset)}
              disabled={disabled}
              className={cn("h-7 gap-1.5 text-xs", isSelected && "gap-1")}
            >
              {preset === 1 ? "1 day" : `${preset} days`}
              {isSelected && <X className="size-3" />}
            </Button>
          );
        })}
      </div>
      {value.length === 0 && (
        <div className="text-muted-foreground text-xs italic">
          Select at least one threshold
        </div>
      )}
    </div>
  );
}
