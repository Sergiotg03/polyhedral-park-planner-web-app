/*
https://reactrouter.com/api/components/Navigate
https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/function_components/
https://legacy.reactjs.org/docs/components-and-props.html
https://react.dev/learn/passing-props-to-a-component
https://www.robinwieruch.de/react-function-component/
*/

import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { TOKEN_KEY } from '../config'

type Props = {
  children: ReactNode
}

function ProtectedRoute({ children }: Props) {
  const token = localStorage.getItem(TOKEN_KEY)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
