"use client";

import { FormEvent } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";

export function SimpleFormCard({
  title,
  description,
  fields,
  onSubmit,
  submitLabel,
}: {
  title: string;
  description?: string;
  fields: Array<{ name: string; label: string; type?: string; placeholder?: string; defaultValue?: string }>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  submitLabel: string;
}) {
  return (
    <Card>
      <h3 className="text-xl font-semibold">{title}</h3>
      {description ? <p className="mt-2 text-sm text-[#6f6255]">{description}</p> : null}
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        {fields.map((field) => (
          <label key={field.name} className="block">
            <span className="mb-2 block text-sm font-medium">{field.label}</span>
            <Input
              name={field.name}
              type={field.type ?? "text"}
              placeholder={field.placeholder}
              defaultValue={field.defaultValue}
              required
            />
          </label>
        ))}
        <Button type="submit">{submitLabel}</Button>
      </form>
    </Card>
  );
}
