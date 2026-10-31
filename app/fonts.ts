import {
  Bungee,
  Cormorant_Garamond,
  Playfair_Display,
  Caveat,
  Gloria_Hallelujah,
  Pacifico,
  Permanent_Marker,
  Rock_Salt,
  Shrikhand,
  Space_Grotesk,
  Special_Elite,
  VT323,
} from "next/font/google";

const marker = Permanent_Marker({ weight: "400", subsets: ["latin"], variable: "--font-marker" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat" });
const typewriter = Special_Elite({ weight: "400", subsets: ["latin"], variable: "--font-typewriter" });
const rocksalt = Rock_Salt({ weight: "400", subsets: ["latin"], variable: "--font-rocksalt" });
const shrikhand = Shrikhand({ weight: "400", subsets: ["latin"], variable: "--font-shrikhand" });
const pixel = VT323({ weight: "400", subsets: ["latin"], variable: "--font-pixel" });
const gloria = Gloria_Hallelujah({ weight: "400", subsets: ["latin"], variable: "--font-gloria" });
const bungee = Bungee({ weight: "400", subsets: ["latin"], variable: "--font-bungee" });
const pacifico = Pacifico({ weight: "400", subsets: ["latin"], variable: "--font-pacifico" });
const serif = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" });
// Italic only — it is used for elegant handwritten-feeling titles.
const classic = Cormorant_Garamond({ weight: "500", style: "italic", subsets: ["latin"], variable: "--font-classic" });
const body = Space_Grotesk({ subsets: ["latin"], variable: "--font-body" });

export const fontVariables = [marker, caveat, typewriter, rocksalt, shrikhand, pixel, gloria, bungee, pacifico, serif, classic, body]
  .map((f) => f.variable)
  .join(" ");
