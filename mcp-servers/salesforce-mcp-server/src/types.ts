export interface SalesforceConfig {
  targetOrg: string;   // sf CLI alias e.g. "healthdev"
  apiVersion: string;
}

// Tool parameter interfaces
export interface RetrieveMetadataParams {
  metadataTypes: string[]; // e.g. ["ApexClass", "LightningComponentBundle"]
  names?: string[];        // specific component names, or all if omitted
}

export interface ValidateDeploymentParams {
  sourceDir?: string;
  testLevel?: 'NoTestRun' | 'RunLocalTests' | 'RunAllTestsInOrg' | 'RunSpecifiedTests';
  testClasses?: string[];
}

export interface RunTestsParams {
  testClasses: string[];
  codeCoverage?: boolean;
}

export interface DeployParams {
  sourceDir?: string;
  testLevel?: 'NoTestRun' | 'RunLocalTests' | 'RunAllTestsInOrg' | 'RunSpecifiedTests';
  testClasses?: string[];
  checkOnly?: boolean;
}

export interface QueryParams {
  soql: string;
  maxRecords?: number;
}

// Response interfaces
export interface MetadataComponent {
  type: string;
  fullName: string;
  fileName?: string;
  lastModifiedDate?: string;
  lastModifiedBy?: string;
}

export interface DeployResult {
  id: string;
  status: string;
  success: boolean;
  checkOnly: boolean;
  numberComponentsDeployed: number;
  numberComponentErrors: number;
  numberTestsCompleted: number;
  numberTestErrors: number;
  details?: {
    componentFailures?: Array<{ fullName: string; problem: string; problemType: string }>;
    runTestResult?: {
      numTestsRun: number;
      numFailures: number;
      codeCoverage?: Array<{ name: string; numLocations: number; numLocationsNotCovered: number }>;
    };
  };
}

export interface TestResult {
  testClassName: string;
  outcome: string;
  numTestsRun: number;
  numFailures: number;
  totalTime: number;
  codeCoverageWarnings?: string[];
  failures?: Array<{ name: string; message: string; stackTrace: string }>;
}

export interface QueryResult {
  totalSize: number;
  records: Record<string, unknown>[];
}
