import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { z } from "zod";
import {
  ArrowUpDown,
  Bath,
  Bed,
  Car,
  Coffee,
  DoorOpen,
  Landmark,
  PawPrint,
  Shirt,
  ShowerHead,
  Snowflake,
  Sparkles,
  Thermometer,
  Tv,
  Upload,
  Utensils,
  Wifi,
  WashingMachine,
  X,
  Loader2,
} from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/app/components/ui/form";
import { Input } from "@/app/components/ui/input";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Textarea } from "@/app/components/ui/textarea";
import PageHeader from "@/components/ui/PageHeader";
import { useAmenities } from "@/lib/hooks/useAmenities";
import {
  useCreateProperty,
  useProperty,
  useUpdateProperty,
} from "@/lib/hooks/useProperties";
import { useImageUpload } from "@/lib/hooks/useImageUpload";
import type { Amenity, PropertyPayload, PropertyImage } from "@/types";

const imageSchema = z.object({
  id: z.number(),
  image_url: z.string().min(1, "Añade una imagen válida"),
  caption: z.string(),
  order: z.number(),
  is_main: z.boolean(),
});

const schema = z.object({
  title: z.string().min(1, "El título es obligatorio"),
  description: z.string().min(1, "La descripción es obligatoria"),
  location: z.string().min(1, "La ubicación es obligatoria"),
  address: z.string().default(""),
  price_per_night: z.string().min(1, "El precio es obligatorio"),
  cleaning_fee: z.string().default("0"),
  max_guests: z.coerce.number().min(1, "Mínimo 1 huésped"),
  rooms: z.coerce.number().min(0),
  bathrooms: z.coerce.number().min(0),
  min_nights: z.coerce.number().min(1),
  check_in_time: z.string().default("15:00"),
  check_out_time: z.string().default("11:00"),
  rules: z.string().default(""),
  tourist_registration_number: z.string().default(""),
  size_m2: z.coerce.number().nullable().default(null),
  floor: z.string().default(""),
  construction_year: z.coerce.number().nullable().default(null),
  renovation_year: z.coerce.number().nullable().default(null),
  distribution: z.object({
    living_room: z.coerce.number().default(0),
    bedrooms: z.coerce.number().default(0),
    sofa_beds: z.coerce.number().default(0),
    kitchen: z.coerce.number().default(1),
    independent_wc: z.coerce.number().default(0),
    balconies: z.coerce.number().default(0),
  }),
  bed_main: z.string().default(""),
  bed_sofa: z.string().default(""),
  equipment_kitchen: z.string().default(""),
  equipment_bathroom: z.string().default(""),
  equipment_multimedia: z.string().default(""),
  equipment_other: z.string().default(""),
  equipment_outdoor: z.string().default(""),
  services_annex: z.string().default(""),
  warnings_text: z.string().default(""),
  is_active: z.boolean().default(true),
  is_published: z.boolean().default(false),
  images: z.array(imageSchema),
  amenities: z.array(z.number()),
});

type PropertyFormValues = z.infer<typeof schema>;

const amenityIcons: Record<string, typeof Wifi> = {
  wifi: Wifi,
  snowflake: Snowflake,
  thermometer: Thermometer,
  utensils: Utensils,
  microwave: Utensils,
  refrigerator: Snowflake,
  coffee: Coffee,
  sandwich: Utensils,
  tv: Tv,
  "washing-machine": WashingMachine,
  shirt: Shirt,
  bed: Bed,
  bath: Bath,
  "shower-head": ShowerHead,
  "door-open": DoorOpen,
  landmark: Landmark,
  "parking-circle": Car,
  "arrow-up-down": ArrowUpDown,
  sparkles: Sparkles,
  "paw-print": PawPrint,
};

function linesToArray(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function arrayToLines(value?: string[]) {
  return Array.isArray(value) ? value.join("\n") : "";
}

function mapAmenities(values: Amenity[]): number[] {
  return values.map((amenity) => amenity.id);
}

function mapImages(values: PropertyImage[]): PropertyFormValues["images"] {
  return values.map((image, index) => ({
    id: image.id,
    image_url: image.image_url || image.image || "",
    caption: image.caption,
    order: index,
    is_main: image.is_main,
  }));
}

export default function PropertyFormPage() {
  const params = useParams();
  const navigate = useNavigate();
  const propertyId = params.id ? Number(params.id) : undefined;
  const isEdit = Boolean(propertyId);

  const propertyQuery = useProperty(propertyId);
  const amenitiesQuery = useAmenities();
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const { uploadImage, uploading, progress } = useImageUpload();

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      address: "",
      price_per_night: "",
      cleaning_fee: "0",
      max_guests: 1,
      rooms: 1,
      bathrooms: 1,
      min_nights: 1,
      check_in_time: "15:00",
      check_out_time: "11:00",
      rules: "",
      tourist_registration_number: "",
      size_m2: null,
      floor: "",
      construction_year: null,
      renovation_year: null,
      distribution: {
        living_room: 0,
        bedrooms: 1,
        sofa_beds: 0,
        kitchen: 1,
        independent_wc: 0,
        balconies: 0,
      },
      bed_main: "",
      bed_sofa: "",
      equipment_kitchen: "",
      equipment_bathroom: "",
      equipment_multimedia: "",
      equipment_other: "",
      equipment_outdoor: "",
      services_annex: "",
      warnings_text: "",
      is_active: true,
      is_published: false,
      images: [],
      amenities: [],
    },
  });

  const fieldArray = useFieldArray({
    control: form.control,
    name: "images",
  });

  useEffect(() => {
    if (!propertyQuery.data) {
      return;
    }

    form.reset({
      title: propertyQuery.data.title,
      description: propertyQuery.data.description,
      location: propertyQuery.data.location,
      address: propertyQuery.data.address,
      price_per_night: propertyQuery.data.price_per_night,
      cleaning_fee: propertyQuery.data.cleaning_fee,
      max_guests: propertyQuery.data.max_guests,
      rooms: propertyQuery.data.rooms,
      bathrooms: propertyQuery.data.bathrooms,
      min_nights: propertyQuery.data.min_nights,
      check_in_time: propertyQuery.data.check_in_time,
      check_out_time: propertyQuery.data.check_out_time,
      rules: propertyQuery.data.rules,
      tourist_registration_number: propertyQuery.data.tourist_registration_number ?? "",
      size_m2: propertyQuery.data.size_m2,
      floor: propertyQuery.data.floor ?? "",
      construction_year: propertyQuery.data.construction_year,
      renovation_year: propertyQuery.data.renovation_year,
      distribution: {
        living_room: Number(propertyQuery.data.distribution?.living_room ?? 0),
        bedrooms: Number(propertyQuery.data.distribution?.bedrooms ?? propertyQuery.data.rooms),
        sofa_beds: Number(propertyQuery.data.distribution?.sofa_beds ?? 0),
        kitchen: Number(propertyQuery.data.distribution?.kitchen ?? 1),
        independent_wc: Number(propertyQuery.data.distribution?.independent_wc ?? 0),
        balconies: Number(propertyQuery.data.distribution?.balconies ?? 0),
      },
      bed_main: propertyQuery.data.beds?.[0] ? `${propertyQuery.data.beds[0].label}${propertyQuery.data.beds[0].size ? ` ${propertyQuery.data.beds[0].size}` : ""}` : "",
      bed_sofa: propertyQuery.data.beds?.[1] ? `${propertyQuery.data.beds[1].label}${propertyQuery.data.beds[1].size ? ` ${propertyQuery.data.beds[1].size}` : ""}` : "",
      equipment_kitchen: arrayToLines(propertyQuery.data.equipment?.kitchen),
      equipment_bathroom: arrayToLines(propertyQuery.data.equipment?.bathroom),
      equipment_multimedia: arrayToLines(propertyQuery.data.equipment?.multimedia),
      equipment_other: arrayToLines(propertyQuery.data.equipment?.other),
      equipment_outdoor: arrayToLines(propertyQuery.data.equipment?.outdoor),
      services_annex: arrayToLines(propertyQuery.data.equipment?.services),
      warnings_text: arrayToLines(propertyQuery.data.warnings),
      is_active: propertyQuery.data.is_active,
      is_published: propertyQuery.data.is_published,
      images: mapImages(propertyQuery.data.images),
      amenities: mapAmenities(propertyQuery.data.amenities),
    });
  }, [form, propertyQuery.data]);

  async function onSubmit(values: PropertyFormValues) {
    const payload: PropertyPayload = {
      ...values,
      size_m2: values.size_m2 || null,
      construction_year: values.construction_year || null,
      renovation_year: values.renovation_year || null,
      beds: [
        values.bed_main ? { label: values.bed_main } : null,
        values.bed_sofa ? { label: values.bed_sofa } : null,
      ].filter(Boolean) as Array<{ label: string }>,
      equipment: {
        kitchen: linesToArray(values.equipment_kitchen),
        bathroom: linesToArray(values.equipment_bathroom),
        multimedia: linesToArray(values.equipment_multimedia),
        other: linesToArray(values.equipment_other),
        outdoor: linesToArray(values.equipment_outdoor),
        services: linesToArray(values.services_annex),
      },
      warnings: linesToArray(values.warnings_text),
      images: values.images.map((image, index) => {
        const existingId = Number.isInteger(image.id) && image.id > 0 && image.id < 1000000000
          ? image.id
          : undefined;

        return {
          ...(existingId ? { id: existingId } : {}),
          image_url: image.image_url,
          caption: image.caption,
          order: index,
          is_main: image.is_main,
        };
      }),
      amenities: values.amenities,
    };

    if (isEdit && propertyId) {
      updateProperty.mutate(
        { id: propertyId, payload },
        { onSuccess: () => navigate("/cms/properties") },
      );
      return;
    }

    createProperty.mutate(payload, {
      onSuccess: () => navigate("/cms/properties"),
    });
  }

  const images = form.watch("images");
  const previewImage = images.find((image) => image.is_main)?.image_url ?? images[0]?.image_url ?? "";

  async function addImageFiles(fileList: File[]) {
    const imageFiles = fileList.filter((file) => file.type.startsWith("image/"));

    if (!imageFiles.length) {
      return;
    }

    for (const file of imageFiles) {
      const result = await uploadImage(file, propertyId);
      if (result) {
        const currentImages = form.getValues("images");
        fieldArray.append({
          id: Date.now() + Math.random(),
          image_url: result.url,
          caption: "",
          order: currentImages.length,
          is_main: currentImages.length === 0,
        });
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? "Editar propiedad" : "Nueva propiedad"}
        subtitle="Completa la información principal, imágenes, detalles y revisión final."
        action={
          <Button asChild variant="outline">
            <Link to="/cms/properties">Volver</Link>
          </Button>
        }
      />

      {propertyQuery.isLoading && isEdit ? <Skeleton className="h-[520px] rounded-3xl" /> : null}

      {!propertyQuery.isLoading ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
                <TabsTrigger value="basic">Información básica</TabsTrigger>
                <TabsTrigger value="images">Imágenes</TabsTrigger>
                <TabsTrigger value="amenities">Facilidades</TabsTrigger>
                <TabsTrigger value="details">Detalles</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="mt-6 grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea className="min-h-32" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ubicación</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price_per_night"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio por noche</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cleaning_fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limpieza</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="max_guests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Máx. huéspedes</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Habitaciones</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bathrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Baños</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="min_nights"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estancia mínima</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="images" className="mt-6 space-y-4">
                {/* Drag & Drop Zone */}
                <div
                  className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                    uploading ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault();
                    await addImageFiles(Array.from(e.dataTransfer.files));
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      await addImageFiles(Array.from(e.target.files || []));
                      e.target.value = '';
                    }}
                    className="hidden"
                    id="image-upload-input"
                    disabled={uploading}
                  />

                  {uploading ? (
                    <div className="space-y-3">
                      <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Subiendo imagen... {progress}%</p>
                      <div className="mx-auto h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                      <p className="mb-2 text-sm font-medium">
                        Arrastra imágenes aquí o haz click para seleccionar
                      </p>
                      <p className="mb-4 text-xs text-muted-foreground">
                        JPG, PNG, WebP - Máx. 10MB por imagen
                        {propertyId && ` · Se guardarán en: property_${propertyId}/`}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('image-upload-input')?.click()}
                      >
                        Seleccionar archivos
                      </Button>
                    </>
                  )}
                </div>

                {/* Lista de imágenes */}
                <div className="space-y-3">
                  {fieldArray.fields.map((field, index) => (
                    <div key={field.id} className="grid gap-3 rounded-2xl border border-border p-4 md:grid-cols-[120px_1fr_180px_auto]">
                      <div className="flex h-20 items-center justify-center overflow-hidden rounded-xl bg-muted">
                        {images[index]?.image_url ? (
                          <img src={images[index]?.image_url} alt={images[index]?.caption} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs text-muted-foreground">Preview</span>
                        )}
                      </div>
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground break-all">{images[index]?.image_url}</p>
                        <Input
                          placeholder="Caption"
                          value={images[index]?.caption ?? ""}
                          onChange={(event) => form.setValue(`images.${index}.caption`, event.target.value)}
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={Boolean(images[index]?.is_main)}
                            onCheckedChange={(checked) => {
                              images.forEach((_, imageIndex) => {
                                form.setValue(`images.${imageIndex}.is_main`, imageIndex === index && Boolean(checked));
                              });
                            }}
                          />
                          Imagen principal
                        </label>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => index > 0 && fieldArray.move(index, index - 1)}>
                            ↑
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => index < fieldArray.fields.length - 1 && fieldArray.move(index, index + 1)}>
                            ↓
                          </Button>
                        </div>
                      </div>
                      <Button type="button" variant="outline" onClick={() => fieldArray.remove(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="amenities" className="mt-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField control={form.control} name="tourist_registration_number" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Nº registro turístico</FormLabel>
                      <FormControl><Input placeholder="37/000145" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="size_m2" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Superficie m2</FormLabel>
                      <FormControl><Input type="number" min="0" {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="floor" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Planta</FormLabel>
                      <FormControl><Input placeholder="3 sobre 4" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="construction_year" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Año construcción</FormLabel>
                      <FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="renovation_year" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Año reforma</FormLabel>
                      <FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div>
                  <h3 className="mb-3 font-semibold">Distribución</h3>
                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      ["distribution.living_room", "Salones"],
                      ["distribution.bedrooms", "Dormitorios"],
                      ["distribution.sofa_beds", "Sofás cama"],
                      ["distribution.kitchen", "Cocinas"],
                      ["distribution.independent_wc", "WC independientes"],
                      ["distribution.balconies", "Balcones"],
                    ].map(([name, label]) => (
                      <FormField key={name} control={form.control} name={name as keyof PropertyFormValues} render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <FormControl><Input type="number" min="0" {...field} value={String(field.value ?? "")} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField control={form.control} name="bed_main" render={({ field }) => (
                    <FormItem><FormLabel>Cama principal</FormLabel><FormControl><Input placeholder="Cama matrimonio 135 x 190" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="bed_sofa" render={({ field }) => (
                    <FormItem><FormLabel>Sofá cama</FormLabel><FormControl><Input placeholder="Sofá cama" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                <div>
                  <h3 className="mb-3 font-semibold">Facilidades con iconos</h3>
                  {amenitiesQuery.isLoading ? <Skeleton className="h-28 rounded-2xl" /> : null}
                  {amenitiesQuery.isSuccess && Array.isArray(amenitiesQuery.data) ? (
                    <div className="space-y-5">
                      {Object.entries(
                        amenitiesQuery.data.reduce<Record<string, Amenity[]>>((groups, amenity) => {
                          const category = amenity.category ?? "OTHER";
                          groups[category] = groups[category] ? [...groups[category], amenity] : [amenity];
                          return groups;
                        }, {}),
                      ).map(([category, amenities]) => (
                        <div key={category}>
                          <p className="mb-2 text-sm font-medium text-muted-foreground">{category}</p>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {amenities.map((amenity) => {
                              const checked = form.watch("amenities").includes(amenity.id);
                              const Icon = amenityIcons[amenity.icon] ?? Sparkles;

                              return (
                                <label key={amenity.id} className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm transition-colors ${checked ? "border-[#FC9F5B] bg-[#FBD1A2]" : "border-border hover:bg-[#ECE4B7]"}`}>
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(nextValue) => {
                                      const current = form.getValues("amenities");
                                      form.setValue(
                                        "amenities",
                                        nextValue
                                          ? [...current, amenity.id]
                                          : current.filter((value) => value !== amenity.id),
                                      );
                                    }}
                                  />
                                  <Icon className="size-4 shrink-0" />
                                  {amenity.name}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </TabsContent>

              <TabsContent value="details" className="mt-6 grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="check_in_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check-in</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="check_out_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check-out</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rules"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Normas</FormLabel>
                      <FormControl>
                        <Textarea className="min-h-28" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField control={form.control} name="equipment_kitchen" render={({ field }) => (
                  <FormItem><FormLabel>Cocina</FormLabel><FormControl><Textarea className="min-h-28" placeholder={"Placas eléctricas\nMicroondas\nNevera"} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="equipment_bathroom" render={({ field }) => (
                  <FormItem><FormLabel>Cuarto de baño</FormLabel><FormControl><Textarea className="min-h-28" placeholder={"WC independiente\nBañera\nDucha"} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="equipment_multimedia" render={({ field }) => (
                  <FormItem><FormLabel>Multimedia</FormLabel><FormControl><Textarea className="min-h-28" placeholder={"Televisión\nWireless Internet"} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="equipment_other" render={({ field }) => (
                  <FormItem><FormLabel>Otros interior</FormLabel><FormControl><Textarea className="min-h-28" placeholder={"Lavadora\nPlancha\nAire acondicionado con bomba de calor"} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="equipment_outdoor" render={({ field }) => (
                  <FormItem><FormLabel>Exterior / edificio</FormLabel><FormControl><Textarea className="min-h-28" placeholder={"Parking privado previa solicitud\nAscensor"} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="services_annex" render={({ field }) => (
                  <FormItem><FormLabel>Servicios anexos</FormLabel><FormControl><Textarea className="min-h-28" placeholder={"Toallas incluidas\nSábanas incluidas\nPosibilidad de limpieza"} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="warnings_text" render={({ field }) => (
                  <FormItem className="md:col-span-2"><FormLabel>Advertencias</FormLabel><FormControl><Textarea className="min-h-24" placeholder={"Animales autorizados previa aceptación propietario"} {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <label className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
                  <Checkbox
                    checked={form.watch("is_active")}
                    onCheckedChange={(checked) => form.setValue("is_active", Boolean(checked))}
                  />
                  Activa
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
                  <Checkbox
                    checked={form.watch("is_published")}
                    onCheckedChange={(checked) => form.setValue("is_published", Boolean(checked))}
                  />
                  Publicada
                </label>
              </TabsContent>

              <TabsContent value="preview" className="mt-6">
                <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
                  <div className="overflow-hidden rounded-3xl border border-border bg-muted">
                    {previewImage ? (
                      <img src={previewImage} alt={form.watch("title")} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">Añade una imagen principal</div>
                    )}
                  </div>
                  <div className="rounded-3xl border border-border bg-card p-6">
                    <p className="text-sm text-muted-foreground">{form.watch("location") || "Ubicación"}</p>
                    <h2 className="mt-2 text-3xl font-semibold">{form.watch("title") || "Título de la propiedad"}</h2>
                    <p className="mt-3 text-muted-foreground">{form.watch("description") || "La descripción se mostrará aquí."}</p>
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-muted p-3 text-sm">{form.watch("rooms")} habitaciones</div>
                      <div className="rounded-2xl bg-muted p-3 text-sm">{form.watch("bathrooms")} baños</div>
                      <div className="rounded-2xl bg-muted p-3 text-sm">{form.watch("max_guests")} huéspedes</div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3">
              <Button asChild type="button" variant="outline">
                <Link to="/cms/properties">Cancelar</Link>
              </Button>
              <Button disabled={createProperty.isPending || updateProperty.isPending || form.formState.isSubmitting}>
                {createProperty.isPending || updateProperty.isPending ? "Guardando..." : "Guardar propiedad"}
              </Button>
            </div>
          </form>
        </Form>
      ) : null}
    </div>
  );
}
