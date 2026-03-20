import { createFileRoute, useParams } from '@tanstack/react-router'
import { AttestationForm } from '../components/identity/AttestationForm'
import { useAuth } from '../lib/auth'

export const Route = createFileRoute('/estates/$estateId/attestation')({
  component: AttestationPage,
})

function AttestationPage() {
  const { estateId } = useParams({ from: '/estates/$estateId/attestation' });
  const { profile } = useAuth();
  
  const estateName = profile?.primaryEstateName || 'My Estate';

  return (
    <AttestationForm 
      estateId={estateId}
      estateName={estateName}
      onComplete={() => {
        // Reload the page to re-check attestation status in IdentityGate
        window.location.reload();
      }}
    />
  );
}
