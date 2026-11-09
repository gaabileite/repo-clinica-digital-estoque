import { Injectable } from '@nestjs/common';
import { MOCK_CLINIC_DENTISTRY_ID, MOCK_CLINIC_INACTIVE_ID, MOCK_CLINIC_PHYSIO_ID } from '../mock-ids';
import type { OrgClinic, OrganizationAdapter } from './organization.adapter';

const CLINICS: OrgClinic[] = [
  { id: MOCK_CLINIC_DENTISTRY_ID, name: 'Clínica-Escola de Odontologia', address: 'Mock address 1', manager: 'Mock Manager 1', active: true },
  { id: MOCK_CLINIC_PHYSIO_ID, name: 'Clínica-Escola de Fisioterapia', address: 'Mock address 2', manager: 'Mock Manager 2', active: true },
  { id: MOCK_CLINIC_INACTIVE_ID, name: 'Mock Closed Clinic', address: 'Mock address 3', manager: 'Mock Manager 3', active: false },
];

/** Fake Organization module with three clinics, one of them inactive. */
@Injectable()
export class MockOrganizationAdapter implements OrganizationAdapter {
  async listActiveClinics() {
    return CLINICS.filter((c) => c.active).map((c) => structuredClone(c));
  }

  async getClinic(clinicId: string) {
    const clinic = CLINICS.find((c) => c.id === clinicId);
    return clinic ? structuredClone(clinic) : null;
  }
}