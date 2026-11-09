/**
 * Fake ids shared by the mock adapters, so IAM, Organization, Care and Requests
 * all "agree" on which clinics exist.
 * They do NOT match the clinic ids in the database (the seed creates random UUIDs).
 */
export const MOCK_CLINIC_DENTISTRY_ID = '11111111-1111-4111-8111-111111111111';
export const MOCK_CLINIC_PHYSIO_ID = '22222222-2222-4222-8222-222222222222';
export const MOCK_CLINIC_INACTIVE_ID = '33333333-3333-4333-8333-333333333333';