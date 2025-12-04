export const CITY_NAME = "Бишкек";
export const MAX_PRICE_KGS = 50000;
export const MIN_ROOMS = 1;
export const MAX_ROOMS = 2;

// If true, only ads where we can confidently detect "owner" will be sent.
// If detection fails, the ad will be skipped.
export const OWNER_ONLY = true;

// How many last IDs to keep in state to avoid duplicates
export const MAX_SENT_IDS = 300;