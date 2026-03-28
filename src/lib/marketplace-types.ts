export type OfferStatus = "draft" | "active" | "paused" | "sold_out";

export type OfferRow = {
  id: string;
  seller_id: string;
  game_slug: string;
  category_slug: string;
  title: string;
  description: string;
  price_usd: number;
  delivery_time: string;
  stock_count: number;
  status: OfferStatus;
  created_at: string;
  updated_at: string;
};

export type OrderStatus = "pending" | "paid" | "delivered" | "cancelled";

export type OrderRow = {
  id: string;
  offer_id: string;
  buyer_id: string;
  seller_id: string;
  game_slug: string;
  category_slug: string;
  offer_title: string;
  price_usd: number;
  status: OrderStatus;
  created_at: string;
};
