"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Megaphone,
  CalendarDays,
  CreditCard,
  UserCheck,
  AlertCircle,
  CheckCheck,
  Check,
  Clock,
  X,
  ChevronRight,
  Sparkles,
  Inbox
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationBadges, NotificationItem, NotificationCategory } from "@/context/NotificationBadgeContext";

interface NotificationCenterDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export function NotificationCenterDropdown({
  isOpen,
  onClose,
}: NotificationCenterDropdownProps) {
  const router = useRouter();
  const {
    totalUnreadCount,
    notificationsList,
    markAsRead,
    markItemAsRead,
    markAllAsRead,
  } = useNotificationBadges();

  const [activeTab, setActiveTab] = useState<"all" | "unread" | "announcement" | "academic" | "finance">("all");
  const panelRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Filtered notifications based on activeTab
  const filteredNotifications = useMemo(() => {
    if (!notificationsList) return [];
    if (activeTab === "all") return notificationsList;
    if (activeTab === "unread") return notificationsList.filter((n) => !n.isRead);
    if (activeTab === "announcement") return notificationsList.filter((n) => n.category === "announcement");
    if (activeTab === "academic") return notificationsList.filter((n) => n.category === "academic");
    if (activeTab === "finance") return notificationsList.filter((n) => n.category === "finance");
    return notificationsList;
  }, [notificationsList, activeTab]);

  // Categorize for grouped view if activeTab === 'all'
  const unreadItems = useMemo(() => {
    return filteredNotifications.filter((n) => !n.isRead);
  }, [filteredNotifications]);

  const readItems = useMemo(() => {
    return filteredNotifications.filter((n) => n.isRead);
  }, [filteredNotifications]);

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      await markItemAsRead(item.categoryPath, item.id);
      await markAsRead(item.categoryPath);
    }
    onClose();
    if (item.href) {
      router.push(item.href);
    }
  };

  const handleMarkItemReadOnly = async (e: React.MouseEvent, item: NotificationItem) => {
    e.stopPropagation();
    await markItemAsRead(item.categoryPath, item.id);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className={cn(
        "absolute right-[-45px] sm:right-0 mt-2.5 z-50",
        "w-[calc(100vw-2rem)] max-w-[440px] sm:w-[460px]",
        "bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)]",
        "border border-gray-100 flex flex-col overflow-hidden",
        "animate-in fade-in zoom-in-95 duration-200"
      )}
    >
      {/* 1. Header Bar */}
      <div className="px-5 py-4 border-b border-gray-100/90 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#531FFF]/10 flex items-center justify-center text-[#531FFF] shadow-2xs">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-[14px] text-gray-900 tracking-tight leading-none">
                Notifikasi & Pembaruan
              </h3>
              {totalUnreadCount > 0 && (
                <span className="px-2 py-0.5 bg-[#531FFF] text-white text-[10px] font-black rounded-full shadow-2xs animate-in zoom-in-75">
                  {totalUnreadCount > 99 ? "99+" : totalUnreadCount} baru
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 font-medium mt-1 leading-none">
              Pusat pemberitahuan data dan aktivitas sistem
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {totalUnreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllAsRead()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-[#531FFF] hover:bg-[#531FFF]/10 transition-all cursor-pointer active:scale-95"
              title="Tandai semua notifikasi telah dibaca"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tandai Dibaca</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Tutup Notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Filter Tabs Segment */}
      <div className="px-4 py-2 bg-[#F9FAFB] border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5",
            activeTab === "all"
              ? "bg-white text-gray-900 shadow-2xs border border-gray-200/80"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
          )}
        >
          <span>Semua</span>
          <span className={cn(
            "text-[10px] px-1.5 py-0.2 rounded-full font-black",
            activeTab === "all" ? "bg-gray-100 text-gray-700" : "bg-gray-200/60 text-gray-500"
          )}>
            {notificationsList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("unread")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5",
            activeTab === "unread"
              ? "bg-[#531FFF] text-white shadow-xs font-black"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
          )}
        >
          <span>Belum Dibaca</span>
          {totalUnreadCount > 0 && (
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full font-black",
              activeTab === "unread" ? "bg-white/20 text-white" : "bg-[#531FFF]/10 text-[#531FFF]"
            )}>
              {totalUnreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("announcement")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer",
            activeTab === "announcement"
              ? "bg-white text-gray-900 shadow-2xs border border-gray-200/80"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
          )}
        >
          Pengumuman
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("academic")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer",
            activeTab === "academic"
              ? "bg-white text-gray-900 shadow-2xs border border-gray-200/80"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
          )}
        >
          Akademik
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("finance")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer",
            activeTab === "finance"
              ? "bg-white text-gray-900 shadow-2xs border border-gray-200/80"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
          )}
        >
          Keuangan
        </button>
      </div>

      {/* 3. Notification List Container */}
      <div className="overflow-y-auto max-h-[380px] sm:max-h-[420px] p-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-200">
        {filteredNotifications.length === 0 ? (
          /* Empty State */
          <div className="py-12 px-6 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-3 shadow-2xs">
              <Inbox className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-gray-800 text-xs">
              {activeTab === "unread" ? "Tidak Ada Notifikasi Baru" : "Belum Ada Pemberitahuan"}
            </h4>
            <p className="text-[11px] text-gray-400 mt-1 max-w-xs leading-relaxed">
              {activeTab === "unread"
                ? "Seluruh pembaruan dan pengumuman sistem telah Anda baca."
                : "Aktivitas terbaru dan pemberitahuan sekolah akan ditampilkan di sini."}
            </p>
            {activeTab === "unread" && (
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className="mt-3 text-xs text-[#531FFF] font-bold hover:underline cursor-pointer"
              >
                Lihat Semua Riwayat Notifikasi ➔
              </button>
            )}
          </div>
        ) : (
          <>
            {/* If tab is 'all' and we have both unread and read items, group them visually */}
            {activeTab === "all" && unreadItems.length > 0 && (
              <div className="space-y-1.5 mb-2">
                <div className="flex items-center justify-between px-2 pt-1 pb-0.5">
                  <span className="text-[10px] font-extrabold text-[#531FFF] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#531FFF] animate-pulse" />
                    Pembaruan Terbaru ({unreadItems.length})
                  </span>
                </div>
                {unreadItems.map((item) => (
                  <NotificationCard
                    key={item.id}
                    item={item}
                    onClick={() => handleItemClick(item)}
                    onMarkRead={(e) => handleMarkItemReadOnly(e, item)}
                  />
                ))}
              </div>
            )}

            {activeTab === "all" && readItems.length > 0 && (
              <div className="space-y-1.5">
                {unreadItems.length > 0 && (
                  <div className="flex items-center justify-between px-2 pt-2 pb-0.5 border-t border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Telah Dibaca Sebelumnya
                    </span>
                  </div>
                )}
                {readItems.map((item) => (
                  <NotificationCard
                    key={item.id}
                    item={item}
                    onClick={() => handleItemClick(item)}
                  />
                ))}
              </div>
            )}

            {/* If filtered by specific tab */}
            {activeTab !== "all" && (
              <div className="space-y-1.5">
                {filteredNotifications.map((item) => (
                  <NotificationCard
                    key={item.id}
                    item={item}
                    onClick={() => handleItemClick(item)}
                    onMarkRead={!item.isRead ? (e) => handleMarkItemReadOnly(e, item) : undefined}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 4. Footer Bar */}
      <div className="px-5 py-3 bg-[#F9FAFB] border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-medium shrink-0">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#531FFF]" />
          Tersinkronisasi Realtime
        </span>
        <button
          type="button"
          onClick={() => {
            onClose();
            router.push("/announcements");
          }}
          className="text-[#531FFF] hover:text-[#4314cc] font-bold flex items-center gap-1 hover:underline cursor-pointer"
        >
          Lihat Semua Pengumuman
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// Individual Notification Card Component
function NotificationCard({
  item,
  onClick,
  onMarkRead,
}: {
  item: NotificationItem;
  onClick: () => void;
  onMarkRead?: (e: React.MouseEvent) => void;
}) {
  // Category styles & icons
  const getCategoryConfig = (cat: NotificationCategory, priority?: string) => {
    if (priority === "urgent") {
      return {
        icon: AlertCircle,
        iconColor: "text-amber-600",
        badgeBg: "bg-amber-100/80 text-amber-800 border-amber-200/80",
        iconBg: "bg-amber-50 text-amber-600",
      };
    }
    switch (cat) {
      case "announcement":
        return {
          icon: Megaphone,
          iconColor: "text-[#531FFF]",
          badgeBg: "bg-[#531FFF]/10 text-[#531FFF] border-[#531FFF]/20",
          iconBg: "bg-[#531FFF]/10 text-[#531FFF]",
        };
      case "academic":
        return {
          icon: CalendarDays,
          iconColor: "text-sky-600",
          badgeBg: "bg-sky-50 text-sky-700 border-sky-200/60",
          iconBg: "bg-sky-50 text-sky-600",
        };
      case "finance":
        return {
          icon: CreditCard,
          iconColor: "text-emerald-600",
          badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
          iconBg: "bg-emerald-50 text-emerald-600",
        };
      case "system":
        return {
          icon: UserCheck,
          iconColor: "text-indigo-600",
          badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200/60",
          iconBg: "bg-indigo-50 text-indigo-600",
        };
      default:
        return {
          icon: Bell,
          iconColor: "text-gray-600",
          badgeBg: "bg-gray-100 text-gray-700 border-gray-200",
          iconBg: "bg-gray-100 text-gray-600",
        };
    }
  };

  const config = getCategoryConfig(item.category, item.priority);
  const Icon = config.icon;

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 rounded-xl transition-all duration-150 cursor-pointer relative group border text-left",
        !item.isRead
          ? "bg-[#531FFF]/[0.03] hover:bg-[#531FFF]/[0.07] border-[#531FFF]/15 shadow-2xs"
          : "bg-white hover:bg-gray-50 border-gray-100/90 text-gray-500"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Category Icon Container */}
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs",
            config.iconBg
          )}
        >
          <Icon className="w-4 h-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-1">
          {/* Header Row: Category Badge + Timestamp */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={cn(
                  "text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded border truncate",
                  config.badgeBg
                )}
              >
                {item.categoryLabel}
              </span>
              {!item.isRead && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#531FFF] shrink-0 animate-pulse" />
              )}
            </div>

            <div className="flex items-center gap-1 text-[10.5px] text-gray-400 shrink-0 font-medium">
              <Clock className="w-3 h-3" />
              <span>{item.formattedTime}</span>
            </div>
          </div>

          {/* Title */}
          <h4
            className={cn(
              "text-[12.5px] leading-snug line-clamp-1 transition-colors",
              !item.isRead
                ? "font-extrabold text-gray-900 group-hover:text-[#531FFF]"
                : "font-semibold text-gray-700 group-hover:text-gray-900"
            )}
          >
            {item.title}
          </h4>

          {/* Description */}
          <p className="text-[11.5px] text-gray-500 line-clamp-2 mt-0.5 leading-relaxed font-normal">
            {item.description}
          </p>
        </div>

        {/* Action Button: Mark single as read */}
        {onMarkRead && !item.isRead && (
          <button
            type="button"
            onClick={onMarkRead}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-[#531FFF] hover:bg-white transition-all shadow-2xs cursor-pointer shrink-0"
            title="Tandai sudah dibaca"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
