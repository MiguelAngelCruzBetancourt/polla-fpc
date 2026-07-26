"use client";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { auth, db } from "@/lib/firebase-client";
import { normalizeUsername, USERNAME_REGEX } from "@/lib/username";

function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code;
  switch (code) {
    case "auth/email-already-in-use":
      return "Ese correo ya tiene una cuenta registrada.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/invalid-email":
      return "El correo no es válido.";
    default:
      return err instanceof Error ? err.message : "No se pudo completar el registro.";
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const normalizedUsername = normalizeUsername(username);
    if (!displayName.trim()) {
      setError("El nombre para mostrar es obligatorio.");
      return;
    }
    if (!USERNAME_REGEX.test(normalizedUsername)) {
      setError("El username debe tener 3-20 caracteres: letras minúsculas, números o guion bajo.");
      return;
    }

    setSubmitting(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = credential.user.uid;

      try {
        await runTransaction(db, async (tx) => {
          const usernameRef = doc(db, "usernames", normalizedUsername);
          const usernameSnapTx = await tx.get(usernameRef);
          if (usernameSnapTx.exists()) {
            throw new Error("USERNAME_TAKEN");
          }
          tx.set(usernameRef, { uid });
          tx.set(doc(db, "users", uid), {
            displayName: displayName.trim(),
            username: normalizedUsername,
            email,
            createdAt: serverTimestamp(),
          });
        });
      } catch (txErr) {
        await auth.currentUser?.delete().catch(() => {});
        if (txErr instanceof Error && txErr.message === "USERNAME_TAKEN") {
          setError("Ese username ya está en uso, elige otro.");
          return;
        }
        throw txErr;
      }

      router.push("/rooms");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-xl font-semibold text-text">Crear cuenta</h1>
        <p className="text-sm text-text-muted">Únete a la polla de la Liga BetPlay.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label="Nombre para mostrar"
          name="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="name"
          required
        />
        <TextField
          label="Username"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          hint="3-20 caracteres: minúsculas, números o guion bajo. No se puede cambiar después."
          autoComplete="off"
          required
        />
        <TextField
          label="Correo electrónico"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <TextField
          label="Contraseña"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />

        {error && <Alert variant="error">{error}</Alert>}

        <Button type="submit" isLoading={submitting}>
          Registrarme
        </Button>
      </form>

      <p className="text-center text-sm text-text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-accent">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
