import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";

export async function signIn(
  email: string,
  password: string,
  callbackURL = "/",
): Promise<void> {
  const { error } = await authClient.signIn.email({
    email,
    password,
    callbackURL,
  });
  if (error) throw new Error(error.message ?? "Não foi possível entrar");
}

export async function signUp(
  name: string,
  email: string,
  password: string,
  callbackURL = "/",
): Promise<void> {
  const { error } = await authClient.signUp.email({
    name,
    email,
    password,
    callbackURL,
  });
  if (error) throw new Error(error.message ?? "Não foi possível criar a conta");
}

export async function signOut(redirectTo = "/"): Promise<void> {
  try {
    await authClient.signOut();
  } finally {
    window.location.href = redirectTo;
  }
}
