"use client";

import { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  RefreshCw,
  Shield,
  ChevronRight,
  AlertCircle,
  Phone,
  Sparkles,
  Wifi,
  Power,
  RotateCcw,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  markAISetupComplete,
  saveAIConfig,
  loadAIConfig,
} from "@/services/aiSetup";
import type {
  WhatsAppNumber,
  AIConfig,
  SetupStep,
  BusinessTone,
} from "@/types/ai-setup";

const MOCK_NUMBERS: WhatsAppNumber[] = [
  {
    id: "1",
    phoneNumber: "+234 801 234 5678",
    displayName: "Velte Business",
    businessName: "Velte Foods Ltd",
    verificationStatus: "verified",
  },
  {
    id: "2",
    phoneNumber: "+234 803 987 6543",
    displayName: "Velte Support",
    businessName: "Velte Foods Ltd",
    verificationStatus: "pending",
  },
];

const WIZARD_STEPS: { id: SetupStep; label: string }[] = [
  { id: 1, label: "Meta Account" },
  { id: 2, label: "WhatsApp Setup" },
  { id: 3, label: "Select Number" },
  { id: 4, label: "Configure AI" },
];

const WA_ICON_PATH =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

const FB_ICON_PATH =
  "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z";

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

export default function AISetupPage() {
  const mainRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState<SetupStep>(1);

  useEffect(() => {
    const scrollable = getScrollParent(mainRef.current);
    if (scrollable) {
      scrollable.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  const [metaConnected, setMetaConnected] = useState(false);
  const [wabaConfigured, setWabaConfigured] = useState(false);
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<WhatsAppNumber | null>(
    null,
  );
  const [isFetchingNumbers, setIsFetchingNumbers] = useState(false);
  const [isConnectingMeta, setIsConnectingMeta] = useState(false);
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

  useEffect(() => {
    const complete = localStorage.getItem("ai_setup_complete") === "true";
    if (complete) {
      setIsSetupComplete(true);
      setMetaConnected(true);
      setWabaConfigured(true);
      setNumbers(MOCK_NUMBERS);
      setSelectedNumber(MOCK_NUMBERS[0]);
      const stored = loadAIConfig();
      if (stored) setAIConfig(stored);
    }
  }, []);

  const handleConnectMeta = async () => {
    setIsConnectingMeta(true);
    await new Promise((r) => setTimeout(r, 2000));
    setMetaConnected(true);
    setIsConnectingMeta(false);
  };

  const handleLaunchWABA = async () => {
    setIsLaunchingWABA(true);
    await new Promise((r) => setTimeout(r, 2500));
    setWabaConfigured(true);
    setIsLaunchingWABA(false);
    setCurrentStep(3);
    setIsFetchingNumbers(true);
    await new Promise((r) => setTimeout(r, 1500));
    setNumbers(MOCK_NUMBERS);
    setIsFetchingNumbers(false);
  };

  const handleRefetchNumbers = async () => {
    setNumbers([]);
    setIsFetchingNumbers(true);
    await new Promise((r) => setTimeout(r, 1500));
    setNumbers(MOCK_NUMBERS);
    setIsFetchingNumbers(false);
  };

  const handleActivateAI = async () => {
    setIsActivating(true);
    await new Promise((r) => setTimeout(r, 2000));
    markAISetupComplete();
    saveAIConfig(aiConfig);
    setIsSetupComplete(true);
    setIsActivating(false);
  };

  const handleReconnect = () => {
    localStorage.removeItem("ai_setup_complete");
    localStorage.removeItem("ai_config");
    setIsSetupComplete(false);
    setCurrentStep(1);
    setMetaConnected(false);
    setWabaConfigured(false);
    setNumbers([]);
    setSelectedNumber(null);
  };

  if (isSetupComplete) {
    return (
      <ManagementView
        selectedNumber={selectedNumber ?? MOCK_NUMBERS[0]}
        aiConfig={aiConfig}
        onAIConfigChange={(config) => {
          setAIConfig(config);
          saveAIConfig(config);
        }}
        onReconnect={handleReconnect}
      />
    );
  }

  return (
    <div className="space-y-5 pb-10" ref={mainRef}>
      <p className="text-sm text-gray-500">
        Connect WhatsApp and configure your AI assistant
      </p>

      {/* Step indicator */}
      <div className="bg-white rounded-2xl w-full border flex justify-center border-gray-200 p-5">
        <div className="w-300">
          <div className="flex items-center">
            {WIZARD_STEPS.map((step, i) => (
              <div
                key={step.id}
                className={`flex items-center ${i !== WIZARD_STEPS.length - 1 ? "flex-1" : ""}`}
              >
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                      currentStep > step.id
                        ? "bg-green-500 text-white"
                        : currentStep === step.id
                          ? "bg-orange-500 text-white ring-4 ring-orange-100"
                          : "bg-gray-100 text-gray-400",
                    )}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle2 size={15} />
                    ) : (
                      step.id
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-xs font-semibold text-center hidden sm:block leading-tight",
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
      </div>

      {/* Step content */}
      <div className="bg-white rounded-2xl border border-gray-200">
        {currentStep === 1 && (
          <ConnectMetaStep
            connected={metaConnected}
            isConnecting={isConnectingMeta}
            onConnect={handleConnectMeta}
            onNext={() => {
              setCurrentStep(2);
            }}
          />
        )}
        {currentStep === 2 && (
          <WABASetupStep
            configured={wabaConfigured}
            isLaunching={isLaunchingWABA}
            onLaunch={handleLaunchWABA}
            onBack={() => setCurrentStep(1)}
          />
        )}
        {currentStep === 3 && (
          <SelectNumberStep
            numbers={numbers}
            isFetching={isFetchingNumbers}
            selectedNumber={selectedNumber}
            onSelect={setSelectedNumber}
            onUseNumber={() => {
              setCurrentStep(4);
            }}
            onRefetch={handleRefetchNumbers}
            onBack={() => setCurrentStep(2)}
          />
        )}
        {currentStep === 4 && (
          <ConfigureAIStep
            selectedNumber={selectedNumber!}
            aiConfig={aiConfig}
            onAIConfigChange={setAIConfig}
            isActivating={isActivating}
            onActivate={handleActivateAI}
            onBack={() => setCurrentStep(3)}
          />
        )}
      </div>
    </div>
  );
}

// ── Step 1: Connect Meta ──────────────────────────────────────────────────────

function ConnectMetaStep({
  connected,
  isConnecting,
  onConnect,
  onNext,
}: {
  connected: boolean;
  isConnecting: boolean;
  onConnect: () => void;
  onNext: () => void;
}) {
  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="#1877F2">
              <path d={FB_ICON_PATH} />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Connect your Meta account
            </h2>
            <p className="text-xs text-gray-400">Step 1 of 4</p>
          </div>
        </div>

        <p className="text-base text-gray-600 mb-5 leading-relaxed">
          We need access to your Facebook Business account to link your WhatsApp
          Business number and enable AI-powered conversations.
        </p>

        <div className="bg-gray-50 rounded-xl p-4 mb-5">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            What you'll need
          </p>
          {[
            "A Facebook account with business access",
            "Admin access to your WhatsApp Business Account",
            "A phone number available to receive OTP",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 mb-2 last:mb-0">
              <CheckCircle2
                size={13}
                className="text-green-500 mt-0.5 flex-shrink-0"
              />
              <span className="text-sm text-gray-600">{item}</span>
            </div>
          ))}
        </div>

        {connected ? (
          <div className="flex items-center gap-3 p-3.5 bg-green-50 border border-green-200 rounded-xl mb-5">
            <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-700">
                Meta account connected
              </p>
              <p className="text-xs text-green-600">
                Your Facebook account is linked successfully
              </p>
            </div>
          </div>
        ) : (
          <button
            onClick={onConnect}
            disabled={isConnecting}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#1877F2] hover:bg-[#1565D8] disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer mb-5"
          >
            {isConnecting ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                Connecting to Facebook…
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="white">
                  <path d={FB_ICON_PATH} />
                </svg>
                Continue with Facebook
              </>
            )}
          </button>
        )}

        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-8">
          <Shield size={12} />
          <span>
            Your access token is stored securely. You can disconnect anytime.
          </span>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onNext}
            disabled={!connected}
            className={cn(
              "flex items-center gap-1.5 py-2.5 px-5 rounded-xl text-sm font-semibold transition-colors",
              connected
                ? "bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
                : "bg-gray-100 text-gray-400 cursor-not-allowed",
            )}
          >
            Continue
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: WhatsApp Business Setup ───────────────────────────────────────────

function WABASetupStep({
  configured,
  isLaunching,
  onLaunch,
  onBack,
}: {
  configured: boolean;
  isLaunching: boolean;
  onLaunch: () => void;
  onBack: () => void;
}) {
  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="#25D366">
              <path d={WA_ICON_PATH} />
            </svg>
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-gray-900">
              Set up WhatsApp Business
            </h2>
            <p className="text-xs text-gray-400">Step 2 of 4</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-5 leading-relaxed">
          Launch Meta's guided signup to link your WhatsApp Business Account
          (WABA). A secure popup will guide you through the full process.
        </p>

        <div className="mb-5">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Steps in the popup
          </p>
          <div className="space-y-2.5">
            {[
              "Select or create a Business Account",
              "Create or select a WhatsApp Business Account (WABA)",
              "Add or confirm a phone number",
              "Verify the number via OTP (SMS or call)",
            ].map((item, i) => (
              <div key={item} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <span className="text-sm text-gray-600">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl mb-5">
          <AlertCircle
            size={14}
            className="text-amber-500 flex-shrink-0 mt-0.5"
          />
          <p className="text-xs text-amber-700 leading-relaxed">
            <span className="font-semibold">Important: </span>
            Your number must not be in active use on personal WhatsApp and must
            be able to receive OTP. You can migrate an existing WhatsApp
            Business number.
          </p>
        </div>

        {configured ? (
          <div className="flex items-center gap-3 p-3.5 bg-green-50 border border-green-200 rounded-xl mb-5">
            <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-700">
                WhatsApp Business configured
              </p>
              <p className="text-xs text-green-600">Fetching your numbers…</p>
            </div>
          </div>
        ) : (
          <button
            onClick={onLaunch}
            disabled={isLaunching}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] hover:bg-[#1ea855] disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer mb-5"
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
                Launch WhatsApp Embedded Signup
              </>
            )}
          </button>
        )}

        <div className="flex justify-start pt-2">
          <button
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Select Number ─────────────────────────────────────────────────────

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
            <h2 className="text-[15px] font-bold text-gray-900">
              Select your WhatsApp number
            </h2>
            <p className="text-xs text-gray-400">Step 3 of 4</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-5">
          Choose which number you want the AI to manage.
        </p>

        {isFetching ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <RefreshCw size={24} className="text-orange-400 animate-spin" />
            <p className="text-sm text-gray-500">
              Fetching your WhatsApp numbers…
            </p>
          </div>
        ) : numbers.length === 0 ? (
          <div className="text-center py-12">
            <Phone size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500 mb-1">
              No numbers found
            </p>
            <p className="text-xs text-gray-400 mb-5">
              Make sure you completed the WhatsApp Business setup
            </p>
            <button
              onClick={onRefetch}
              className="inline-flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors cursor-pointer"
            >
              <RefreshCw size={14} />
              Try again
            </button>
          </div>
        ) : (
          <div className="space-y-3 mb-5">
            {numbers.map((number) => (
              <button
                key={number.id}
                onClick={() => onSelect(number)}
                className={cn(
                  "w-full flex items-center gap-3.5 p-4 rounded-xl border-2 text-left transition-all cursor-pointer",
                  selectedNumber?.id === number.id
                    ? "border-orange-400 bg-orange-50"
                    : "border-gray-200 hover:border-gray-300 bg-white",
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                    selectedNumber?.id === number.id
                      ? "border-orange-500"
                      : "border-gray-300",
                  )}
                >
                  {selectedNumber?.id === number.id && (
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {number.phoneNumber}
                  </p>
                  <p className="text-xs text-gray-500">{number.businessName}</p>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0",
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
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-500 transition-colors cursor-pointer"
            >
              <RefreshCw size={12} />
              Refresh numbers
            </button>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            ← Back
          </button>
          <button
            onClick={onUseNumber}
            disabled={!selectedNumber}
            className={cn(
              "flex items-center gap-1.5 py-2.5 px-5 rounded-xl text-sm font-semibold transition-colors",
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

// ── Step 4: Configure AI ──────────────────────────────────────────────────────

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
            <h2 className="text-[15px] font-bold text-gray-900">
              Configure AI assistant
            </h2>
            <p className="text-xs text-gray-400">Step 4 of 4</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl mb-6">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="#16a34a">
            <path d={WA_ICON_PATH} />
          </svg>
          <p className="text-xs font-medium text-green-700">
            {selectedNumber.phoneNumber} · {selectedNumber.businessName}
          </p>
        </div>

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Enable AI Auto Replies
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
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
            <label className="text-sm font-semibold text-gray-900 block mb-1">
              Greeting Message
            </label>
            <p className="text-xs text-gray-500 mb-2">
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
              className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow"
            />
          </div>

          <div className="h-px bg-gray-100" />

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Business Tone
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
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
              className="text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-300 cursor-pointer flex-shrink-0"
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
              <p className="text-sm font-semibold text-gray-900">
                Product Catalog Sync
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
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
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            ← Back
          </button>
          <button
            onClick={onActivate}
            disabled={isActivating}
            className="flex items-center gap-2 py-2.5 px-6 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
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

// ── Management View (post-setup) ──────────────────────────────────────────────

function ManagementView({
  selectedNumber,
  aiConfig,
  onAIConfigChange,
  onReconnect,
}: {
  selectedNumber: WhatsAppNumber;
  aiConfig: AIConfig;
  onAIConfigChange: (c: AIConfig) => void;
  onReconnect: () => void;
}) {
  const [localConfig, setLocalConfig] = useState<AIConfig>(aiConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    onAIConfigChange(localConfig);
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
              <h2 className="text-[15px] font-bold text-gray-900">
                AI Assistant Active
              </h2>
            </div>
            <p className="text-xs text-gray-500">
              {selectedNumber.phoneNumber} · {selectedNumber.businessName}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full flex-shrink-0">
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
              <span className="text-[11px] font-medium text-gray-600 leading-tight">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Configuration */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
        <h3 className="text-[13px] font-bold text-gray-800 mb-5">
          AI Configuration
        </h3>

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Enable AI Auto Replies
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
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
            <label className="text-sm font-semibold text-gray-900 block mb-1">
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
              className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-shadow"
            />
          </div>

          <div className="h-px bg-gray-100" />

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Business Tone
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
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
              className="text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-300 cursor-pointer flex-shrink-0"
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
              <p className="text-sm font-semibold text-gray-900">
                Product Catalog Sync
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
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
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
              <CheckCircle2 size={13} />
              Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 py-2.5 px-5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
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
        <h3 className="text-[13px] font-bold text-gray-800 mb-1">
          Manage Connection
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Change or disconnect your WhatsApp integration
        </p>
        <div className="flex flex-wrap gap-3">
          <button className="flex items-center gap-1.5 py-2 px-4 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors cursor-pointer">
            <Phone size={14} />
            Change Number
          </button>
          <button
            onClick={onReconnect}
            className="flex items-center gap-1.5 py-2 px-4 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw size={14} />
            Reconnect Meta
          </button>
          <button
            onClick={onReconnect}
            className="flex items-center gap-1.5 py-2 px-4 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium rounded-xl transition-colors cursor-pointer"
          >
            <Power size={14} />
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}
