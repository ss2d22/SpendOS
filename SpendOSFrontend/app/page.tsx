import Link from "next/link";

export default function Home() {
  return (
    <>
      <header className="w-full">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <span className="font-semibold text-lg">SpendOS</span>
            </Link>

            <nav>
              <ul className="flex items-center gap-4">
                <li>
                  <Link href="/auth/login" className="text-sm font-medium hover:underline">
                    Login
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/register"
                    className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-semibold"
                  >
                    Register
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center p-24">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold">Welcome to the Home Page</h1>
          <p className="mt-4 text-lg">This is a sample Next.js application.</p>
        </div>
      </main>
    </>
  );
}
