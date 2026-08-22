import type { Metadata } from "next";
import { Object3dReverseHome } from "@/components/object3d-reverse-home";

export const metadata: Metadata = {
  title: "3D Reverse — GitReverse",
  description:
    "Reverse engineer a 2D photo into a 3D GLB and a Cursor-ready Three.js viewer prompt.",
  robots: { index: false, follow: false },
};

export default function Object3dPage() {
  return <Object3dReverseHome />;
}
