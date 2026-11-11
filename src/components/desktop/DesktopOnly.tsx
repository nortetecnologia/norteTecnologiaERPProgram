"use client";

import dynamic from "next/dynamic";

export const DesktopBar = dynamic(
  () => import("./DesktopBar"),
  { ssr: false }
);

export const BackupConfig = dynamic(
  () => import("./BackupConfig"),
  { ssr: false }
);

export const DumpConfig = dynamic(
  () => import("./DumpConfig"),
  { ssr: false }
);
