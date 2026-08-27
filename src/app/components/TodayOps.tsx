import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import { Building2, LogIn, LogOut, MessageCircle, Sparkles } from "lucide-react";
import { Link } from "react-router";

import { resolveMediaUrl } from "@/lib/api";
import { formatCurrency } from "@/lib/formatters";
import { useReturnDeposit } from "@/lib/hooks/useBookings";
import type { Booking } from "@/types";

function waLink(phone: string, apartmentTitle?: string) {
  const digits = phone.replace(/[^\d]/g, "");
  const text = encodeURIComponent(
    apartmentTitle ? `Hola, te escribo sobre tu estancia en ${apartmentTitle}.` : "Hola,",
  );
  return `https://wa.me/${digits}?text=${text}`;
}

function GuestCard({
  booking,
  direction,
  onReturnDeposit,
  returningId,
}: {
  booking: Booking;
  direction: "in" | "out";
  onReturnDeposit: (id: number) => void;
  returningId?: number;
}) {
  const image = resolveMediaUrl(booking.apartment_image);
  const depositOwed = direction === "out" && Number(booking.deposit_amount) > 0 && !booking.deposit_returned;
  const guestLabel = booking.client_name?.trim() || "Huésped";

  return (
    <div className="group relative aspect-[3/4] w-44 shrink-0 overflow-hidden rounded-2xl bg-muted shadow-sm sm:w-52">
      {image ? (
        <img
          src={image}
          alt={booking.apartment_title ?? "Apartamento"}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-secondary">
          <Building2 className="size-8 text-muted-foreground" strokeWidth={1.5} />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/0" />

      <div
        className={`absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium text-white ${
          direction === "in" ? "bg-[color:#5E6E4F]" : "bg-[color:#8A6A2E]"
        }`}
      >
        {direction === "in" ? <LogIn className="size-3" strokeWidth={2} /> : <LogOut className="size-3" strokeWidth={2} />}
        {direction === "in" ? "Entra" : "Sale"}
      </div>

      {booking.client_phone ? (
        <a
          href={waLink(booking.client_phone, booking.apartment_title)}
          target="_blank"
          rel="noreferrer"
          title="Escribir por WhatsApp"
          className="absolute right-2.5 top-2.5 flex size-7 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
        >
          <MessageCircle className="size-3.5" strokeWidth={2} />
        </a>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 space-y-1 p-3">
        <p className="truncate text-[10px] uppercase tracking-[0.14em] text-white/65">{booking.apartment_title ?? "Apartamento"}</p>
        <p className="font-display truncate text-lg leading-none text-white">{guestLabel}</p>
        <p className="text-xs text-white/70">
          {booking.num_guests} huésped{booking.num_guests === 1 ? "" : "es"}
        </p>

        {depositOwed ? (
          <button
            type="button"
            onClick={() => onReturnDeposit(booking.id)}
            disabled={returningId === booking.id}
            className="mt-1.5 flex w-full items-center justify-between rounded-lg bg-white/15 px-2 py-1.5 text-left text-[11px] text-white backdrop-blur-sm transition-colors hover:bg-white/25 disabled:opacity-60"
          >
            <span>Fianza {formatCurrency(booking.deposit_amount)}</span>
            <span className="font-medium underline underline-offset-2">
              {returningId === booking.id ? "..." : "Devolver"}
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

function GuestRow({
  title,
  bookings,
  direction,
  emptyLabel,
  onReturnDeposit,
  returningId,
}: {
  title: string;
  bookings: Booking[];
  direction: "in" | "out";
  emptyLabel: string;
  onReturnDeposit: (id: number) => void;
  returningId?: number;
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="font-display text-xl text-[color:#F7F4EC]">{title}</h3>
        <span className="text-sm text-[color:#F7F4EC]/50">{bookings.length}</span>
      </div>
      {bookings.length === 0 ? (
        <p className="text-sm text-[color:#F7F4EC]/50">{emptyLabel}</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {bookings.map((booking) => (
            <GuestCard key={booking.id} booking={booking} direction={direction} onReturnDeposit={onReturnDeposit} returningId={returningId} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TodayOps({
  checkins,
  checkouts,
  newBookings,
  monthTotal,
  depositsPendingTotal,
  depositsPendingCount,
}: {
  checkins: Booking[];
  checkouts: Booking[];
  newBookings: Booking[];
  monthTotal: string | number;
  depositsPendingTotal: number;
  depositsPendingCount: number;
}) {
  const returnDeposit = useReturnDeposit();

  return (
    <div className="overflow-hidden rounded-2xl bg-[color:#221E18] text-[color:#F7F4EC] shadow-sm">
      <div className="grid gap-8 p-6 sm:p-8 xl:grid-cols-[0.62fr_1fr]">
        {/* Vitals */}
        <div className="flex flex-col justify-between gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[color:#F7F4EC]/45">Hoy</p>
            <p className="font-display mt-1 text-2xl">
              {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-[color:#F7F4EC]/12 pt-5 xl:grid-cols-1 xl:divide-y xl:divide-[color:#F7F4EC]/12">
            <div className="xl:pb-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[color:#F7F4EC]/45">Total del mes</p>
              <p className="font-display mt-1 text-3xl">{formatCurrency(monthTotal)}</p>
            </div>
            <div className="xl:py-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[color:#F7F4EC]/45">Reservas nuevas (7 días)</p>
              <p className="font-display mt-1 text-3xl">{newBookings.length}</p>
            </div>
            <div className="xl:pt-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[color:#F7F4EC]/45">Fianzas por devolver</p>
              <p className="font-display mt-1 text-3xl">
                {depositsPendingCount > 0 ? formatCurrency(depositsPendingTotal) : "—"}
              </p>
              {depositsPendingCount > 0 ? (
                <p className="text-xs text-[color:#F7F4EC]/50">{depositsPendingCount} pendiente{depositsPendingCount === 1 ? "" : "s"}</p>
              ) : null}
            </div>
          </div>

          {newBookings.length > 0 ? (
            <div className="hidden border-t border-[color:#F7F4EC]/12 pt-4 xl:block">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[color:#F7F4EC]/45">
                <Sparkles className="size-3" /> Últimas reservas
              </p>
              <div className="space-y-2">
                {newBookings.slice(0, 3).map((booking) => (
                  <Link
                    key={booking.id}
                    to={`/bookings/${booking.id}`}
                    className="block truncate text-sm text-[color:#F7F4EC]/80 transition-colors hover:text-[color:#F7F4EC]"
                  >
                    {booking.apartment_title} · {booking.client_name || "Huésped"}
                    <span className="text-[color:#F7F4EC]/40">
                      {" "}
                      · hace {formatDistanceToNowStrict(new Date(booking.created_at), { locale: es })}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Check-ins / check-outs */}
        <div className="space-y-6">
          <GuestRow
            title="Entran hoy"
            bookings={checkins}
            direction="in"
            emptyLabel="Sin llegadas hoy."
            onReturnDeposit={(id) => returnDeposit.mutate(id)}
            returningId={returnDeposit.isPending ? (returnDeposit.variables as number) : undefined}
          />
          <GuestRow
            title="Salen hoy"
            bookings={checkouts}
            direction="out"
            emptyLabel="Sin salidas hoy."
            onReturnDeposit={(id) => returnDeposit.mutate(id)}
            returningId={returnDeposit.isPending ? (returnDeposit.variables as number) : undefined}
          />
        </div>
      </div>
    </div>
  );
}
