import { createConnectTransport } from "@connectrpc/connect-web";
import { createClient } from "@connectrpc/connect";
import { EstateService } from "../gen/estate/v1/estate_pb";

// The transport defines how the client talks to the backend
const transport = createConnectTransport({
  baseUrl: "http://localhost:8080", // Local API port
});

// We create a client for each service
// In Connect-ES v2, we pass the GenService schema directly from the _pb file.
export const estateClient = createClient(EstateService, transport);
