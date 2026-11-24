/**
 * Resume Studio — IndexedDB Layer (Dexie.js)
 * Local-first, privacy-centric structured data & binary PDF Blob storage.
 */

import Dexie from 'dexie'

export class ResumeStudioDB extends Dexie {
  constructor() {
    super('ResumeStudioDB')
    this.version(1).stores({
      variants: 'id, name, createdAt, updatedAt',
      applications: 'id, companyName, jobTitle, variantId, createdAt, updatedAt, lastExportedAt',
      archivedPdfs: 'id, applicationId, companyName, jobTitle, variantId, revision, exportedAt',
      settings: 'key',
    })
  }
}

export const db = new ResumeStudioDB()
