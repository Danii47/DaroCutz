interface ImportMetaEnv {
  readonly DATABASE_URL: string;
  readonly JWT_SECRET: string;
  readonly NODE_ENV: 'development' | 'production';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace NodeJS {
  interface ProcessEnv {
    readonly DATABASE_URL: string;
    readonly JWT_SECRET: string;
    readonly NODE_ENV: 'development' | 'production';
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