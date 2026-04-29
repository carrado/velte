import { cn } from "@/lib/utils";
import { getAvailableStock } from "@/services/products";
import { ProductsTableProps } from "@/types/products";
import ProductActionsPopover from "./ProductActionsPopover";

export default function ProductsTable({
  products,
  currentPage,
  itemsPerPage,
  onRestock,
  onChangePrice,
  onDelete,
}: ProductsTableProps) {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = products.slice(startIndex, startIndex + itemsPerPage);

  // Desktop Table View
  const DesktopTable = () => (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full min-w-[800px]">
        <thead>
          <tr className="bg-orange-50">
            <th className="px-4 py-3 text-sm font-medium text-[#023337] text-center w-16">
              No.
            </th>
            <th className="px-4 py-3 text-sm font-medium text-[#023337] text-left">
              Product
            </th>
            <th className="px-4 py-3 text-sm font-medium text-[#023337] text-center">
              Created Date
            </th>
            <th className="px-4 py-3 text-sm font-medium text-[#023337] text-center">
              Total Qty
            </th>
            <th className="px-4 py-3 text-sm font-medium text-[#023337] text-center">
              In Stock
            </th>
            <th className="px-4 py-3 text-sm font-medium text-[#023337] text-center">
              Ordered Qty
            </th>
            <th className="px-4 py-3 text-sm font-medium text-[#023337] text-center w-12">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {paginated.map((product, idx) => {
            const available = getAvailableStock(product);
            return (
              <tr
                key={product.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-3 text-center text-sm text-black">
                  {startIndex + idx + 1}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded border border-gray-200 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500",
                        product.colorClass,
                      )}
                    >
                      {product.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm text-black font-medium">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        ${product.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-sm text-black">
                  {product.createdDate}
                </td>
                <td className="px-4 py-3 text-center text-sm text-black">
                  {product.totalQuantity}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      available > 0
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800",
                    )}
                  >
                    {available}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-sm text-black">
                  {product.orderedQuantity}
                </td>
                <td className="px-4 py-3 text-center">
                  <ProductActionsPopover
                    product={product}
                    onRestock={() => onRestock(product)}
                    onChangePrice={() => onChangePrice(product)}
                    onDelete={() => onDelete(product)}
                  />
                </td>
              </tr>
            );
          })}
          {paginated.length === 0 && (
            <tr>
              <td
                colSpan={7}
                className="py-12 text-center text-sm text-gray-400"
              >
                No products found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // Mobile Card View
  const MobileCards = () => (
    <div className="md:hidden space-y-3">
      {paginated.map((product, idx) => {
        const available = getAvailableStock(product);
        return (
          <div key={product.id} className="bg-white border border-gray-100 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded border border-gray-200 flex items-center justify-center text-xs font-bold",
                    product.colorClass,
                  )}
                >
                  {product.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    ${product.price.toFixed(2)}
                  </p>
                </div>
              </div>
              <ProductActionsPopover
                product={product}
                onRestock={() => onRestock(product)}
                onChangePrice={() => onChangePrice(product)}
                onDelete={() => onDelete(product)}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <div>
                <p className="text-gray-400">Created</p>
                <p className="font-medium text-gray-700">
                  {product.createdDate}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Total Qty</p>
                <p className="font-medium text-gray-700">
                  {product.totalQuantity}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Ordered</p>
                <p className="font-medium text-gray-700">
                  {product.orderedQuantity}
                </p>
              </div>
              <div className="col-span-3 mt-1">
                <p className="text-gray-400">In Stock</p>
                <span
                  className={cn(
                    "inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-0.5",
                    available > 0
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800",
                  )}
                >
                  {available} available
                </span>
              </div>
            </div>
          </div>
        );
      })}
      {paginated.length === 0 && (
        <div className="py-10 text-center text-sm text-gray-400">
          No products found.
        </div>
      )}
    </div>
  );

  return (
    <>
      <DesktopTable />
      <MobileCards />
    </>
  );
}
