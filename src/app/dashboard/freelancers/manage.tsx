import FreelancerTable from '@/components/dashboard/FreelancerTable';
import FreelancerForm from '@/components/dashboard/FreelancerForm';

export default function ManageFreelancers() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Manage Freelancers</h1>
      <FreelancerForm onSuccess={() => {
        // Trigger refresh by reloading the page
        window.location.reload();
      }} />
      <FreelancerTable />
    </div>
  );
}
