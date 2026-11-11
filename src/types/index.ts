// Tipos compartilhados com o site
export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  price_max?: number;
  stock: number;
  category_id?: string;
  subcategory_id?: string;
  brand?: string;
  sku?: string;
  barcode?: string;
  internal_code?: string;
  product_type: "product" | "service";
  is_active: boolean;
  images?: { url: string; is_primary: boolean }[];
  created_at: string;
  updated_at: string;
  categories?: { name: string };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
  category_id: string;
}

// Tipos exclusivos do ERP
export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  cpf_cnpj?: string;
  address?: string;
  city?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type OSStatus =
  | "awaiting"
  | "in_progress"
  | "done"
  | "delivered"
  | "cancelled";

export interface ServiceOrder {
  id: string;
  number: number;
  customer_id: string;
  title: string;
  description?: string;
  status: OSStatus;
  equipment?: string;
  serial_number?: string;
  labor_cost?: number;
  discount?: number;
  notes?: string;
  estimated_at?: string;
  images?: string[];
  created_at: string;
  updated_at: string;
  erp_customers?: Customer;
  erp_service_order_items?: ServiceOrderItem[];
}

export interface ServiceOrderItem {
  id: string;
  service_order_id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  products?: { name: string; sku?: string };
}

export interface PDVSale {
  id: string;
  sale_number: number;
  customer_id?: string;
  subtotal: number;
  discount: number;
  total: number;
  notes?: string;
  created_at: string;
  erp_customers?: Customer;
  erp_pdv_sale_items?: PDVSaleItem[];
  erp_pdv_sale_payments?: PDVSalePayment[];
}

export interface PDVSaleItem {
  id: string;
  sale_id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface PDVSalePayment {
  id: string;
  sale_id: string;
  method: string;
  amount: number;
}

export interface StockMovement {
  id: string;
  product_id: string;
  type: "in" | "out" | "adjustment";
  quantity: number;
  reason: string;
  reference?: string;
  created_at: string;
  products?: { name: string; sku?: string };
}

export const OS_STATUS_LABELS: Record<OSStatus, string> = {
  awaiting: "Aguardando",
  in_progress: "Em andamento",
  done: "Concluída",
  delivered: "Entregue",
  cancelled: "Cancelada",
};

export const OS_STATUS_COLORS: Record<OSStatus, string> = {
  awaiting: "bg-yellow-500/20 text-yellow-400",
  in_progress: "bg-blue-500/20 text-blue-400",
  done: "bg-green-500/20 text-green-400",
  delivered: "bg-gray-500/20 text-gray-300",
  cancelled: "bg-red-500/20 text-red-400",
};
