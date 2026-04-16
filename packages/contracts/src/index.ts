export type DemoUser = {
  id: string;
  email: string;
  name: string;
  role: "buyer";
};

export type OrderStatus = "processing" | "fulfilled";

export type DemoOrderItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export type DemoOrder = {
  id: string;
  userId: string;
  status: OrderStatus;
  createdAt: string;
  items: DemoOrderItem[];
};

export type DemoProduct = {
  id: string;
  name: string;
  category: string;
};

export type DemoInventory = {
  productId: string;
  inStock: number;
  warehouse: string;
};

export type ServiceTrace = {
  service: string;
  path: string;
  status: "ok" | "error";
  durationMs: number;
  detail?: string;
};

export type TraceStatus = "ok" | "partial" | "error";

export type GraphqlErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "DOWNSTREAM_SERVICE_ERROR"
  | "INTERNAL_SERVER_ERROR";

export type Viewer = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type OrderSummary = {
  id: string;
  status: OrderStatus;
  createdAt: string;
  customerName: string;
  itemCount: number;
  total: number;
};

export type OrderDetailItem = {
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  inventory: DemoInventory | null;
};

export type OrderDetail = {
  id: string;
  status: OrderStatus;
  createdAt: string;
  customer: Viewer;
  items: OrderDetailItem[];
  total: number;
};

export type TraceSnapshot = {
  operationName: string;
  generatedAt: string;
  status: TraceStatus;
  downstream: ServiceTrace[];
  resultSummary: string;
};

export type BffTraceExtension = TraceSnapshot;

export type SessionUser = Viewer;

export const SERVICE_PORTS = {
  web: 3000,
  graphql: 4000,
  oidc: 4001,
  users: 4101,
  orders: 4102,
  catalog: 4103
} as const;

export const DEMO_USER: DemoUser = {
  id: "user-1",
  email: "buyer@example.com",
  name: "Morgan Lee",
  role: "buyer"
};

export const DEMO_USERS: Record<string, DemoUser> = {
  [DEMO_USER.id]: DEMO_USER
};

export const DEMO_PRODUCTS: Record<string, DemoProduct> = {
  "prod-1": {
    id: "prod-1",
    name: "Studio Headphones",
    category: "audio"
  },
  "prod-2": {
    id: "prod-2",
    name: "Travel Messenger Bag",
    category: "bags"
  },
  "prod-3": {
    id: "prod-3",
    name: "Mechanical Keyboard",
    category: "accessories"
  }
};

export const DEMO_INVENTORY: Record<string, DemoInventory> = {
  "prod-1": {
    productId: "prod-1",
    inStock: 16,
    warehouse: "hangzhou-a"
  },
  "prod-3": {
    productId: "prod-3",
    inStock: 8,
    warehouse: "hangzhou-b"
  }
};

export const DEMO_ORDERS: DemoOrder[] = [
  {
    id: "order-1001",
    userId: DEMO_USER.id,
    status: "fulfilled",
    createdAt: "2026-04-08T09:30:00.000Z",
    items: [
      {
        productId: "prod-1",
        quantity: 1,
        unitPrice: 199
      },
      {
        productId: "prod-3",
        quantity: 1,
        unitPrice: 129
      }
    ]
  },
  {
    id: "order-1002",
    userId: DEMO_USER.id,
    status: "processing",
    createdAt: "2026-04-09T07:15:00.000Z",
    items: [
      {
        productId: "prod-2",
        quantity: 1,
        unitPrice: 89
      }
    ]
  }
];

export function toViewer(user: DemoUser): Viewer {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}
