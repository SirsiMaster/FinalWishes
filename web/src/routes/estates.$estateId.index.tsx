import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/estates/$estateId/')({
  component: () => <Navigate to="/estates/$estateId/dashboard" params={(params) => params} />
})
