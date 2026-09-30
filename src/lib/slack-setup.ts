export const SLACK_WEBHOOK_AGENT_INSTRUCTIONS = `Help me connect an existing Slack channel to Pointed using an incoming webhook.
1. Ask which Slack workspace and channel I want. Do not create a new channel.
2. In Slack's app management, create or select an app I control, enable Incoming Webhooks, and choose Add New Webhook to Workspace. Let me authorize the selected channel; workspace admin approval may be required.
3. Treat the resulting hooks.slack.com/services URL as a secret. Do not put it in chat, logs, source files, or shared environment variables.
4. In Pointed, sign in with my intended Linear workspace and open Settings > Slack > Use an incoming webhook. Enter the webhook URL and the matching Slack workspace and channel names into that authenticated form. Let me enter the secret if secure transfer is unavailable.
5. Save the connection. This must not send a test message. The connection belongs only to my current Linear identity, not every user of the deployment.
6. Explain that I can change the channel or disconnect in Settings. Disconnect removes it from Pointed; revoke the webhook in Slack to invalidate it completely.
Do not post any message. I will review the destination and explicitly send the session invite myself.`;
