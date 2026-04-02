"use client";

import { signIn, signOut } from "next-auth/react";

export function CredentialsLoginForm() {
  return (
    <form
      className="form-grid"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const email = String(formData.get("email") ?? "");
        const password = String(formData.get("password") ?? "");

        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
          callbackUrl: "/"
        });

        if (result?.error) {
          window.location.href = "/login?error=Credenciales%20inv%C3%A1lidas";
          return;
        }

        window.location.href = "/";
      }}
    >
      <label>
        Correo
        <input name="email" type="email" required />
      </label>
      <label>
        Contraseña
        <input name="password" type="password" required />
      </label>
      <button type="submit">Entrar al panel</button>
    </form>
  );
}

export function GoogleLoginButton() {
  return (
    <button
      type="button"
      className="google-button"
      onClick={() => {
        void signIn("google", { callbackUrl: "/" });
      }}
    >
      Continuar con Google
    </button>
  );
}

export function LogoutButton() {
  return (
    <button
      type="button"
      className="ghost-button"
      onClick={() => {
        void signOut({ callbackUrl: "/login" });
      }}
    >
      Cerrar sesión
    </button>
  );
}
