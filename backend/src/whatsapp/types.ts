export type WhatsAppRole = 'anm' | 'phc_sn' | 'phc_mo' | 'chc_sn' | 'chc_mo' | 'dh_sn' | 'dh_mo' | 'tert_sn' | 'asha' | 'admin';

export interface WhatsAppUser {
  id: string;
  name: string;
  phone: string;
  role: WhatsAppRole;
  facility_id: string | null;
  facility_name?: string;
  facility_level?: string;
  preferred_lang?: 'hi' | 'en';
  is_active: boolean;
}

export type InboundMessageKind = 'text' | 'button_reply' | 'list_reply' | 'flow_reply' | 'unknown';

export interface InboundMessage {
  id: string;
  from: string; // E.164 without '+' or with '+'
  timestamp: string;
  kind: InboundMessageKind;
  text?: string;
  replyId?: string;
  replyTitle?: string;
  flowResponse?: Record<string, any>;
  raw?: any;
}

export interface InteractiveButton {
  id: string;
  title: string; // Max 20 chars
}

export interface InteractiveListSectionRow {
  id: string;
  title: string; // Max 24 chars
  description?: string; // Max 72 chars
}

export interface InteractiveListSection {
  title: string;
  rows: InteractiveListSectionRow[];
}

export type OutboundMessage =
  | {
      kind: 'text';
      to: string;
      body: string;
    }
  | {
      kind: 'buttons';
      to: string;
      body: string;
      header?: string;
      footer?: string;
      buttons: InteractiveButton[]; // Max 3 buttons per WhatsApp rules
    }
  | {
      kind: 'list';
      to: string;
      body: string;
      header?: string;
      footer?: string;
      buttonText: string; // e.g. "Select Option"
      sections: InteractiveListSection[];
    }
  | {
      kind: 'flow';
      to: string;
      header?: string;
      body: string;
      footer?: string;
      flowId: string;
      flowCta: string; // e.g. "Register Patient"
      flowToken?: string;
      screen?: string;
      flowMode?: 'draft' | 'published';
    };

export interface ConversationSession {
  userId: string;
  phoneNumber: string;
  currentState: string;
  lang?: 'hi' | 'en';
  patientId?: string;
  stepId?: string;
  stagedAction?: {
    category: string;
    level: string;
    facilityId: string;
    dueDate: string;
    patientId: string;
    targetFacilityName?: string;
  };
  stagedSteps?: Array<{
    category: string;
    level: string;
    facilityId: string;
    dueDate: string;
    patientId: string;
    targetFacilityName?: string;
  }>;
  stagedRegistration?: {
    name?: string;
    phone?: string;
    villageId?: string;
    villageName?: string;
    service?: string;
    riskStatus?: string;
    age?: number;
    consentWhatsapp?: number;
  };
  lastActiveAt: number;
}
