/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Navigate, useParams } from '@tanstack/react-router'

export const Route = createFileRoute('/estates/$estateId/')({
  component: EstateIndexRedirect,
})

function EstateIndexRedirect() {
  const { estateId } = useParams({ from: '/estates/$estateId/' })
  return <Navigate to="/estates/$estateId/dashboard" params={{ estateId }} />
}
