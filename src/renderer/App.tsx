function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <h1 className="text-xl font-semibold">Claude Terminal Manager</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-blue-400 mb-4">Hello World!</h2>
          <p className="text-gray-400 text-lg mb-8">
            Electron + React + Tailwind CSS
          </p>
          <div className="flex gap-4 justify-center">
            <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              New Session
            </button>
            <button className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
              Settings
            </button>
          </div>
        </div>
      </main>

      {/* Status Bar */}
      <footer className="bg-gray-800 border-t border-gray-700 px-4 py-2 text-sm text-gray-400">
        Ready - No active sessions
      </footer>
    </div>
  )
}

export default App
