# JSlice Discord Bot

Discord bot for GTA crafting, shared inventory, AI help, and a Google
Sheets-backed development changelog.

## Script changelog commands

- `/script add` logs a script, its summary, what was changed, and its status.
  This command requires the existing `FK` Discord role.
- `/script summary` shows the ten newest updates from all scripts.
- `/script summary name:qs-multicharacter` shows updates for one script.
- `/script list` lists every script currently tracked.

Example:

```text
/script add name:qs-multicharacter summary:Handles character selection changes:Changed Config.Locations for the new spawn locations status:Done
```

The bot automatically creates a worksheet named `Script Changes` in the same
spreadsheet used by the inventory. Set the optional `SCRIPT_WORKSHEET_NAME`
environment variable if you want a different tab name.

## Duplicate slash-command fix

At startup the bot now registers one server-specific copy of each command and
removes old global registrations. Restart or redeploy the bot once after
installing this version. Discord may briefly cache a removed global command,
but the duplicate will disappear after Discord refreshes its command list.

## Lock the bot to approved Discord servers

The bot only stays in servers listed in `ALLOWED_GUILD_IDS`. If somebody uses
the invite link without your permission, the bot immediately leaves their
server and does not register commands there.

The default approved server is the original server already configured in the
bot. To approve more than one server, add their Discord server IDs as a
comma-separated environment variable:

```text
ALLOWED_GUILD_IDS=1383300600367808613,SECOND_SERVER_ID,THIRD_SERVER_ID
```

To find a server ID, enable Discord Developer Mode, right-click the server
icon, and choose **Copy Server ID**. Add the ID to the environment variable,
redeploy the bot, and only then give that server owner the invite link.

For the strongest lock, open the Discord Developer Portal, select the app,
open **Bot**, and turn off **Public Bot**. Discord then permits only the app
owner to add it to servers. If approved server owners need to perform the
installation themselves, leave Public Bot enabled and rely on the server
allowlist above.

## Existing environment variables

- `DISCORD_TOKEN`
- `GOOGLE_CREDS`
- `SHEET_ID`
- `OPENAI_API_KEY` (optional)
- `ANTHROPIC_API_KEY` (optional)
- `SCRIPT_WORKSHEET_NAME` (optional; defaults to `Script Changes`)
- `ALLOWED_GUILD_IDS` (optional; comma-separated approved Discord server IDs)

The Google service account must have edit access to the spreadsheet because
the bot creates the changelog tab and appends rows to it.
you may not use this
