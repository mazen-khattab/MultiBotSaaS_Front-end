import { createContext, useContext } from "react"

// Context follows React portals so client dialogs inherit the same theme while
// admin screens keep their existing palette, even after route navigation.
export const ClientThemeContext = createContext(false)
export const useClientTheme = () => useContext(ClientThemeContext)
