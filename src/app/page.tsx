import Image from "next/image";

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <Image
        src="/corniche-kennedy.jpg"
        alt="Corniche Kennedy à Marseille"
        fill
        priority
        className="object-cover blur-sm"
      />
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <div className="text-center text-white px-6">
          <h1 className="heading-hero">
            allianz marseille
          </h1>
          <p className="mt-4 subtle text-lg sm:text-2xl">
            saas boetti-nogaro
          </p>
          <a
            href="/login"
            className="mt-8 inline-block btn btn-primary"
          >
            Se connecter
          </a>
        </div>
      </div>
    </main>
  );
}
