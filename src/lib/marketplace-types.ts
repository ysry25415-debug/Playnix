export type OfferStatus = "draft" | "active" | "paused" | "sold_out";
export type OfferDeliveryMode = "instant" | "chat";
export type OrderRoomStatus = "awaiting_seller" | "open" | "completed" | "disputed" | "closed";
export type OrderPaymentStatus = "unpaid" | "held" | "released" | "refunded";
export type OrderResolutionStatus =
  | "none"
  | "seller_marked_delivered"
  | "buyer_confirmed"
  | "buyer_disputed"
  | "resolved_for_seller"
  | "resolved_for_buyer";

export type OfferRow = {
  id: string;
  seller_id: string;
  game_slug: string;
  category_slug: string;
  title: string;
  description: string;
  price_usd: number;
  delivery_mode: OfferDeliveryMode;
  delivery_time: string;
  stock_count: number;
  status: OfferStatus;
  created_at: string;
  updated_at: string;
};

export type OfferImageRow = {
  id: string;
  offer_id: string;
  seller_id: string;
  storage_path: string;
  public_url: string;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
};

export type OfferWithImagesRow = OfferRow & {
  offer_images?: OfferImageRow[] | null;
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
  delivery_mode: OfferDeliveryMode;
  status: OrderStatus;
  created_at: string;
};

export type OfferPrivateDeliveryRow = {
  offer_id: string;
  seller_id: string;
  delivery_content: string;
  created_at: string;
  updated_at: string;
};

export type OrderDeliveryDetailsRow = {
  order_id: string;
  offer_id: string;
  seller_id: string;
  buyer_id: string;
  delivery_mode: OfferDeliveryMode;
  delivery_content: string | null;
  created_at: string;
  unlocked_at: string | null;
};

export type OrderTradeRoomRow = {
  order_id: string;
  offer_id: string;
  seller_id: string;
  buyer_id: string;
  delivery_window_minutes: number;
  room_status: OrderRoomStatus;
  payment_status: OrderPaymentStatus;
  resolution_status: OrderResolutionStatus;
  seller_started_at: string | null;
  delivery_deadline: string | null;
  buyer_paid_at: string | null;
  buyer_card_last4: string | null;
  buyer_card_holder: string | null;
  seller_marked_delivered_at: string | null;
  buyer_confirmed_received_at: string | null;
  buyer_disputed_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderMessageRow = {
  id: number;
  order_id: string;
  sender_id: string | null;
  message: string;
  is_system: boolean;
  created_at: string;
};

export type UserNotificationRow = {
  id: number;
  recipient_id: string;
  actor_id: string | null;
  order_id: string | null;
  title: string;
  body: string;
  action_href: string | null;
  is_read: boolean;
  created_at: string;
};
