"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Briefcase, FileText, Sparkles, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DescriptionQualityMeter } from "@/components/DescriptionQualityMeter";
import { SIGNUP_FIELD_SCHEMAS } from "../schema";
import type { SignupFormApi } from "../schema";
import { FieldError } from "./shared";
import SectorPicker from "./SectorPicker";
import { useAutoResizeTextarea } from "@/hooks/useAutoResizeTextarea";

const MAX_DESCRIPTION = 600;

interface GenerateResult {
  description: string;
}

// A hook can't be called inside form.Field's render-prop callback (not a
// component as far as react-hooks/rules-of-hooks can tell) — pulled out
// into its own component so useAutoResizeTextarea is legal.
function DescriptionField({
  field,
  sectorValues,
  onGenerate,
  isGenerating,
}: {
  field: {
    state: { value: string; meta: { errors: unknown[] } };
    handleChange: (value: string) => void;
    handleBlur: () => void;
  };
  sectorValues: string[];
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  const autoResize = useAutoResizeTextarea(field.state.value);
  return (
    <div>
      <Label className="text-black/70 text-sm mb-1.5 flex items-center gap-2">
        <FileText className="w-3.5 h-3.5 text-orange-400" />
        Describe your business
      </Label>
      <textarea
        {...autoResize}
        value={field.state.value}
        onChange={(e) =>
          field.handleChange(e.target.value.slice(0, MAX_DESCRIPTION))
        }
        onBlur={field.handleBlur}
        rows={5}
        placeholder="e.g. We sell original phone accessories — chargers, earphones, screen guards — in Computer Village, Ikeja. We also do same-day phone repairs."
        className="w-full px-3.5 py-2.5 min-h-[160px] sm:min-h-[130px] bg-transparent border border-black/[0.3] rounded-md text-black text-sm placeholder:text-black/25 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 resize-none overflow-hidden"
      />
      <DescriptionQualityMeter
        description={field.state.value}
        sectorValues={sectorValues}
      />
      <div className="flex justify-end mt-1.5">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex items-center gap-1 text-xs font-medium text-orange-500 hover:text-orange-600 disabled:opacity-60 cursor-pointer"
        >
          {isGenerating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          {isGenerating ? "Generating…" : "Ask AI to generate"}
        </button>
      </div>
      <div className="flex items-center justify-between mt-1">
        <FieldError
          message={field.state.meta.errors[0] as string | undefined}
        />
        <p className="text-black/40 text-xs ml-auto">
          {field.state.value.length}/{MAX_DESCRIPTION}
        </p>
      </div>
    </div>
  );
}

export default function Step2SectorDescription({
  form,
}: {
  form: SignupFormApi;
}) {
  const generateMutation = useMutation({
    mutationFn: async (input: {
      businessName: string;
      sectorValues: string[];
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
    // All picked sectors flow into the prompt so a vendor covering several
    // (e.g. Phones & Accessories + Computer Repairs) gets a description
    // that reflects the whole business, not just the first one chosen.
    const sectorValues = form.store.state.values.sectors;
    if (!businessName) {
      toast.error("Add your business name in step 1 first");
      return;
    }
    if (!sectorValues.length) {
      toast.error("Pick at least one sector first");
      return;
    }
    generateMutation.mutate({ businessName, sectorValues });
  };

  return (
    <div className="space-y-5">
      {/* Sectors */}
      <form.Field
        name="sectors"
        validators={{
          onChange: ({ value }) => {
            const r = SIGNUP_FIELD_SCHEMAS.sectors.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {(field) => (
          <div>
            <Label className="text-black/70 text-sm mb-3 flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5 text-orange-400" />
              Business Sectors
            </Label>
            <SectorPicker
              value={field.state.value}
              onChange={field.handleChange}
              error={field.state.meta.errors[0]}
            />
            <p className="text-black/40 text-xs mt-1">
              Pick up to 5 — this helps buyers find you, and shapes what you can
              list. Editable anytime from your store settings.
            </p>
            <div className="mt-2">
              <FieldError message={field.state.meta.errors[0]} />
            </div>
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
          <DescriptionField
            field={field}
            sectorValues={form.store.state.values.sectors}
            onGenerate={handleGenerate}
            isGenerating={generateMutation.isPending}
          />
        )}
      </form.Field>

      {/* Terms & Conditions */}
      <form.Field
        name="agreedToTerms"
        validators={{
          onChange: ({ value }) => {
            const r = SIGNUP_FIELD_SCHEMAS.agreedToTerms.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {(field) => (
          <div>
            <div className="flex items-start gap-2.5 bg-black/[0.02] border border-black/[0.06] rounded-lg px-3.5 py-3">
              <Checkbox
                id="agreedToTerms"
                checked={field.state.value}
                onCheckedChange={(checked) =>
                  field.handleChange(checked === true)
                }
                className="mt-0.5 border-black/30 data-[checked]:!bg-orange-500 data-[checked]:!border-orange-500 data-[checked]:text-white"
              />
              <Label
                htmlFor="agreedToTerms"
                className="block min-w-0 flex-1 text-sm text-black/60 leading-relaxed cursor-pointer font-normal"
              >
                I agree to Velte&apos;s{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-500 hover:text-orange-600 font-medium"
                >
                  Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-500 hover:text-orange-600 font-medium"
                >
                  Privacy Policy
                </Link>
                .
              </Label>
            </div>
            <FieldError message={field.state.meta.errors[0]} />
          </div>
        )}
      </form.Field>
    </div>
  );
}
