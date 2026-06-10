"use client";

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  CheckCircle2,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  Phone,
  Sparkles,
  Wifi,
  Power,
  Zap,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  configureWABA,
  fetchWhatsAppNumbers,
  selectWhatsAppNumber,
  updateAIConfig,
  activateAI,
  disconnectAI,
  getAISetupStatus,
} from "@/services/aiSetup";
import { launchWhatsAppEmbeddedSignup, disconnectMeta } from "@/lib/facebook";
import { useAISetupStore } from "@/store/aiSetupStore";
import { useOnboardingStore } from "@/store/onboardingStore";
import type {
  WhatsAppNumber,
  AIConfig,
  SetupStep,
  BusinessTone,
  AISetupStatus,
} from "@/types/ai-setup";

// ── Constants ─────────────────────────────────────────────────────────────────

const WIZARD_STEPS: { id: SetupStep; label: string }[] = [
  { id: 1, label: "WhatsApp Setup" },
  { id: 2, label: "Select Number" },
  { id: 3, label: "Configure AI" },
];

const WA_ICON_PATH =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;
  const overflowValues = ["auto", "scroll", "overlay"];
  let parent = el.parentElement;
  while (parent) {
    const { overflow, overflowY } = window.getComputedStyle(parent);
    if (
      overflowValues.some((v) => overflow.includes(v) || overflowY.includes(v))
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      type="button"
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none cursor-pointer",
        enabled ? "bg-orange-500" : "bg-gray-200",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
          enabled ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

// ── Root page component ───────────────────────────────────────────────────────

export default function AISetupPage() {
  const queryClient = useQueryClient();
  const mainRef = useRef<HTMLDivElement>(null);
  const { currentStep: onboardingStep, isComplete: onboardingComplete } =
    useOnboardingStore();
  const [currentStep, setCurrentStep] = useState<SetupStep>(1);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  const [wabaConfigured, setWabaConfigured] = useState(false);
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<WhatsAppNumber | null>(
    null,
  );

  const [isFetchingNumbers, setIsFetchingNumbers] = useState(false);
  const [isLaunchingWABA, setIsLaunchingWABA] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  const [aiConfig, setAIConfig] = useState<AIConfig>({
    enabled: true,
    greetingMessage:
      "Hello! 👋 Welcome to our store. How can I help you today?",
    businessTone: "professional",
    productCatalogSync: true,
  });

  // Get store actions (we won't read store directly for UI state, only for persistence & sync)
  const { markComplete, setConfig } = useAISetupStore();

  // Scroll to top on step change
  useEffect(() => {
    const scrollable = getScrollParent(mainRef.current);
    if (scrollable) {
      scrollable.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  // Restore state on mount — fetch server status
  useEffect(() => {
    async function restoreStatus() {
      setIsLoadingStatus(true);
      try {
        let status = queryClient.getQueryData<AISetupStatus>(
          queryKeys.aiSetup.status,
        );
        if (!status) {
          status = await getAISetupStatus();
          queryClient.setQueryData(queryKeys.aiSetup.status, status);
        }

        if (status.isComplete) {
          setIsSetupComplete(true);
          setWabaConfigured(status.wabaConfigured);
          if (status.selectedNumber) setSelectedNumber(status.selectedNumber);
          if (status.aiConfig) {
            setAIConfig(status.aiConfig);
            setConfig(status.aiConfig);
          }
          markComplete();
          useOnboardingStore.getState().completeStep(2);
        } else {
          if (status.wabaConfigured) {
            setWabaConfigured(true);
            setCurrentStep(2);
            handleRefetchNumbers();
          }
          if (status.selectedNumberId) {
            setSelectedNumber(status.selectedNumber);
            setCurrentStep(3);
          }
        }
      } catch {
        // API unreachable — nothing to fall back to
      } finally {
        setIsLoadingStatus(false);
      }
    }
    restoreStatus();
  }, [markComplete, setConfig, queryClient]);

  // ── Step handlers ────────────────────────────────────────────────────────────

  const handleLaunchWABA = async () => {
    setIsLaunchingWABA(true);
    try {
      const { code } = await launchWhatsAppEmbeddedSignup();
      await configureWABA(code);
      setWabaConfigured(true);
      toast.success("WhatsApp Business configured");
      setCurrentStep(2);
      setIsFetchingNumbers(true);
      const nums = await fetchWhatsAppNumbers();
      setNumbers(nums);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "WhatsApp setup failed";
      toast.error(message);
    } finally {
      setIsLaunchingWABA(false);
      setIsFetchingNumbers(false);
    }
  };

  const handleRefetchNumbers = async () => {
    setNumbers([]);
    setIsFetchingNumbers(true);
    try {
      const nums = await fetchWhatsAppNumbers();
      setNumbers(nums);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not fetch numbers";
      toast.error(message);
    } finally {
      setIsFetchingNumbers(false);
    }
  };

  const handleSelectAndProceed = async () => {
    if (!selectedNumber) return;
    try {
      await selectWhatsAppNumber(selectedNumber.numberId);
      setCurrentStep(3);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not select number";
      toast.error(message);
    }
  };

  const handleActivateAI = async () => {
    setIsActivating(true);
    try {
      // updateAIConfig stores config and activateAI marks complete in store
      await updateAIConfig(aiConfig);
      await activateAI();
      setIsSetupComplete(true);
      toast.success("AI assistant activated 🎉");
      useOnboardingStore.getState().completeStep(2);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Activation failed";
      toast.error(message);
    } finally {
      setIsActivating(false);
    }
  };

  const handleReconnect = async () => {
    try {
      await disconnectAI(); // clears store
      await disconnectMeta();
    } catch {
      // Even if the server call fails, clear local state so the user can retry
    }
    setIsSetupComplete(false);
    setCurrentStep(1);
    setWabaConfigured(false);
    setNumbers([]);
    setSelectedNumber(null);
    // reset to default config (store already cleared)
    setAIConfig({
      enabled: true,
      greetingMessage:
        "Hello! 👋 Welcome to our store. How can I help you today?",
      businessTone: "professional",
      productCatalogSync: true,
    });
  };

  // ── Loading skeleton ─────────────────────────────────────────────────────────

  if (isLoadingStatus) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-4 w-48 bg-gray-200 rounded" />
        <div className="bg-white rounded-2xl border border-gray-200 p-5 h-24" />
        <div className="bg-white rounded-2xl border border-gray-200 p-8 h-64" />
      </div>
    );
  }

  // ── Management view (post-setup) ──────────────────────────────────────────────

  if (isSetupComplete) {
    return (
      <ManagementView
        selectedNumber={selectedNumber!}
        aiConfig={aiConfig}
        onAIConfigChange={async (config) => {
          setAIConfig(config);
          try {
            await updateAIConfig(config); // updates store and persists
          } catch {
            toast.error("Failed to save configuration");
          }
        }}
        onReconnect={handleReconnect}
      />
    );
  }

  // ── Setup wizard ──────────────────────────────────────────────────────────────

  return (
    <div
      id="ai-setup-content"
      className={cn(
        "space-y-5",
        onboardingStep === 2 && !onboardingComplete && "relative z-[55]",
      )}
      ref={mainRef}
    >
      <p
        className={cn(
          "text-dash-body px-5",
          onboardingStep === 2 && !onboardingComplete
            ? "text-white"
            : "text-gray-400",
        )}
      >
        Connect WhatsApp and configure your AI assistant
      </p>

      {/* Step indicator */}
      <div className="bg-white sm:rounded-2xl w-full border border-gray-200 p-5">
        <div className="flex items-center">
          {WIZARD_STEPS.map((step, i) => (
            <div
              key={step.id}
              className={`flex items-center ${i < WIZARD_STEPS.length - 1 ? "flex-1" : ""}`}
            >
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-dash-body font-bold transition-all",
                    currentStep > step.id
                      ? "bg-green-500 text-white"
                      : currentStep === step.id
                        ? "bg-orange-500 text-white ring-4 ring-orange-100"
                        : "bg-gray-100 text-gray-400",
                  )}
                >
                  {currentStep > step.id ? <CheckCircle2 size={15} /> : step.id}
                </div>
                <p
                  className={cn(
                    "text-dash-body font-semibold text-center hidden sm:block leading-tight",
                    currentStep === step.id
                      ? "text-orange-500"
                      : currentStep > step.id
                        ? "text-green-600"
                        : "text-gray-400",
                  )}
                >
                  {step.label}
                </p>
              </div>
              {i < WIZARD_STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1 -mt-4 transition-colors rounded-full",
                    currentStep > step.id ? "bg-green-400" : "bg-gray-200",
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="bg-white sm:rounded-2xl border border-gray-200">
        {currentStep === 1 && (
          <WABASetupStep
            configured={wabaConfigured}
            isLaunching={isLaunchingWABA}
            onLaunch={handleLaunchWABA}
          />
        )}
        {currentStep === 2 && (
          <SelectNumberStep
            numbers={numbers}
            isFetching={isFetchingNumbers}
            selectedNumber={selectedNumber}
            onSelect={setSelectedNumber}
            onUseNumber={handleSelectAndProceed}
            onRefetch={handleRefetchNumbers}
            onBack={() => setCurrentStep(1)}
          />
        )}
        {currentStep === 3 && (
          <ConfigureAIStep
            selectedNumber={selectedNumber!}
            aiConfig={aiConfig}
            onAIConfigChange={setAIConfig}
            isActivating={isActivating}
            onActivate={handleActivateAI}
            onBack={() => setCurrentStep(2)}
          />
        )}
      </div>
    </div>
  );
}

// ── Step components (unchanged, but any direct localStorage calls are removed) ──
// (All components below are identical to the original – no design changes, only
//  their parent now passes the correct props without localStorage references)

function WABASetupStep({
  configured,
  isLaunching,
  onLaunch,
}: {
  configured: boolean;
  isLaunching: boolean;
  onLaunch: () => void;
}) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const setModal = (open: boolean) => {
    setShowConfirmModal(open);
  };

  const handleLaunchClick = () => setModal(true);

  const handleConfirm = () => {
    setModal(false);
    onLaunch();
  };

  return (
    <>
      <div className="p-6 sm:p-8">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="#25D366">
                <path d={WA_ICON_PATH} />
              </svg>
            </div>
            <div>
              <h2 className="text-dash-heading font-bold text-gray-900">
                Set up WhatsApp Business
              </h2>
              <p className="text-dash-body text-gray-400">Step 1 of 3</p>
            </div>
          </div>

          <p className="text-dash-body text-gray-600 mb-6 leading-relaxed">
            Connect your WhatsApp Business Account to start sending and
            receiving messages through Velte AI. The process takes less than 2
            minutes via Meta's secure guided flow.
          </p>

          {configured ? (
            <div className="flex items-center gap-3 p-3.5 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle2
                size={18}
                className="text-green-500 flex-shrink-0"
              />
              <div>
                <p className="text-dash-body font-semibold text-green-700">
                  WhatsApp Business configured
                </p>
                <p className="text-dash-body text-green-600">
                  Fetching your numbers…
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={handleLaunchClick}
              disabled={isLaunching}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] hover:bg-[#1ea855] disabled:opacity-60 text-white text-dash-body font-semibold rounded-xl transition-colors cursor-pointer"
            >
              {isLaunching ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  Completing WhatsApp setup…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="white">
                    <path d={WA_ICON_PATH} />
                  </svg>
                  Connect WhatsApp Business
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center px-0 sm:px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setModal(false)}
          />

          {/* Modal */}
          <div className="relative w-full sm:max-w-xl bg-white sm:rounded-2xl sm:rounded-t-2xl overflow-hidden shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="#25D366"
                  >
                    <path d={WA_ICON_PATH} />
                  </svg>
                </div>
                <h3 className="text-dash-heading font-bold text-gray-900">
                  Before you continue
                </h3>
              </div>
              <button
                onClick={() => setModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* What happens in the popup */}
              <div>
                <p className="text-dash-caption font-bold text-gray-400 uppercase tracking-wider mb-3">
                  What happens in the popup
                </p>
                <div className="space-y-2.5">
                  {[
                    "Log in to Facebook and grant permissions",
                    "Select or create a Business Portfolio",
                    "Create or select a WhatsApp Business Account (WABA)",
                    "Add or confirm a phone number",
                    "Verify the number via OTP (SMS or call)",
                  ].map((item, i) => (
                    <div key={item} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-dash-micro font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <span className="text-dash-body text-gray-600">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-gray-100" />

              {/* Requirements */}
              <div>
                <p className="text-dash-caption font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Phone number requirements
                </p>
                <div className="space-y-2.5">
                  {[
                    {
                      ok: true,
                      text: "A number currently on WhatsApp Business app can be used — it will appear automatically if it's already linked to your Meta Business Portfolio.",
                    },
                    {
                      ok: true,
                      text: "A completely new number (not on any WhatsApp) works too — you'll add and verify it via OTP inside the popup.",
                    },
                    {
                      ok: false,
                      text: "Numbers active on personal WhatsApp cannot be used. The number must be on WhatsApp Business app or unused entirely.",
                    },
                    {
                      ok: false,
                      text: "If your existing number has two-step verification (a 6-digit PIN) enabled, turn it off in the WhatsApp Business app before connecting — Meta blocks the migration otherwise.",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          item.ok ? "bg-green-100" : "bg-red-50"
                        }`}
                      >
                        {item.ok ? (
                          <CheckCircle2 size={10} className="text-green-600" />
                        ) : (
                          <AlertCircle size={10} className="text-red-400" />
                        )}
                      </div>
                      <p className="text-dash-body text-gray-600 leading-relaxed">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-gray-100" />

              {/* Already on WA Business app warning */}
              <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertCircle
                  size={14}
                  className="text-amber-500 flex-shrink-0 mt-0.5"
                />
                <p className="text-dash-body text-amber-700 leading-relaxed">
                  <span className="font-semibold">
                    Using WhatsApp Business app already?{" "}
                  </span>
                  If your number doesn't appear in the popup, you'll need to
                  link it to your Meta Business Portfolio first at{" "}
                  <a
                    href="https://business.facebook.com/latest/settings/whatsapp_account"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    business.facebook.com
                  </a>{" "}
                  before restarting this flow. You cannot add it manually if
                  it's already registered.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setModal(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-dash-body font-semibold rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 bg-[#25D366] hover:bg-[#1ea855] text-white text-dash-body font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="white">
                  <path d={WA_ICON_PATH} />
                </svg>
                <p className="hidden sm:flex">Continue to Facebook</p>
                <p className="sm:hidden flex">Continue</p>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SelectNumberStep({
  numbers,
  isFetching,
  selectedNumber,
  onSelect,
  onUseNumber,
  onRefetch,
  onBack,
}: {
  numbers: WhatsAppNumber[];
  isFetching: boolean;
  selectedNumber: WhatsAppNumber | null;
  onSelect: (n: WhatsAppNumber) => void;
  onUseNumber: () => void;
  onRefetch: () => void;
  onBack: () => void;
}) {
  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Phone size={20} className="text-orange-500" />
          </div>
          <div>
            <h2 className="text-dash-heading font-bold text-gray-900">
              Select your WhatsApp number
            </h2>
            <p className="text-dash-body text-gray-400">Step 2 of 3</p>
          </div>
        </div>

        <p className="text-dash-body text-gray-600 mb-5">
          Choose which number you want the AI to manage.
        </p>

        {isFetching ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <RefreshCw size={24} className="text-orange-400 animate-spin" />
            <p className="text-dash-body text-gray-500">
              Fetching your WhatsApp numbers…
            </p>
          </div>
        ) : numbers.length === 0 ? (
          <div className="text-center py-12">
            <Phone size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-dash-body font-medium text-gray-500 mb-1">
              No numbers found
            </p>
            <p className="text-dash-body text-gray-400 mb-5">
              Make sure you completed the WhatsApp Business setup
            </p>
            <button
              onClick={onRefetch}
              className="inline-flex items-center gap-1.5 text-dash-body text-orange-500 hover:text-orange-600 font-medium transition-colors cursor-pointer"
            >
              <RefreshCw size={14} />
              Try again
            </button>
          </div>
        ) : (
          <div className="space-y-3 mb-5">
            {numbers.map((number) => (
              <button
                key={number.numberId}
                onClick={() => onSelect(number)}
                className={cn(
                  "w-full flex items-center gap-3.5 p-4 rounded-xl border-2 text-left transition-all cursor-pointer",
                  selectedNumber?.numberId === number.numberId
                    ? "border-orange-400 bg-orange-50"
                    : "border-gray-200 hover:border-gray-300 bg-white",
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                    selectedNumber?.numberId === number.numberId
                      ? "border-orange-500"
                      : "border-gray-300",
                  )}
                >
                  {selectedNumber?.numberId === number.numberId && (
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-dash-body font-semibold text-gray-900">
                    {number?.phoneNumber}
                  </p>
                  <p className="text-dash-body text-gray-500">
                    {number?.businessName}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-dash-micro font-semibold px-2 py-1 rounded-full flex-shrink-0",
                    number.verificationStatus === "verified"
                      ? "bg-green-100 text-green-700"
                      : number.verificationStatus === "pending"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-500",
                  )}
                >
                  {number.verificationStatus === "verified"
                    ? "Verified"
                    : number.verificationStatus === "pending"
                      ? "Pending"
                      : "Unverified"}
                </span>
              </button>
            ))}

            <button
              onClick={onRefetch}
              className="inline-flex items-center gap-1.5 text-dash-body text-gray-400 hover:text-orange-500 transition-colors cursor-pointer"
            >
              <RefreshCw size={12} />
              Refresh numbers
            </button>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onBack}
            className="text-dash-body text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            ← Back
          </button>
          <button
            onClick={onUseNumber}
            className={cn(
              "flex items-center gap-1.5 py-2.5 px-5 rounded-xl text-dash-body font-semibold transition-colors",
              selectedNumber
                ? "bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
                : "bg-gray-100 text-gray-400 cursor-not-allowed",
            )}
          >
            Use This Number
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfigureAIStep({
  selectedNumber,
  aiConfig,
  onAIConfigChange,
  isActivating,
  onActivate,
  onBack,
}: {
  selectedNumber: WhatsAppNumber;
  aiConfig: AIConfig;
  onAIConfigChange: (c: AIConfig) => void;
  isActivating: boolean;
  onActivate: () => void;
  onBack: () => void;
}) {
  const tones: { value: BusinessTone; label: string }[] = [
    { value: "formal", label: "Formal" },
    { value: "professional", label: "Professional" },
    { value: "casual", label: "Casual" },
  ];

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles size={20} className="text-orange-500" />
          </div>
          <div>
            <h2 className="text-dash-heading font-bold text-gray-900">
              Configure AI assistant
            </h2>
            <p className="text-dash-body text-gray-400">Step 3 of 3</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl mb-6">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="#16a34a">
            <path d={WA_ICON_PATH} />
          </svg>
          <p className="text-dash-body font-medium text-green-700">
            {selectedNumber?.phoneNumber} · {selectedNumber?.businessName}
          </p>
        </div>

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dash-body font-semibold text-gray-900">
                Enable AI Auto Replies
              </p>
              <p className="text-dash-body text-gray-500 mt-0.5">
                AI will respond to incoming messages automatically
              </p>
            </div>
            <Toggle
              enabled={aiConfig.enabled}
              onChange={() =>
                onAIConfigChange({ ...aiConfig, enabled: !aiConfig.enabled })
              }
            />
          </div>

          <div className="h-px bg-gray-100" />

          <div>
            <label className="text-dash-body font-semibold text-gray-900 block mb-1">
              Greeting Message
            </label>
            <p className="text-dash-body text-gray-500 mb-2">
              Sent to new customers on their first message
            </p>
            <textarea
              value={aiConfig.greetingMessage}
              onChange={(e) =>
                onAIConfigChange({
                  ...aiConfig,
                  greetingMessage: e.target.value,
                })
              }
              rows={3}
              className="w-full text-dash-body text-gray-700 border border-gray-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow"
            />
          </div>

          <div className="h-px bg-gray-100" />

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-dash-body font-semibold text-gray-900">
                Business Tone
              </p>
              <p className="text-dash-body text-gray-500 mt-0.5">
                How the AI communicates with customers
              </p>
            </div>
            <select
              value={aiConfig.businessTone}
              onChange={(e) =>
                onAIConfigChange({
                  ...aiConfig,
                  businessTone: e.target.value as BusinessTone,
                })
              }
              className="text-dash-body text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-300 cursor-pointer flex-shrink-0"
            >
              {tones.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="h-px bg-gray-100" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-dash-body font-semibold text-gray-900">
                Product Catalog Sync
              </p>
              <p className="text-dash-body text-gray-500 mt-0.5">
                AI recommends products from your catalog
              </p>
            </div>
            <Toggle
              enabled={aiConfig.productCatalogSync}
              onChange={() =>
                onAIConfigChange({
                  ...aiConfig,
                  productCatalogSync: !aiConfig.productCatalogSync,
                })
              }
            />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={onBack}
            className="text-dash-body text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            ← Back
          </button>
          <button
            onClick={onActivate}
            disabled={isActivating}
            className="flex items-center gap-2 py-2.5 px-6 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-dash-body font-semibold rounded-xl transition-colors cursor-pointer"
          >
            {isActivating ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Activating…
              </>
            ) : (
              <>
                <Zap size={14} />
                Activate AI
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Management View (post-setup) – updated to use store and remove localStorage ──
function ManagementView({
  selectedNumber,
  aiConfig,
  onAIConfigChange,
  onReconnect,
}: {
  selectedNumber: WhatsAppNumber;
  aiConfig: AIConfig;
  onAIConfigChange: (c: AIConfig) => Promise<void> | void;
  onReconnect: () => void;
}) {
  const [localConfig, setLocalConfig] = useState<AIConfig>(aiConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onAIConfigChange(localConfig);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const statusItems = [
    { label: "Meta Account" },
    { label: "WhatsApp Business" },
    { label: "Phone Selected" },
    { label: "Webhook Active" },
  ];

  const tones: { value: BusinessTone; label: string }[] = [
    { value: "formal", label: "Formal" },
    { value: "professional", label: "Professional" },
    { value: "casual", label: "Casual" },
  ];

  return (
    <div className="space-y-5 pb-10">
      {/* Status banner */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles size={18} className="text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
              <h2 className="text-dash-heading font-bold text-gray-900">
                AI Assistant Active
              </h2>
            </div>
            <p className="text-dash-body text-gray-500">
              {selectedNumber?.phoneNumber} · {selectedNumber?.businessName}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-dash-body font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full flex-shrink-0">
            <Wifi size={11} />
            Live
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {statusItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg"
            >
              <CheckCircle2
                size={13}
                className="text-green-500 flex-shrink-0"
              />
              <span className="text-dash-body font-medium text-gray-600 leading-tight">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Configuration */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
        <h3 className="text-dash-heading font-bold text-gray-800 mb-5">
          AI Configuration
        </h3>

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dash-body font-semibold text-gray-900">
                Enable AI Auto Replies
              </p>
              <p className="text-dash-body text-gray-500 mt-0.5">
                AI responds to incoming messages automatically
              </p>
            </div>
            <Toggle
              enabled={localConfig.enabled}
              onChange={() =>
                setLocalConfig({
                  ...localConfig,
                  enabled: !localConfig.enabled,
                })
              }
            />
          </div>

          <div className="h-px bg-gray-100" />

          <div>
            <label className="text-dash-body font-semibold text-gray-900 block mb-1">
              Greeting Message
            </label>
            <textarea
              value={localConfig.greetingMessage}
              onChange={(e) =>
                setLocalConfig({
                  ...localConfig,
                  greetingMessage: e.target.value,
                })
              }
              rows={3}
              className="w-full text-dash-body text-gray-700 border border-gray-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow"
            />
          </div>

          <div className="h-px bg-gray-100" />

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-dash-body font-semibold text-gray-900">
                Business Tone
              </p>
              <p className="text-dash-body text-gray-500 mt-0.5">
                How the AI communicates with customers
              </p>
            </div>
            <select
              value={localConfig.businessTone}
              onChange={(e) =>
                setLocalConfig({
                  ...localConfig,
                  businessTone: e.target.value as BusinessTone,
                })
              }
              className="text-dash-body text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-300 cursor-pointer flex-shrink-0"
            >
              {tones.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="h-px bg-gray-100" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-dash-body font-semibold text-gray-900">
                Product Catalog Sync
              </p>
              <p className="text-dash-body text-gray-500 mt-0.5">
                AI recommends products from your catalog
              </p>
            </div>
            <Toggle
              enabled={localConfig.productCatalogSync}
              onChange={() =>
                setLocalConfig({
                  ...localConfig,
                  productCatalogSync: !localConfig.productCatalogSync,
                })
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          {saved && (
            <span className="flex items-center gap-1.5 text-dash-body font-medium text-green-600">
              <CheckCircle2 size={13} />
              Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 py-2.5 px-5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-dash-body font-semibold rounded-xl transition-colors cursor-pointer"
          >
            {isSaving ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>

      {/* Manage Connection */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
        <h3 className="text-dash-heading font-bold text-gray-800 mb-1">
          Manage Connection
        </h3>
        <p className="text-dash-body text-gray-500 mb-4">
          Change or disconnect your WhatsApp integration
        </p>
        <div className="flex flex-wrap gap-3">
          {/* <button
            onClick={onReconnect}
            className="flex items-center gap-1.5 py-2 px-4 border border-gray-200 text-gray-700 hover:bg-gray-50 text-dash-body font-medium rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw size={14} />
            Reconnect Meta
          </button> */}
          <button
            onClick={onReconnect}
            className="flex items-center gap-1.5 py-2 px-4 border border-red-200 text-red-600 hover:bg-red-50 text-dash-body font-medium rounded-xl transition-colors cursor-pointer"
          >
            <Power size={14} />
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}
