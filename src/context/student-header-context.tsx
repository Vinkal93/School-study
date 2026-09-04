"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";

export interface StudentHeaderConfig {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  backHref?: string;
  rightAction?: ReactNode;
}

interface StudentHeaderContextType {
  headerConfig: StudentHeaderConfig;
  setHeaderConfig: (config: StudentHeaderConfig) => void;
  resetHeaderConfig: () => void;
}

const StudentHeaderContext = createContext<StudentHeaderContextType | undefined>(
  undefined
);

export function StudentHeaderProvider({ children }: { children: ReactNode }) {
  const [headerConfig, setHeaderConfigState] = useState<StudentHeaderConfig>({});

  const setHeaderConfig = useCallback((config: StudentHeaderConfig) => {
    setHeaderConfigState(config);
  }, []);

  const resetHeaderConfig = useCallback(() => {
    setHeaderConfigState({});
  }, []);

  return (
    <StudentHeaderContext.Provider
      value={{
        headerConfig,
        setHeaderConfig,
        resetHeaderConfig,
      }}
    >
      {children}
    </StudentHeaderContext.Provider>
  );
}

export function useStudentHeaderContext() {
  const context = useContext(StudentHeaderContext);
  if (!context) {
    throw new Error(
      "useStudentHeaderContext must be used within a StudentHeaderProvider"
    );
  }
  return context;
}

/**
 * Hook for pages to easily declare their header title, back navigation, or custom actions.
 */
export function useStudentHeader(config: StudentHeaderConfig) {
  const { setHeaderConfig, resetHeaderConfig } = useStudentHeaderContext();

  useEffect(() => {
    setHeaderConfig(config);
    return () => {
      resetHeaderConfig();
    };
  }, [
    config.title,
    config.subtitle,
    config.showBack,
    config.backHref,
    setHeaderConfig,
    resetHeaderConfig,
  ]);
}
