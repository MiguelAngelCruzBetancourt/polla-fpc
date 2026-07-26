"use client";

import { sendPasswordResetEmail } from "firebase/auth";
import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { auth } from "@/lib/firebase-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el correo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-xl font-semibold text-text">Recuperar contraseña</h1>
        <p className="text-sm text-text-muted">
          Te enviamos un enlace a tu correo para restablecerla.
        </p>
      </div>

      {sent ? (
        <Alert variant="success">Listo, revisa tu correo ({email}) para continuar.</Alert>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            label="Correo electrónico"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          {error && <Alert variant="error">{error}</Alert>}

          <Button type="submit" isLoading={submitting}>
            Enviar enlace
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-text-muted">
        <Link href="/login" className="font-medium text-accent">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
