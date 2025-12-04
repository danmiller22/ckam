export interface Ad {
  id: string;
  title: string;
  city: string;
  district: string | null;
  rooms: number | null;
  price: number | null;
  currency: string | null;
  isOwner: boolean | null;
  phone: string | null;
  url: string;
  imageUrls: string[];
}