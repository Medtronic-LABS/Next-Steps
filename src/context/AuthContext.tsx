import React, { createContext, useContext, useState, ReactNode } from "react";
import { RoleId, ServiceDomain } from "../openphc/types";
import { FACILITIES, Facility } from "../db";

export interface RoleConfig {
  id: RoleId;
  name: string;
  short: string;
  facility: string;
  facilityId: string;
  level: "SUBCENTRE" | "PHC" | "CHC" | "DH" | "TERTIARY";
  accent: string;
  description: string;
}

export const ROLE_CONFIGS: Record<RoleId, RoleConfig> = {
  asha: {
    id: "asha",
    name: "ASHA",
    short: "ASHA",
    facility: "Village Ghurehta",
    facilityId: "SUBCENTRE",
    level: "SUBCENTRE",
    accent: "#54CC90",
    description: "Village level (~1,000 pop) · Home visits, tracking & escalation",
  },
  anm: {
    id: "anm",
    name: "ANM / CHO",
    short: "ANM",
    facility: "Sub-centre Ghurehta",
    facilityId: "SUBCENTRE",
    level: "SUBCENTRE",
    accent: "#1E14BE",
    description: "Sub-centre catchment (~5,000 pop) · Register, refer, capture next steps",
  },
  phc_sn: {
    id: "phc_sn",
    name: "PHC Staff Nurse",
    short: "SN",
    facility: "PHC Sirmour",
    facilityId: "PHC",
    level: "PHC",
    accent: "#6165DE",
    description: "Primary Health Centre (~30,000 pop) · Expected arrivals, lab, follow-up",
  },
  chc_sn: {
    id: "chc_sn",
    name: "CHC Staff Nurse",
    short: "CHC",
    facility: "CHC Teonthar",
    facilityId: "CHC",
    level: "CHC",
    accent: "#1E14BE",
    description: "Community Health Centre / FRU · Specialist care & downward referral",
  },
  dh_sn: {
    id: "dh_sn",
    name: "District Hospital Nurse",
    short: "DH",
    facility: "District Hospital, Rewa",
    facilityId: "DH",
    level: "DH",
    accent: "#994242",
    description: "District Hospital · Specialist ultrasound, labs, high-risk care",
  },
  tert_sn: {
    id: "tert_sn",
    name: "Tertiary Care Nurse",
    short: "TERT",
    facility: "Medical College, Jabalpur",
    facilityId: "TERTIARY",
    level: "TERTIARY",
    accent: "#C35721",
    description: "Advanced Tertiary Care · Critical maternal complication handoff",
  },
  phc_mo: {
    id: "phc_mo",
    name: "PHC Medical Officer",
    short: "MO",
    facility: "PHC Sirmour",
    facilityId: "PHC",
    level: "PHC",
    accent: "#2E9E6B",
    description: "Medical Officer · Care cascade oversight, woman-wise insights",
  },
  dpo: {
    id: "dpo",
    name: "District Programme Officer",
    short: "DPO",
    facility: "District Hospital, Rewa",
    facilityId: "DH",
    level: "DH",
    accent: "#751A1A",
    description: "District level programme monitoring & sub-centre review",
  },
};

interface AuthContextType {
  role: RoleId;
  roleConfig: RoleConfig;
  service: ServiceDomain;
  facility: Facility;
  isLoggedIn: boolean;
  loginAs: (role: RoleId, service?: ServiceDomain) => void;
  setService: (svc: ServiceDomain) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<RoleId>("anm");
  const [service, setService] = useState<ServiceDomain>("ANC");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);

  const roleConfig = ROLE_CONFIGS[role];
  const facility = FACILITIES.find((f) => f.id === roleConfig.facilityId) || FACILITIES[0];

  const loginAs = (newRole: RoleId, newService?: ServiceDomain) => {
    setRole(newRole);
    if (newService) setService(newService);
    setIsLoggedIn(true);
  };

  const logout = () => {
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        roleConfig,
        service,
        facility,
        isLoggedIn,
        loginAs,
        setService,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
