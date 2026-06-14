/**
 * Cloud Functions — Unit Tests
 *
 * Tests the 4 Cloud Functions with mocked Firestore, Gmail API, and Secret Manager.
 * Uses Jest module mocking to intercept firebase-admin, firebase-functions, and googleapis.
 */

// ─── Mock Setup ──────────────────────────────────────────────────────────────

const mockBatch = {
  set: jest.fn(),
  update: jest.fn(),
  commit: jest.fn().mockResolvedValue(undefined),
};

const mockGet = jest.fn();
const mockUpdate = jest.fn().mockResolvedValue(undefined);
const mockCollection = jest.fn();
const mockDoc = jest.fn(() => ({
  get: jest.fn().mockResolvedValue({ exists: false }),
  ref: { update: mockUpdate },
}));

const mockDb = {
  collection: mockCollection,
  batch: jest.fn(() => mockBatch),
};

const mockServerTimestamp = jest.fn(() => 'SERVER_TIMESTAMP');

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: jest.fn(() => mockDb),
  auth: jest.fn(() => ({
    createCustomToken: jest.fn().mockResolvedValue('mock-custom-token'),
  })),
}));

// admin.auth() handles used by sendMail's open-relay defense (getUser) and the
// guardian scheduler (createCustomToken). getUser is overridable per-test via
// mockGetUser so a fixture can simulate the createdBy account's own email.
const mockGetUser = jest.fn().mockResolvedValue({ email: '' });

// Make FieldValue accessible
jest.mock('firebase-admin', () => {
  const admin = {
    initializeApp: jest.fn(),
    firestore: Object.assign(jest.fn(() => mockDb), {
      FieldValue: { serverTimestamp: mockServerTimestamp },
    }),
    auth: jest.fn(() => ({
      createCustomToken: jest.fn().mockResolvedValue('mock-custom-token'),
      getUser: mockGetUser,
    })),
  };
  return admin;
});

// Track registered functions
const registeredFunctions = {};

jest.mock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: jest.fn((config, handler) => {
    // Extract the function name from the document path pattern
    const path = typeof config === 'string' ? config : config.document;
    registeredFunctions[path] = handler;
    return handler;
  }),
}));

jest.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: jest.fn((config, handler) => {
    registeredFunctions['__schedule__'] = handler;
    return handler;
  }),
}));

const mockGmailSend = jest.fn().mockResolvedValue({ data: { id: 'msg-123' } });

jest.mock('googleapis', () => ({
  google: {
    auth: {
      JWT: jest.fn().mockImplementation(() => ({})),
    },
    gmail: jest.fn(() => ({
      users: {
        messages: {
          send: mockGmailSend,
        },
      },
    })),
  },
}));

jest.mock('@google-cloud/secret-manager', () => ({
  SecretManagerServiceClient: jest.fn().mockImplementation(() => ({
    accessSecretVersion: jest.fn().mockResolvedValue([{
      payload: {
        data: Buffer.from(JSON.stringify({
          client_email: 'test@test.iam.gserviceaccount.com',
          private_key: '-----BEGIN RSA PRIVATE KEY-----\nMIIBog\n-----END RSA PRIVATE KEY-----\n',
        })),
      },
    }]),
  })),
}));

// Mock global fetch for guardianInactivityCheck
global.fetch = jest.fn();

// ─── Load the module (triggers registration) ────────────────────────────────

const functions = require('./index');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSnapshot(data, ref) {
  return {
    data: () => data,
    ref: ref || { update: mockUpdate },
    id: 'test-doc-id',
  };
}

function makeEvent(data, params = {}, ref) {
  return {
    data: makeSnapshot(data, ref),
    params,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('autoMatchInvitation', () => {
  const handler = registeredFunctions['users/{uid}'];

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.batch.mockReturnValue(mockBatch);
  });

  test('skips when no snapshot data', async () => {
    await handler({ data: null, params: { uid: 'u1' } });
    expect(mockCollection).not.toHaveBeenCalled();
  });

  test('skips when user has no email', async () => {
    const event = makeEvent({ email: '' }, { uid: 'u1' });
    await handler(event);
    expect(mockCollection).not.toHaveBeenCalled();
  });

  test('skips when no pending invitations found', async () => {
    mockCollection.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ empty: true, size: 0, docs: [] }),
    });

    const event = makeEvent({ email: 'test@example.com' }, { uid: 'u1' });
    await handler(event);

    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  test('matches pending invitations and creates estate_users', async () => {
    const invDoc = {
      id: 'inv-1',
      data: () => ({ estateId: 'estate-1', role: 'heir', invitedBy: 'owner-1' }),
      ref: { id: 'inv-1' },
    };

    const mockWhere = jest.fn().mockReturnThis();
    const mockGetResult = { empty: false, size: 1, docs: [invDoc] };
    // An empty role/soul-log query result: the handler issues a SECOND query
    // against estates/<id>/heirs|executors (to flip the subcollection doc to
    // 'active') and estates/<id>/soul-log (sharedWith backfill). The mock must
    // return a chainable .where(...).get() that yields no docs so those queries
    // resolve cleanly instead of throwing "db.collection(...).where is not a
    // function" (which the handler's try/catch would silently swallow).
    const emptyQuery = () => ({
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ empty: true, size: 0, docs: [], forEach: () => {} }),
    });
    mockCollection.mockImplementation((collName) => {
      if (collName === 'estate_invitations') {
        return { where: mockWhere, get: jest.fn().mockResolvedValue(mockGetResult) };
      }
      if (collName === 'estate_users') {
        return { doc: jest.fn(() => ({ id: 'eu-ref' })) };
      }
      if (collName === 'audit_logs') {
        return { doc: jest.fn(() => ({ id: 'audit-ref' })) };
      }
      // estates/<id>/heirs, estates/<id>/executors, estates/<id>/soul-log
      if (typeof collName === 'string' &&
          (collName.includes('/heirs') || collName.includes('/executors') || collName.includes('/soul-log'))) {
        return emptyQuery();
      }
      return { doc: mockDoc };
    });

    const event = makeEvent({ email: 'Test@Example.com' }, { uid: 'u1' });
    await handler(event);

    // Should have created batch writes: estate_user + invitation update + audit log
    expect(mockBatch.set).toHaveBeenCalledTimes(2); // estate_user + audit_log
    expect(mockBatch.update).toHaveBeenCalledTimes(1); // invitation status update
    expect(mockBatch.commit).toHaveBeenCalledTimes(1);
  });

  test('normalizes email to lowercase and trims whitespace', async () => {
    mockCollection.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ empty: true, size: 0, docs: [] }),
    });

    const event = makeEvent({ email: '  Test@EXAMPLE.com  ' }, { uid: 'u1' });
    await handler(event);

    // The where clause should have been called with lowercase trimmed email
    const whereCalls = mockCollection().where.mock.calls;
    expect(whereCalls[0]).toEqual(['email', '==', 'test@example.com']);
  });
});

describe('sendMail', () => {
  const handler = registeredFunctions['mail/{mailId}'];

  // Wire the Firestore mock so the open-relay defense (isRecipientAuthorized)
  // AUTHORIZES every recipient for `createdBy`, via path (a): the createdBy user
  // belongs to estate `est-1` (estate_users) and the recipient has a pending
  // invitation for that same estate (estate_invitations by email). Any test that
  // expects a successful send must call this first; the production defense is NOT
  // weakened — the test simply provides the data the defense looks for.
  function authorizeAllRecipients(estateId = 'est-1') {
    mockCollection.mockImplementation((collName) => {
      if (collName === 'estate_users') {
        return {
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            docs: [{ data: () => ({ estateId, userId: 'owner-1' }) }],
          }),
        };
      }
      if (collName === 'estate_invitations') {
        return {
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            docs: [{ data: () => ({ estateId, email: 'authorized' }) }],
          }),
        };
      }
      if (collName === 'email_templates') {
        return { doc: mockDoc };
      }
      // heirs/executors fallback (path c) — not reached when (a) matches first.
      return {
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
        doc: mockDoc,
      };
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ email: '' });
    authorizeAllRecipients();
  });

  test('skips when no snapshot data', async () => {
    await handler({ data: null, params: { mailId: 'm1' } });
    expect(mockGmailSend).not.toHaveBeenCalled();
  });

  test('skips already processed (SUCCESS)', async () => {
    const event = makeEvent({
      delivery: { state: 'SUCCESS' },
      message: { subject: 'Test', html: '<p>Hi</p>' },
      to: 'a@b.com',
    }, { mailId: 'm1' });

    await handler(event);
    expect(mockGmailSend).not.toHaveBeenCalled();
  });

  test('skips already processed (ERROR)', async () => {
    const event = makeEvent({
      delivery: { state: 'ERROR' },
      message: { subject: 'Test', html: '<p>Hi</p>' },
      to: 'a@b.com',
    }, { mailId: 'm1' });

    await handler(event);
    expect(mockGmailSend).not.toHaveBeenCalled();
  });

  test('marks error when subject or html is missing', async () => {
    const ref = { update: jest.fn().mockResolvedValue(undefined) };
    const event = {
      data: {
        data: () => ({ to: 'a@b.com', message: {} }),
        ref,
      },
      params: { mailId: 'm1' },
    };

    await handler(event);

    expect(ref.update).toHaveBeenCalledWith(
      expect.objectContaining({
        'delivery.state': 'ERROR',
        'delivery.error': 'Missing subject or html in message',
      })
    );
    expect(mockGmailSend).not.toHaveBeenCalled();
  });

  test('sends email via Gmail API and marks SUCCESS', async () => {
    const ref = { update: jest.fn().mockResolvedValue(undefined) };
    const event = {
      data: {
        data: () => ({
          to: 'recipient@example.com',
          message: { subject: 'Welcome', html: '<h1>Hello</h1>' },
          createdBy: 'owner-1',
        }),
        ref,
      },
      params: { mailId: 'm1' },
    };

    await handler(event);

    expect(mockGmailSend).toHaveBeenCalledTimes(1);
    expect(mockGmailSend).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'me',
        requestBody: expect.objectContaining({
          raw: expect.any(String),
        }),
      })
    );

    // Should mark as SUCCESS
    expect(ref.update).toHaveBeenCalledWith(
      expect.objectContaining({
        'delivery.state': 'SUCCESS',
      })
    );
  });

  test('sends to multiple recipients', async () => {
    const ref = { update: jest.fn().mockResolvedValue(undefined) };
    const event = {
      data: {
        data: () => ({
          to: ['a@b.com', 'c@d.com'],
          message: { subject: 'Multi', html: '<p>Hi all</p>' },
          createdBy: 'owner-1',
        }),
        ref,
      },
      params: { mailId: 'm1' },
    };

    await handler(event);

    expect(mockGmailSend).toHaveBeenCalledTimes(2);
    expect(ref.update).toHaveBeenCalledWith(
      expect.objectContaining({ 'delivery.state': 'SUCCESS' })
    );
  });

  test('resolves template from email_templates collection', async () => {
    const ref = { update: jest.fn().mockResolvedValue(undefined) };

    // Authorize the recipient AND serve the template doc from the same mock so
    // the open-relay lookups (estate_users / estate_invitations) still resolve.
    mockCollection.mockImplementation((collName) => {
      if (collName === 'email_templates') {
        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                subject: 'Invitation for {{name}}',
                html: '<p>Welcome, {{name}}! Estate: {{estate}}</p>',
              }),
            }),
          })),
        };
      }
      if (collName === 'estate_users') {
        return {
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            docs: [{ data: () => ({ estateId: 'est-1', userId: 'owner-1' }) }],
          }),
        };
      }
      if (collName === 'estate_invitations') {
        return {
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            docs: [{ data: () => ({ estateId: 'est-1', email: 'heir@test.com' }) }],
          }),
        };
      }
      return {
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
        doc: mockDoc,
      };
    });

    const event = {
      data: {
        data: () => ({
          to: 'heir@test.com',
          createdBy: 'owner-1',
          template: {
            name: 'invitation',
            data: { name: 'John', estate: 'Collymore Estate' },
          },
        }),
        ref,
      },
      params: { mailId: 'm1' },
    };

    await handler(event);

    expect(mockGmailSend).toHaveBeenCalledTimes(1);
    expect(ref.update).toHaveBeenCalledWith(
      expect.objectContaining({ 'delivery.state': 'SUCCESS' })
    );
  });

  test('marks ERROR on Gmail API failure', async () => {
    mockGmailSend.mockRejectedValueOnce(new Error('Gmail quota exceeded'));

    const ref = { update: jest.fn().mockResolvedValue(undefined) };
    const event = {
      data: {
        data: () => ({
          to: 'a@b.com',
          message: { subject: 'Test', html: '<p>Hi</p>' },
          createdBy: 'owner-1',
        }),
        ref,
      },
      params: { mailId: 'm1' },
    };

    await handler(event);

    expect(ref.update).toHaveBeenCalledWith(
      expect.objectContaining({
        'delivery.state': 'ERROR',
        'delivery.error': 'Gmail quota exceeded',
      })
    );
  });

  // ─── Open-relay defense (locks in the createdBy-attribution hardening) ─────

  test('rejects mail with NO createdBy attribution (open-relay defense)', async () => {
    const ref = { update: jest.fn().mockResolvedValue(undefined) };
    const event = {
      data: {
        data: () => ({
          to: 'stranger@example.com',
          message: { subject: 'Phish', html: '<p>Click me</p>' },
          // createdBy intentionally absent
        }),
        ref,
      },
      params: { mailId: 'm1' },
    };

    await handler(event);

    // Must FAIL CLOSED — never relay an unattributed mail from admin@sirsi.ai.
    expect(mockGmailSend).not.toHaveBeenCalled();
    expect(ref.update).toHaveBeenCalledWith(
      expect.objectContaining({
        'delivery.state': 'ERROR',
        'delivery.error': 'recipient not authorized',
        status: 'rejected',
      })
    );
  });

  test('rejects mail to a recipient the createdBy user is NOT authorized for', async () => {
    // createdBy belongs to NO estate and the recipient is not their own email →
    // every authorization path fails and the mail must be rejected.
    mockGetUser.mockResolvedValue({ email: 'owner@sirsi.ai' });
    mockCollection.mockImplementation((collName) => {
      if (collName === 'estate_users') {
        return {
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({ docs: [] }), // belongs to no estate
        };
      }
      if (collName === 'users') {
        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ exists: false }),
          })),
        };
      }
      return {
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
        doc: mockDoc,
      };
    });

    const ref = { update: jest.fn().mockResolvedValue(undefined) };
    const event = {
      data: {
        data: () => ({
          to: 'victim@example.com',
          message: { subject: 'Hi', html: '<p>Hi</p>' },
          createdBy: 'orphan-uid',
        }),
        ref,
      },
      params: { mailId: 'm1' },
    };

    await handler(event);

    expect(mockGmailSend).not.toHaveBeenCalled();
    expect(ref.update).toHaveBeenCalledWith(
      expect.objectContaining({
        'delivery.state': 'ERROR',
        'delivery.error': 'recipient not authorized',
        status: 'rejected',
      })
    );
  });
});

// NOTE: There is no sendSMS describe block. Invitation delivery is email-only;
// the SMS queue + stub delivery function were removed (it never delivered a text
// while the UI reported success). Reinstate tests here only alongside a live SMS
// provider integration.

describe('guardianInactivityCheck', () => {
  const handler = registeredFunctions['__schedule__'];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls Go API inactivity check endpoint', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        estatesChecked: 5,
        remindersSent: 2,
        executorsNotified: 1,
      }),
    });

    await handler();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/v1/guardian/run-inactivity-check');
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toMatch(/^Bearer /);
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  test('handles API error response gracefully', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    });

    // Should not throw
    await expect(handler()).resolves.toBeUndefined();
  });

  test('handles network failure gracefully', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network unreachable'));

    // Should not throw
    await expect(handler()).resolves.toBeUndefined();
  });
});
