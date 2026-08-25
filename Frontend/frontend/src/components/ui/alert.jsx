"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const alertVariants = {
  default: "",
  destructive:
    "border-destructive bg-destructive/10 text-destructive",
}

function Alert({ className, variant = "default", ...props }) {
  return (
    <div
      className={cn(
        "relative w-full rounded-lg border px-4 py-3 text-sm grid grid-cols-[auto_1fr] items-start gap-x-3",
        alertVariants[variant],
        className,
      )}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }) {
  return (
    <h5
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }) {
  return (
    <div
      className={cn("text-sm", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
