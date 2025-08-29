// Server Component - Static Params
export function generateStaticParams() {
  // Sabit hasta ID listesi
  const patientIds = [
    'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AH', 'AI', 'AJ',
    'AR', 'AS', 'AT', 'AV', 'B', 'C', 'D', 'G', 'GX',
    'HX', 'I', 'J', 'K', 'L', 'R', 'S', 'T', 'U', 'V', 'Y'
  ];
  
  return patientIds.map((id) => ({
    id: id,
  }));
}

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
