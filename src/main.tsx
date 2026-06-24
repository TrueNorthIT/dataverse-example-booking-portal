import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Auth0Provider } from "@auth0/auth0-react"
import { auth0Config } from "@/config/auth0"
import App from "./App"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Auth0Provider {...auth0Config}>
      <App />
    </Auth0Provider>
  </StrictMode>
)
