import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl md:text-8xl font-bold text-white mb-4 drop-shadow-lg">
          Apel Pagi
        </h1>
        <p className="text-xl md:text-2xl text-blue-100 mb-12">
          Sistem Absensi Digital
        </p>

        <Link
          href="/checkin"
          className="inline-block bg-white hover:bg-gray-100 text-indigo-600 font-bold text-2xl px-12 py-6 rounded-2xl shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105"
        >
          Check In Sekarang →
        </Link>

        <div className="mt-12">
          <Link
            href="/login"
            className="text-white hover:text-blue-200 text-sm underline"
          >
            Admin Login
          </Link>
        </div>
      </div>
    </div>
  )
}
