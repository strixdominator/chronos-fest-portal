export type AttendeeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AlumniRecord {
  usn: string; // University Seat Number / Roll No, e.g. "1MS20CS042"
  fullName: string;
  officialEmail: string;
  phone: string;
  department: string;
  batchYear: string; // e.g. "Batch of 2024"
}

export interface FamilyMember {
  name: string;
  relation: string; // e.g. "Parent", "Spouse", "Child", "Sibling", "Family Guest"
  age?: string;
}

export interface CheckInLog {
  timestamp: string;
  admitted: number;
  gateVolunteer: string;
  notes?: string;
}

export interface Attendee {
  id: string; // e.g. "ATT-4921"
  fullName: string;
  email: string;
  phone: string;
  rollNumber: string; // USN / Roll number
  usn?: string; // Canonical USN
  department: string;
  year: string; // e.g. "Batch of 2024 (Alumni)"
  batchYear?: string;
  idCardUrl?: string; // Optional degree certificate / ID proof
  degreeProofUrl?: string;
  ticketCode: string; // Unique ticket QR payload: "TKT-CHRONOS-XXXX"
  status: AttendeeStatus;
  rejectionReason?: string;
  checkedIn: boolean;
  checkedInAt?: string;
  checkedInBy?: string;
  registeredAt: string;
  approvedAt?: string;
  wristbandColor?: string;
  wristbandNumber?: string;
  notes?: string;

  // Professional details filled upon registration
  organization?: string;
  designation?: string;

  // Family & Accompanying Guest Quota Tracking (Max 4 guests)
  familyCount?: number; // 0 to 4 additional family members
  familyMembers?: FamilyMember[];
  totalQuota?: number; // 1 (alumnus) + familyCount
  admittedCount?: number; // number of members already entered
  checkInLogs?: CheckInLog[];

  // Contact update & OTP tracking
  verificationMethod?: 'OTP_VERIFIED' | 'MANUAL_REVIEW_REQUEST';
  isContactUpdated?: boolean;
  originalEmail?: string;
  originalPhone?: string;
  reviewReason?: string;
}

export interface EventSettings {
  eventName: string;
  tagline: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  organizer: string;
  totalCapacity: number;
  isRegistrationOpen: boolean;
  wristbandColors: string[];
}

export interface VerificationResult {
  valid: boolean;
  code: 'SUCCESS' | 'PARTIAL_ENTRY' | 'ALREADY_CHECKED_IN' | 'PENDING' | 'REJECTED' | 'NOT_FOUND';
  message: string;
  attendee?: Attendee;
  admittedNow?: number;
  remaining?: number;
  totalQuota?: number;
}

export interface OtpRecord {
  usn: string;
  code: string;
  expiresAt: number;
  channel: 'EMAIL' | 'PHONE';
  target: string;
}
