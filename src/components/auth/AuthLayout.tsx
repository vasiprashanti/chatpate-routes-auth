import type { ReactNode } from "react";
import { AuthBrand } from "./AuthBrand";
import { AuthImagePanel } from "./AuthImagePanel";

interface AuthLayoutProps {
  children: ReactNode;
  footer?: ReactNode;
  brandSuffix?: string | undefined;
  place?: string;
  region?: string;
  distance?: string;
  distanceNote?: string;
  trail?: string;
  image?: string;
}

export function AuthLayout({
  children,
  footer,
  brandSuffix,
  place = "Chandratal Camp",
  region = "Spiti Valley",
  distance = "1.2 km",
  distanceNote = "left to your basecamp",
  trail = "Hampta Pass Trail",
  image,
}: AuthLayoutProps) {
  return (
    <main className="flex min-h-[100svh] items-stretch justify-center bg-[#faf7ef] md:items-center md:p-6">
      <div className="flex min-h-[100svh] w-full max-w-[1480px] flex-col overflow-hidden bg-card shadow-[0_20px_40px_oklch(0_0_0_/_0.08)] md:min-h-0 md:h-[min(820px,calc(100vh-3rem))] md:flex-row md:rounded-[36px]">
        <div className="relative h-[58svh] min-h-[320px] max-h-[520px] shrink-0 md:hidden">
          <AuthImagePanel
            image={image}
            place={place}
            region={region}
            distance={distance}
            distanceNote={distanceNote}
            trail={trail}
            className="rounded-none"
          />
          <div className="absolute left-6 top-6 z-10 sm:left-8 sm:top-8">
            <AuthBrand suffix={brandSuffix} tone="light" />
          </div>
        </div>

        <section className="relative z-10 -mt-7 flex flex-1 flex-col items-center justify-center rounded-t-[28px] bg-card px-5 pb-9 pt-8 sm:px-9 md:mt-0 md:w-[52%] md:flex-none md:overflow-y-auto md:rounded-none md:px-8 md:py-12 lg:px-12">
          <div className="absolute left-8 top-8 hidden md:block lg:left-12 lg:top-10">
            <AuthBrand suffix={brandSuffix} />
          </div>
          <div className="w-full max-w-[420px] text-center md:pt-10">
            {children}
            {footer ? (
              <div className="mx-auto mt-8 w-full max-w-[420px] break-words px-1 text-center text-sm leading-relaxed text-muted-foreground">
                {footer}
              </div>
            ) : null}
          </div>
        </section>

        <div className="hidden min-h-0 flex-1 p-3 md:block md:w-[48%] md:flex-none">
          <AuthImagePanel
            image={image}
            place={place}
            region={region}
            distance={distance}
            distanceNote={distanceNote}
            trail={trail}
            className="rounded-[28px]"
          />
        </div>
      </div>
    </main>
  );
}
