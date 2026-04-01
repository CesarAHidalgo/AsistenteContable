import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/crypto";

const authSecret = process.env.NEXTAUTH_SECRET;

const providers: NonNullable<NextAuthOptions["providers"]> = [
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Correo", type: "email" },
      password: { label: "Contrasena", type: "password" }
    },
    async authorize(credentials) {
      const email = String(credentials?.email ?? "").trim().toLowerCase();
      const password = String(credentials?.password ?? "");

      if (!email || !password) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user?.passwordHash) {
        return null;
      }

      if (!verifyPassword(password, user.passwordHash)) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name
      };
    }
  })
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    })
  );
}

export const authOptions: NextAuthOptions = {
  secret: authSecret,
  session: {
    strategy: "jwt",
    maxAge: 15 * 60,
    updateAge: 0
  },
  jwt: {
    maxAge: 15 * 60
  },
  pages: {
    signIn: "/login"
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email?.trim().toLowerCase();

        if (!email) {
          return false;
        }

        await prisma.user.upsert({
          where: { email },
          update: {
            name: user.name ?? undefined,
            googleId: account.providerAccountId
          },
          create: {
            email,
            name: user.name ?? "Usuario Google",
            googleId: account.providerAccountId
          }
        });
      }

      return true;
    }
  }
};
