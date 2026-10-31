import { APP_VERSION } from "@/lib/constants";

/** Small signature at the bottom of every page. */
export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`px-4 py-6 text-center text-xs opacity-60 ${className}`}>
      Built with <span className="text-cherry">♡</span> by Shubh · <span className="font-type">v{APP_VERSION.replace(/.0$/, "")}</span>
    </footer>
  );
}
