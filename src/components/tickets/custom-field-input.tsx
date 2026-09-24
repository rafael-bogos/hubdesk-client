"use client";

import { Paperclip } from "lucide-react";
import { useRef } from "react";
import { StagedFilePreview } from "@/components/tickets/staged-file-preview";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CategoryCustomField } from "@/lib/tickets/types";

export function CustomFieldInput({
  field,
  value,
  file,
  error,
  onChange,
  onFileChange,
}: {
  field: CategoryCustomField;
  value: string | number | boolean | undefined;
  file: File | null;
  error?: string;
  onChange: (value: string | number | boolean) => void;
  onFileChange: (file: File | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = `custom-field-${field.id}`;
  const labelText = field.required ? `${field.label} *` : field.label;

  return (
    <div className="flex flex-col gap-1.5">
      {field.type !== "BOOLEAN" && <Label htmlFor={inputId}>{labelText}</Label>}

      {field.type === "TEXT" && (
        <Input
          id={inputId}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.type === "NUMBER" && (
        <Input
          id={inputId}
          type="number"
          value={typeof value === "string" || typeof value === "number" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.type === "DATE" && (
        <Input
          id={inputId}
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.type === "BOOLEAN" && (
        <div className="flex items-center gap-2">
          <Checkbox
            id={inputId}
            checked={value === true}
            onCheckedChange={(v) => onChange(v === true)}
          />
          <Label htmlFor={inputId} className="font-normal">
            {labelText}
          </Label>
        </div>
      )}

      {field.type === "SELECT" && (
        <Select
          value={typeof value === "string" ? value : ""}
          onValueChange={(v) => v !== null && onChange(v)}
        >
          <SelectTrigger id={inputId} className="w-full">
            <SelectValue placeholder="Selecione uma opção">
              {(v: string | null) => v || "Selecione uma opção"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field.type === "ATTACHMENT" && (
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              onFileChange(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="w-fit"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="size-4" aria-hidden="true" />
            {file ? "Trocar arquivo" : "Selecionar arquivo"}
          </Button>
          {file && <StagedFilePreview file={file} onRemove={() => onFileChange(null)} />}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
