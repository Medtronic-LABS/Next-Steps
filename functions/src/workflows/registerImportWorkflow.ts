import { simulateRegisterImport } from '../domain/RegisterImportService.js';
import { renderRegisterImportResult } from '../adapter/MessageRenderer.js';
import type { OutboundMessage } from '../adapter/WhatsAppClient.js';

export function handleImportRegisterCommand(to: string): OutboundMessage[] {
  return [renderRegisterImportResult(to, simulateRegisterImport())];
}
