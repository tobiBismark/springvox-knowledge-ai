"use client";

import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AppCard({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <Card
      className={cn(
        "rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-none",
        className,
      )}
      {...props}
    >
      {children}
    </Card>
  );
}

export function AppCardHeader({
  className,
  ...props
}: React.ComponentProps<typeof CardHeader>) {
  return <CardHeader className={cn("space-y-1 pb-3", className)} {...props} />;
}

export function AppCardTitle({
  className,
  ...props
}: React.ComponentProps<typeof CardTitle>) {
  return (
    <CardTitle
      className={cn(
        "text-base font-semibold tracking-tight text-[var(--ink)]",
        className,
      )}
      {...props}
    />
  );
}

export function AppCardContent({
  className,
  ...props
}: React.ComponentProps<typeof CardContent>) {
  return <CardContent className={cn(className)} {...props} />;
}
