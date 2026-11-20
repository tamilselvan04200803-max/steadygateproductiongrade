// Actuation ticket utilities re-exported from api-guard
export type { ActuationTicket } from "./api-guard";
export { issueActuationTicket, verifyActuationTicket } from "./api-guard";

// Per-device nonce cache shared across ticket validations.
// 2-second TTL matches actuation ticket expiry window.
import { TicketNonceCache } from "./api-guard";
const perDeviceNonceCache = new TicketNonceCache(2000);