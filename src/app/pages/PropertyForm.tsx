import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useEffect, useState } from "react";
import type { FieldErrors } from "react-hook-form";
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
  Save,
} from "lucide-react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
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
import type { Amenity, Property, PropertyPayload, PropertyImage } from "@/types";
import api, { resolveMediaUrl } from "@/lib/api";

const imageSchema = z.object({
  id: z.number(),
  image_url: z.string().min(1, "Añade una imagen válida"),
  caption: z.string(),
  order: z.number(),
  is_main: z.boolean(),
});

const resourceSchema = z.object({
  id: z.number(),
  name: z.string(),
  url: z.string().min(1, "Añade un recurso válido"),
  type: z.string().default("VIDEO"),
});

const schema = z.object({
  title: z.string().default(""),
  listing_type: z.enum(["APARTMENT", "ROOM_FLAT"]).default("APARTMENT"),
  description: z.string().min(1, "La descripción es obligatoria"),
  location: z.string().min(1, "La ubicación es obligatoria"),
  address: z.string().default(""),
  unit_number: z.string().default(""),
  city: z.string().default(""),
  postal_code: z.string().default(""),
  province: z.string().default(""),
  country: z.string().default("España"),
  price_per_night: z.string().min(1, "El precio es obligatorio"),
  price_15_days: z.string().default(""),
  price_1_month: z.string().default(""),
  price_2_months: z.string().default(""),
  price_3_5_months: z.string().default(""),
  price_6_months: z.string().default(""),
  long_stay_discount_enabled: z.boolean().default(false),
  long_stay_discount_percent: z.string().default(""),
  last_minute_discount_enabled: z.boolean().default(false),
  last_minute_discount_percent: z.string().default(""),
  cleaning_fee: z.string().default("0"),
  max_guests: z.coerce.number().min(1, "Mínimo 1 huésped"),
  rooms: z.coerce.number().min(0),
  bathrooms: z.coerce.number().min(0),
  min_nights: z.coerce.number().min(1),
  check_in_time: z.string().default("15:00"),
  check_out_time: z.string().default("11:00"),
  rules: z.string().default(""),
  tourist_registration_number: z.string().default(""),
  cup_number: z.string().default(""),
  property_registry_number: z.string().default(""),
  cadastral_reference: z.string().default(""),
  owner_name: z.string().default(""),
  rental_type: z.string().default("TEMPORADA"),
  orientation: z.string().default("EXTERIOR"),
  viewpoint: z.string().default(""),
  windows: z.string().default(""),
  housing_type: z.string().default("PISO"),
  public_url: z.string().default(""),
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
  video_url: z.string().default(""),
  virtual_tour_url: z.string().default(""),
  virtual_tour_2_url: z.string().default(""),
  other_resources: z.string().default(""),
  chat_url: z.string().default(""),
  resources: z.array(resourceSchema),
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

function firstLine(value?: string[]) {
  return Array.isArray(value) ? value[0] ?? "" : "";
}

function compactImagePath(value?: string) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    return decodeURIComponent(url.pathname.split("/").filter(Boolean).slice(-2).join("/"));
  } catch {
    return value.split("/").filter(Boolean).slice(-2).join("/");
  }
}

function mapAmenities(values: number[]): number[] {
  return values;
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

function persistedUploadUrl(result: { url: string; path: string }) {
  // The upload endpoint already returns the correct absolute URL for
  // whatever storage backend is configured (Cloudflare R2 in production,
  // local disk in dev) — just use it. This used to rewrite property
  // uploads to a hardcoded `/media/properties/...` path, which only ever
  // worked with local FileSystemStorage and broke every image once R2
  // was wired up (Vercel's filesystem doesn't persist that path at all).
  return result.url;
}

function getSaveErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return "No se pudo guardar el apartamento.";
  }

  const detail = error.response?.data;
  if (!detail) {
    return "No se pudo guardar el apartamento. Revisa la conexión con la API.";
  }

  if (typeof detail === "string") {
    return detail;
  }

  if (detail.detail) {
    return String(detail.detail);
  }

  return Object.entries(detail)
    .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(", ") : String(messages)}`)
    .join(" · ");
}

function mapPropertyToFormValues(property: Property): PropertyFormValues {
  const pricingModel = firstLine(property.equipment?.pricing_model);
  const rentalType = firstLine(property.equipment?.rental_type);
  const listingType = firstLine(property.equipment?.listing_type) || (
    pricingModel === "room_monthly" || rentalType === "PISOS_ALQUILADOS_POR_HABITACIONES" ? "ROOM_FLAT" : "APARTMENT"
  );

  return {
    title: property.title,
    listing_type: listingType === "ROOM_FLAT" ? "ROOM_FLAT" : "APARTMENT",
    description: property.description,
    location: property.location,
    address: property.address,
    unit_number: property.unit_number ?? firstLine(property.equipment?.apartment_number),
    city: property.city ?? "",
    postal_code: property.postal_code ?? "",
    province: property.province ?? "",
    country: property.country ?? "España",
    price_per_night: property.price_per_night,
    price_15_days: property.price_15_days ?? firstLine(property.equipment?.price_15_days),
    price_1_month: property.price_1_month ?? firstLine(property.equipment?.price_1_month),
    price_2_months: property.price_2_months ?? firstLine(property.equipment?.price_2_months),
    price_3_5_months: property.price_3_5_months ?? firstLine(property.equipment?.price_3_5_months),
    price_6_months: property.price_6_months ?? firstLine(property.equipment?.price_6_months),
    long_stay_discount_enabled: Boolean(property.long_stay_discount_enabled),
    long_stay_discount_percent: property.long_stay_discount_percent ?? firstLine(property.equipment?.long_stay_discount_percent),
    last_minute_discount_enabled: Boolean(property.last_minute_discount_enabled),
    last_minute_discount_percent: property.last_minute_discount_percent ?? firstLine(property.equipment?.last_minute_discount_percent),
    cleaning_fee: property.cleaning_fee,
    max_guests: property.max_guests,
    rooms: property.rooms,
    bathrooms: property.bathrooms,
    min_nights: property.min_nights,
    check_in_time: property.check_in_time,
    check_out_time: property.check_out_time,
    rules: property.rules ?? "",
    tourist_registration_number: property.tourist_registration_number ?? "",
    cup_number: property.cup_number ?? firstLine(property.equipment?.cup_number),
    property_registry_number: property.property_registry_number ?? firstLine(property.equipment?.property_registry_number),
    cadastral_reference: property.cadastral_reference ?? firstLine(property.equipment?.cadastral_reference),
    owner_name: property.owner_name ?? firstLine(property.equipment?.owner_name),
    rental_type: (property.rental_type ?? firstLine(property.equipment?.rental_type)) || "TEMPORADA",
    orientation: (property.orientation ?? firstLine(property.equipment?.orientation)) || "EXTERIOR",
    viewpoint: property.viewpoint ?? firstLine(property.equipment?.viewpoint),
    windows: property.windows ?? firstLine(property.equipment?.windows),
    housing_type: (property.housing_type ?? firstLine(property.equipment?.housing_type)) || "PISO",
    public_url: property.public_url ?? firstLine(property.equipment?.public_url),
    size_m2: property.size_m2,
    floor: property.floor ?? "",
    construction_year: property.construction_year,
    renovation_year: property.renovation_year,
    distribution: {
      living_room: Number(property.distribution?.living_room ?? 0),
      bedrooms: Number(property.distribution?.bedrooms ?? property.rooms),
      sofa_beds: Number(property.distribution?.sofa_beds ?? 0),
      kitchen: Number(property.distribution?.kitchen ?? 1),
      independent_wc: Number(property.distribution?.independent_wc ?? 0),
      balconies: Number(property.distribution?.balconies ?? 0),
    },
    bed_main: property.beds?.[0] ? `${property.beds[0].label}${property.beds[0].size ? ` ${property.beds[0].size}` : ""}` : "",
    bed_sofa: property.beds?.[1] ? `${property.beds[1].label}${property.beds[1].size ? ` ${property.beds[1].size}` : ""}` : "",
    equipment_kitchen: arrayToLines(property.equipment?.kitchen),
    equipment_bathroom: arrayToLines(property.equipment?.bathroom),
    equipment_multimedia: arrayToLines(property.equipment?.multimedia),
    equipment_other: arrayToLines(property.equipment?.other),
    equipment_outdoor: arrayToLines(property.equipment?.outdoor),
    services_annex: arrayToLines(property.equipment?.services),
    video_url: property.video_url ?? firstLine(property.equipment?.video),
    virtual_tour_url: property.virtual_tour_url ?? firstLine(property.equipment?.virtual_tour),
    virtual_tour_2_url: property.virtual_tour_2_url ?? firstLine(property.equipment?.virtual_tour_2),
    other_resources: property.other_resources ?? arrayToLines(property.equipment?.other_resources),
    chat_url: property.chat_url ?? firstLine(property.equipment?.chat),
    resources: property.resources ?? property.equipment?.resource_files?.map((url, index) => ({
      id: Date.now() + index,
      name: url.split("/").pop() ?? `Recurso ${index + 1}`,
      url,
      type: "VIDEO",
    })) ?? [],
    warnings_text: arrayToLines(property.warnings),
    is_active: property.is_active,
    is_published: property.is_published,
    images: mapImages(property.images),
    amenities: mapAmenities(property.amenities),
  };
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
  const { uploadImage, uploadFile, uploading, progress } = useImageUpload();
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState("");
  const [titleSaving, setTitleSaving] = useState(false);

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      title: "",
      listing_type: "APARTMENT",
      description: "",
      location: "",
      address: "",
      unit_number: "",
      city: "",
      postal_code: "",
      province: "",
      country: "España",
      price_per_night: "",
      price_15_days: "",
      price_1_month: "",
      price_2_months: "",
      price_3_5_months: "",
      price_6_months: "",
      long_stay_discount_enabled: false,
      long_stay_discount_percent: "",
      last_minute_discount_enabled: false,
      last_minute_discount_percent: "",
      cleaning_fee: "0",
      max_guests: 1,
      rooms: 1,
      bathrooms: 1,
      min_nights: 1,
      check_in_time: "15:00",
      check_out_time: "11:00",
      rules: "",
      tourist_registration_number: "",
      cup_number: "",
      property_registry_number: "",
      cadastral_reference: "",
      owner_name: "",
      rental_type: "TEMPORADA",
      orientation: "EXTERIOR",
      viewpoint: "",
      windows: "",
      housing_type: "PISO",
      public_url: "",
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
      video_url: "",
      virtual_tour_url: "",
      virtual_tour_2_url: "",
      other_resources: "",
      chat_url: "",
      resources: [],
      warnings_text: "",
      is_active: true,
      is_published: false,
      images: [],
      amenities: [],
    },
  });

  const imageFieldArray = useFieldArray({
    control: form.control,
    name: "images",
  });

  const resourceFieldArray = useFieldArray({
    control: form.control,
    name: "resources",
  });

  useEffect(() => {
    if (!propertyQuery.data) {
      return;
    }

    form.reset(mapPropertyToFormValues(propertyQuery.data));
  }, [form, propertyQuery.data]);

  useEffect(() => {
    const subscription = form.watch(() => {
      setSaveError("");
    });

    return () => subscription.unsubscribe();
  }, [form]);

  async function onSubmit(values: PropertyFormValues) {
    const {
      bed_main,
      bed_sofa,
      equipment_kitchen,
      equipment_bathroom,
      equipment_multimedia,
      equipment_other,
      equipment_outdoor,
      services_annex,
      warnings_text,
      resources,
      listing_type,
      housing_type,
      rental_type,
      ...propertyValues
    } = values;
    const normalizedUnitNumber = values.unit_number.trim();
    const isRoomFlat = listing_type === "ROOM_FLAT";

    const payload: PropertyPayload = {
      ...propertyValues,
      title: values.title.trim(),
      unit_number: normalizedUnitNumber,
      resources,
      size_m2: values.size_m2 || null,
      construction_year: values.construction_year || null,
      renovation_year: values.renovation_year || null,
      beds: [
        bed_main ? { label: bed_main } : null,
        bed_sofa ? { label: bed_sofa } : null,
      ].filter(Boolean) as Array<{ label: string }>,
      equipment: {
        kitchen: linesToArray(equipment_kitchen),
        bathroom: linesToArray(equipment_bathroom),
        multimedia: linesToArray(equipment_multimedia),
        other: linesToArray(equipment_other),
        outdoor: linesToArray(equipment_outdoor),
        services: linesToArray(services_annex),
        listing_type: [listing_type],
        apartment_number: normalizedUnitNumber ? [normalizedUnitNumber] : [],
        flat_number: isRoomFlat && normalizedUnitNumber ? [normalizedUnitNumber.replace(/^Piso\s+/i, "")] : [],
        pricing_model: [isRoomFlat ? "room_monthly" : "seasonal_stay_tiers"],
        pricing_unit: isRoomFlat ? ["EUR/habitacion/mes"] : [],
        price_15_days: values.price_15_days ? [values.price_15_days] : [],
        price_1_month: values.price_1_month ? [values.price_1_month] : [],
        price_2_months: values.price_2_months ? [values.price_2_months] : [],
        price_3_5_months: values.price_3_5_months ? [values.price_3_5_months] : [],
        price_6_months: values.price_6_months ? [values.price_6_months] : [],
        long_stay_discount_percent: values.long_stay_discount_percent ? [values.long_stay_discount_percent] : [],
        last_minute_discount_percent: values.last_minute_discount_percent ? [values.last_minute_discount_percent] : [],
        cup_number: values.cup_number ? [values.cup_number] : [],
        property_registry_number: values.property_registry_number ? [values.property_registry_number] : [],
        cadastral_reference: values.cadastral_reference ? [values.cadastral_reference] : [],
        owner_name: values.owner_name ? [values.owner_name] : [],
        rental_type: [isRoomFlat ? "PISOS_ALQUILADOS_POR_HABITACIONES" : values.rental_type],
        orientation: values.orientation ? [values.orientation] : [],
        viewpoint: values.viewpoint ? [values.viewpoint] : [],
        windows: values.windows ? [values.windows] : [],
        housing_type: [isRoomFlat ? "PISO_COMPARTIDO" : values.housing_type],
        public_url: values.public_url ? [values.public_url] : [],
        video: values.video_url ? [values.video_url] : [],
        virtual_tour: values.virtual_tour_url ? [values.virtual_tour_url] : [],
        virtual_tour_2: values.virtual_tour_2_url ? [values.virtual_tour_2_url] : [],
        other_resources: linesToArray(values.other_resources),
        chat: values.chat_url ? [values.chat_url] : [],
        resource_files: resources.map((resource) => resource.url),
      },
      warnings: linesToArray(warnings_text),
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

    setSaveError("");

    if (!values.title.trim()) {
      const message = "No se ha guardado: el título es obligatorio.";
      form.setError("title", { type: "manual", message: "El título es obligatorio" });
      setSaveError(message);
      toast.error(message);
      return;
    }

    try {
      const savedProperty = isEdit && propertyId
        ? await updateProperty.mutateAsync({ id: propertyId, payload })
        : await createProperty.mutateAsync(payload);

      form.reset(mapPropertyToFormValues(savedProperty));
      setSavedAt(new Date());

      if (!isEdit) {
        navigate(`/cms/properties/${savedProperty.id}/edit`, { replace: true });
      }
    } catch (error) {
      const message = getSaveErrorMessage(error);
      setSaveError(message);
      toast.error(message);
    }
  }

  async function saveTitleOnly() {
    const nextTitle = form.getValues("title").trim();

    if (!propertyId) {
      await form.trigger("title");
      return;
    }

    if (!nextTitle) {
      const message = "El título es obligatorio.";
      form.setError("title", { type: "manual", message });
      setSaveError(message);
      toast.error(message);
      return;
    }

    setTitleSaving(true);
    setSaveError("");

    try {
      const savedProperty = await updateProperty.mutateAsync({
        id: propertyId,
        payload: { title: nextTitle },
      });
      form.reset(mapPropertyToFormValues(savedProperty));
      setSavedAt(new Date());
      toast.success("Nombre del apartamento guardado");
    } catch (error) {
      const message = getSaveErrorMessage(error);
      setSaveError(message);
      toast.error(message);
    } finally {
      setTitleSaving(false);
    }
  }

  function onInvalidSubmit(errors: FieldErrors<PropertyFormValues>) {
    const labels: Partial<Record<keyof PropertyFormValues, string>> = {
      title: "título",
      description: "descripción",
      location: "ubicación",
      price_per_night: "precio base",
      max_guests: "huéspedes",
      rooms: "habitaciones",
      bathrooms: "baños",
      min_nights: "estancia mínima",
      images: "fotos",
      resources: "recursos",
    };
    const fields = Object.keys(errors)
      .map((key) => labels[key as keyof PropertyFormValues] ?? key)
      .slice(0, 4);
    const message = fields.length
      ? `No se ha guardado. Revisa: ${fields.join(", ")}.`
      : "No se ha guardado: revisa los campos marcados en rojo.";
    setSaveError(message);
    toast.error(message);
  }

  const images = form.watch("images");
  const resources = form.watch("resources");
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
        const imageUrl = persistedUploadUrl(result);
        let imageId = Date.now() + Math.random();

        if (propertyId) {
          const { data } = await api.post<PropertyImage>("/property-images/", {
            property: propertyId,
            image_url: imageUrl,
            caption: "",
            order: currentImages.length,
            is_main: currentImages.length === 0,
          });
          imageId = data.id;
        }

        imageFieldArray.append({
          id: imageId,
          image_url: resolveMediaUrl(imageUrl),
          caption: "",
          order: currentImages.length,
          is_main: currentImages.length === 0,
        });
      }
    }
  }

  async function addResourceFiles(fileList: File[]) {
    const resourceFiles = fileList.filter((file) => file.type.startsWith("video/") || file.type === "application/pdf");

    if (!resourceFiles.length) {
      return;
    }

    for (const file of resourceFiles) {
      const result = await uploadFile(file, { propertyId, kind: "resource" });
      if (result) {
        resourceFieldArray.append({
          id: Date.now() + Math.random(),
          name: result.filename || file.name,
          url: result.url,
          type: file.type.startsWith("video/") ? "VIDEO" : "OTROS",
        });
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? "Editar apartamento" : "Nuevo apartamento"}
        subtitle="Edita la ficha que alimenta el CRM, el calendario y la web pública."
        action={
          <Button asChild variant="outline">
            <Link to="/cms/properties">Volver</Link>
          </Button>
        }
      />

      {propertyQuery.isLoading && isEdit ? <Skeleton className="h-[520px] rounded-xl" /> : null}

      {!propertyQuery.isLoading ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-6">
            {saveError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {saveError}
              </div>
            ) : null}
            <Tabs defaultValue="basic" className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-6">
                <TabsTrigger value="basic">Info</TabsTrigger>
                <TabsTrigger value="images">Fotos</TabsTrigger>
                <TabsTrigger value="resources">Recursos</TabsTrigger>
                <TabsTrigger value="amenities">Ficha</TabsTrigger>
                <TabsTrigger value="details">Normas</TabsTrigger>
                <TabsTrigger value="preview">Vista web</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2 grid gap-3 rounded-xl border border-border bg-muted/25 p-3 md:grid-cols-[1fr_220px]">
                  <FormField
                    control={form.control}
                    name="listing_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de ficha</FormLabel>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                            <Checkbox
                              checked={field.value === "APARTMENT"}
                              onCheckedChange={(checked) => checked && field.onChange("APARTMENT")}
                            />
                            Apartamento
                          </label>
                          <label className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                            <Checkbox
                              checked={field.value === "ROOM_FLAT"}
                              onCheckedChange={(checked) => checked && field.onChange("ROOM_FLAT")}
                            />
                            Piso por habitaciones
                          </label>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="unit_number" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl><Input placeholder="1, 10, Piso 18..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Título</FormLabel>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            onChange={(event) => {
                              field.onChange(event);
                              form.clearErrors("title");
                              setSaveError("");
                            }}
                            placeholder="Apartamento nº 1"
                          />
                        </FormControl>
                        {isEdit ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="sm:w-44"
                            disabled={titleSaving || updateProperty.isPending}
                            onClick={() => void saveTitleOnly()}
                          >
                            {titleSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                            Guardar nombre
                          </Button>
                        ) : null}
                      </div>
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
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localidad</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="postal_code" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CP</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="province" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provincia</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem>
                    <FormLabel>País</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField
                  control={form.control}
                  name="price_per_night"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio base</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" placeholder="150" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="price_15_days" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio por 15 días</FormLabel>
                    <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="price_1_month" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio 1 mes</FormLabel>
                    <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="price_2_months" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio 2 meses</FormLabel>
                    <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="price_3_5_months" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio 3 a 5 meses</FormLabel>
                    <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="price_6_months" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio + 6 meses</FormLabel>
                    <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <label className="flex items-center gap-3 rounded-md border border-border px-4 py-3">
                  <Checkbox
                    checked={form.watch("long_stay_discount_enabled")}
                    onCheckedChange={(checked) => form.setValue("long_stay_discount_enabled", Boolean(checked), { shouldDirty: true })}
                  />
                  Descuento larga estancia
                </label>
                <FormField control={form.control} name="long_stay_discount_percent" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descuento %</FormLabel>
                    <FormControl><Input type="number" min="0" max="100" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <label className="flex items-center gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
                  <Checkbox
                    checked={form.watch("last_minute_discount_enabled")}
                    onCheckedChange={(checked) => form.setValue("last_minute_discount_enabled", Boolean(checked), { shouldDirty: true })}
                  />
                  Oferta descuento última hora
                </label>
                <FormField control={form.control} name="last_minute_discount_percent" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Última hora %</FormLabel>
                    <FormControl><Input type="number" min="0" max="100" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
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
                  className={`relative rounded-md border-2 border-dashed p-8 text-center transition-colors ${
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
                  {imageFieldArray.fields.map((field, index) => (
                    <div key={field.id} className="grid gap-3 rounded-md border border-border p-4 md:grid-cols-[120px_1fr_180px_auto]">
                      <div className="flex h-20 items-center justify-center overflow-hidden rounded-xl bg-muted">
                        {images[index]?.image_url ? (
                          <img src={images[index]?.image_url} alt={images[index]?.caption} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs text-muted-foreground">Preview</span>
                        )}
                      </div>
                      <div className="space-y-3">
                        <p className="truncate text-xs text-muted-foreground" title={images[index]?.image_url}>
                          {compactImagePath(images[index]?.image_url) || "Sin ruta"}
                        </p>
                        <Input
                          placeholder="Caption"
                          value={images[index]?.caption ?? ""}
                          onChange={(event) => form.setValue(`images.${index}.caption`, event.target.value, { shouldDirty: true })}
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={Boolean(images[index]?.is_main)}
                            onCheckedChange={(checked) => {
                              images.forEach((_, imageIndex) => {
                                form.setValue(`images.${imageIndex}.is_main`, imageIndex === index && Boolean(checked), { shouldDirty: true });
                              });
                            }}
                          />
                          Imagen principal
                        </label>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => index > 0 && imageFieldArray.move(index, index - 1)}>
                            ↑
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => index < imageFieldArray.fields.length - 1 && imageFieldArray.move(index, index + 1)}>
                            ↓
                          </Button>
                        </div>
                      </div>
                      <Button type="button" variant="outline" onClick={() => imageFieldArray.remove(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="resources" className="mt-6 space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField control={form.control} name="video_url" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Video URL</FormLabel>
                      <FormControl><Input placeholder="URL del vídeo" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="virtual_tour_url" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tour virtual</FormLabel>
                      <FormControl><Input placeholder="URL del tour virtual" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="virtual_tour_2_url" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tour virtual 2</FormLabel>
                      <FormControl><Input placeholder="URL del segundo tour" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="chat_url" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chat</FormLabel>
                      <FormControl><Input placeholder="URL o canal de chat" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="other_resources" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Otros</FormLabel>
                      <FormControl><Textarea className="min-h-24" placeholder={"Un recurso por línea"} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div
                  className={`relative rounded-md border-2 border-dashed p-8 text-center transition-colors ${
                    uploading ? "border-primary bg-primary/5" : "border-border bg-muted/30"
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault();
                    await addResourceFiles(Array.from(e.dataTransfer.files));
                  }}
                >
                  <input
                    type="file"
                    accept="video/*,application/pdf"
                    multiple
                    onChange={async (e) => {
                      await addResourceFiles(Array.from(e.target.files || []));
                      e.target.value = "";
                    }}
                    className="hidden"
                    id="resource-upload-input"
                    disabled={uploading}
                  />
                  {uploading ? (
                    <div className="space-y-3">
                      <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Subiendo recurso... {progress}%</p>
                      <div className="mx-auto h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                      <p className="mb-2 text-sm font-medium">Arrastra vídeos o PDFs aquí</p>
                      <p className="mb-4 text-xs text-muted-foreground">Vídeos, tours exportados o documentos PDF</p>
                      <Button type="button" variant="outline" onClick={() => document.getElementById("resource-upload-input")?.click()}>
                        Seleccionar recursos
                      </Button>
                    </>
                  )}
                </div>

                <div className="space-y-3">
                  {resourceFieldArray.fields.map((field, index) => (
                    <div key={field.id} className="grid gap-3 rounded-md border border-border p-4 md:grid-cols-[140px_1fr_auto]">
                      <FormField control={form.control} name={`resources.${index}.type`} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="VIDEO">Video</SelectItem>
                              <SelectItem value="TOUR_VIRTUAL">Tour virtual</SelectItem>
                              <SelectItem value="OTROS">Otros</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="space-y-2">
                        <Input
                          value={resources[index]?.name ?? ""}
                          onChange={(event) => form.setValue(`resources.${index}.name`, event.target.value, { shouldDirty: true })}
                          placeholder="Nombre del recurso"
                        />
                        <p className="truncate text-xs text-muted-foreground" title={resources[index]?.url}>
                          {compactImagePath(resources[index]?.url) || "Sin ruta"}
                        </p>
                      </div>
                      <Button type="button" variant="outline" onClick={() => resourceFieldArray.remove(index)}>
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
                  <FormField control={form.control} name="cup_number" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nº CUP</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="property_registry_number" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registro propiedad</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="cadastral_reference" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ref. catastral</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="owner_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Propietario</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="rental_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo alquiler</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="TURISTICO">Turístico</SelectItem>
                          <SelectItem value="TEMPORADA">Temporada</SelectItem>
                          <SelectItem value="LARGA_DURACION">Larga duración</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="orientation" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exterior / interior</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="EXTERIOR">Exterior</SelectItem>
                          <SelectItem value="INTERIOR">Interior</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="housing_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de vivienda</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="PISO">Piso</SelectItem>
                          <SelectItem value="APARTAMENTO">Apartamento</SelectItem>
                          <SelectItem value="ESTUDIO">Estudio</SelectItem>
                          <SelectItem value="LOCAL">Local</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="viewpoint" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mirador</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="windows" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ventanas</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="public_url" render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL activa / no pública</FormLabel>
                      <FormControl><Input placeholder="https://..." {...field} /></FormControl>
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
                  {amenitiesQuery.isLoading ? <Skeleton className="h-28 rounded-md" /> : null}
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
                                <label key={amenity.id} className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${checked ? "border-accent bg-accent/30" : "border-border hover:bg-secondary"}`}>
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(nextValue) => {
                                      const current = form.getValues("amenities");
                                      form.setValue(
                                        "amenities",
                                        nextValue
                                          ? [...current, amenity.id]
                                          : current.filter((value) => value !== amenity.id),
                                        { shouldDirty: true },
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

                <label className="flex items-center gap-3 rounded-md border border-border px-4 py-3">
                  <Checkbox
                    checked={form.watch("is_active")}
                    onCheckedChange={(checked) => form.setValue("is_active", Boolean(checked), { shouldDirty: true })}
                  />
                  Activa
                </label>
                <label className="flex items-center gap-3 rounded-md border border-border px-4 py-3">
                  <Checkbox
                    checked={form.watch("is_published")}
                    onCheckedChange={(checked) => form.setValue("is_published", Boolean(checked), { shouldDirty: true })}
                  />
                  Publicada
                </label>
              </TabsContent>

              <TabsContent value="preview" className="mt-6">
                <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
                  <div className="overflow-hidden rounded-xl border border-border bg-muted">
                    {previewImage ? (
                      <img src={previewImage} alt={form.watch("title")} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">Añade una imagen principal</div>
                    )}
                  </div>
                  <div className="rounded-xl border border-border bg-card p-6">
                    <p className="text-sm text-muted-foreground">{form.watch("location") || "Ubicación"}</p>
                    <h2 className="mt-2 text-3xl font-semibold">{form.watch("title") || "Título de la propiedad"}</h2>
                    <p className="mt-3 text-muted-foreground">{form.watch("description") || "La descripción se mostrará aquí."}</p>
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-md bg-muted p-3 text-sm">{form.watch("rooms")} habitaciones</div>
                      <div className="rounded-md bg-muted p-3 text-sm">{form.watch("bathrooms")} baños</div>
                      <div className="rounded-md bg-muted p-3 text-sm">{form.watch("max_guests")} huéspedes</div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className={`sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 shadow-xl backdrop-blur ${
              saveError
                ? "border-rose-200 bg-rose-50/95"
                : form.formState.isDirty
                  ? "border-amber-200 bg-amber-50/95"
                  : "border-emerald-200 bg-emerald-50/95"
            }`}>
              <div>
                <p className="text-sm font-medium">
                  {saveError
                    ? "No se guardó"
                    : createProperty.isPending || updateProperty.isPending || form.formState.isSubmitting
                      ? "Guardando apartamento..."
                      : form.formState.isDirty
                        ? "Hay cambios sin guardar"
                        : savedAt
                          ? `Guardado a las ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                          : "Sin cambios pendientes"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {saveError || "Nombre, normas, fotos y publicación se confirman contra la API al guardar."}
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <Button asChild type="button" variant="outline">
                  <Link to="/cms/properties">Salir</Link>
                </Button>
                <Button disabled={createProperty.isPending || updateProperty.isPending || form.formState.isSubmitting || uploading}>
                  {createProperty.isPending || updateProperty.isPending || form.formState.isSubmitting ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 size-4" />
                  )}
                  {createProperty.isPending || updateProperty.isPending || form.formState.isSubmitting ? "Guardando..." : "Guardar apartamento"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      ) : null}
    </div>
  );
}
