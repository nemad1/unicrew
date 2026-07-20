"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  MoreVertical,
  Plus,
  Inbox,
  ArrowRightLeft,
  UserPlus,
  User,
  FileText,
  Archive,
  ChevronRight,
  Check,
  X,
  Pencil,
  Palette,
  Trash2,
  MessageCircle,
  AlertTriangle,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { intentStyles } from "@/types/roles";
import type { Intent } from "@/types/roles";
import { useMediaQuery } from "@/hooks/use-media-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ProspectProfile } from "@/components/prospect-profile";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Deal = {
  id: string;
  contactId: string;
  phone: string;
  name: string;
  time: string;
  intent: Intent;
  preview: string;
  ambassador: { id: string | null; name: string; initials: string };
  /** Denormalized cache from contacts.top_concerns (migration 009) — optional since
   * client-constructed deals (e.g. right after "New Deal") won't have it yet. */
  topConcerns?: { label: string; confidence?: number; sentiment?: string | null }[];
};

type Column = {
  id: string;
  title: string;
  accent: string;
  completed?: boolean;
  isCustom?: boolean;
  deals: Deal[];
};

// ─── Static data ─────────────────────────────────────────────────────────────

const accentColors = [
  { hex: "#1d4ed8", label: "Blue" },
  { hex: "#059669", label: "Green" },
  { hex: "#d97706", label: "Amber" },
  { hex: "#7c3aed", label: "Violet" },
  { hex: "#db2777", label: "Pink" },
];

type BoardAmbassador = { id: string; name: string; initials: string };

const intentOptions: Intent[] = [
  "Fees",
  "Campus Life",
  "Visa & Immigration",
  "Courses",
  "Housing",
  "Booking",
  "Escalated",
  "General",
];

// ─── Card Options Menu (board-level, fixed position) ──────────────────────────

type CardMenuState = {
  dealId: string;
  colId: string;
  x: number;
  y: number;
  subMenu: "stage" | "ambassador" | null;
};

function CardOptionsMenu({
  menu,
  columns,
  ambassadors,
  onClose,
  onMoveToStage,
  onAssignAmbassador,
  onViewProfile,
  onAddNote,
  onArchive,
  onSetSubMenu,
}: {
  menu: CardMenuState;
  columns: Column[];
  ambassadors: BoardAmbassador[];
  onClose: () => void;
  onMoveToStage: (dealId: string, targetColId: string) => void;
  onAssignAmbassador: (dealId: string, ambassadorId: string) => void;
  onViewProfile: (dealId: string) => void;
  onAddNote: (dealId: string) => void;
  onArchive: (dealId: string) => void;
  onSetSubMenu: (sub: "stage" | "ambassador" | null) => void;
}) {
  const [ambassadorSearch, setAmbassadorSearch] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const otherCols = columns.filter((c) => c.id !== menu.colId);
  const filteredAmbassadors = ambassadors.filter((a) =>
    a.name.toLowerCase().includes(ambassadorSearch.toLowerCase()),
  );

  const menuStyle: React.CSSProperties = {
    position: "fixed",
    top: menu.y,
    left: menu.x,
    zIndex: 50,
    width: 220,
    background: "#ffffff",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
  };

  const subMenuStyle: React.CSSProperties = {
    position: "fixed",
    top: menu.y,
    left: menu.x + 228,
    zIndex: 51,
    width: 200,
    background: "#ffffff",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
  };

  return (
    <div ref={menuRef}>
      {/* Main menu */}
      <div style={menuStyle} className="p-1">
        {/* Move to stage */}
        <button
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors",
            menu.subMenu === "stage" && "bg-gray-100 text-gray-900",
          )}
          onMouseEnter={() => onSetSubMenu("stage")}
          onClick={() => onSetSubMenu(menu.subMenu === "stage" ? null : "stage")}
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          <span className="flex-1 text-left">Move to stage</span>
          <ChevronRight className="w-3 h-3 text-gray-400" />
        </button>

        {/* Assign ambassador */}
        <button
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors",
            menu.subMenu === "ambassador" && "bg-gray-100 text-gray-900",
          )}
          onMouseEnter={() => onSetSubMenu("ambassador")}
          onClick={() => onSetSubMenu(menu.subMenu === "ambassador" ? null : "ambassador")}
        >
          <UserPlus className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          <span className="flex-1 text-left">Assign ambassador</span>
          <ChevronRight className="w-3 h-3 text-gray-400" />
        </button>

        <div className="my-1 h-px bg-gray-100" />

        {/* View student profile */}
        <button
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          onMouseEnter={() => onSetSubMenu(null)}
          onClick={() => { onViewProfile(menu.dealId); onClose(); }}
        >
          <User className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          <span>View student profile</span>
        </button>

        <div className="my-1 h-px bg-gray-100" />

        {/* Archive */}
        <button
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-red-600 hover:bg-red-50 transition-colors"
          onMouseEnter={() => onSetSubMenu(null)}
          onClick={() => { onArchive(menu.dealId); onClose(); }}
        >
          <Archive className="w-3.5 h-3.5 shrink-0" />
          <span>Archive card</span>
        </button>
      </div>

      {/* Stage submenu */}
      {menu.subMenu === "stage" && (
        <div style={subMenuStyle} className="p-1">
          {otherCols.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400">No other stages</p>
          ) : (
            otherCols.map((col) => (
              <button
                key={col.id}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                onClick={() => { onMoveToStage(menu.dealId, col.id); onClose(); }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: col.accent }}
                />
                {col.title}
              </button>
            ))
          )}
        </div>
      )}

      {/* Ambassador submenu */}
      {menu.subMenu === "ambassador" && (
        <div style={subMenuStyle} className="p-2 space-y-1">
          <input
            autoFocus
            value={ambassadorSearch}
            onChange={(e) => setAmbassadorSearch(e.target.value)}
            placeholder="Search ambassadors..."
            className="w-full text-xs border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-blue-400"
          />
          {filteredAmbassadors.length === 0 ? (
            <p className="px-2.5 py-1.5 text-xs text-gray-400">No ambassadors on this team</p>
          ) : (
            filteredAmbassadors.map((a) => (
              <button
                key={a.id}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                onClick={() => { onAssignAmbassador(menu.dealId, a.id); onClose(); }}
              >
                <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-[9px] shrink-0">
                  {a.initials}
                </span>
                {a.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Column Header Options Menu ───────────────────────────────────────────────

type ColMenuState = { colId: string; x: number; y: number };

function ColumnOptionsMenu({
  menu,
  isCustom,
  onClose,
  onRename,
  onChangeColor,
  onDelete,
}: {
  menu: ColMenuState;
  isCustom?: boolean;
  onClose: () => void;
  onRename: () => void;
  onChangeColor: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: menu.y,
        left: menu.x,
        zIndex: 50,
        width: 180,
        background: "#ffffff",
        borderRadius: 8,
        border: "1px solid #e5e7eb",
        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
      }}
      className="p-1"
    >
      <button
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-gray-700 hover:bg-gray-100 transition-colors"
        onClick={() => { onRename(); onClose(); }}
      >
        <Pencil className="w-3.5 h-3.5 text-gray-500" />
        Rename stage
      </button>
      <button
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-gray-700 hover:bg-gray-100 transition-colors"
        onClick={() => { onChangeColor(); onClose(); }}
      >
        <Palette className="w-3.5 h-3.5 text-gray-500" />
        Change column color
      </button>
      {isCustom && (
        <>
          <div className="my-1 h-px bg-gray-100" />
          <button
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-red-600 hover:bg-red-50 transition-colors"
            onClick={() => { onDelete(); onClose(); }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete stage
          </button>
        </>
      )}
    </div>
  );
}

// ─── Intent badge ─────────────────────────────────────────────────────────────

function IntentBadge({ intent }: { intent: Intent }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full border text-xs",
        intentStyles[intent],
      )}
    >
      {intent}
    </span>
  );
}

function ConcernIndicator({ concerns }: { concerns?: { label: string }[] }) {
  if (!concerns || concerns.length === 0) return null;
  const label = concerns.length === 1 ? concerns[0].label : `${concerns[0].label} +${concerns.length - 1}`;
  return (
    <span
      title={concerns.map((c) => c.label).join(", ")}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs bg-amber-50 text-amber-700 border-amber-200 max-w-[140px]"
    >
      <AlertTriangle className="w-3 h-3 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}

// ─── Deal Card ────────────────────────────────────────────────────────────────

function DealCardContent({
  deal,
  completed,
  dragging,
  onOpen,
  ghost,
  onOpenMenu,
  onMessage,
}: {
  deal: Deal;
  completed?: boolean;
  dragging?: boolean;
  onOpen?: () => void;
  ghost?: boolean;
  onOpenMenu?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMessage?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div
      onClick={(e) => {
        if (dragging) return;
        e.stopPropagation();
        onOpen?.();
      }}
      className={cn(
        "bg-white rounded-lg border border-gray-200 shadow-sm p-3 space-y-2.5 cursor-grab transition-all",
        completed && "border-l-[3px] border-l-emerald-500",
        dragging && "scale-105 shadow-xl ring-2 ring-blue-500 border-blue-300",
        ghost && "opacity-40",
        !dragging && !ghost && "hover:border-blue-300",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-gray-900 font-medium flex items-center gap-1 min-w-0">
          <User className="w-3.5 h-3.5 text-gray-300 shrink-0" />
          <span className="truncate">{deal.name}</span>
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-gray-400">{deal.time}</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <IntentBadge intent={deal.intent} />
        <ConcernIndicator concerns={deal.topConcerns} />
      </div>
      <p className="text-xs text-gray-500 italic truncate">{deal.preview}</p>
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full pl-0.5 pr-2 py-0.5">
          <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-[10px]">
            {deal.ambassador.initials}
          </span>
          <span className="text-xs text-gray-600">{deal.ambassador.name}</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onMessage?.(e); }}
            className="text-gray-400 hover:text-blue-600 p-1 rounded transition-colors"
            title="Message in Inbox"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onOpenMenu?.(e); }}
            className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SortableDealCard({
  deal,
  colId,
  completed,
  onOpen,
  onOpenMenu,
  onMessage,
}: {
  deal: Deal;
  colId: string;
  completed?: boolean;
  onOpen?: () => void;
  onOpenMenu: (dealId: string, colId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  onMessage?: (dealId: string, colId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: deal.id, data: { type: "deal", deal } });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      <DealCardContent
        deal={deal}
        completed={completed}
        ghost={isDragging}
        onOpen={onOpen}
        onOpenMenu={(e) => onOpenMenu(deal.id, colId, e)}
        onMessage={(e) => onMessage?.(deal.id, colId, e)}
      />
    </div>
  );
}

// ─── Droppable Column ─────────────────────────────────────────────────────────

function SortableColumn({
  column,
  children,
  onOpenColMenu,
}: {
  column: Column;
  children: React.ReactNode;
  onOpenColMenu: (colId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: "column", column },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "border border-gray-200 rounded-lg flex flex-col min-h-0 transition-colors overflow-hidden",
        isDragging ? "opacity-50 ring-2 ring-blue-500" : "bg-gray-50",
        isMobile && "min-w-[85vw] snap-center shrink-0"
      )}
    >
      {/* Accent top bar */}
      <div className="h-[3px] shrink-0" style={{ backgroundColor: column.accent }} />

      {/* Header */}
      <div 
        className="px-4 py-3 flex items-center gap-2 border-b border-gray-200/70 cursor-grab"
        {...attributes}
        {...listeners}
      >
        <span className="text-sm text-gray-900 font-medium flex-1 truncate">{column.title}</span>
        <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-white border border-gray-200 text-xs text-gray-600 shrink-0">
          {column.deals.length}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onOpenColMenu(column.id, e); }}
          className="text-gray-400 hover:text-gray-600 p-0.5 rounded shrink-0"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-3 space-y-3 overflow-y-auto flex-1 min-h-24">
        {column.deals.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-8 border border-dashed border-gray-300 rounded-lg">
            <Inbox className="w-7 h-7 mb-2 text-gray-400" />
            <p className="text-xs text-gray-500">No cards yet</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// ─── Add Stage Card ───────────────────────────────────────────────────────────

function AddStageCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full h-12 flex items-center justify-center gap-2 border border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50/40 transition-colors"
    >
      <Plus className="w-4 h-4" />
      Add Stage
    </button>
  );
}

// ─── Add Stage Form ───────────────────────────────────────────────────────────

function AddStageForm({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (title: string, accent: string) => void;
}) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [title, setTitle] = useState("");
  const [selectedColor, setSelectedColor] = useState(accentColors[0].hex);

  return (
    <div className={cn("border border-gray-200 rounded-lg bg-gray-50 flex flex-col overflow-hidden", isMobile && "min-w-[85vw] snap-center shrink-0")}>
      <div className="h-[3px]" style={{ backgroundColor: selectedColor }} />
      <div className="p-3 space-y-3">
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">
            Stage name
          </label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && title.trim()) onCreate(title.trim(), selectedColor);
              if (e.key === "Escape") onCancel();
            }}
            placeholder="e.g. Interview Scheduled"
            className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-xs outline-none focus:border-blue-400 bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          {accentColors.map((c) => (
            <button
              key={c.hex}
              title={c.label}
              onClick={() => setSelectedColor(c.hex)}
              className="w-4 h-4 rounded-full flex items-center justify-center transition-transform hover:scale-110"
              style={{ backgroundColor: c.hex }}
            >
              {selectedColor === c.hex && <Check className="w-2.5 h-2.5 text-white" />}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            disabled={!title.trim()}
            onClick={() => title.trim() && onCreate(title.trim(), selectedColor)}
            className="flex-1 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-40 rounded-md px-3 py-1.5 transition-colors"
          >
            Create
          </button>
          <button
            onClick={onCancel}
            className="flex-1 text-xs font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 rounded-md px-3 py-1.5 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Filter pill ──────────────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs border transition-colors",
        active
          ? "bg-blue-700 text-white border-blue-700"
          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
      )}
    >
      {label}
    </button>
  );
}

// ─── Rename Modal ─────────────────────────────────────────────────────────────

function RenameModal({
  open,
  initial,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  initial: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  useEffect(() => { if (open) setValue(initial); }, [open, initial]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 w-80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Rename stage</h3>
          <button onClick={onCancel}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onConfirm(value.trim());
            if (e.key === "Escape") onCancel();
          }}
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-400"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="text-xs text-gray-600 border border-gray-200 rounded-md px-3 py-1.5 hover:bg-gray-50">Cancel</button>
          <button
            disabled={!value.trim()}
            onClick={() => value.trim() && onConfirm(value.trim())}
            className="text-xs font-semibold text-white bg-blue-700 rounded-md px-3 py-1.5 hover:bg-blue-800 disabled:opacity-40"
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Color Picker Modal ───────────────────────────────────────────────────────

function ColorPickerModal({
  open,
  initial,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  initial: string;
  onConfirm: (hex: string) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState(initial);
  useEffect(() => { if (open) setSelected(initial); }, [open, initial]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 w-64 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Column color</h3>
          <button onClick={onCancel}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          {accentColors.map((c) => (
            <button
              key={c.hex}
              title={c.label}
              onClick={() => setSelected(c.hex)}
              style={{ backgroundColor: c.hex }}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
            >
              {selected === c.hex && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 pt-2">
          <label className="text-xs text-gray-600 flex-1">Custom color:</label>
          <input
            type="color"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-8 h-8 p-0 border-0 rounded cursor-pointer shrink-0"
          />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onCancel} className="text-xs text-gray-600 border border-gray-200 rounded-md px-3 py-1.5 hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => onConfirm(selected)}
            className="text-xs font-semibold text-white bg-blue-700 rounded-md px-3 py-1.5 hover:bg-blue-800"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Board ────────────────────────────────────────────────────────────────────


export function KanbanBoard({
  onOpenDeal,
  onOpenProfile,
}: {
  onOpenDeal?: (id: string) => void;
  /** Mobile: opens the Customer (Student Prospect) profile for a tapped card. */
  onOpenProfile?: (deal: { name: string; intent: Intent; preview: string }) => void;
}) {
  const router = useRouter();
  const [expandedDeal, setExpandedDeal] = useState<Deal | null>(null);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  const openCard = (deal: Deal) => {
    setExpandedDeal(deal);
    setProfileSheetOpen(true);
  };
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [columns, setColumns] = useState<Column[]>([]);
  const [activeFilter, setActiveFilter] = useState("All Intents");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [activeColumn, setActiveColumn] = useState<Column | null>(null);

  // Team-scoped board state
  const [ambassadors, setAmbassadors] = useState<BoardAmbassador[]>([]);
  const [availableTeams, setAvailableTeams] = useState<{ id: string; name: string; accent_color: string | null }[]>([]);
  const [currentBoard, setCurrentBoard] = useState<{ id: string; name: string; team_id: string | null } | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useState<string | null>(null);

  // New deal dialog
  const [newDealOpen, setNewDealOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formIntent, setFormIntent] = useState<Intent>("Fees");
  const [formAmbassadorId, setFormAmbassadorId] = useState("");
  const [creatingDeal, setCreatingDeal] = useState(false);

  // Add stage
  const [addingStage, setAddingStage] = useState(false);

  // Card options menu (fixed position)
  const [cardMenu, setCardMenu] = useState<CardMenuState | null>(null);

  // Column header options menu
  const [colMenu, setColMenu] = useState<ColMenuState | null>(null);

  // Rename / color modals
  const [renameModal, setRenameModal] = useState<{ colId: string; title: string } | null>(null);
  const [colorModal, setColorModal] = useState<{ colId: string; accent: string } | null>(null);

  // Skeleton loading
  const [loading, setLoading] = useState(true);

  const fetchBoard = useCallback(async (teamId?: string | null) => {
    try {
      setLoading(true);
      const url = teamId ? `/api/kanban/board?teamId=${teamId}` : '/api/kanban/board';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.columns) setColumns(data.columns);
        setAmbassadors(data.ambassadors || []);
        setAvailableTeams(data.availableTeams || []);
        setCurrentBoard(data.board || null);
        setSelectedTeamId(data.board?.team_id ?? null);
        setViewerId(data.viewerId ?? null);
        setViewerRole(data.viewerRole ?? null);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to load board.");
      }
    } catch (err) {
      console.error("Failed to fetch kanban board:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormIntent("Fees");
    setFormAmbassadorId("");
  };

  const handleCreateDeal = async () => {
    if (!formName.trim() || !formPhone.trim()) return;
    if (viewerRole !== "ambassador" && !formAmbassadorId) {
      toast.error("Please select an ambassador to assign this deal to.");
      return;
    }

    setCreatingDeal(true);
    try {
      const res = await fetch('/api/kanban/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          phone_number: formPhone.trim(),
          intent: formIntent,
          assignee_id: viewerRole === "ambassador" ? undefined : formAmbassadorId,
          teamId: selectedTeamId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create deal.");
        return;
      }

      setColumns((prev) =>
        prev.map((c) => (c.id === data.stageId ? { ...c, deals: [data.deal, ...c.deals] } : c)),
      );
      setNewDealOpen(false);
      resetForm();
    } catch (err) {
      toast.error("Failed to create deal.");
    } finally {
      setCreatingDeal(false);
    }
  };

  const handleCreateStage = async (title: string, accent: string) => {
    try {
      const res = await fetch('/api/kanban/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: title, accent_color: accent, order_index: columns.length })
      });
      const data = await res.json();
      if (data.success) {
        const newCol: Column = {
          id: data.stage.id,
          title: data.stage.name,
          accent: data.stage.accent_color,
          isCustom: true,
          deals: [],
        };
        setColumns((prev) => [...prev, newCol]);
      }
    } catch (e) {
      console.error(e);
    }
    setAddingStage(false);
  };

  const handleMoveDeal = useCallback((dealId: string, targetColId: string) => {
    setColumns((prev) => {
      const next = prev.map((c) => ({ ...c, deals: [...c.deals] }));
      let deal: Deal | undefined;
      let sourceColId: string | undefined;
      for (const col of next) {
        const idx = col.deals.findIndex((d) => d.id === dealId);
        if (idx !== -1) { [deal] = col.deals.splice(idx, 1); sourceColId = col.id; break; }
      }
      if (!deal || sourceColId === targetColId) return prev;
      const target = next.find((c) => c.id === targetColId);
      target?.deals.push(deal);
      
      // Persist movement to backend
      fetch('/api/kanban/cards/move', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: dealId, new_stage_id: targetColId })
      }).catch(err => {
        console.error(err);
        toast.error("Failed to update stage on server.");
      });

      return next;
    });
  }, []);

  const handleAssignAmbassador = useCallback((dealId: string, ambassadorId: string) => {
    const amb = ambassadors.find((a) => a.id === ambassadorId);
    if (!amb) return;

    const deal = columns.flatMap((c) => c.deals).find((d) => d.id === dealId);
    if (!deal) return;

    // Optimistic update, reverted on failure
    setColumns((prev) =>
      prev.map((c) => ({
        ...c,
        deals: c.deals.map((d) =>
          d.id === dealId ? { ...d, ambassador: { id: amb.id, name: amb.name, initials: amb.initials } } : d,
        ),
      })),
    );

    fetch(`/api/contacts/${encodeURIComponent(deal.phone)}/assign`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignee_id: amb.id }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to assign ambassador.');
        }
      })
      .catch((err) => {
        toast.error(err.message);
        setColumns((prev) =>
          prev.map((c) => ({
            ...c,
            deals: c.deals.map((d) => (d.id === dealId ? deal : d)),
          })),
        );
      });
  }, [ambassadors, columns]);

  const handleArchive = useCallback((dealId: string) => {
    setColumns((prev) =>
      prev.map((c) => ({ ...c, deals: c.deals.filter((d) => d.id !== dealId) })),
    );
  }, []);

  const handleOpenCardMenu = useCallback(
    (dealId: string, colId: string, e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setCardMenu({ dealId, colId, x: rect.left - 228, y: rect.top, subMenu: null });
    },
    [],
  );

  const handleOpenColMenu = useCallback(
    (colId: string, e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setColMenu({ colId, x: rect.left - 188, y: rect.bottom + 4 });
    },
    [],
  );

  // ── DnD ─────────────────────────────────────────────────────────────────

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const findColumnByDealId = (dealId: string) =>
    columns.find((c) => c.deals.some((d) => d.id === dealId));

  const findColumnById = (id: string) => columns.find((c) => c.id === id);

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === "column") {
      setActiveColumn(event.active.data.current.column);
      return;
    }
    const dealId = String(event.active.id);
    const col = findColumnByDealId(dealId);
    setActiveDeal(col?.deals.find((d) => d.id === dealId) ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.data.current?.type === "column") return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;
    const sourceCol = findColumnByDealId(activeId);
    if (!sourceCol) return;
    const overIsColumn = columns.some((c) => c.id === overId);
    const destCol = overIsColumn ? findColumnById(overId) : findColumnByDealId(overId);
    if (!destCol || sourceCol.id === destCol.id) return;
    setColumns((prev) => {
      const next = prev.map((c) => ({ ...c, deals: [...c.deals] }));
      const src = next.find((c) => c.id === sourceCol.id)!;
      const dst = next.find((c) => c.id === destCol.id)!;
      const idx = src.deals.findIndex((d) => d.id === activeId);
      if (idx === -1) return prev;
      const [moved] = src.deals.splice(idx, 1);
      if (overIsColumn) dst.deals.push(moved);
      else {
        const overIdx = dst.deals.findIndex((d) => d.id === overId);
        dst.deals.splice(overIdx >= 0 ? overIdx : dst.deals.length, 0, moved);
      }
      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDeal(null);
    setActiveColumn(null);
    if (!over) return;
    
    if (active.data.current?.type === "column") {
      const activeId = String(active.id);
      const overId = String(over.id);
      if (activeId === overId) return;
      
      setColumns((prev) => {
        const oldIndex = prev.findIndex((c) => c.id === activeId);
        const newIndex = prev.findIndex((c) => c.id === overId);
        const newColumns = arrayMove(prev, oldIndex, newIndex);
        
        // Optimistically sync to backend
        fetch('/api/kanban/stages/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            stages: newColumns.map((col, index) => ({ id: col.id, order_index: index })) 
          })
        }).catch(err => {
          console.error(err);
          toast.error("Failed to reorder columns.");
        });
        
        return newColumns;
      });
      return;
    }
    
    const activeId = String(active.id);
    const overId = String(over.id);
    
    // Synchronize to backend if the card was moved to a new column
    const currentColumn = findColumnByDealId(activeId);
    if (currentColumn) {
       fetch('/api/kanban/cards/move', {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ card_id: activeId, new_stage_id: currentColumn.id })
       }).catch(err => {
          console.error(err);
          toast.error("Failed to move card.");
       });
    }

    if (activeId === overId) return;
    const sourceCol = findColumnByDealId(activeId);
    if (!sourceCol) return;
    const overIsColumn = columns.some((c) => c.id === overId);
    if (overIsColumn) return;
    const destCol = findColumnByDealId(overId);
    if (!destCol || sourceCol.id !== destCol.id) return;
    const oldIdx = sourceCol.deals.findIndex((d) => d.id === activeId);
    const newIdx = sourceCol.deals.findIndex((d) => d.id === overId);
    if (oldIdx === -1 || newIdx === -1) return;
    setColumns((prev) =>
      prev.map((c) =>
        c.id === sourceCol.id ? { ...c, deals: arrayMove(c.deals, oldIdx, newIdx) } : c,
      ),
    );
  };

  const columnIds = useMemo(() => columns.map((c) => c.id), [columns]);
  const gridCols = columns.length + (addingStage ? 1 : 1); // +1 for Add Stage card/form

  const filteredColumns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return columns.map((col) => ({
      ...col,
      deals: col.deals.filter((deal) => {
        if (activeFilter === "Assigned to Me" && deal.ambassador.id !== viewerId) return false;
        if (activeFilter === "Unassigned" && deal.ambassador.id !== null) return false;
        if (q && !deal.name.toLowerCase().includes(q) && !deal.phone.toLowerCase().includes(q)) return false;
        return true;
      }),
    }));
  }, [columns, activeFilter, searchQuery, viewerId]);



  return (
    <div className={cn("flex-1 flex flex-col bg-white min-w-0", isMobile && "bg-gray-50")}>
      {/* Page header - Hidden on mobile, MobileApp provides its own */}
      {!isMobile && (
        <div className="h-16 px-6 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-gray-900">Kanban Pipeline</h2>
            <p className="text-xs text-gray-500">Track student deals from inquiry to enrollment</p>
          </div>
        </div>
      )}

      {/* Toolbar - simplified for mobile */}
      <div className={cn("border-b border-gray-200 flex items-center gap-3 shrink-0", isMobile ? "px-4 py-3 flex-wrap bg-white" : "px-6 py-4")}>
        <div className={cn("relative", isMobile ? "w-full" : "w-72")}>
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search deals..."
            className="pl-9 bg-gray-50 border-gray-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          {["All Intents", "Assigned to Me", "Unassigned"].map((label) => (
            <FilterPill
              key={label}
              label={label}
              active={activeFilter === label}
              onClick={() => setActiveFilter(label)}
            />
          ))}
        </div>
        {viewerRole === "admin" && availableTeams.length > 0 && (
          <Select
            value={selectedTeamId ?? ""}
            onValueChange={(v) => fetchBoard(v || null)}
          >
            <SelectTrigger className="w-48 bg-white border-gray-200">
              <SelectValue placeholder="Select team board" />
            </SelectTrigger>
            <SelectContent>
              {availableTeams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: t.accent_color || "#9ca3af" }}
                    />
                    {t.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="ml-auto">
          <Button
            className="bg-blue-700 hover:bg-blue-800 text-white"
            onClick={() => setNewDealOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            New Deal
          </Button>
        </div>
      </div>

      {/* Board grid */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div 
            className={cn("h-full", isMobile ? "flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 px-2" : "grid gap-5")} 
            style={isMobile ? undefined : { gridTemplateColumns: `repeat(4, 260px)` }}
          >
            {Array.from({ length: 4 }).map((_, ci) => (
              <div key={ci} className={cn("border border-gray-200 rounded-lg bg-gray-50 flex flex-col", isMobile && "min-w-[85vw] snap-center shrink-0")}>
                <div className="h-[3px] bg-gray-200" />
                <div className="px-4 py-3 border-b border-gray-200/70 flex items-center gap-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
                <div className="p-3 space-y-3">
                  {Array.from({ length: 3 }).map((_, di) => (
                    <div key={di} className="bg-white rounded-lg border border-gray-200 p-3 space-y-2.5">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className={cn("h-full", isMobile ? "flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 px-2" : "grid gap-5")}
            style={isMobile ? undefined : { gridTemplateColumns: `repeat(${gridCols}, 260px)` }}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                {filteredColumns.map((col) => (
                  <SortableColumn
                    key={col.id}
                    column={col}
                    onOpenColMenu={handleOpenColMenu}
                  >
                    <SortableContext
                      items={col.deals.map((d) => d.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {col.deals.map((deal) => (
                        <SortableDealCard
                          key={deal.id}
                          deal={deal}
                          colId={col.id}
                          completed={col.completed}
                          onOpen={() => openCard(deal)}
                          onOpenMenu={handleOpenCardMenu}
                          onMessage={() => router.push(`/inbox?activeId=${deal.phone.replace(/\D/g, '')}@c.us`)}
                        />
                      ))}
                    </SortableContext>
                  </SortableColumn>
                ))}
              </SortableContext>

              <DragOverlay>
                {activeDeal ? <DealCardContent deal={activeDeal} dragging /> : null}
              </DragOverlay>
            </DndContext>

            {/* Add Stage column */}
            <div className="flex flex-col">
              {addingStage ? (
                <AddStageForm
                  onCancel={() => setAddingStage(false)}
                  onCreate={handleCreateStage}
                />
              ) : (
                <AddStageCard onClick={() => setAddingStage(true)} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Card options menu (fixed) */}
      {cardMenu && (
        <CardOptionsMenu
          menu={cardMenu}
          columns={columns}
          ambassadors={ambassadors}
          onClose={() => setCardMenu(null)}
          onMoveToStage={handleMoveDeal}
          onAssignAmbassador={handleAssignAmbassador}
          onViewProfile={(id) => {
            const deal = columns.flatMap((c) => c.deals).find((d) => d.id === id);
            if (deal) openCard(deal);
          }}
          onAddNote={(id) => toast.info("Notes feature coming soon")}
          onArchive={handleArchive}
          onSetSubMenu={(sub) => setCardMenu((m) => m ? { ...m, subMenu: sub } : null)}
        />
      )}

      {/* Column options menu (fixed) */}
      {colMenu && (
        <ColumnOptionsMenu
          menu={colMenu}
          isCustom={columns.find((c) => c.id === colMenu.colId)?.isCustom}
          onClose={() => setColMenu(null)}
          onRename={() => {
            const col = columns.find((c) => c.id === colMenu.colId);
            if (col) setRenameModal({ colId: col.id, title: col.title });
          }}
          onChangeColor={() => {
            const col = columns.find((c) => c.id === colMenu.colId);
            if (col) setColorModal({ colId: col.id, accent: col.accent });
          }}
          onDelete={() => {
            const colId = colMenu.colId;
            // Optimistic check first
            const col = columns.find(c => c.id === colId);
            if (col && col.deals.length > 0) {
               toast.error(`Cannot delete stage because it contains ${col.deals.length} card(s). Move them first.`);
               return;
            }
            
            setColumns((prev) => prev.filter((c) => c.id !== colId));
            
            fetch(`/api/kanban/stages/${colId}`, { method: 'DELETE' })
              .then(async (res) => {
                const data = await res.json();
                if (!res.ok || data.error) {
                  toast.error(data.error || "Failed to delete stage.");
                  // Revert if needed (simplified here)
                } else {
                  toast.success("Stage deleted.");
                }
              })
              .catch(() => toast.error("Failed to delete stage."));
          }}
        />
      )}

      {/* Rename modal */}
      <RenameModal
        open={!!renameModal}
        initial={renameModal?.title ?? ""}
        onConfirm={(name) => {
          if (renameModal) {
            const colId = renameModal.colId;
            setColumns((prev) =>
              prev.map((c) => (c.id === colId ? { ...c, title: name } : c)),
            );
            
            fetch(`/api/kanban/stages/${colId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name })
            }).catch(() => toast.error("Failed to rename stage."));
          }
          setRenameModal(null);
        }}
        onCancel={() => setRenameModal(null)}
      />

      {/* Color picker modal */}
      <ColorPickerModal
        open={!!colorModal}
        initial={colorModal?.accent ?? accentColors[0].hex}
        onConfirm={(hex) => {
          if (colorModal) {
            const colId = colorModal.colId;
            setColumns((prev) =>
              prev.map((c) => (c.id === colId ? { ...c, accent: hex } : c)),
            );
            
            fetch(`/api/kanban/stages/${colId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accent_color: hex })
            }).catch(() => toast.error("Failed to update stage color."));
          }
          setColorModal(null);
        }}
        onCancel={() => setColorModal(null)}
      />

      {/* New Deal dialog */}
      <Dialog
        open={newDealOpen}
        onOpenChange={(open) => { setNewDealOpen(open); if (!open) resetForm(); }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Deal</DialogTitle>
            <DialogDescription>Add a prospective student to the New Inquiry column.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="deal-name" className="text-xs text-gray-600">Prospect name</Label>
              <Input
                id="deal-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Jordan Lee"
                className="bg-white border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deal-phone" className="text-xs text-gray-600">WhatsApp number</Label>
              <Input
                id="deal-phone"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="e.g. 60123456789"
                className="bg-white border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">Intent category</Label>
              <Select value={formIntent} onValueChange={(v) => setFormIntent(v as Intent)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {intentOptions.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {viewerRole !== "ambassador" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Assigned ambassador</Label>
                <Select value={formAmbassadorId} onValueChange={setFormAmbassadorId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select ambassador" /></SelectTrigger>
                  <SelectContent>
                    {ambassadors.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-gray-200 text-gray-700"
              onClick={() => { setNewDealOpen(false); resetForm(); }}
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-700 hover:bg-blue-800 text-white"
              disabled={!formName.trim() || !formPhone.trim() || creatingDeal}
              onClick={handleCreateDeal}
            >
              {creatingDeal ? "Creating..." : "Create Deal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Prospect Profile Sheet */}
      <Sheet open={profileSheetOpen} onOpenChange={(open) => {
        setProfileSheetOpen(open);
        if (!open) setExpandedDeal(null);
      }}>
        <SheetContent side="right" className="w-full sm:max-w-[550px] p-0 overflow-hidden bg-gray-50 border-l border-gray-200">
          <SheetTitle className="sr-only">Prospect Profile</SheetTitle>
          <SheetDescription className="sr-only">Details of the prospect.</SheetDescription>
          {expandedDeal && (
            <div className="h-full overflow-y-auto">
              <ProspectProfile rawPhone={expandedDeal.phone} onBack={() => setProfileSheetOpen(false)} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
