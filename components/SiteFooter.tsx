import { APP_VERSION } from "@/lib/constants";

/** Small signature at the bottom of every page. */
export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`px-4 py-6 text-center text-xs opacity-60 ${className}`}>
      <p>
        Built with <span className="text-cherry">♡</span> by Shubh · <span className="font-type">v{APP_VERSION}</span>
      </p>
      <p className="mt-1">
        say hi on insta{" "}
        <a
          href="https://instagram.com/subhashh.jadav"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-dotted underline-offset-2 transition-opacity hover:opacity-100"
        >
          @subhashh.jadav
        </a>{" "}
        ✌︎
      </p>
    </footer>
  );
}
