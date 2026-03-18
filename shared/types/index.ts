// FinalWishes Shared — Type Definitions
// Generated from proto/estate/v1/estate.proto
// These types are the TypeScript equivalent of the Protobuf messages

export type EstateStatus = 'active' | 'death_reported' | 'executor_confirmed' | 'in_settlement' | 'closed';
export type AssetCategory = 'financial' | 'real_estate' | 'vehicle' | 'digital' | 'personal_property';
export type UserTier = 'free' | 'concierge' | 'white_glove';
export type UserRole = 'principal' | 'executor' | 'heir' | 'admin';

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  phone?: string;
  tier: UserTier;
  status: 'active' | 'suspended' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

export interface Estate {
  id: string;
  name: string;
  principalId: string;
  status: EstateStatus;
  deathInfo?: {
    reportedAt: string;
    reportedBy: string;
    dateOfDeath: string;
    deathCertificateDocId?: string;
  };
  estimatedValue?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  estateId: string;
  category: AssetCategory;
  name: string;
  description?: string;
  estimatedValue?: number;
  notes?: string;
  metadata: Record<string, unknown>;
  status: 'active' | 'transferred' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  estateId: string;
  originalName: string;
  displayName?: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
  folderId?: string;
  tags?: string[];
  status: 'pending' | 'active' | 'archived' | 'deleted';
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Executor {
  id: string;
  estateId: string;
  userId?: string;
  email: string;
  fullName: string;
  phone?: string;
  relationship?: string;
  priority: number;
  confirmedDeath: boolean;
  status: 'pending' | 'invited' | 'accepted' | 'declined' | 'active' | 'removed';
  createdAt: string;
  updatedAt: string;
}

export interface Heir {
  id: string;
  estateId: string;
  userId?: string;
  email?: string;
  fullName: string;
  relationship?: string;
  isMinor: boolean;
  isResiduary: boolean;
  residuaryPercentage?: number;
  status: 'active' | 'removed';
  createdAt: string;
  updatedAt: string;
}
