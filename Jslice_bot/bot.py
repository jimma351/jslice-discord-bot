import os
import json
import discord
from discord import app_commands
from discord.ext import commands
from openai import OpenAI
import gspread
from google.oauth2.service_account import Credentials

TOKEN = os.getenv("DISCORD_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GOOGLE_CREDS = os.getenv("GOOGLE_CREDS")

client_ai = OpenAI(api_key=OPENAI_API_KEY)

intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)

user_memory = {}
ALLOWED_ROLE = "FK"

# =========================
# GOOGLE SHEETS SETUP
# =========================
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
]

SHEET_NAME = "BotInventory"
WORKSHEET_NAME = "Sheet1"

if not GOOGLE_CREDS:
    raise ValueError("GOOGLE_CREDS is not set in Railway Variables.")

creds_dict = json.loads(GOOGLE_CREDS)

# Fix newline issue in Railway
creds_dict["private_key"] = creds_dict["private_key"].replace("\\n", "\n")
gc = gspread.authorize(creds)

sheet = gc.open(SHEET_NAME)
inventory_ws = sheet.worksheet(WORKSHEET_NAME)

# =========================
# HELPERS
# =========================
def has_fk_role(member: discord.Member) -> bool:
    return any(role.name == ALLOWED_ROLE for role in member.roles)

def find_item_row(item_name: str):
    records = inventory_ws.get_all_values()
    search = item_name.strip().lower()

    for idx, row in enumerate(records[1:], start=2):
        if len(row) >= 2 and row[0].strip().lower() == search:
            return idx, row
    return None, None

# =========================
# EVENTS
# =========================
@bot.event
async def on_ready():
    await bot.tree.sync()
    print(f"Logged in as {bot.user}")

# =========================
# INVENTORY COMMANDS
# =========================
@bot.tree.command(name="inventoryall", description="Show full inventory list")
async def inventoryall(interaction: discord.Interaction):
    await interaction.response.defer()

    try:
        records = inventory_ws.get_all_values()

        if len(records) <= 1:
            await interaction.followup.send("Inventory is empty, kid.")
            return

        items = records[1:]
        lines = []

        for row in items:
            name = row[0] if len(row) > 0 else "Unknown"
            qty = row[1] if len(row) > 1 else "0"
            lines.append(f"• {name} — {qty}")

        output = "\n".join(lines)

        if len(output) > 1900:
            output = output[:1900] + "\n... (too many items)"

        embed = discord.Embed(
            title="📦 Full Inventory",
            description=output,
            color=discord.Color.gold()
        )

        await interaction.followup.send(embed=embed)

    except Exception as e:
        await interaction.followup.send(f"Inventory error: {e}")

@bot.tree.command(name="inventory", description="Check item quantity")
@app_commands.describe(item="Item name")
async def inventory(interaction: discord.Interaction, item: str):
    await interaction.response.defer()

    try:
        row_num, row = find_item_row(item)

        if not row:
            await interaction.followup.send("Item not found, guy.")
            return

        qty = row[1] if len(row) > 1 else "0"
        await interaction.followup.send(f"📦 {row[0]}: {qty}")

    except Exception as e:
        await interaction.followup.send(f"Inventory error: {e}")

@bot.tree.command(name="additem", description="Add items to inventory")
@app_commands.describe(item="Item name", amount="Amount to add")
async def additem(interaction: discord.Interaction, item: str, amount: int):
    await interaction.response.defer()

    if not has_fk_role(interaction.user):
        await interaction.followup.send("You ain't FK, kid. No touching inventory.")
        return

    if amount <= 0:
        await interaction.followup.send("Use a number bigger than 0.")
        return

    try:
        row_num, row = find_item_row(item)

        if not row:
            inventory_ws.append_row([item, amount])
            await interaction.followup.send(f"🆕 Added new item **{item}** ({amount})")
            return

        current = int(row[1]) if len(row) > 1 and row[1].isdigit() else 0
        new_total = current + amount

        inventory_ws.update_cell(row_num, 2, new_total)

        await interaction.followup.send(
            f"➕ Added {amount} to **{row[0]}** (Now: {new_total})"
        )

    except Exception as e:
        await interaction.followup.send(f"Inventory error: {e}")

@bot.tree.command(name="removeitem", description="Remove items from inventory")
@app_commands.describe(item="Item name", amount="Amount to remove")
async def removeitem(interaction: discord.Interaction, item: str, amount: int):
    await interaction.response.defer()

    if not has_fk_role(interaction.user):
        await interaction.followup.send("You ain't FK, kid. No touching inventory.")
        return

    if amount <= 0:
        await interaction.followup.send("Use a number bigger than 0.")
        return

    try:
        row_num, row = find_item_row(item)

        if not row:
            await interaction.followup.send("Item not found.")
            return

        current = int(row[1]) if len(row) > 1 and row[1].isdigit() else 0
        new_total = max(0, current - amount)

        inventory_ws.update_cell(row_num, 2, new_total)

        await interaction.followup.send(
            f"➖ Removed {amount} from **{row[0]}** (Now: {new_total})"
        )

    except Exception as e:
        await interaction.followup.send(f"Inventory error: {e}")

# =========================
# AI COMMAND
# =========================
@bot.tree.command(name="ask", description="Ask the bot anything")
@app_commands.describe(question="Ask something")
async def ask(interaction: discord.Interaction, question: str):
    await interaction.response.defer()

    user_id = str(interaction.user.id)

    if user_id not in user_memory:
        user_memory[user_id] = []

    user_memory[user_id].append({
        "role": "user",
        "content": question
    })

    user_memory[user_id] = user_memory[user_id][-6:]

    system_prompt = (
        "You are a GTA RP assistant with a Rhode Island attitude. "
        "Street smart, sarcastic, helpful."
    )

    try:
        response = client_ai.responses.create(
            model="gpt-5.4-mini",
            input=[
                {"role": "system", "content": system_prompt},
                *user_memory[user_id]
            ]
        )

        answer = response.output_text.strip()

        user_memory[user_id].append({
            "role": "assistant",
            "content": answer
        })

        await interaction.followup.send(answer)

    except Exception as e:
        await interaction.followup.send(f"AI error: {e}")

bot.run(TOKEN)
