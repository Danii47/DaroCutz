/// <reference types="astro/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly DATABASE_URL: string;
    readonly JWT_SECRET: string;
    /** "true" | "false" | "auto" (por defecto): marca la cookie como Secure. */
    readonly COOKIE_SECURE?: string;
    readonly NODE_ENV?: 'development' | 'production';
    readonly TZ?: string;
  }
}

declare namespace App {
  interface Locals {
    user: {
      id: string;
      email: string;
      isAdmin: boolean;
      isApproved: boolean;
    } | null;
  }
}
