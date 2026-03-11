import ClientRequestsTable from '@/components/dashboard/ClientRequestsTable';

export default function RequestsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Client Requests</h1>
      <ClientRequestsTable />
    </div>
  );
}