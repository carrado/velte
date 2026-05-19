"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  Phone,
  MessageCircle,
  Video,
  MoreVertical,
  ArrowLeft,
  Check,
  CheckCheck,
  Info,
  Globe,
  MapPin,
  Tag,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  Link,
  X,
  ShoppingBag,
  Mail,
  Search,
  Smile,
  Paperclip,
  Mic,
  Camera,
  BellOff,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useUserStore } from "@/store/userStore";
import { useProductsStore } from "@/store/productsStore";
import { categoriesApi, getAvailableStock } from "@/services/products";
import {
  fetchWhatsAppProfile,
  saveWhatsAppProfile,
} from "@/services/whatsappProfile";
import type { CategoryProduct } from "@/types/product";

interface WhatsAppProfile {
  displayName: string;
  about: string;
  services: string[];
  website: string;
  address: string;
  email: string;
  avatar: string;
}

const AVATAR_COLORS = [
  "#25D366",
  "#128C7E",
  "#075E54",
  "#34B7F1",
  "#7c3aed",
  "#dc2626",
  "#d97706",
  "#0ea5e9",
];

const MAX_FEATURED = 3;
const MAX_PICKER_VISIBLE = 10;

const CHAT_BG = `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c5b9a7' fill-opacity='0.15'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10S0 25.523 0 20s4.477-10 10-10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "B"
  );
}

function getUserServices(): string[] {
  const user = useUserStore.getState().user;
  return user?.company?.services ?? user?.services ?? [];
}

function buildDefaultProfile(): WhatsAppProfile {
  const user = useUserStore.getState().user;
  return {
    displayName:
      user?.businessName ?? user?.company?.name ?? user?.name ?? "Business",
    about: "",
    services: getUserServices(),
    website: "",
    address: user?.address ?? user?.company?.location ?? "",
    email: user?.email ?? "",
    avatar: "",
  };
}

function Tick({
  double = false,
  read = false,
}: {
  double?: boolean;
  read?: boolean;
}) {
  return double ? (
    <CheckCheck
      size={12}
      className={cn(read ? "text-[#53bdeb]" : "text-gray-400")}
    />
  ) : (
    <Check size={12} className="text-gray-400" />
  );
}

function Bubble({
  text,
  time,
  isMine,
  read,
}: {
  text: string;
  time: string;
  isMine: boolean;
  read?: boolean;
}) {
  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "relative max-w-[78%] rounded-lg px-2 py-1 text-[11px] leading-snug shadow-sm",
          isMine
            ? "bg-[#d9fdd3] rounded-tr-sm text-gray-800"
            : "bg-white rounded-tl-sm text-gray-800",
        )}
      >
        {text}
        <div className="flex items-center justify-end gap-1 mt-0.5">
          <span className="text-[9px] text-gray-400">{time}</span>
          {isMine && <Tick double read={read} />}
        </div>
      </div>
    </div>
  );
}

function ProductBubble({
  product,
  time,
  isMine,
  read,
}: {
  product: CategoryProduct;
  time: string;
  isMine: boolean;
  read?: boolean;
}) {
  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "rounded-lg p-1 shadow-sm w-[150px]",
          isMine ? "bg-[#d9fdd3] rounded-tr-sm" : "bg-white rounded-tl-sm",
        )}
      >
        <div
          className={cn(
            "rounded-md h-16 flex items-center justify-center text-white font-bold text-xl",
            product.colorClass,
          )}
        >
          {product.name.charAt(0).toUpperCase()}
        </div>
        <div className="px-1 pt-1">
          <p className="text-[10px] font-semibold text-gray-800 truncate">
            {product.name}
          </p>
          <p className="text-[10px] text-[#128C7E] font-bold">
            ₦{product.price.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center justify-end gap-1 px-1 pb-0.5">
          <span className="text-[9px] text-gray-400">{time}</span>
          {isMine && <Tick double read={read} />}
        </div>
      </div>
    </div>
  );
}

function ChatPreview({
  profile,
  avatarBg,
  featuredProducts,
}: {
  profile: WhatsAppProfile;
  avatarBg: string;
  featuredProducts: CategoryProduct[];
}) {
  const aboutSnippet =
    profile.about.trim() ||
    "Hi! Message us to learn more about our products and services.";

  const previewProduct = featuredProducts[0];

  return (
    <div className="w-full h-full flex flex-col select-none">
      <div className="bg-[#008069] px-2.5 pt-2 pb-2 flex items-center gap-2 shrink-0 shadow">
        <ArrowLeft size={16} className="text-white shrink-0" />
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 ring-2 ring-white/20 overflow-hidden"
          style={{ backgroundColor: avatarBg }}
        >
          {profile.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar}
              alt=""
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            getInitials(profile.displayName)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-white text-[11px] font-semibold truncate leading-tight">
              {profile.displayName}
            </p>
            <CheckCircle2
              size={10}
              className="text-white fill-[#25D366] shrink-0"
            />
          </div>
          <p className="text-white/80 text-[9px] leading-tight">online</p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Video size={14} className="text-white" />
          <Phone size={13} className="text-white" />
          <MoreVertical size={14} className="text-white" />
        </div>
      </div>

      <div
        className="flex-1 px-2 py-2 space-y-1.5 overflow-hidden"
        style={{ backgroundImage: CHAT_BG, backgroundColor: "#efeae2" }}
      >
        <div className="flex justify-center pb-1">
          <span className="px-2 py-0.5 bg-white/90 backdrop-blur rounded-md text-[9px] text-gray-600 font-medium shadow-sm">
            TODAY
          </span>
        </div>

        <div className="flex justify-center pb-0.5">
          <div className="bg-[#fff3c4] text-[#7a6300] text-[9px] px-2 py-1 rounded-md text-center max-w-[85%] shadow-sm">
            🛍 This is a business account. Tap for more info.
          </div>
        </div>

        <Bubble
          text="Hi! 👋 I saw your business profile"
          time="10:02"
          isMine={false}
        />
        <Bubble
          text={
            aboutSnippet.slice(0, 90) + (aboutSnippet.length > 90 ? "…" : "")
          }
          time="10:02"
          isMine
          read
        />
        <Bubble
          text="Could I see what you have available?"
          time="10:03"
          isMine={false}
        />
        {previewProduct && (
          <ProductBubble product={previewProduct} time="10:03" isMine read />
        )}
        <Bubble
          text={
            previewProduct ? "Looks great, I'll take it!" : "Sounds good 👍"
          }
          time="10:04"
          isMine={false}
        />
      </div>

      <div className="bg-[#f0f2f5] px-2 py-1.5 flex items-end gap-1.5 border-t border-gray-200 shrink-0">
        <div className="flex-1 bg-white rounded-full px-2 py-1.5 flex items-center gap-1.5 shadow-sm">
          <Smile size={14} className="text-gray-400 shrink-0" />
          <span className="flex-1 text-[10px] text-gray-400">Message</span>
          <Paperclip size={13} className="text-gray-400 shrink-0" />
          <Camera size={13} className="text-gray-400 shrink-0" />
        </div>
        <button
          type="button"
          className="w-7 h-7 rounded-full bg-[#008069] flex items-center justify-center shadow"
        >
          <Mic size={13} className="text-white" />
        </button>
      </div>
    </div>
  );
}

function ProfileViewPreview({
  profile,
  avatarBg,
  services,
  featuredProducts,
}: {
  profile: WhatsAppProfile;
  avatarBg: string;
  services: string[];
  featuredProducts: CategoryProduct[];
}) {
  const actions = [
    { icon: Phone, label: "Audio" },
    { icon: Video, label: "Video" },
    { icon: Search, label: "Search" },
    { icon: BellOff, label: "Mute" },
  ];

  return (
    <div className="w-full h-full flex flex-col select-none rounded-[2rem] text-left bg-[#f0f2f5]">
      <div className="bg-[#008069] px-2.5 py-2 flex items-center justify-between shrink-0 shadow">
        <ArrowLeft size={16} className="text-white" />
        <p className="text-white text-[11px] font-semibold">Business info</p>
        <MoreVertical size={16} className="text-white" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="bg-white flex flex-col items-center pt-4 pb-3 px-3 border-b border-gray-200">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md overflow-hidden ring-4 ring-[#e7f8ef]"
            style={{ backgroundColor: avatarBg }}
          >
            {profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              getInitials(profile.displayName)
            )}
          </div>
          <div className="flex items-center gap-1 mt-2">
            <h3 className="text-[13px] font-bold text-gray-900">
              {profile.displayName}
            </h3>
            <CheckCircle2
              size={12}
              className="text-white fill-[#25D366] shrink-0"
            />
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Briefcase size={9} className="text-[#128C7E]" />
            <p className="text-[9px] text-[#128C7E] font-semibold">
              Business account
            </p>
          </div>

          <div className="grid grid-cols-4 gap-1.5 mt-3 w-full">
            {actions.map(({ icon: Icon, label }) => (
              <button
                key={label}
                type="button"
                className="flex flex-col items-center justify-center py-1.5 rounded-lg bg-[#e7f8ef] hover:bg-[#d1f4dd] transition-colors"
              >
                <Icon size={13} className="text-[#128C7E]" />
                <span className="text-[8px] text-[#075E54] font-semibold mt-0.5">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {profile.about && (
          <div className="bg-white px-3 py-2 mt-1.5 border-y border-gray-200">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">
              About
            </p>
            <p className="text-[10px] text-gray-700 leading-snug">
              {profile.about}
            </p>
          </div>
        )}

        {(profile.address || profile.email || profile.website) && (
          <div className="bg-white mt-1.5 border-y border-gray-200">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider px-3 pt-2">
              Business info
            </p>
            {profile.address && (
              <div className="flex items-start gap-2.5 px-3 py-2 border-b border-gray-100 last:border-0">
                <MapPin size={12} className="text-[#128C7E] shrink-0 mt-0.5" />
                <span className="text-[10px] text-gray-700 leading-snug line-clamp-2">
                  {profile.address}
                </span>
              </div>
            )}
            {profile.email && (
              <div className="flex items-center gap-2.5 px-3 py-2 border-b border-gray-100 last:border-0">
                <Mail size={12} className="text-[#128C7E] shrink-0" />
                <span className="text-[10px] text-gray-700 truncate">
                  {profile.email}
                </span>
              </div>
            )}
            {profile.website && (
              <div className="flex items-center gap-2.5 px-3 py-2 border-b border-gray-100 last:border-0">
                <Globe size={12} className="text-[#128C7E] shrink-0" />
                <span className="text-[10px] text-[#128C7E] truncate underline">
                  {profile.website}
                </span>
              </div>
            )}
          </div>
        )}

        {services.length > 0 && (
          <div className="bg-white px-3 py-2 mt-1.5 border-y border-gray-200">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Briefcase size={10} className="text-[#128C7E]" />
              Business Category
            </p>
            <div className="flex flex-wrap gap-1">
              {services.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#e7f8ef] text-[#075E54] text-[9px] font-semibold border border-[#cde9d9]"
                >
                  <Tag size={8} />
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {featuredProducts.length > 0 && (
          <div className="bg-white px-3 py-2 mt-1.5 rounded-b-[1rem] border-y border-gray-200">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <ShoppingBag size={10} className="text-[#128C7E]" />
                Catalog · {featuredProducts.length}
              </p>
              <button
                type="button"
                className="text-[9px] text-[#128C7E] font-semibold flex items-center"
              >
                View all
                <ChevronRight size={10} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {featuredProducts.map((p) => (
                <div
                  key={p.id}
                  className="rounded-md border border-gray-200 overflow-hidden bg-gray-50"
                >
                  <div
                    className={cn(
                      "h-14 flex items-center justify-center text-white font-bold text-base",
                      p.colorClass,
                    )}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="px-1 py-1">
                    <p className="text-[8px] font-semibold text-gray-800 truncate">
                      {p.name}
                    </p>
                    <p className="text-[8px] text-[#128C7E] font-bold">
                      ₦{p.price.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ServicesTagInput({
  services,
  onChange,
}: {
  services: string[];
  onChange: (services: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag || services.includes(tag)) return;
    onChange([...services, tag]);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      addTag(input);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-dash-body font-semibold text-gray-800 flex items-center gap-1.5">
        <Briefcase size={14} className="text-orange-500" />
        Business Category
      </label>
      <div className="flex flex-wrap gap-1.5">
        {services.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-md text-dash-secondary font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(services.filter((t) => t !== tag))}
              className="hover:text-red-600 transition-colors"
              aria-label={`Remove ${tag}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="e.g. Retail Store, Fashion, Restaurant — press Enter"
        className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-dash-body text-[#023337] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300"
      />
      <p className="text-dash-secondary text-gray-400 text-xs">
        Press Enter to add. Shown under Business Category on your WhatsApp
        profile.
      </p>
    </div>
  );
}

function ProductCatalogPicker({
  products,
  featuredProductIds,
  onChange,
}: {
  products: CategoryProduct[];
  featuredProductIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const selected = useMemo(
    () => featuredProductIds.filter(Boolean),
    [featuredProductIds],
  );

  const visibleProducts = useMemo(() => {
    const selectedSet = new Set(selected);
    const picked = products.filter((p) => selectedSet.has(p.id));
    const rest = products
      .filter((p) => !selectedSet.has(p.id))
      .sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        if (a.onSale !== b.onSale) return a.onSale ? -1 : 1;
        return (b.inStock ?? 0) - (a.inStock ?? 0);
      });
    return [...picked, ...rest].slice(0, MAX_PICKER_VISIBLE);
  }, [products, selected]);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else if (selected.length < MAX_FEATURED) {
      onChange([...selected, id]);
    } else {
      toast.info(`You can feature up to ${MAX_FEATURED} products`);
    }
  };

  const slides = useMemo(() => {
    const chunks: CategoryProduct[][] = [];
    for (let i = 0; i < visibleProducts.length; i += 2) {
      chunks.push(visibleProducts.slice(i, i + 2));
    }
    return chunks;
  }, [visibleProducts]);

  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (slideIndex > Math.max(0, slides.length - 1)) {
      setSlideIndex(Math.max(0, slides.length - 1));
    }
  }, [slides.length, slideIndex]);

  const renderCard = (p: CategoryProduct) => {
    const isSelected = selected.includes(p.id);
    const isDisabled = !isSelected && selected.length >= MAX_FEATURED;
    const stock = getAvailableStock(p) ?? p.inStock ?? 0;
    return (
      <button
        key={p.id}
        type="button"
        onClick={() => toggle(p.id)}
        disabled={isDisabled}
        className={cn(
          "relative block w-full min-w-0 text-left rounded-xl border bg-white overflow-hidden transition-all",
          isSelected
            ? "border-orange-500 ring-2 ring-orange-200 shadow-md"
            : "border-gray-200 hover:border-orange-300 hover:shadow-sm",
          isDisabled && "opacity-40 cursor-not-allowed",
        )}
      >
        <div
          className={cn(
            "aspect-[4/3] flex items-center justify-center text-white font-bold text-2xl relative",
            p.colorClass,
          )}
        >
          {p.name.charAt(0).toUpperCase()}
          {isSelected && (
            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shadow ring-2 ring-white">
              <Check size={12} className="text-white" strokeWidth={3} />
            </div>
          )}
        </div>
        <div className="p-2 space-y-0.5">
          <p className="text-dash-body font-semibold text-gray-800 truncate">
            {p.name}
          </p>
          <div className="flex items-center justify-between gap-1">
            <p className="text-dash-secondary text-orange-700 font-bold">
              ₦{p.price.toLocaleString()}
            </p>
            <span
              className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded",
                stock > 0
                  ? "bg-orange-50 text-orange-700"
                  : "bg-gray-100 text-gray-500",
              )}
            >
              {stock > 0 ? `${stock} in stock` : "Out"}
            </span>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-dash-body font-semibold text-gray-800 flex items-center gap-1.5">
          <ShoppingBag size={14} className="text-orange-500" />
          Product catalog
        </label>
        <span className="text-dash-secondary text-orange-700 font-semibold bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
          {selected.length} / {MAX_FEATURED} selected
        </span>
      </div>

      {products.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 flex items-center gap-2 text-dash-secondary text-gray-400">
          <Info size={14} />
          <span>Add products to your catalog to feature them here.</span>
        </div>
      ) : (
        <>
          {/* Mobile: 2-per-slide carousel */}
          <div className="sm:hidden space-y-2">
            <div className="overflow-hidden rounded-xl">
              <div
                className="flex transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${slideIndex * 100}%)` }}
              >
                {slides.map((slide, i) => (
                  <div
                    key={i}
                    className="w-full shrink-0 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2"
                  >
                    {slide.map(renderCard)}
                    {slide.length < 2 && (
                      <div aria-hidden className="invisible" />
                    )}
                  </div>
                ))}
              </div>
            </div>
            {slides.length > 1 && (
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
                  disabled={slideIndex === 0}
                  aria-label="Previous products"
                  className="w-8 h-8 rounded-full bg-orange-50 border border-orange-200 text-orange-700 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-100 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-1.5">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSlideIndex(i)}
                      aria-label={`Go to slide ${i + 1}`}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === slideIndex
                          ? "w-5 bg-orange-500"
                          : "w-1.5 bg-orange-200 hover:bg-orange-300",
                      )}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSlideIndex((i) => Math.min(slides.length - 1, i + 1))
                  }
                  disabled={slideIndex >= slides.length - 1}
                  aria-label="Next products"
                  className="w-8 h-8 rounded-full bg-orange-50 border border-orange-200 text-orange-700 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-100 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Desktop: scrollable grid */}
          <div className="hidden sm:grid grid-cols-3 gap-2 max-h-[320px] overflow-y-auto pr-1">
            {visibleProducts.map(renderCard)}
          </div>
        </>
      )}
      <p className="text-dash-secondary text-gray-400 text-xs flex items-center gap-1">
        <Info size={12} />
        Showing up to {MAX_PICKER_VISIBLE} products — tap to feature on your
        WhatsApp catalog preview.
      </p>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-dash-body font-semibold text-gray-800 flex items-center gap-1.5">
        {Icon && <Icon size={14} className="text-orange-500" />}
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full px-3 bg-gray-50 border border-gray-200 rounded-lg text-dash-body text-[#023337] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300";

export function WhatsAppProfileSection() {
  const user = useUserStore((s) => s.user);
  const products = useProductsStore((s) => s.products);
  const setProducts = useProductsStore((s) => s.setProducts);
  const queryClient = useQueryClient();

  const [profile, setProfile] = useState<WhatsAppProfile>(buildDefaultProfile);
  const [services, setServices] = useState<string[]>(getUserServices);
  const [featuredProductIds, setFeaturedProductIds] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState<"chat" | "profile">("profile");
  const [metaConnected, setMetaConnected] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: wpData, isLoading: loading } = useQuery({
    queryKey: queryKeys.settings.whatsappProfile,
    queryFn: fetchWhatsAppProfile,
  });

  const seededRef = useRef(false);
  useEffect(() => {
    if (!wpData) return;

    setMetaConnected(wpData.metaConnected);

    if (wpData.profile) {
      setProfile((prev) => ({
        ...prev,
        about: wpData.profile?.about ?? prev.about,
        address: wpData.profile?.address ?? prev.address,
        website: wpData.profile?.website ?? prev.website,
        email: wpData.profile?.email ?? prev.email,
        avatar: wpData.profile?.profilePictureUrl ?? prev.avatar,
      }));
    }

    if (!seededRef.current) {
      seededRef.current = true;
      if (wpData.services?.length) {
        setServices(wpData.services);
      }
      if (wpData.featuredProductIds?.length) {
        setFeaturedProductIds(
          wpData.featuredProductIds.filter(Boolean).slice(0, MAX_FEATURED),
        );
      }
    }
  }, [wpData]);

  const avatarBg = useMemo(() => {
    const idx =
      profile.displayName
        .split("")
        .reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[idx];
  }, [profile.displayName]);

  const featuredProducts = useMemo(
    () =>
      featuredProductIds
        .filter(Boolean)
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is CategoryProduct => !!p),
    [featuredProductIds, products],
  );

  useEffect(() => {
    const { products: stored } = useProductsStore.getState();
    if (stored.length > 0) return;
    categoriesApi
      .getProducts()
      .then(setProducts)
      .catch(() => toast.error("Could not load products"));
  }, [setProducts]);

  useEffect(() => {
    setProfile((prev) => ({
      ...prev,
      displayName:
        user?.businessName ??
        user?.company?.name ??
        user?.name ??
        prev.displayName,
    }));
  }, [user]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const wasConnected = metaConnected;
    try {
      const featuredProductsPayload = featuredProductIds
        .filter(Boolean)
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is CategoryProduct => !!p)
        .map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          inStock: getAvailableStock(p) ?? p.inStock ?? 0,
        }));

      await saveWhatsAppProfile({
        about: profile.about.slice(0, 139),
        address: profile.address,
        website: profile.website,
        email: profile.email || undefined,
        profilePictureUrl: profile.avatar || undefined,
        services,
        featuredProducts: featuredProductsPayload,
      });

      setMetaConnected(true);
      queryClient.invalidateQueries({
        queryKey: queryKeys.settings.whatsappProfile,
      });
      toast.success("WhatsApp profile saved");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save profile";
      if (!wasConnected) {
        toast.warning(
          "WhatsApp is not connected. Connect in AI Setup to sync.",
        );
      } else {
        toast.error(message);
      }
    } finally {
      setSaving(false);
    }
  }, [featuredProductIds, metaConnected, products, profile, services]);

  return (
    <div className="bg-white sm:rounded-2xl border border-gray-200 p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <MessageCircle size={17} className="text-orange-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-dash-heading font-bold text-gray-900">
            WhatsApp Business Profile
          </h3>
          <p className="text-dash-secondary text-gray-400 mt-0.5">
            Preview and sync how customers see your business on WhatsApp
          </p>
        </div>
        {!metaConnected && !loading && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
            Not synced
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4 order-2 lg:order-1">
          <Field label="About" icon={Info}>
            <textarea
              value={profile.about}
              onChange={(e) =>
                setProfile((p) => ({ ...p, about: e.target.value }))
              }
              maxLength={139}
              rows={3}
              placeholder="Short description shown in chat and profile"
              className={cn(inputClass, "py-2 resize-none min-h-[72px]")}
            />
            <p className="text-xs text-gray-400 text-right">
              {profile.about.length}/139
            </p>
          </Field>

          <Field label="Address" icon={MapPin}>
            <input
              type="text"
              value={profile.address}
              onChange={(e) =>
                setProfile((p) => ({ ...p, address: e.target.value }))
              }
              placeholder="Business address"
              className={cn(inputClass, "h-10")}
            />
          </Field>

          <Field label="Website" icon={Link}>
            <input
              type="url"
              value={profile.website}
              onChange={(e) =>
                setProfile((p) => ({ ...p, website: e.target.value }))
              }
              placeholder="https://yourstore.com"
              className={cn(inputClass, "h-10")}
            />
          </Field>

          <Field label="Email" icon={Mail}>
            <input
              type="email"
              value={profile.email}
              onChange={(e) =>
                setProfile((p) => ({ ...p, email: e.target.value }))
              }
              placeholder="contact@business.com"
              className={cn(inputClass, "h-10")}
            />
          </Field>

          <ServicesTagInput services={services} onChange={setServices} />

          <ProductCatalogPicker
            products={products}
            featuredProductIds={featuredProductIds}
            onChange={setFeaturedProductIds}
          />
        </div>

        <div className="order-1 lg:order-2 flex flex-col items-center">
          <div className="flex gap-1 p-0.5 bg-orange-50 border border-orange-100 rounded-lg mb-3">
            <button
              type="button"
              onClick={() => setPreviewMode("chat")}
              className={cn(
                "px-3 py-1.5 rounded-md text-dash-secondary font-semibold text-xs transition-colors",
                previewMode === "chat"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-orange-700 hover:text-orange-900",
              )}
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("profile")}
              className={cn(
                "px-3 py-1.5 rounded-md text-dash-secondary font-semibold text-xs transition-colors",
                previewMode === "profile"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-orange-700 hover:text-orange-900",
              )}
            >
              Profile
            </button>
          </div>

          <div className="relative w-[300px]">
            <div className="absolute inset-x-0 top-0 flex justify-center z-10 pointer-events-none">
              <div className="w-20 h-4 bg-gray-900 rounded-b-2xl" />
            </div>
            <div className="rounded-[2rem] border-[6px] border-gray-900 bg-gray-900 p-1 pt-5 shadow-xl">
              <div className="rounded-[2rem] bg-white min-h-[540px]">
                {loading ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <RefreshCw size={20} className="animate-spin" />
                  </div>
                ) : previewMode === "chat" ? (
                  <ChatPreview
                    profile={profile}
                    avatarBg={avatarBg}
                    featuredProducts={featuredProducts}
                  />
                ) : (
                  <ProfileViewPreview
                    profile={{ ...profile, services }}
                    avatarBg={avatarBg}
                    services={services}
                    featuredProducts={featuredProducts}
                  />
                )}
              </div>
            </div>
          </div>

          <p className="text-dash-secondary text-gray-400 text-xs mt-3 text-center max-w-[260px]">
            Live preview — toggle between chat and business profile views
          </p>
        </div>
      </div>

      <div className="flex justify-end mt-5">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 py-2.5 px-5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-dash-body font-semibold rounded-xl transition-colors cursor-pointer shadow-sm"
        >
          {saving ? (
            <>
              <RefreshCw size={13} className="animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <CheckCircle2 size={14} />
              Save WhatsApp Profile
            </>
          )}
        </button>
      </div>
    </div>
  );
}
