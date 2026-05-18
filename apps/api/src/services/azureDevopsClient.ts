import { httpRequestJson } from "./http";

export type AdoAuth =
  | { type: "PAT"; pat: string }
  | { type: "BEARER"; token: string };

export type AdoClientOptions = {
  organizationName: string;
  auth: AdoAuth;
};

export type AdoProject = {
  id: string;
  name: string;
  state?: string;
  visibility?: string;
};

export type AdoTeam = {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
};

export type AdoIdentity = {
  descriptor?: string;
  displayName: string;
  uniqueName?: string;
  mailAddress?: string;
};

export type AdoWorkItemRef = {
  id: number;
  url: string;
};

export type AdoWorkItem = {
  id: number;
  fields: Record<string, unknown>;
};

export class AzureDevOpsClient {
  private readonly org: string;
  private readonly headers: Record<string, string>;

  constructor(opts: AdoClientOptions) {
    this.org = opts.organizationName;
    if (opts.auth.type === "PAT") {
      const token = Buffer.from(`:${opts.auth.pat}`).toString("base64");
      this.headers = {
        authorization: `Basic ${token}`,
        "content-type": "application/json",
      };
    } else {
      this.headers = {
        authorization: `Bearer ${opts.auth.token}`,
        "content-type": "application/json",
      };
    }
  }

  private url(path: string) {
    return `https://dev.azure.com/${this.org}${path}`;
  }

  async listProjects(): Promise<AdoProject[]> {
    const result: AdoProject[] = [];
    let continuationToken: string | undefined;

    while (true) {
      const url = new URL(this.url(`/_apis/projects?api-version=7.1-preview.4`));
      if (continuationToken) url.searchParams.set("continuationToken", continuationToken);
      const res = await fetch(url, { headers: this.headers });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`projects_http_${res.status}: ${text.slice(0, 1000)}`);
      }
      const body = (await res.json()) as { value: AdoProject[] };
      result.push(...(body.value ?? []));
      continuationToken = res.headers.get("x-ms-continuationtoken") ?? undefined;
      if (!continuationToken) break;
    }

    return result;
  }

  async listTeams(projectName: string): Promise<AdoTeam[]> {
    const url = this.url(`/${encodeURIComponent(projectName)}/_apis/teams?api-version=7.1-preview.3`);
    const body = await httpRequestJson<{ value: AdoTeam[] }>(url, {
      method: "GET",
      headers: this.headers,
      expectedStatus: [200],
    });
    return body.value ?? [];
  }

  async listTeamMembers(projectId: string, teamId: string): Promise<AdoIdentity[]> {
    const url = this.url(
      `/_apis/projects/${encodeURIComponent(projectId)}/teams/${encodeURIComponent(teamId)}/members?api-version=7.1-preview.1`,
    );
    const body = await httpRequestJson<{ value: AdoIdentity[] }>(url, {
      method: "GET",
      headers: this.headers,
      expectedStatus: [200],
    });
    return body.value ?? [];
  }

  async wiqlQuery(projectName: string, query: string): Promise<AdoWorkItemRef[]> {
    const url = this.url(`/${encodeURIComponent(projectName)}/_apis/wit/wiql?api-version=7.1-preview.2`);
    const body = await httpRequestJson<{ workItems?: AdoWorkItemRef[] }>(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ query }),
      expectedStatus: [200],
    });
    return body.workItems ?? [];
  }

  async getWorkItemsBatch(projectName: string, ids: number[], fields: string[]): Promise<AdoWorkItem[]> {
    if (ids.length === 0) return [];
    const url = this.url(
      `/${encodeURIComponent(projectName)}/_apis/wit/workitemsbatch?api-version=7.1-preview.1`,
    );
    const body = await httpRequestJson<{ value?: AdoWorkItem[] }>(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ ids, fields }),
      expectedStatus: [200],
    });
    return body.value ?? [];
  }
}

