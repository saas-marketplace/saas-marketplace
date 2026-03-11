import ProductTable from '@/components/dashboard/ProductTable';
import ProductForm from '@/components/dashboard/ProductForm';

export default function ManageProducts() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Manage Products</h1>
      <ProductForm onSuccess={() => {
        // Trigger refresh by reloading the page
        window.location.reload();
      }} />
      <ProductTable />
    </div>
  );
}
