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

headers = ["Item", "Quantity"]
existing_headers = sheet.row_values(1)

if not existing_headers:
    sheet.append_row(headers)
elif existing_headers[:2] != headers:
    sheet.update("A1:B1", [headers])

# =========================
# CRAFTING DATA
# =========================
crafting_data = {
    "Pistols": {
        "Combat Pistol": "5,000 Dirty Money\n2 Pistol Barrels\n1 Pistol Lower\n1 Pistol Upper",
        "Heavy Pistol": "5,000 Dirty Money\n2 Pistol Barrels\n3 Pistol Lower\n2 Pistol Upper",
        "SNS Pistol": "5,000 Dirty Money\n1 Pistol Barrels\n1 Pistol Lower\n1 Pistol Upper",
        "Vintage Pistol": "5,000 Dirty Money\n3 Pistol Barrels\n3 Pistol Lower\n3 Pistol Upper",
        "Pistol Ammo": "1 Bullet\n1 Casing\n1 Gun Powder",
    },
    "Rifles": {
        "Assault Rifle": "15,000 Dirty Money\n2 Rifle Barrels\n2 Rifle Lowers\n1 Rifle Stock\n2 Rifle Uppers",
        "Bullpup Rifle": "15,000 Dirty Money\n1 Rifle Barrel\n2 Rifle Lowers\n1 Rifle Stock\n2 Rifle Uppers",
        "Compact Rifle": "15,000 Dirty Money\n1 Rifle Barrel\n1 Rifle Lower\n1 Rifle Stock\n1 Rifle Upper",
        "Military Rifle": "15,000 Dirty Money\n1 Rifle Barrel\n3 Rifle Lowers\n2 Rifle Stocks\n3 Rifle Uppers",
        "Rifle Ammo": "1 Bullet\n1 Casing\n1 Gun Powder",
    },
    "SMGs": {
        "Combat Pdw": "12,000 Dirty Money\n2 Rifle Barrels\n2 Rifle Lowers\n2 Rifle Stocks\n2 Rifle Uppers",
        "Micro Smg": "12,000 Dirty Money\n1 Rifle Barrel\n1 Rifle Lower\n1 Rifle Stock\n1 Rifle Upper",
        "Mini Smg": "12,000 Dirty Money\n1 Rifle Barrel\n1 Rifle Lower\n1 Rifle Stock\n1 Rifle Upper",
        "Mk2 Smg": "12,000 Dirty Money\n1 Rifle Barrel\n1 Rifle Lower\n1 Rifle Stock\n1 Rifle Upper",
        "Smg Ammo": "1 Bullet\n1 Casing\n1 Gun Powder",
    },
    "Shotguns": {
        "Bullpup": "10,000 Dirty Money\n1 Shotgun Barrel\n2 Shotgun Reciever\n1 Shotgun Shock",
        "Mk2 Pump": "10,000 Dirty Money\n2 Shotgun Barrels\n2 Shotgun Recievers\n2 Shotgun Stocks",
        "Pump": "10,000 Dirty Money\n1 Shotgun Barrel\n1 Shotgun Reciever\n1 Shotgun Shock",
        "Shotgun Ammo": "1 Bullet\n1 Casing\n1 Gun Powder",
    },
    "LMGs": {
        "Combat Mg": "15,000 Dirty Money\n2 Rifle Barrel\n2 Rifle Lowers\n1 Rifle Stock\n2 Rifle Uppers",
        "Combat Mg Mk2": "15,000 Dirty Money\n2 Rifle Barrels\n3 Rifle Lowers\n1 Rifle Stock\n3 Rifle Uppers",
        "Gusenberg Sweeper": "15,000 Dirty Money\n1 Rifle Barrel\n3 Rifle Lowers\n1 Rifle Stock\n3 Rifle Uppers",
        "Lmg Ammo": "1 Bullet\n1 Casing\n1 Gun Powder",
    },
    "Chemicals": {
        "Aluminum Oxide": "10 Aluminum\n500 Dirty Money\n10 Plastic",
        "Blowtorch": "10 Aluminum\n500 Dirty Money\n10 Metal Scrap",
        "Gun Powder": "500 Dirty Money\n10 Carbon\n10 Potassium Nitrate\n10 Sulfur",
        "Iron Oxide": "500 Dirty Money\n20 Plastic\n10 Rusted Iron",
        "Sticky Bomb": "500 Dirty Money\n3 Electronic Kits\n10 Iron Powder\n10 Metal Scrap\n10 Plastic",
        "Thermite": "500 Dirty Money\n3 Electronic Kits\n10 Metal Scrap\n10 Plastic",
    },
    "Melee": {
        "Bat": "10 Aluminum\n2 Rubber",
        "Battle Axe": "20 Steel\n5 Plastic\n10 Metal Scrap",
        "Crow Bar": "10 Steel\n4 Plastic",
        "Dick Bat": "20 Steel\n20 Rubber\n10 Plastic",
        "Hatchet": "20 Steel\n4 Plastic\n4 Metal Scrap",
        "Knife": "10 Steel",
        "Matchette": "10 Steel\n4 Plastic",
        "Switchblade": "12 Steel",
    },
    "Components": {
        "Pistol Barrel": "4 Caliper\n4 Lathe Bits\n4 Steel Block",
        "Pistol Lower": "2 Alumininum Block\n2 Caliper\n5 Milling Bit\n5 Screw\n2 Triggers",
        "Pistol Upper": "4 Alumininum Block\n4 Caliper\n4 Milling Bit\n5 Screw\n4 Spring",
        "Rifle Barrel": "4 Caliper\n4 Lathe Bits\n4 Steel Block",
        "Rifle Lower": "2 Alumininum Block\n2 Caliper\n5 Milling Bit\n5 Screw\n2 Triggers",
        "Rifle Stock": "4 Caliper\n4 Milling Bits\n4 Plastic Block",
        "Rifle Upper": "4 Alumininum Block\n4 Caliper\n4 Milling Bit\n5 Screw\n4 Spring",
        "Shotgun Barrel": "4 Caliper\n4 Lathe Bits\n4 Steel Block",
        "Shotgun Receiver": "4 Aluminum Block\n4 Caliper\n4 Milling Bit\n4 Screw\n5 Trigger",
        "Shotgun Stock": "4 Caliper\n4 Milling Bits\n4 Plastic Block",
    }
}

locations = {
    "electronics bench": "images/gta_loco.png",
    "map": "images/gta_loco.png"
}

# =========================
# INVENTORY HELPERS
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
# CRAFTING HELPERS
# =========================
def build_guide_context() -> str:
    lines = ["GTA crafting and location guide:"]
    for category, items in crafting_data.items():
        lines.append(f"\n[{category}]")
        for item_name, recipe in items.items():
            lines.append(f"- {item_name}: {recipe}")
    lines.append("\n[Locations]")
    for place in locations.keys():
        lines.append(f"- {place}")
    return "\n".join(lines)

# =========================
# CRAFTING VIEWS
# =========================
class ItemSelect(discord.ui.Select):
    def __init__(self, category_name: str):
        self.category_name = category_name
        options = [
            discord.SelectOption(label=item, value=item)
            for item in crafting_data[category_name].keys()
        ]
        super().__init__(
            placeholder=f"Choose a {category_name[:-1] if category_name.endswith('s') else category_name} item",
            min_values=1,
            max_values=1,
            options=options
        )

    async def callback(self, interaction: discord.Interaction):
        item_name = self.values[0]
        recipe = crafting_data[self.category_name][item_name]
        embed = discord.Embed(
            title=f"🔧 {item_name}",
            description=recipe,
            color=discord.Color.blue()
        )
        embed.set_footer(text=f"Category: {self.category_name}")
        await interaction.response.send_message(embed=embed, ephemeral=False)


class ItemView(discord.ui.View):
    def __init__(self, category_name: str):
        super().__init__(timeout=120)
        self.add_item(ItemSelect(category_name))


class CategorySelect(discord.ui.Select):
    def __init__(self):
        options = [
            discord.SelectOption(label=category, value=category)
            for category in crafting_data.keys()
        ]
        super().__init__(
            placeholder="Choose a crafting category",
            min_values=1,
            max_values=1,
            options=options
        )

    async def callback(self, interaction: discord.Interaction):
        category_name = self.values[0]
        view = ItemView(category_name)
        await interaction.response.send_message(
            f"Select an item from **{category_name}**:",
            view=view,
            ephemeral=False
        )


class CategoryView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=120)
        self.add_item(CategorySelect())

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
# INVENTORY COMMANDS
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
    try:
        items = get_inventory()
        if not items:
            await interaction.response.send_message("Inventory is empty.", ephemeral=True)
            return

        lines = []
        for item in items:
            name = str(item.get("Item", "Unknown")).strip()
            qty = item.get("Quantity", 0)
            lines.append(f"**{name}** — {qty}")

        chunks = []
        current_chunk = ""
        for line in lines:
            if len(current_chunk) + len(line) + 1 > 4000:
                chunks.append(current_chunk)
                current_chunk = line
            else:
                if current_chunk:
                    current_chunk += "\n"
                current_chunk += line
        if current_chunk:
            chunks.append(current_chunk)

        embed = discord.Embed(
            title="Shared Inventory",
            description=chunks[0],
            color=discord.Color.blue()
        )
        await interaction.response.send_message(embed=embed)

        for chunk in chunks[1:]:
            extra_embed = discord.Embed(
                title="Shared Inventory (continued)",
                description=chunk,
                color=discord.Color.blue()
            )
            await interaction.followup.send(embed=extra_embed)

    except Exception as e:
        print(f"/inventory error: {e}")
        await interaction.response.send_message(f"Inventory error: {e}", ephemeral=True)

# =========================
# CRAFTING COMMANDS
# =========================
@bot.tree.command(name="gta", description="Open the GTA crafting menu")
async def gta(interaction: discord.Interaction):
    view = CategoryView()
    await interaction.response.send_message(
        "Choose a crafting category:",
        view=view,
        ephemeral=False
    )


@bot.tree.command(name="location", description="Show server map location")
@app_commands.describe(place="Location to show")
async def location(interaction: discord.Interaction, place: str):
    place = place.lower().strip()
    if place in locations:
        file = discord.File(locations[place], filename="map.png")
        embed = discord.Embed(
            title=f"📍 {place.title()} Location",
            color=discord.Color.green()
        )
        embed.set_image(url="attachment://map.png")
        await interaction.response.send_message(embed=embed, file=file)
    else:
        await interaction.response.send_message("Location not found.")


@bot.tree.command(name="ask", description="Ask the bot anything about crafting or locations")
@app_commands.describe(question="Ask a question about the server, crafting, or locations")
async def ask(interaction: discord.Interaction, question: str):
    await interaction.response.defer()

    if not client_ai:
        await interaction.followup.send("OPENAI_API_KEY is not set.")
        return

    guide_context = build_guide_context()

    try:
        response = client_ai.responses.create(
            model="gpt-4.1-mini",
            input=[
                {
                    "role": "system",
                    "content": (
                        "You are JSlice Crafting Guide, an in-character GTA RP server assistant with a Rhode Island attitude. "
                        "You are street-smart, sarcastic, and confident. You speak like a local who knows the city and the hustle. "
                        "You are helpful first, but you don't act like customer support.\n\n"
                        "Personality rules:\n"
                        "- Keep answers clear and useful.\n"
                        "- Use light Rhode Island flavor like 'kid', 'guy', 'c'mon now'.\n"
                        "- Sound natural, not robotic.\n"
                        "- Do NOT overdo slang.\n\n"
                        "Behavior rules:\n"
                        "- Answer crafting questions directly.\n"
                        "- Answer location questions like a local.\n"
                        "- If info is not in the guide, say so and give a general answer.\n\n"
                        "Toxic users:\n"
                        "- If user is rude, respond with short, sarcastic clapback.\n"
                        "- Do NOT use slurs, threats, or extreme harassment.\n"
                        "- Stay in control.\n\n"
                        "Examples:\n"
                        "- 'Yeah yeah, ask it right and I'll help you.'\n"
                        "- 'You good or you just talkin'?'\n"
                        "- 'Don't make it harder than it needs to be.'"
                    )
                },
                {
                    "role": "user",
                    "content": f"{guide_context}\n\nUser question: {question}"
                }
            ]
        )

        answer = response.output_text.strip()
        if not answer:
            answer = "I couldn't generate an answer."
        if len(answer) > 1900:
            answer = answer[:1900] + "..."

        await interaction.followup.send(answer)

    except Exception as e:
        await interaction.followup.send(f"AI error: {e}")


# =========================
# RUN BOT
# =========================
bot.run(TOKEN)
