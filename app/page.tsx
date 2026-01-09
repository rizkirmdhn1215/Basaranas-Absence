

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

        <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-8 text-white max-w-md mx-auto shadow-xl border border-white/30">
          <p className="text-xl font-medium mb-4">
            👋 Selamat Datang
          </p>
          <p className="text-lg opacity-90">
            Silakan scan <strong>QR Code</strong> yang ditampilkan di layar monitor/admin untuk melakukan absensi.
          </p>
        </div>


      </div>
    </div>
  )
}
