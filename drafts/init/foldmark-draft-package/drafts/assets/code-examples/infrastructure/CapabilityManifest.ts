export interface CapabilityManifest {
  readonly id: string;
  readonly nameKey: string;
  readonly descriptionKey: string;
  readonly defaultEnabled: false;
  readonly requiresConsent: true;
  readonly permissions: readonly CapabilityPermission[];
  load(): Promise<CapabilityModule>;
}

export const googleDriveManifest: CapabilityManifest = {
  id: 'google-drive',
  nameKey: 'capabilities.googleDrive.name',
  descriptionKey: 'capabilities.googleDrive.description',
  defaultEnabled: false,
  requiresConsent: true,
  permissions: [{ type: 'external-network', provider: 'Google', purpose: 'Open or save user-selected files' }],
  load: () => import('./google-drive/GoogleDriveCapability'),
};
