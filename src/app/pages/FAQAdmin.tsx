import { useMemo, useState } from "react";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import PageHeader from "@/components/ui/PageHeader";
import { useCreateFAQ, useCreateFAQCategory, useDeleteFAQ, useFAQCategories, useFAQs, useUpdateFAQ } from "@/lib/hooks/useFAQ";

export default function FAQAdminPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [newFaq, setNewFaq] = useState({
    question: "",
    answer: "",
    is_published: true,
    order: 0,
  });

  const categoriesQuery = useFAQCategories();
  const faqsQuery = useFAQs();
  const createFAQ = useCreateFAQ();
  const updateFAQ = useUpdateFAQ();
  const deleteFAQ = useDeleteFAQ();
  const createCategory = useCreateFAQCategory();

  const categories = categoriesQuery.data?.results ?? categoriesQuery.data ?? [];
  const faqs = faqsQuery.data?.results ?? [];
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) ?? categories[0] ?? null;
  const selectedFaqs = useMemo(
    () => faqs.filter((faq) => faq.category === selectedCategory?.id).sort((a, b) => a.order - b.order),
    [faqs, selectedCategory?.id],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="FAQs admin" subtitle="Gestiona categorías y preguntas frecuentes publicadas en el portal." />

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Categorías</h3>
            <Button
              size="sm"
              onClick={async () => {
                await createCategory.mutateAsync({
                  name: newCategory,
                  order: categories.length + 1,
                });
                setNewCategory("");
              }}
            >
              Añadir
            </Button>
          </div>
          <div className="mb-4 flex gap-2">
            <Input placeholder="Nueva categoría" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} />
          </div>
          <div className="space-y-2">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`w-full rounded-md border px-4 py-3 text-left ${selectedCategory?.id === category.id ? "border-primary bg-primary/5" : "border-border"}`}
                onClick={() => setSelectedCategoryId(category.id)}
              >
                <p className="text-xs text-muted-foreground">Orden {category.order}</p>
                <p className="font-medium">{category.name}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{selectedCategory?.name ?? "Selecciona una categoría"}</h3>
              <p className="text-sm text-muted-foreground">Edita, publica y reordena preguntas frecuentes.</p>
            </div>
            {selectedCategory ? (
              <Button
                size="sm"
                onClick={async () => {
                  await createFAQ.mutateAsync({
                    category: selectedCategory.id,
                    question: newFaq.question,
                    answer: newFaq.answer,
                    is_published: newFaq.is_published,
                    order: selectedFaqs.length + 1,
                  });
                  setNewFaq({ question: "", answer: "", is_published: true, order: 0 });
                }}
              >
                Añadir FAQ
              </Button>
            ) : null}
          </div>

          {selectedCategory ? (
            <div className="mb-5 space-y-3 rounded-md border border-dashed border-border p-4">
              <Input placeholder="Pregunta" value={newFaq.question} onChange={(event) => setNewFaq((current) => ({ ...current, question: event.target.value }))} />
              <Textarea placeholder="Respuesta" value={newFaq.answer} onChange={(event) => setNewFaq((current) => ({ ...current, answer: event.target.value }))} />
            </div>
          ) : null}

          <div className="space-y-3">
            {selectedFaqs.map((faq, index) => (
              <div key={faq.id} className="rounded-md border border-border p-4">
                <Input value={faq.question} onChange={(event) => updateFAQ.mutate({ id: faq.id, payload: { question: event.target.value } })} />
                <Textarea className="mt-3" value={faq.answer} onChange={(event) => updateFAQ.mutate({ id: faq.id, payload: { answer: event.target.value } })} />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateFAQ.mutate({ id: faq.id, payload: { is_published: !faq.is_published } })}>
                    {faq.is_published ? "Ocultar" : "Publicar"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateFAQ.mutate({ id: faq.id, payload: { order: Math.max(1, faq.order - 1) } })} disabled={index === 0}>
                    Subir
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateFAQ.mutate({ id: faq.id, payload: { order: faq.order + 1 } })} disabled={index === selectedFaqs.length - 1}>
                    Bajar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => deleteFAQ.mutate(faq.id)}>Eliminar</Button>
                </div>
              </div>
            ))}
            {!selectedFaqs.length ? <p className="text-sm text-muted-foreground">No hay preguntas en esta categoría.</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
