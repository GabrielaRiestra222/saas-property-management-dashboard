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
        message: "Credenciales inválidas. Revisa el usuario y la contraseña.",
      });
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-md border border-border bg-card shadow-xl lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden bg-sidebar p-10 text-sidebar-foreground lg:block">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-md bg-sidebar-accent ring-1 ring-sidebar-foreground/10">
                <Building2 className="size-6" />
              </div>
              <div>
                <p className="font-display text-xl">Apartments PMS</p>
                <p className="text-sm text-sidebar-foreground/60">Gestión centralizada de alojamientos</p>
              </div>
            </div>

            <div className="mt-20 space-y-6">
              <h1 className="font-display text-4xl font-medium leading-tight tracking-tight">
                Gestiona reservas, pagos y operativa diaria desde un solo panel.
              </h1>
              <p className="max-w-md text-base leading-7 text-sidebar-foreground/65">
                Inicia sesión para revisar check-ins de hoy, cobros pendientes, limpieza, mantenimiento y el rendimiento de tu portafolio.
              </p>
            </div>
          </div>

          <div className="p-8 sm:p-12">
            <div className="mb-8 text-center lg:text-left">
              <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm lg:mx-0">
                <Building2 className="size-8" />
              </div>
              <h2 className="font-display text-3xl font-medium tracking-tight text-foreground">Acceso al panel</h2>
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
                  <div className="rounded-md border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)] shadow-sm">
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
