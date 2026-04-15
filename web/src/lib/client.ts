import { createConnectTransport } from "@connectrpc/connect-web";
import { createClient } from "@connectrpc/connect";
import { EstateService } from "../gen/estate/v1/estate_pb";

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const baseUrl = isLocal ? "http://localhost:8080" : "/api";

const transport = createConnectTransport({ baseUrl });

export const estateClient = createClient(EstateService, transport);
