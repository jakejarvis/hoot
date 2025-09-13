import { Heart } from "lucide-react";
import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="px-4 sm:px-6 py-6 text-center text-xs text-muted-foreground leading-relaxed [&_a]:text-foreground/85 [&_a]:hover:text-foreground/60 [&_a]:hover:no-underline [&_svg]:inline-block [&_svg]:align-top [&_svg]:mx-[1px] [&_svg]:size-4">
      <p>
        Made with <Heart className="stroke-destructive fill-destructive" /> and{" "}
        <Link
          href="https://nextjs.org/"
          title="Powered by Next.js"
          target="_blank"
          rel="noopener"
          aria-label="Next.js"
        >
          {/** biome-ignore lint/a11y/noSvgWithoutTitle: not necessary */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="0"
            viewBox="0 0 24 24"
          >
            <path d="M18.665 21.978C16.758 23.255 14.465 24 12 24 5.377 24 0 18.623 0 12S5.377 0 12 0s12 5.377 12 12c0 3.583-1.574 6.801-4.067 9.001L9.219 7.2H7.2v9.596h1.615V9.251l9.85 12.727Zm-3.332-8.533 1.6 2.061V7.2h-1.6v6.245Z" />
          </svg>
        </Link>{" "}
        by{" "}
        <Link
          href="https://jarv.is"
          title="Jake Jarvis"
          target="_blank"
          rel="noopener"
        >
          @jakejarvis
        </Link>
        .
      </p>
      <p>
        Owl logo by mcarranza from{" "}
        <a
          href="https://thenounproject.com/browse/icons/term/owl/"
          target="_blank"
          rel="noopener noreferrer"
          title="Owl Icons"
        >
          Noun Project
        </a>{" "}
        (CC BY 3.0).
      </p>
    </footer>
  );
}
