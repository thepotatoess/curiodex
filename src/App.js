import { useAuth } from './hooks/useAuth'
import Auth from './components/Auth'

function App() {
  const { user, loading, signOut } = useAuth()

  if (loading) return <div>Loading...</div>

  if (!user) return <Auth />

  return (
    <div>
      <h1>Welcome to Curiodex!</h1>
      <p>Hello, {user.email}</p>
      <button onClick={signOut}>Sign Out</button>
      {/* Your quiz components will go here */}
    </div>
  )
}

export default App