import { HeadContent, Scripts, createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { Link } from "@tanstack/react-router";
import ThemeToggle from "../components/ThemeToggle";
import { AppProvider } from "../store";

import appCss from "../styles.css?url";

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CuttleList — 1D Cut Optimizer" },
      {
        name: "description",
        content:
          "Client-side 1D linear cut optimizer. Minimize waste on your stock by optimizing cut placement.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
    ],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
        {children}
        <TanStackDevtools
          config={{ position: "bottom-right" }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AppProvider>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg print:hidden">
        <nav className="page-wrap flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:py-4">
          <h1 className="m-0 flex-shrink-0 text-base font-semibold tracking-tight">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm text-[var(--sea-ink)] no-underline shadow-[0_8px_24px_rgba(30,90,72,0.08)] sm:px-4 sm:py-2"
            >
              <span className="text-lg">🦑</span>
              CuttleList
            </Link>
          </h1>

          <div className="order-3 flex w-full flex-wrap items-center gap-x-4 gap-y-1 pb-1 text-sm font-semibold sm:order-none sm:w-auto sm:flex-nowrap sm:pb-0">
            <Link
              to="/"
              className="nav-link"
              activeOptions={{ exact: true }}
              activeProps={{ className: "nav-link is-active" }}
            >
              Optimizer
            </Link>
            <Link
              to="/results"
              className="nav-link"
              activeProps={{ className: "nav-link is-active" }}
            >
              Cut Sheet
            </Link>
            <Link
              to="/compare"
              className="nav-link"
              activeProps={{ className: "nav-link is-active" }}
            >
              Compare
            </Link>
            <Link
              to="/saved"
              className="nav-link"
              activeProps={{ className: "nav-link is-active" }}
            >
              Saved
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
          </div>
        </nav>
      </header>

      {/* Main content */}
      <Outlet />

      {/* Footer */}
      <footer className="site-footer mt-auto py-6 text-center text-xs text-[var(--sea-ink-soft)] print:hidden">
        <div className="page-wrap">
          CuttleList — Open source 1D cut optimizer • Built with TanStack Start
        </div>
      </footer>
    </AppProvider>
  );
}
