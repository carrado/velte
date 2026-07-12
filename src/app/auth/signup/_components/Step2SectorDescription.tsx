"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Briefcase, FileText, Sparkles, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { SIGNUP_FIELD_SCHEMAS } from "../schema";
import type { SignupFormApi } from "../schema";
import { FieldError } from "./shared";
import SectorPicker from "./SectorPicker";

const MAX_DESCRIPTION = 600;

interface GenerateResult {
  description: string;
}

export default function Step2SectorDescription({
  form,
}: {
  form: SignupFormApi;
}) {
  const generateMutation = useMutation({
    mutationFn: async (input: {
      businessName: string;
      sectorValue: string;
    }) => {
      const res = await fetch("/api/ai/business-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await res.json()) as GenerateResult & { error?: string };
      if (!res.ok)
        throw new Error(data.error ?? "Couldn't generate a description.");
      return data;
    },
    onSuccess: (data) => {
      form.setFieldValue(
        "description",
        data.description.slice(0, MAX_DESCRIPTION),
      );
      toast.success("Draft ready — edit it to sound like you");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleGenerate = () => {
    const businessName = form.store.state.values.businessName?.trim();
    const sectorValue = form.store.state.values.sector;
    if (!businessName) {
      toast.error("Add your business name in step 1 first");
      return;
    }
    if (!sectorValue) {
      toast.error("Pick your sector first");
      return;
    }
    generateMutation.mutate({ businessName, sectorValue });
  };

  return (
    <div className="space-y-5">
      {/* Sector */}
      <form.Field
        name="sector"
        validators={{
          onChange: ({ value }) => {
            const r = SIGNUP_FIELD_SCHEMAS.sector.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {(field) => (
          <div>
            <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5 text-orange-400" />
              Business Sector
            </Label>
            <SectorPicker
              value={field.state.value}
              onSelect={(leaf) => {
                field.handleChange(leaf.value);
                // Selecting a sector derives the account's businessType.
                form.setFieldValue("businessType", leaf.classification);
              }}
              error={field.state.meta.errors[0]}
            />
            <p className="text-black/40 text-xs mt-1">
              Pick the closest match — this helps buyers find you. You can add
              more sectors anytime from your store settings.
            </p>
            <FieldError message={field.state.meta.errors[0]} />
          </div>
        )}
      </form.Field>

      {/* Description */}
      <form.Field
        name="description"
        validators={{
          onChange: ({ value }) => {
            const r = SIGNUP_FIELD_SCHEMAS.description.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {(field) => (
          <div>
            <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-orange-400" />
              Describe your business
            </Label>
            <textarea
              value={field.state.value}
              onChange={(e) =>
                field.handleChange(e.target.value.slice(0, MAX_DESCRIPTION))
              }
              onBlur={field.handleBlur}
              rows={5}
              placeholder="e.g. We sell original phone accessories — chargers, earphones, screen guards — in Computer Village, Ikeja. We also do same-day phone repairs."
              className="w-full px-3.5 py-2.5 bg-transparent border border-black/[0.3] rounded-md text-black text-sm placeholder:text-black/25 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 resize-none"
            />
            <div className="flex justify-end mt-1.5">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="flex items-center gap-1 text-xs font-medium text-orange-500 hover:text-orange-600 disabled:opacity-60 cursor-pointer"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                {generateMutation.isPending
                  ? "Generating…"
                  : "Ask AI to generate"}
              </button>
            </div>
            <div className="flex items-center justify-between mt-1">
              <FieldError message={field.state.meta.errors[0]} />
              <p className="text-black/40 text-xs ml-auto">
                {field.state.value.length}/{MAX_DESCRIPTION}
              </p>
            </div>
          </div>
        )}
      </form.Field>
    </div>
  );
}
