/**
 * Node domain types — identity and peer records for the P2P ERP network.
 */

// ── Node Identity ──────────────────────────────────────────────────────────────

/** This node's own identity, stored in `node_identity` table. */
export interface NodeIdentity {
  /** SHA-256(public_key) hex */
  node_id: string;
  /** Ed25519 public key (hex) */
  public_key: string;
  /** Hardware fingerprint (hex), optional — null if TPM-sealed */
  hw_fingerprint: string | null;
  /** Whether the private key is sealed in TPM (0 = false, 1 = true in SQLite) */
  tpm_sealed: boolean | number;
  /** ISO 8601 UTC creation timestamp */
  created_at: string;
}

// ── Known Peers ────────────────────────────────────────────────────────────────

/** A partner node as stored in `known_peers` table. */
export interface KnownPeer {
  /** SHA-256(public_key) hex */
  node_id: string;
  /** Ed25519 public key (hex) */
  public_key: string;
  /** Human-readable alias, e.g. "Sócio A" */
  alias: string;
  /** ISO 8601 UTC timestamp of last connection (null if never seen) */
  last_seen: string | null;
  /** Whether this peer is trusted (true) or revoked (false) */
  trusted: boolean | number;
  /** ISO 8601 UTC when revoked (null if still trusted) */
  revoked_at: string | null;
  /** node_id of who revoked this peer (null if still trusted) */
  revoked_by: string | null;
}

// ── Merkle Snapshot ────────────────────────────────────────────────────────────

/** A periodic Merkle tree snapshot for fast sync negotiation. */
export interface MerkleSnapshot {
  /** UUID v4 */
  id: string;
  /** ISO 8601 UTC when snapshot was computed */
  computed_at: string;
  /** Merkle root hash (hex) */
  root_hash: string;
  /** Per-entity hash map: { orders: "...", products: "...", ... } */
  entity_hashes: Record<string, string>;
}

// ── Quorum Proposal ────────────────────────────────────────────────────────────

export type QuorumOperationType =
  | 'REVOKE_PEER'
  | 'BULK_DELETE'
  | 'FISCAL_CANCEL'
  | 'FISCAL_INUTILIZE'
  | 'SECURITY_CONFIG'
  | 'HIGH_VALUE_PAYMENT';

export type QuorumStatus = 'OPEN' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

/** A signature on a quorum proposal. */
export interface QuorumSignature {
  node_id: string;
  signature: string;
  signed_at: string;
}

/** A critical operation proposal requiring 2-of-3 approval. */
export interface QuorumProposal {
  /** UUID v4 */
  id: string;
  /** Type of critical operation */
  operation_type: QuorumOperationType;
  /** JSON payload with operation-specific details */
  payload: Record<string, unknown>;
  /** node_id of the proposing partner */
  proposed_by: string;
  /** ISO 8601 UTC when proposed */
  proposed_at: string;
  /** Optional expiry (ISO 8601 UTC) */
  expires_at: string | null;
  /** Collected signatures (including proposer's) */
  signatures: QuorumSignature[];
  /** Current status */
  status: QuorumStatus;
}
