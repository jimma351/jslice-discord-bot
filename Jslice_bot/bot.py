import os
import json
import discord
from discord import app_commands
from discord.ext import commands
from openai import OpenAI
import gspread
from google.oauth2.service_account import Credentials

# =========================
# ENV VARIABLES
# =========================
TOKEN = os.getenv("DISCORD_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GOOGLE_CREDS = os.getenv("GOOGLE_CREDS")
SHEET_ID = os.getenv("SHEET_ID")

if not TOKEN:
    raise ValueError("DISCORD_TOKEN is not set.")

if not GOOGLE_CREDS:
    raise ValueError("GOOGLE_CREDS is not set.")

if not SHEET_ID:
    raise ValueError("SHEET_ID is not set.")

client_ai = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# =========================
# DISCORD SETUP
# =========================
intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents)

ALLOWED_ROLE = "FK"

# =========================
# GOOGLE SHEETS SETUP
# =========================
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
]

WORKSHEET_NAME = "Sheet1"

try:
    creds_dict = json.loads(GOOGLE_CREDS)
except json.JSONDecodeError as e:
    raise ValueError(f"GOOGLE_CREDS is not valid JSON: {e}")

if "private_key" not in creds_dict or not creds_dict["private_key"]:
    raise ValueError("GOOGLE_CREDS is missing private_key.")

# Fix Railway newline issue
creds_dict["private_key"] = creds_dict["private_key"].replace("\\n", "\n")

creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
gc = gspread.authorize(creds)

try:
    spreadsheet = gc.open_by_key(SHEET_ID)
except Exception as e:
    raise RuntimeError(
        f"Failed to open spreadsheet. Check SHEET_ID and make sure the sheet is shared with the service account email. Error: {e}"
    )

try:
    sheet = spreadsheet.worksheet(WORKSHEET_NAME)
except gspread.WorksheetNotFound:
    raise RuntimeError(
        f"Worksheet '{WORKSHEET_NAME}' not found. Create a tab with that exact name in your Google Sheet."
    )

# Make sure headers exist for shared inventory
headers = ["Item", "Quantity"]
existing_headers = sheet.row_values(1)

if not existing_headers:
    sheet.append_row(headers)
elif existing_headers[:2] != headers:
    sheet.update("A1:B1", [headers])

# =========================
# HELPER FUNCTIONS
# =========================
def has_allowed_role(member: discord.Member) -> bool:
    return any(role.name == ALLOWED_ROLE for role in member.roles)

def normalize_item_name(item_name: str) -> str:
    return item_name.strip()

def find_item_row(item_name: str):
    records = sheet.get_all_records()

    for idx, row in enumerate(records, start=2):
        keys = {k.lower(): v for k, v in row.items()}
        sheet_item = str(keys.get("item", "")).strip()

        if sheet_item.lower() == item_name.lower():
            return idx, row

    return None, None

def get_inventory():
    records = sheet.get_all_records()
    return [row for row in records if str(row.get("Item", "")).strip()]

def add_item(item_name: str, quantity: int):
    row_num, existing = find_item_row(item_name)

    if existing:
        current_qty = int(existing.get("Quantity", 0))
        new_qty = current_qty + quantity
        sheet.update(f"B{row_num}", [[new_qty]])
        return new_qty
    else:
        sheet.append_row([item_name, quantity])
        return quantity

def remove_item(item_name: str, quantity: int):
    row_num, existing = find_item_row(item_name)

    if not existing:
        return False, "Item not found."

    current_qty = int(existing.get("Quantity", 0))

    if current_qty < quantity:
        return False, f"Not enough quantity. Current: {current_qty}"

    new_qty = current_qty - quantity

    if new_qty <= 0:
        sheet.delete_rows(row_num)
        return True, 0
    else:
        sheet.update(f"B{row_num}", [[new_qty]])
        return True, new_qty

def set_item_quantity(item_name: str, quantity: int):
    row_num, existing = find_item_row(item_name)

    if quantity <= 0:
        if existing:
            sheet.delete_rows(row_num)
        return 0

    if existing:
        sheet.update(f"B{row_num}", [[quantity]])
    else:
        sheet.append_row([item_name, quantity])

    return quantity

# =========================
# EVENTS
# =========================
@bot.event
async def on_ready():
    print(f"Logged in as {bot.user}")
    try:
        synced = await bot.tree.sync()
        print(f"Synced {len(synced)} slash commands.")
    except Exception as e:
        print(f"Slash command sync failed: {e}")

# =========================
# SLASH COMMANDS
# =========================
@bot.tree.command(name="additem", description="Add an item to the shared inventory")
@app_commands.describe(item_name="Name of the item", quantity="Amount to add")
async def additem(interaction: discord.Interaction, item_name: str, quantity: int):
    if not isinstance(interaction.user, discord.Member):
        await interaction.response.send_message("Could not verify your server roles.", ephemeral=True)
        return

    if not has_allowed_role(interaction.user):
        await interaction.response.send_message("You do not have permission to use this command.", ephemeral=True)
        return

    item_name = normalize_item_name(item_name)

    if not item_name:
        await interaction.response.send_message("Item name cannot be empty.", ephemeral=True)
        return

    if quantity <= 0:
        await interaction.response.send_message("Quantity must be more than 0.", ephemeral=True)
        return

    new_qty = add_item(item_name, quantity)

    await interaction.response.send_message(
        f"Added **{quantity}x {item_name}**.\nNew total: **{new_qty}**"
    )

@bot.tree.command(name="removeitem", description="Remove an item from the shared inventory")
@app_commands.describe(item_name="Name of the item", quantity="Amount to remove")
async def removeitem(interaction: discord.Interaction, item_name: str, quantity: int):
    if not isinstance(interaction.user, discord.Member):
        await interaction.response.send_message("Could not verify your server roles.", ephemeral=True)
        return

    if not has_allowed_role(interaction.user):
        await interaction.response.send_message("You do not have permission to use this command.", ephemeral=True)
        return

    item_name = normalize_item_name(item_name)

    if not item_name:
        await interaction.response.send_message("Item name cannot be empty.", ephemeral=True)
        return

    if quantity <= 0:
        await interaction.response.send_message("Quantity must be more than 0.", ephemeral=True)
        return

    success, result = remove_item(item_name, quantity)

    if not success:
        await interaction.response.send_message(result, ephemeral=True)
        return

    await interaction.response.send_message(
        f"Removed **{quantity}x {item_name}**.\nRemaining: **{result}**"
    )

@bot.tree.command(name="setitem", description="Set an exact quantity for an item in the shared inventory")
@app_commands.describe(item_name="Name of the item", quantity="Exact amount")
async def setitem(interaction: discord.Interaction, item_name: str, quantity: int):
    if not isinstance(interaction.user, discord.Member):
        await interaction.response.send_message("Could not verify your server roles.", ephemeral=True)
        return

    if not has_allowed_role(interaction.user):
        await interaction.response.send_message("You do not have permission to use this command.", ephemeral=True)
        return

    item_name = normalize_item_name(item_name)

    if not item_name:
        await interaction.response.send_message("Item name cannot be empty.", ephemeral=True)
        return

    new_qty = set_item_quantity(item_name, quantity)

    await interaction.response.send_message(
        f"Set **{item_name}** to **{new_qty}**."
    )

@bot.tree.command(name="inventory", description="View the shared inventory")
async def inventory(interaction: discord.Interaction):
    items = get_inventory()

    if not items:
        await interaction.response.send_message("Inventory is empty.", ephemeral=True)
        return

    embed = discord.Embed(
        title="Shared Inventory",
        color=discord.Color.blue()
    )

    for item in items:
        embed.add_field(
            name=str(item.get("Item", "Unknown")),
            value=f"Quantity: {item.get('Quantity', 0)}",
            inline=False
        )

    await interaction.response.send_message(embed=embed)

# =========================
# OPTIONAL AI COMMAND
# =========================
@bot.tree.command(name="askai", description="Ask the AI something")
@app_commands.describe(prompt="What do you want to ask?")
async def askai(interaction: discord.Interaction, prompt: str):
    if not client_ai:
        await interaction.response.send_message("AI is not configured yet.", ephemeral=True)
        return

    try:
        response = client_ai.responses.create(
            model="gpt-4.1-mini",
            input=prompt
        )
        answer = response.output_text[:1900]
        await interaction.response.send_message(answer)
    except Exception as e:
        await interaction.response.send_message(f"AI error: {e}", ephemeral=True)

# =========================
# RUN BOT
# =========================
bot.run(TOKEN)
