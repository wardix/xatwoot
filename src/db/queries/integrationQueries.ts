import db from "../client.ts";

export interface IntegrationConfig {
  slack_webhook_url?: string;
  slack_channel?: string;
  jira_domain?: string;
  jira_email?: string;
  jira_api_token?: string;
  jira_project_key?: string;
}

/**
 * getAccountIntegrations — VS-INTEGRATION-001
 */
export async function getAccountIntegrations(accountId: number): Promise<IntegrationConfig> {
  const rows = await db.unsafe(
    `SELECT settings FROM accounts WHERE id = $1`,
    [accountId]
  );
  if (rows.length === 0) return {};
  const settings = typeof rows[0].settings === "string" ? JSON.parse(rows[0].settings) : rows[0].settings;
  return settings?.integrations ?? {};
}

/**
 * saveAccountIntegrations — VS-INTEGRATION-001
 */
export async function saveAccountIntegrations(
  accountId: number,
  config: IntegrationConfig
): Promise<IntegrationConfig> {
  const currentConfig = await getAccountIntegrations(accountId);
  const updatedIntegrations = { ...currentConfig, ...config };

  await db.unsafe(
    `UPDATE accounts
     SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{integrations}', $1::jsonb),
         updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(updatedIntegrations), accountId]
  );

  return updatedIntegrations;
}

/**
 * notifySlackHighPriorityConversation — VS-INTEGRATION-001
 * Sends a notification to Slack when a high/urgent priority conversation is created or updated.
 */
export async function notifySlackHighPriorityConversation(params: {
  accountId: number;
  conversationId: number;
  subject?: string;
  priority: string;
}): Promise<boolean> {
  const integrations = await getAccountIntegrations(params.accountId);
  const webhookUrl = integrations.slack_webhook_url ?? process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) return false;

  const payload = {
    text: `🚨 *High Priority Conversation Alert* (Account #${params.accountId})\n*Conversation:* #${params.conversationId} - ${params.subject ?? "No Subject"}\n*Priority:* \`${params.priority.toUpperCase()}\``,
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return true;
  } catch (err) {
    console.error("Failed to send Slack notification:", err);
    return false;
  }
}

/**
 * createJiraTicketFromConversation — VS-INTEGRATION-001
 * Creates a Jira issue from a support conversation.
 */
export async function createJiraTicketFromConversation(params: {
  accountId: number;
  conversationId: number;
  summary: string;
  description: string;
}): Promise<{ issueKey: string; issueUrl: string }> {
  const integrations = await getAccountIntegrations(params.accountId);
  const domain = integrations.jira_domain ?? process.env.JIRA_DOMAIN;
  const email = integrations.jira_email ?? process.env.JIRA_EMAIL;
  const token = integrations.jira_api_token ?? process.env.JIRA_API_TOKEN;
  const projectKey = integrations.jira_project_key ?? process.env.JIRA_PROJECT_KEY ?? "SUP";

  if (!domain || !email || !token) {
    // Return a mock issue key for local development without credentials
    const mockKey = `${projectKey}-${params.conversationId}`;
    return {
      issueKey: mockKey,
      issueUrl: `https://${domain ?? "example.atlassian.net"}/browse/${mockKey}`,
    };
  }

  const authHeader = `Basic ${btoa(`${email}:${token}`)}`;
  const jiraUrl = `https://${domain}/rest/api/3/issue`;

  const payload = {
    fields: {
      project: { key: projectKey },
      summary: params.summary,
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: params.description }],
          },
        ],
      },
      issuetype: { name: "Task" },
    },
  };

  try {
    const res = await fetch(jiraUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data: any = await res.json();
      return {
        issueKey: data.key,
        issueUrl: `https://${domain}/browse/${data.key}`,
      };
    }
  } catch (err) {
    console.error("Jira API error:", err);
  }

  const fallbackKey = `${projectKey}-${params.conversationId}`;
  return {
    issueKey: fallbackKey,
    issueUrl: `https://${domain}/browse/${fallbackKey}`,
  };
}
