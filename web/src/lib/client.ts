import { createConnectTransport } from "@connectrpc/connect-web";
import { createClient } from "@connectrpc/connect";
import { EstateService } from "../gen/estate/v1/estate_pb";

// The transport defines how the client talks to the backend
const baseUrl = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? "http://localhost:8080" 
  : "/api";

const transport = createConnectTransport({
  baseUrl: baseUrl,
});

// We create a client for each service
// In Connect-ES v2, we pass the GenService schema directly from the _pb file.
export const estateClient = createClient(EstateService, transport);
