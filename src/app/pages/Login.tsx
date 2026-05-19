import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router";
import { z } from "zod";

import { Button } from "@/app/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/app/components/ui/form";
import { Input } from "@/app/components/ui/input";
import { useAuth } from "@/lib/hooks/useAuth";

const schema = z.object({
  username: z.string().min(1, "Introduce tu usuario"),
  password: z.string().min(1, "Introduce tu contraseña"),
});

type LoginValues = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const form = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/dashboard";

  async function onSubmit(values: LoginValues) {
    form.clearErrors("root");

    try {
      await login(values.username, values.password);
      navigate(from, { replace: true });
    } catch {
      form.setError("root", {
        type: "server",
        message: "Credenciales inválidas. Verifica tu usuario y contraseña.",
      });
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-2xl border border-border bg-card shadow-xl lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden bg-[#17324D] p-10 text-white lg:block">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                <Building2 className="size-6" />
              </div>
              <div>
                <p className="text-lg font-semibold">Apartments PMS</p>
                <p className="text-sm text-white/70">Gestión centralizada de alojamientos</p>
              </div>
            </div>

            <div className="mt-20 space-y-6">
              <h1 className="text-4xl font-semibold leading-tight tracking-tight">
                Gestiona reservas, pagos y operativa diaria desde un solo panel.
              </h1>
              <p className="max-w-md text-base leading-7 text-white/72">
                Inicia sesión para revisar check-ins de hoy, cobros pendientes, limpieza, mantenimiento y el rendimiento de tu portafolio.
              </p>
            </div>
          </div>

          <div className="p-8 sm:p-12">
            <div className="mb-8 text-center lg:text-left">
              <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm lg:mx-0">
                <Building2 className="size-8" />
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">Acceso al panel</h2>
              <p className="mt-2 text-sm text-muted-foreground">Introduce tus credenciales para continuar.</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuario</FormLabel>
                      <FormControl>
                        <Input autoComplete="username" placeholder="host_admin" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input autoComplete="current-password" type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.formState.errors.root ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
                    {form.formState.errors.root.message}
                  </div>
                ) : null}

                <Button className="h-11 w-full rounded-xl" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
                  {form.formState.isSubmitting ? "Iniciando sesión..." : "Entrar al dashboard"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
