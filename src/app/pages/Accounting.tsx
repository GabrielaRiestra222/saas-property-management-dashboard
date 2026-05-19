import { useMemo, useState } from "react";
import { eachMonthOfInterval, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import DataTable from "@/components/ui/DataTable";
import FormModal from "@/components/ui/FormModal";
import PageHeader from "@/components/ui/PageHeader";
import { formatCurrency } from "@/lib/formatters";
import { useCreateTransaction, useTransactions } from "@/lib/hooks/useAccounting";
import { useProperties } from "@/lib/hooks/useProperties";
import type { Transaction } from "@/types";

export default function AccountingPage() {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState({
    category: "ALL",
    property: "ALL",
    start: "",
    end: "",
  });
  const [newTransaction, setNewTransaction] = useState({
    category: "INCOME",
    subcategory: "",
    amount: "",
    date: "",
    property: "",
    booking: "",
    description: "",
  });

  const transactionsQuery = useTransactions({
    category: filters.category !== "ALL" ? filters.category : undefined,
    property: filters.property !== "ALL" ? filters.property : undefined,
    date_from: filters.start || undefined,
    date_to: filters.end || undefined,
  });
  const propertiesQuery = useProperties();
  const createTransaction = useCreateTransaction();
  const transactions = transactionsQuery.data?.results ?? [];

  const income = transactions.filter((item) => item.category === "INCOME").reduce((sum, item) => sum + Number(item.amount), 0);
  const expense = transactions.filter((item) => item.category === "EXPENSE").reduce((sum, item) => sum + Number(item.amount), 0);

  const summaryData = useMemo(() => {
    return eachMonthOfInterval({
      start: startOfMonth(subMonths(new Date(), 11)),
      end: endOfMonth(new Date()),
    }).map((monthDate) => {
      const monthKey = format(monthDate, "yyyy-MM");
      const monthItems = transactions.filter((item) => item.date.startsWith(monthKey));
      return {
        month: format(monthDate, "MMM"),
        income: monthItems.filter((item) => item.category === "INCOME").reduce((sum, item) => sum + Number(item.amount), 0),
        expense: monthItems.filter((item) => item.category === "EXPENSE").reduce((sum, item) => sum + Number(item.amount), 0),
      };
    });
  }, [transactions]);

  function exportCsv() {
    const header = ["fecha", "propiedad", "reserva", "categoria", "subcategoria", "importe", "descripcion"];
    const rows = transactions.map((item) => [
      item.date,
      item.property ?? "",
      item.booking ?? "",
      item.category,
      item.subcategory,
      item.amount,
      item.description,
    ]);
    const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "transactions.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Contabilidad" subtitle="Transacciones y resumen financiero del portafolio." action={<Button onClick={() => setOpen(true)}>Nueva transacción</Button>} />

      <Tabs defaultValue="transactions">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions">Transacciones</TabsTrigger>
          <TabsTrigger value="summary">Resumen</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <div className="grid gap-3 rounded-3xl border border-border bg-card p-4 shadow-sm md:grid-cols-4">
            <select className="h-10 rounded-md border border-input bg-input-background px-3" value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}>
              <option value="ALL">Todas</option>
              <option value="INCOME">INCOME</option>
              <option value="EXPENSE">EXPENSE</option>
            </select>
            <select className="h-10 rounded-md border border-input bg-input-background px-3" value={filters.property} onChange={(event) => setFilters((current) => ({ ...current, property: event.target.value }))}>
              <option value="ALL">Todas las propiedades</option>
              {(propertiesQuery.data?.results ?? []).map((item) => (
                <option key={item.id} value={String(item.id)}>{item.title}</option>
              ))}
            </select>
            <Input type="date" value={filters.start} onChange={(event) => setFilters((current) => ({ ...current, start: event.target.value }))} />
            <Input type="date" value={filters.end} onChange={(event) => setFilters((current) => ({ ...current, end: event.target.value }))} />
          </div>

          <DataTable<Transaction>
            loading={transactionsQuery.isLoading}
            rows={transactions}
            emptyMessage="No hay transacciones para estos filtros."
            columns={[
              { key: "date", header: "Fecha", render: (transaction) => transaction.date },
              { key: "property", header: "Propiedad", render: (transaction) => (transaction.property ? `#${transaction.property}` : "-") },
              { key: "booking", header: "Reserva", render: (transaction) => (transaction.booking ? `#${transaction.booking}` : "-") },
              { key: "category", header: "Categoría", render: (transaction) => transaction.category },
              { key: "subcategory", header: "Subcategoría", render: (transaction) => transaction.subcategory },
              { key: "amount", header: "Importe", render: (transaction) => formatCurrency(transaction.amount) },
              { key: "description", header: "Descripción", render: (transaction) => transaction.description },
            ]}
          />
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Total ingresos</p><p className="mt-3 text-3xl font-semibold text-emerald-600">{formatCurrency(income)}</p></div>
            <div className="rounded-3xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Total gastos</p><p className="mt-3 text-3xl font-semibold text-rose-600">{formatCurrency(expense)}</p></div>
            <div className="rounded-3xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Beneficio neto</p><p className="mt-3 text-3xl font-semibold text-sky-600">{formatCurrency(income - expense)}</p></div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Ingresos vs gastos</h3>
              <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
            </div>
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summaryData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="income" fill="#16a34a" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="expense" fill="#dc2626" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <FormModal title="Nueva transacción" isOpen={open} onClose={() => setOpen(false)}>
        <div className="grid gap-4">
          <select className="h-10 rounded-md border border-input bg-input-background px-3" value={newTransaction.category} onChange={(event) => setNewTransaction((current) => ({ ...current, category: event.target.value }))}>
            <option value="INCOME">INCOME</option>
            <option value="EXPENSE">EXPENSE</option>
          </select>
          <Input placeholder="Subcategoría" value={newTransaction.subcategory} onChange={(event) => setNewTransaction((current) => ({ ...current, subcategory: event.target.value }))} />
          <Input placeholder="Importe" value={newTransaction.amount} onChange={(event) => setNewTransaction((current) => ({ ...current, amount: event.target.value }))} />
          <Input type="date" value={newTransaction.date} onChange={(event) => setNewTransaction((current) => ({ ...current, date: event.target.value }))} />
          <select className="h-10 rounded-md border border-input bg-input-background px-3" value={newTransaction.property} onChange={(event) => setNewTransaction((current) => ({ ...current, property: event.target.value }))}>
            <option value="">Sin propiedad</option>
            {(propertiesQuery.data?.results ?? []).map((item) => (
              <option key={item.id} value={String(item.id)}>{item.title}</option>
            ))}
          </select>
          <Input placeholder="Reserva opcional" value={newTransaction.booking} onChange={(event) => setNewTransaction((current) => ({ ...current, booking: event.target.value }))} />
          <Input placeholder="Descripción" value={newTransaction.description} onChange={(event) => setNewTransaction((current) => ({ ...current, description: event.target.value }))} />
          <div className="flex justify-end">
            <Button
              onClick={async () => {
                await createTransaction.mutateAsync({
                  category: newTransaction.category as "INCOME" | "EXPENSE",
                  subcategory: newTransaction.subcategory,
                  amount: newTransaction.amount,
                  date: newTransaction.date,
                  property: newTransaction.property ? Number(newTransaction.property) : null,
                  booking: newTransaction.booking ? Number(newTransaction.booking) : null,
                  description: newTransaction.description,
                });
                setOpen(false);
              }}
            >
              Guardar
            </Button>
          </div>
        </div>
      </FormModal>
    </div>
  );
}
