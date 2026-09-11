"use client";

import React from "react";
import {
  HardDrive as LucideHardDrive,
  Users as LucideUsers,
  CheckCircle2 as LucideCheckCircle2,
  HelpCircle as LucideHelpCircle,
  Mail as LucideMail,
  Globe as LucideGlobe,
  Plus as LucidePlus,
  Trash2 as LucideTrash2,
} from "lucide-react";

export function HardDrive(props: React.SVGProps<SVGSVGElement>) {
  return <LucideHardDrive className={props.className || "h-4 w-4"} {...(props as any)} />;
}

export function Persons(props: React.SVGProps<SVGSVGElement>) {
  return <LucideUsers className={props.className || "h-4 w-4"} {...(props as any)} />;
}

export function CircleCheckFill(props: React.SVGProps<SVGSVGElement>) {
  return <LucideCheckCircle2 className={props.className || "h-4 w-4 fill-current"} {...(props as any)} />;
}

export function CircleQuestion(props: React.SVGProps<SVGSVGElement>) {
  return <LucideHelpCircle className={props.className || "h-4 w-4"} {...(props as any)} />;
}

export function Envelope(props: React.SVGProps<SVGSVGElement>) {
  return <LucideMail className={props.className || "h-4 w-4"} {...(props as any)} />;
}

export function Globe(props: React.SVGProps<SVGSVGElement>) {
  return <LucideGlobe className={props.className || "h-4 w-4"} {...(props as any)} />;
}

export function Plus(props: React.SVGProps<SVGSVGElement>) {
  return <LucidePlus className={props.className || "h-4 w-4"} {...(props as any)} />;
}

export function TrashBin(props: React.SVGProps<SVGSVGElement>) {
  return <LucideTrash2 className={props.className || "h-4 w-4"} {...(props as any)} />;
}
