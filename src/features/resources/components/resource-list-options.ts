import { BookOpen, File, ImageIcon, Link2 } from "lucide-react";

export const resourceTypeOptions = [
  { value: "note", label: "Notes", icon: BookOpen },
  { value: "link", label: "Links", icon: Link2 },
  { value: "image", label: "Images", icon: ImageIcon },
  { value: "file", label: "Files", icon: File },
] as const;
