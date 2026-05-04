import { cn } from "@/lib/utils";
import { getAvailableStock } from "@/services/products";
import type { ProductsTableProps } from "@/types/product";
import type { ColumnDef } from "@/types/common";
import type { CategoryProduct } from "@/types/product";
import ProductActionsPopover from "./ProductActionsPopover";
import DataTable from "../DataTable";
import MobileCard from "../MobileCard";

function InStockBadge({ available }: { available: number }) {
  return (
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
  );
}

export default function ProductsTable({
  products,
  rowOffset = 0,
  onRestock,
  onChangePrice,
  onDelete,
}: ProductsTableProps) {
  const columns: ColumnDef<CategoryProduct>[] = [
    {
      key: "no",
      header: "No.",
      headerClassName: "text-center w-16",
      className: "text-center",
      cell: (_, index) => rowOffset + index + 1,
    },
    {
      key: "product",
      header: "Product",
      cell: (p) => (
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded border border-gray-200 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500",
              p.colorClass,
            )}
          >
            {p.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm text-black font-medium">{p.name}</p>
            <p className="text-xs text-gray-400">${p.price.toFixed(2)}</p>
          </div>
        </div>
      ),
    },
    {
      key: "createdDate",
      header: "Created Date",
      headerClassName: "text-center",
      className: "text-center",
      cell: (p) => p.createdDate,
    },
    {
      key: "totalQty",
      header: "Total Qty",
      headerClassName: "text-center",
      className: "text-center",
      cell: (p) => p.totalQuantity,
    },
    {
      key: "inStock",
      header: "In Stock",
      headerClassName: "text-center",
      className: "text-center",
      cell: (p) => <InStockBadge available={getAvailableStock(p)} />,
    },
    {
      key: "orderedQty",
      header: "Ordered Qty",
      headerClassName: "text-center",
      className: "text-center",
      cell: (p) => p.orderedQuantity,
    },
    {
      key: "action",
      header: "Action",
      headerClassName: "text-center w-12",
      className: "text-center",
      cell: (p) => (
        <ProductActionsPopover
          product={p}
          onRestock={() => onRestock(p)}
          onChangePrice={() => onChangePrice(p)}
          onDelete={() => onDelete(p)}
        />
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={products}
      keyExtractor={(p) => p.id}
      emptyMessage="No products found."
      mobileCard={(product) => {
        const available = getAvailableStock(product);
        return (
          <MobileCard
            title={product.name}
            subtitle={`$${product.price.toFixed(2)}`}
            initials={{
              text: product.name.charAt(0),
              className: cn(product.colorClass, "border-gray-200"),
            }}
            action={
              <ProductActionsPopover
                product={product}
                onRestock={() => onRestock(product)}
                onChangePrice={() => onChangePrice(product)}
                onDelete={() => onDelete(product)}
              />
            }
            fields={[
              { label: "Created", value: product.createdDate },
              { label: "Total Qty", value: product.totalQuantity },
              { label: "Ordered", value: product.orderedQuantity },
              {
                label: "In Stock",
                value: (
                  <span
                    className={cn(
                      "inline-block px-2 py-0.5 rounded-full text-xs font-medium",
                      available > 0
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800",
                    )}
                  >
                    {available} available
                  </span>
                ),
              },
            ]}
          />
        );
      }}
    />
  );
}
